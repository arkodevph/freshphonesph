import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Permission, User } from '@freshphones/contracts';
import { allowed } from '../auth/access';
import { Database } from '../database';
import { Prisma } from '../generated/prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrivateStorageService, type PrivateUpload } from '../storage/private-storage.service';

const json = (value: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

const requirementInclude = {
  type: true,
  documents: {
    include: { storedFile: { select: { id: true, originalName: true, mimeType: true, size: true, createdAt: true } } },
    orderBy: { revision: 'desc' as const },
  },
  reviews: {
    include: { reviewer: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' as const },
  },
} as const;

@Injectable()
export class DocumentsService {
  constructor(
    @Inject(Database) private readonly db: Database,
    @Inject(PrivateStorageService) private readonly storage: PrivateStorageService,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
  ) {}

  private async write<T>(user: User, permission: Permission, run: (tx: Prisma.TransactionClient) => Promise<T>) {
    return this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(740015)`;
      const current = await tx.user.findUnique({ where: { id: user.id } });
      if (!current?.active || !allowed(current, permission)) throw new ForbiddenException('Your access has changed.');
      return run(tx);
    });
  }

  private assertClient(user: User, clientId: string) {
    if (user.role === 'CUSTOMER' && user.clientId !== clientId)
      throw new NotFoundException('Client not found.');
  }

  async types(user: User) {
    return this.db.requirementType.findMany({
      where: user.role === 'CUSTOMER' ? { active: true } : {},
      orderBy: [{ active: 'desc' }, { label: 'asc' }],
    });
  }

  async createType(user: User, input: {
    code: string; label: string; description: string; allowedMimeTypes: string[];
    maxBytes: number; customerCanUpload: boolean; active: boolean;
  }) {
    return this.write(user, 'REQUIREMENT_MANAGE', async (tx) => {
      const result = await tx.requirementType.create({ data: input });
      await tx.auditEntry.create({ data: {
        actorId: user.id, action: 'requirement_type.created', entity: 'requirement_type',
        recordId: result.id, after: json(result),
      } });
      await tx.changeEvent.create({ data: { entity: 'requirement_type', recordId: result.id } });
      return result;
    });
  }

  async updateType(user: User, id: string, input: {
    code: string; label: string; description: string; allowedMimeTypes: string[];
    maxBytes: number; customerCanUpload: boolean; active: boolean;
  }, version: number) {
    return this.write(user, 'REQUIREMENT_MANAGE', async (tx) => {
      const before = await tx.requirementType.findUnique({ where: { id } });
      if (!before) throw new NotFoundException('Requirement type not found.');
      const changed = await tx.requirementType.updateMany({ where: { id, version }, data: {
        ...input, version: { increment: 1 },
      } });
      if (!changed.count) throw new ConflictException('This requirement type changed. Refresh and try again.');
      const after = await tx.requirementType.findUniqueOrThrow({ where: { id } });
      await tx.auditEntry.create({ data: {
        actorId: user.id, action: 'requirement_type.updated', entity: 'requirement_type',
        recordId: id, before: json(before), after: json(after),
      } });
      await tx.changeEvent.create({ data: { entity: 'requirement_type', recordId: id } });
      return after;
    });
  }

  async requirements(user: User, clientId: string) {
    this.assertClient(user, clientId);
    const client = await this.db.client.findUnique({ where: { id: clientId }, select: { id: true } });
    if (!client) throw new NotFoundException('Client not found.');
    const [types, requirements] = await this.db.$transaction([
      this.db.requirementType.findMany({ where: { active: true }, orderBy: { label: 'asc' } }),
      this.db.clientRequirement.findMany({ where: { clientId }, include: requirementInclude }),
    ]);
    const byType = new Map(requirements.map((item) => [item.typeId, item]));
    return types.map((type) => {
      const item = byType.get(type.id);
      if (!item) return {
        id: null, clientId, type, status: 'MISSING', customerNote: '', version: 0,
        documents: [], reviews: [], createdAt: null, updatedAt: null,
      };
      return this.view(user, item);
    });
  }

  private view(user: User, requirement: Prisma.ClientRequirementGetPayload<{ include: typeof requirementInclude }>) {
    return {
      ...requirement,
      ...(user.role === 'CUSTOMER' ? { internalNote: undefined } : {}),
      reviews: requirement.reviews.map((review) => ({
        ...review,
        ...(user.role === 'CUSTOMER' ? { internalNote: undefined } : {}),
      })),
    };
  }

  async upload(user: User, clientId: string, typeId: string, upload?: PrivateUpload) {
    this.assertClient(user, clientId);
    const type = await this.db.requirementType.findFirst({ where: { id: typeId, active: true } });
    if (!type) throw new NotFoundException('Requirement type not found.');
    if (user.role === 'CUSTOMER' && !type.customerCanUpload)
      throw new ForbiddenException('This document must be uploaded by Records.');
    const file = this.storage.validateDocument(upload, {
      allowedMimeTypes: type.allowedMimeTypes,
      maxBytes: type.maxBytes,
      label: type.label,
    });
    const storageKey = await this.storage.saveDocument(file, {
      allowedMimeTypes: type.allowedMimeTypes,
      maxBytes: type.maxBytes,
      label: type.label,
    });
    try {
      return await this.write(user, 'DOCUMENT_UPLOAD', async (tx) => {
        const client = await tx.client.findUnique({
          where: { id: clientId }, select: { id: true, name: true, account: { select: { id: true } } },
        });
        if (!client) throw new NotFoundException('Client not found.');
        const requirement = await tx.clientRequirement.upsert({
          where: { clientId_typeId: { clientId, typeId } },
          update: { status: 'SUBMITTED', customerNote: '', internalNote: '', version: { increment: 1 } },
          create: { clientId, typeId, status: 'SUBMITTED' },
        });
        const latest = await tx.requirementDocument.aggregate({ where: { requirementId: requirement.id }, _max: { revision: true } });
        const stored = await tx.storedFile.create({ data: {
          storageKey,
          originalName: file.originalname.slice(0, 255) || 'document',
          mimeType: file.mimetype,
          size: file.size,
          uploadedById: user.id,
        } });
        const document = await tx.requirementDocument.create({ data: {
          clientId, requirementId: requirement.id, storedFileId: stored.id,
          revision: (latest._max.revision ?? 0) + 1,
        } });
        await tx.auditEntry.create({ data: {
          actorId: user.id, action: 'document.uploaded', entity: 'customer_document',
          recordId: document.id, after: json({ clientId, requirementId: requirement.id, typeId, revision: document.revision, mimeType: stored.mimeType, size: stored.size }),
        } });
        await tx.changeEvent.create({ data: { entity: 'client_requirement', recordId: requirement.id } });
        if (user.role === 'CUSTOMER') await this.notifications.enqueueRoles(tx, ['OWNER', 'COO', 'RECORDS'], {
          eventKey: 'document.submitted',
          dedupeKey: `document:${document.id}:submitted`,
          variables: { client: client.name, requirement: type.label },
          link: `/system/clients?client=${clientId}`,
        });
        return this.view(user, await tx.clientRequirement.findUniqueOrThrow({
          where: { id: requirement.id }, include: requirementInclude,
        }));
      });
    } catch (error) {
      await this.storage.remove(storageKey);
      throw error;
    }
  }

  async review(user: User, id: string, input: {
    status: 'APPROVED' | 'NEEDS_CLARIFICATION'; customerNote: string; internalNote: string; version: number;
  }) {
    return this.write(user, 'DOCUMENT_REVIEW', async (tx) => {
      const before = await tx.clientRequirement.findUnique({
        where: { id }, include: { type: true, client: { select: { account: { select: { id: true } } } } },
      });
      if (!before) throw new NotFoundException('Client requirement not found.');
      if (before.status !== 'SUBMITTED') throw new ConflictException('Only a submitted document can be reviewed.');
      const changed = await tx.clientRequirement.updateMany({ where: { id, version: input.version, status: 'SUBMITTED' }, data: {
        status: input.status,
        customerNote: input.customerNote,
        internalNote: input.internalNote,
        version: { increment: 1 },
      } });
      if (!changed.count) throw new ConflictException('This requirement was already reviewed. Refresh the checklist.');
      await tx.requirementReview.create({ data: {
        requirementId: id, reviewerId: user.id, fromStatus: before.status, toStatus: input.status,
        customerNote: input.customerNote, internalNote: input.internalNote,
      } });
      const after = await tx.clientRequirement.findUniqueOrThrow({ where: { id }, include: requirementInclude });
      await tx.auditEntry.create({ data: {
        actorId: user.id, action: `document.${input.status.toLowerCase()}`, entity: 'client_requirement',
        recordId: id, before: json(before), after: json(after),
      } });
      await tx.changeEvent.create({ data: { entity: 'client_requirement', recordId: id } });
      if (before.client.account) await this.notifications.enqueue(tx, {
        recipientId: before.client.account.id,
        eventKey: input.status === 'APPROVED' ? 'document.approved' : 'document.needs_clarification',
        dedupeKey: `requirement:${id}:review:${after.version}`,
        variables: { requirement: before.type.label, note: input.customerNote },
        link: '/portal',
      });
      return this.view(user, after);
    });
  }

  async content(user: User, id: string) {
    const document = await this.db.requirementDocument.findUnique({
      where: { id },
      include: { storedFile: true },
    });
    if (!document || (user.role === 'CUSTOMER' && user.clientId !== document.clientId))
      throw new NotFoundException('Document not found.');
    return {
      data: await this.storage.read(document.storedFile.storageKey),
      mimeType: document.storedFile.mimeType,
      originalName: document.storedFile.originalName,
    };
  }
}
