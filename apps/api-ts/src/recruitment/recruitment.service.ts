import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Permission, User } from '@freshphones/contracts';
import { allowed } from '../auth/access';
import { Database } from '../database';
import { Prisma } from '../generated/prisma/client';
import { PrivateStorageService, type PrivateUpload } from '../storage/private-storage.service';

const json = (value: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

@Injectable()
export class RecruitmentService {
  constructor(
    @Inject(Database) private readonly db: Database,
    @Inject(PrivateStorageService) private readonly storage: PrivateStorageService,
  ) {}

  private async write<T>(user: User, permission: Permission, run: (tx: Prisma.TransactionClient) => Promise<T>) {
    return this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(740015)`;
      const current = await tx.user.findUnique({ where: { id: user.id } });
      if (!current?.active || !allowed(current, permission)) throw new ForbiddenException('Your access has changed.');
      return run(tx);
    });
  }

  careers() {
    return this.db.jobOpening.findMany({
      where: { isOpen: true },
      select: { id: true, title: true, description: true, location: true, employmentType: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async apply(input: {
    jobId: string; fullName: string; email: string; phone: string; message: string;
  }, upload?: PrivateUpload) {
    const file = upload ? this.storage.validateDocument(upload, {
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
      maxBytes: 5 * 1024 * 1024,
      label: 'application attachment',
    }) : undefined;
    const storageKey = file ? await this.storage.saveDocument(file, {
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
      maxBytes: 5 * 1024 * 1024,
      label: 'application attachment',
    }) : undefined;
    try {
      const applicant = await this.db.$transaction(async (tx) => {
        if (!await tx.jobOpening.findFirst({ where: { id: input.jobId, isOpen: true }, select: { id: true } }))
          throw new NotFoundException('Open job not found.');
        let storedFileId: string | undefined;
        if (file && storageKey) {
          const stored = await tx.storedFile.create({ data: {
            storageKey, originalName: file.originalname.slice(0, 255) || 'application',
            mimeType: file.mimetype, size: file.size,
          } });
          storedFileId = stored.id;
        }
        const result = await tx.applicant.create({
          data: {
            ...input,
            ...(storedFileId ? { attachments: { create: { storedFileId } } } : {}),
          },
          select: { id: true },
        });
        await tx.changeEvent.create({ data: { entity: 'applicant', recordId: result.id } });
        return result;
      });
      return { detail: 'Application received. Thank you!', id: applicant.id };
    } catch (error) {
      if (storageKey) await this.storage.remove(storageKey);
      throw error;
    }
  }

  async jobs(page = 1) {
    const [items, total] = await this.db.$transaction([
      this.db.jobOpening.findMany({ include: { _count: { select: { applicants: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * 20, take: 20 }),
      this.db.jobOpening.count(),
    ]);
    return { items, total, page, pageSize: 20 };
  }

  async createJob(user: User, input: {
    title: string; description: string; location: string; employmentType: string; isOpen: boolean;
  }) {
    return this.write(user, 'RECRUITMENT_MANAGE', async (tx) => {
      const result = await tx.jobOpening.create({ data: input, include: { _count: { select: { applicants: true } } } });
      await tx.auditEntry.create({ data: {
        actorId: user.id, action: 'job.created', entity: 'job_opening', recordId: result.id, after: json(result),
      } });
      await tx.changeEvent.create({ data: { entity: 'job_opening', recordId: result.id } });
      return result;
    });
  }

  async updateJob(user: User, id: string, input: {
    title: string; description: string; location: string; employmentType: string; isOpen: boolean;
  }, version: number) {
    return this.write(user, 'RECRUITMENT_MANAGE', async (tx) => {
      const before = await tx.jobOpening.findUnique({ where: { id } });
      if (!before) throw new NotFoundException('Job opening not found.');
      const changed = await tx.jobOpening.updateMany({ where: { id, version }, data: { ...input, version: { increment: 1 } } });
      if (!changed.count) throw new ConflictException('This job opening changed. Refresh and try again.');
      const after = await tx.jobOpening.findUniqueOrThrow({ where: { id }, include: { _count: { select: { applicants: true } } } });
      await tx.auditEntry.create({ data: {
        actorId: user.id, action: 'job.updated', entity: 'job_opening', recordId: id,
        before: json(before), after: json(after),
      } });
      await tx.changeEvent.create({ data: { entity: 'job_opening', recordId: id } });
      return after;
    });
  }

  async applicants(query: { page: number; q: string; status?: string }) {
    if (query.status && !['RECEIVED', 'REVIEWING', 'SHORTLISTED', 'REJECTED', 'HIRED'].includes(query.status))
      throw new ConflictException('Invalid applicant status.');
    const where: Prisma.ApplicantWhereInput = {
      ...(query.status ? { status: query.status as Prisma.EnumApplicantStatusFilter['equals'] } : {}),
      ...(query.q ? { OR: [
        { fullName: { contains: query.q, mode: 'insensitive' } },
        { email: { contains: query.q, mode: 'insensitive' } },
        { job: { title: { contains: query.q, mode: 'insensitive' } } },
      ] } : {}),
    };
    const [items, total] = await this.db.$transaction([
      this.db.applicant.findMany({
        where,
        include: {
          job: { select: { id: true, title: true } },
          reviewer: { select: { id: true, name: true } },
          attachments: { include: { storedFile: { select: { id: true, originalName: true, mimeType: true, size: true } } } },
        },
        orderBy: { createdAt: 'desc' }, skip: (query.page - 1) * 20, take: 20,
      }),
      this.db.applicant.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: 20 };
  }

  async updateApplicant(user: User, id: string, input: {
    status?: 'RECEIVED' | 'REVIEWING' | 'SHORTLISTED' | 'REJECTED' | 'HIRED';
    reviewerNotes?: string; version: number;
  }) {
    return this.write(user, 'RECRUITMENT_MANAGE', async (tx) => {
      const before = await tx.applicant.findUnique({ where: { id } });
      if (!before) throw new NotFoundException('Applicant not found.');
      const changed = await tx.applicant.updateMany({ where: { id, version: input.version }, data: {
        ...(input.status ? { status: input.status } : {}),
        ...(input.reviewerNotes !== undefined ? { reviewerNotes: input.reviewerNotes } : {}),
        reviewerId: user.id,
        version: { increment: 1 },
      } });
      if (!changed.count) throw new ConflictException('This applicant changed. Refresh and try again.');
      const after = await tx.applicant.findUniqueOrThrow({ where: { id } });
      await tx.auditEntry.create({ data: {
        actorId: user.id, action: 'applicant.reviewed', entity: 'applicant', recordId: id,
        before: json(before), after: json(after),
      } });
      await tx.changeEvent.create({ data: { entity: 'applicant', recordId: id } });
      return after;
    });
  }

  async applicantAttachment(id: string) {
    const attachment = await this.db.applicantAttachment.findUnique({ where: { id }, include: { storedFile: true } });
    if (!attachment) throw new NotFoundException('Applicant attachment not found.');
    return {
      data: await this.storage.read(attachment.storedFile.storageKey),
      mimeType: attachment.storedFile.mimeType,
      originalName: attachment.storedFile.originalName,
    };
  }

  async agents(query: { page: number; q: string }) {
    const where: Prisma.AgentWhereInput = query.q ? { OR: [
      { name: { contains: query.q, mode: 'insensitive' } },
      { code: { contains: query.q, mode: 'insensitive' } },
    ] } : {};
    const [items, total] = await this.db.$transaction([
      this.db.agent.findMany({ where, orderBy: { name: 'asc' }, skip: (query.page - 1) * 20, take: 20 }),
      this.db.agent.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: 20 };
  }

  async createAgent(user: User, input: { fullName: string; agentCode: string; phone: string; active: boolean }) {
    return this.write(user, 'AGENT_MANAGE', async (tx) => {
      const result = await tx.agent.create({ data: { name: input.fullName, code: input.agentCode, active: input.active } });
      await tx.auditEntry.create({ data: {
        actorId: user.id, action: 'agent.created', entity: 'agent', recordId: result.id, after: json(result),
      } });
      return result;
    });
  }

  async updateAgent(user: User, id: string, input: { fullName: string; agentCode: string; phone: string; active: boolean }, version: number) {
    return this.write(user, 'AGENT_MANAGE', async (tx) => {
      const before = await tx.agent.findUnique({ where: { id } });
      if (!before) throw new NotFoundException('Agent not found.');
      const changed = await tx.agent.updateMany({ where: { id, version }, data: { name: input.fullName, code: input.agentCode, active: input.active, version: { increment: 1 } } });
      if (!changed.count) throw new ConflictException('This agent changed. Refresh and try again.');
      const after = await tx.agent.findUniqueOrThrow({ where: { id } });
      await tx.auditEntry.create({ data: {
        actorId: user.id, action: 'agent.updated', entity: 'agent', recordId: id,
        before: json(before), after: json(after),
      } });
      return after;
    });
  }

  async verifyAgent(query: string) {
    const value = query.trim();
    if (!value) return { found: false } as const;
    const agent = await this.db.agent.findFirst({
      where: { OR: [
        { code: { equals: value, mode: 'insensitive' } },
        { name: { contains: value, mode: 'insensitive' } },
      ] },
      orderBy: { name: 'asc' },
    });
    if (!agent) return { found: false } as const;
    const code = agent.code;
    const masked = code.length <= 4 ? '*'.repeat(code.length) : `${code.slice(0, 2)}${'*'.repeat(code.length - 4)}${code.slice(-2)}`;
    return { found: true, fullName: agent.name, agentCode: masked, active: agent.active } as const;
  }
}
