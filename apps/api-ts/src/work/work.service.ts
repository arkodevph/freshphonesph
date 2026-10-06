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
const taskInclude = {
  assignee: { select: { id: true, name: true, role: true } },
  creator: { select: { id: true, name: true } },
  attachments: { include: { storedFile: { select: { id: true, originalName: true, mimeType: true, size: true } } }, orderBy: { createdAt: 'asc' as const } },
  review: { include: { reviewer: { select: { id: true, name: true } } } },
} as const;

@Injectable()
export class WorkService {
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

  private scope(user: User): Prisma.TaskWhereInput {
    return allowed(user, 'TASK_ASSIGN') ? {} : { assigneeId: user.id };
  }

  staff() {
    return this.db.user.findMany({
      where: { active: true, role: { not: 'CUSTOMER' } },
      select: { id: true, name: true, role: true },
      orderBy: { name: 'asc' },
    });
  }

  async tasks(user: User, query: { page: number; q: string; status?: string }) {
    if (query.status && !['TODO', 'IN_PROGRESS', 'SUBMITTED', 'DONE'].includes(query.status))
      throw new ConflictException('Invalid task status.');
    const where: Prisma.TaskWhereInput = {
      ...this.scope(user),
      ...(query.status ? { status: query.status as Prisma.EnumTaskStatusFilter['equals'] } : {}),
      ...(query.q ? { OR: [
        { title: { contains: query.q, mode: 'insensitive' } },
        { assignee: { name: { contains: query.q, mode: 'insensitive' } } },
      ] } : {}),
    };
    const [items, total] = await this.db.$transaction([
      this.db.task.findMany({ where, include: taskInclude, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (query.page - 1) * 20, take: 20 }),
      this.db.task.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: 20 };
  }

  async create(user: User, input: {
    title: string; instructions: string; assigneeId: string; priority: 'LOW' | 'MEDIUM' | 'HIGH'; deadline: string;
  }) {
    return this.write(user, 'TASK_ASSIGN', async (tx) => {
      const assignee = await tx.user.findFirst({ where: { id: input.assigneeId, active: true, role: { not: 'CUSTOMER' } } });
      if (!assignee) throw new NotFoundException('Active staff assignee not found.');
      const task = await tx.task.create({
        data: { ...input, deadline: new Date(input.deadline), creatorId: user.id },
        include: taskInclude,
      });
      await tx.auditEntry.create({ data: {
        actorId: user.id, action: 'task.created', entity: 'task', recordId: task.id, after: json(task),
      } });
      await tx.changeEvent.create({ data: { entity: 'task', recordId: task.id } });
      await this.notifications.enqueue(tx, {
        recipientId: task.assigneeId,
        eventKey: 'task.assigned',
        dedupeKey: `task:${task.id}:assigned`,
        variables: { title: task.title, deadline: task.deadline.toLocaleString('en-PH') },
        link: '/system/tasks',
      });
      return task;
    });
  }

  async progress(user: User, id: string, status: 'TODO' | 'IN_PROGRESS', version: number) {
    return this.write(user, 'TASK_SUBMIT', async (tx) => {
      const before = await tx.task.findFirst({ where: { id, ...this.scope(user) } });
      if (!before) throw new NotFoundException('Task not found.');
      if (['SUBMITTED', 'DONE'].includes(before.status)) throw new ConflictException('Submitted tasks cannot return to progress.');
      const changed = await tx.task.updateMany({ where: { id, version, assigneeId: user.id }, data: { status, version: { increment: 1 } } });
      if (!changed.count) throw new ConflictException('This task changed. Refresh and try again.');
      const after = await tx.task.findUniqueOrThrow({ where: { id }, include: taskInclude });
      await tx.auditEntry.create({ data: {
        actorId: user.id, action: 'task.progress_updated', entity: 'task', recordId: id,
        before: json(before), after: json(after),
      } });
      await tx.changeEvent.create({ data: { entity: 'task', recordId: id } });
      return after;
    });
  }

  async submit(user: User, id: string, version: number) {
    return this.write(user, 'TASK_SUBMIT', async (tx) => {
      const before = await tx.task.findUnique({ where: { id } });
      if (!before || before.assigneeId !== user.id) throw new NotFoundException('Task not found.');
      if (['SUBMITTED', 'DONE'].includes(before.status)) throw new ConflictException('This task was already submitted.');
      const submittedAt = new Date();
      const changed = await tx.task.updateMany({ where: { id, version, assigneeId: user.id }, data: {
        status: 'SUBMITTED', submittedAt: submittedAt,
        lateFlag: submittedAt > before.deadline, version: { increment: 1 },
      } });
      if (!changed.count) throw new ConflictException('This task changed. Refresh and try again.');
      const after = await tx.task.findUniqueOrThrow({ where: { id }, include: taskInclude });
      await tx.auditEntry.create({ data: {
        actorId: user.id, action: 'task.submitted', entity: 'task', recordId: id,
        before: json(before), after: json(after),
      } });
      await tx.changeEvent.create({ data: { entity: 'task', recordId: id } });
      return after;
    });
  }

  async attach(user: User, id: string, upload?: PrivateUpload) {
    const file = this.storage.validateDocument(upload, {
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
      maxBytes: 10 * 1024 * 1024,
      label: 'task attachment',
    });
    const storageKey = await this.storage.saveDocument(file, {
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
      maxBytes: 10 * 1024 * 1024,
      label: 'task attachment',
    });
    try {
      return await this.write(user, 'TASK_SUBMIT', async (tx) => {
        const task = await tx.task.findUnique({ where: { id } });
        if (!task || (task.assigneeId !== user.id && !allowed(user, 'TASK_ASSIGN')))
          throw new NotFoundException('Task not found.');
        if (task.status === 'DONE') throw new ConflictException('Completed tasks cannot receive attachments.');
        const stored = await tx.storedFile.create({ data: {
          storageKey, originalName: file.originalname.slice(0, 255) || 'attachment',
          mimeType: file.mimetype, size: file.size, uploadedById: user.id,
        } });
        const attachment = await tx.taskAttachment.create({ data: { taskId: id, storedFileId: stored.id } });
        await tx.auditEntry.create({ data: {
          actorId: user.id, action: 'task.attachment_added', entity: 'task', recordId: id,
          after: json({ attachmentId: attachment.id, mimeType: stored.mimeType, size: stored.size }),
        } });
        await tx.changeEvent.create({ data: { entity: 'task', recordId: id } });
        return tx.task.findUniqueOrThrow({ where: { id }, include: taskInclude });
      });
    } catch (error) {
      await this.storage.remove(storageKey);
      throw error;
    }
  }

  async attachment(user: User, id: string) {
    const attachment = await this.db.taskAttachment.findUnique({
      where: { id }, include: { task: true, storedFile: true },
    });
    if (!attachment || (attachment.task.assigneeId !== user.id && !allowed(user, 'TASK_ASSIGN') && !allowed(user, 'KPI_REVIEW')))
      throw new NotFoundException('Task attachment not found.');
    return {
      data: await this.storage.read(attachment.storedFile.storageKey),
      mimeType: attachment.storedFile.mimeType,
      originalName: attachment.storedFile.originalName,
    };
  }

  kpiQueue() {
    return this.db.task.findMany({
      where: { status: 'SUBMITTED', lateFlag: true, review: null },
      include: taskInclude,
      orderBy: { submittedAt: 'asc' },
    });
  }

  async review(user: User, input: {
    taskId: string; evaluation: string; recommendation: string;
    decision: 'PENDING' | 'NOTED' | 'ACTION_RECOMMENDED';
  }) {
    return this.write(user, 'KPI_REVIEW', async (tx) => {
      const task = await tx.task.findUnique({ where: { id: input.taskId } });
      if (!task) throw new NotFoundException('Task not found.');
      const evidence = task.submittedAt
        ? `Submitted ${task.submittedAt.toISOString()} vs deadline ${task.deadline.toISOString()} (${task.lateFlag ? 'LATE' : 'ON TIME'}).`
        : 'Not yet submitted.';
      const review = await tx.kpiReview.create({ data: {
        ...input, reviewerId: user.id, factualEvidence: evidence,
      } });
      await tx.auditEntry.create({ data: {
        actorId: user.id, action: 'kpi_review.created', entity: 'kpi_review', recordId: review.id,
        after: json(review),
      } });
      await tx.changeEvent.create({ data: { entity: 'task', recordId: task.id } });
      return review;
    });
  }
}
