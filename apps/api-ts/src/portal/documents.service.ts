import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { User } from '@freshphones/contracts';
import { Database } from '../database';
import { Prisma, type DocumentStatus } from '../generated/prisma/client';
import { PrivateStorageService, type PrivateUpload } from '../storage/private-storage.service';
import { notifyCustomer } from './notifications.service';
import { requirement, requirements } from './requirements';

const include = { file: { select: { originalName: true, mimeType: true, size: true } } } as const;
type Row = Prisma.CustomerDocumentGetPayload<{ include: typeof include }>;
const json = (value: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const view = (row: Row) => ({
  id: row.id, requirementKey: row.requirementKey, status: row.status,
  fileName: row.file.originalName, mimeType: row.file.mimeType, size: row.file.size,
  clarification: row.clarification, version: row.version, uploadedAt: row.createdAt.toISOString(),
  reviewedAt: row.reviewedAt?.toISOString() ?? null,
});

@Injectable()
export class DocumentsService {
  constructor(
    @Inject(Database) private readonly db: Database,
    @Inject(PrivateStorageService) private readonly storage: PrivateStorageService,
  ) {}

  private staff(user: Pick<User, 'role'>) { return user.role === 'OWNER' || user.role === 'RECORDS'; }
  private check(user: User, clientId: string) {
    if (user.role === 'CUSTOMER' && user.clientId === clientId) return;
    if (this.staff(user)) return;
    throw new NotFoundException('Documents not found.');
  }
  private ownClient(user: User) {
    if (user.role !== 'CUSTOMER' || !user.clientId) throw new ForbiddenException('Linked customer account required.');
    return user.clientId;
  }

  mine(user: User) { return this.list(user, this.ownClient(user)); }

  async list(user: User, clientId: string) {
    this.check(user, clientId);
    if (!await this.db.client.findUnique({ where: { id: clientId }, select: { id: true } }))
      throw new NotFoundException('Client not found.');
    const rows = await this.db.customerDocument.findMany({ where: { clientId }, include,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
    return requirements.map((item) => {
      const history = rows.filter((row) => row.requirementKey === item.key).map(view);
      return { ...item, status: history[0]?.status ?? 'MISSING', latest: history[0] ?? null, history };
    });
  }

  uploadMine(user: User, key: string, upload?: PrivateUpload) {
    return this.upload(user, this.ownClient(user), key, upload);
  }

  async upload(user: User, clientId: string, key: string, upload?: PrivateUpload) {
    this.check(user, clientId);
    if (!requirement(key)) throw new BadRequestException('Unknown requirement.');
    const file = this.storage.validateDocument(upload);
    const storageKey = await this.storage.saveDocument(file);
    try {
      return await this.db.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(740015)`;
        const current = await tx.user.findUnique({ where: { id: user.id } });
        if (!current?.active || (current.role === 'CUSTOMER' ? current.clientId !== clientId : !this.staff(current)))
          throw new ForbiddenException('Your access has changed.');
        if (!await tx.client.findUnique({ where: { id: clientId }, select: { id: true } }))
          throw new NotFoundException('Client not found.');
        const previous = await tx.customerDocument.findFirst({ where: { clientId, requirementKey: key },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
        if (previous && previous.status !== 'NEEDS_CLARIFICATION')
          throw new ConflictException('This requirement is already submitted. Wait for review before replacing it.');
        const stored = await tx.storedFile.create({ data: {
          storageKey, originalName: file.originalname.slice(0, 255) || 'document',
          mimeType: file.mimetype, size: file.size, uploadedById: user.id,
        } });
        const row = await tx.customerDocument.create({ data: { clientId, requirementKey: key, fileId: stored.id }, include });
        await tx.auditEntry.create({ data: { actorId: user.id, action: 'document.submitted', entity: 'document',
          recordId: row.id, before: previous ? json({ id: previous.id, clientId, status: previous.status }) : undefined,
          after: json({ clientId, ...view(row) }) } });
        await tx.changeEvent.create({ data: { entity: 'document', recordId: row.id } });
        return view(row);
      });
    } catch (error) {
      await this.storage.remove(storageKey);
      throw error;
    }
  }

  async review(user: User, id: string, input: { status: DocumentStatus; clarification?: string; version: number }) {
    if (!this.staff(user)) throw new ForbiddenException('Records access required.');
    return this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(740015)`;
      const current = await tx.user.findUnique({ where: { id: user.id } });
      if (!current?.active || !this.staff(current)) throw new ForbiddenException('Your access has changed.');
      const before = await tx.customerDocument.findUnique({ where: { id }, include });
      if (!before) throw new NotFoundException('Document not found.');
      if (before.version !== input.version) throw new ConflictException('This document changed. Refresh and review it.');
      if (before.status !== 'SUBMITTED') throw new ConflictException('Only submitted documents can be reviewed.');
      const clarification = input.status === 'NEEDS_CLARIFICATION' ? input.clarification?.trim() ?? '' : '';
      if (input.status === 'NEEDS_CLARIFICATION' && !clarification)
        throw new BadRequestException('Explain what the customer needs to correct.');
      const row = await tx.customerDocument.update({ where: { id }, data: {
        status: input.status, clarification, reviewedById: user.id, reviewedAt: new Date(), version: { increment: 1 },
      }, include });
      await tx.auditEntry.create({ data: { actorId: user.id, action: 'document.reviewed', entity: 'document', recordId: id,
        before: json({ clientId: before.clientId, ...view(before) }), after: json({ clientId: row.clientId, ...view(row) }) } });
      await tx.changeEvent.create({ data: { entity: 'document', recordId: id } });
      await notifyCustomer(tx, row.clientId, 'document', 'Document reviewed',
        input.status === 'APPROVED' ? `${requirement(row.requirementKey)?.label} was approved.` : `${requirement(row.requirementKey)?.label} needs clarification. See your documents.`);
      return view(row);
    });
  }

  async read(user: User, id: string) {
    const row = await this.db.customerDocument.findUnique({ where: { id }, include: { file: true } });
    if (!row) throw new NotFoundException('Document not found.');
    this.check(user, row.clientId);
    return { data: await this.storage.read(row.file.storageKey), mimeType: row.file.mimeType,
      originalName: row.file.originalName };
  }
}
