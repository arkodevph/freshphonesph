import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { User } from '@freshphones/contracts';
import { allowed } from '../auth/access';
import { Database } from '../database';
import { Prisma, type KpiDecision, type TaskPriority } from '../generated/prisma/client';
import { PrivateStorageService, type PrivateUpload } from '../storage/private-storage.service';

const taskInclude = {
  assignee: { select: { id: true, name: true, role: true } },
  creator: { select: { id: true, name: true } },
  attachment: { select: { id: true, originalName: true, mimeType: true, size: true } },
  review: { include: { reviewer: { select: { name: true } } } },
} as const;
type TaskRow = Prisma.TaskGetPayload<{ include: typeof taskInclude }>;
const json = (value: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const pageSize = 20;

function view(row: TaskRow, showReview: boolean) {
  return {
    id: row.id, title: row.title, instructions: row.instructions,
    assigneeId: row.assigneeId, assigneeName: row.assignee.name,
    creatorId: row.creatorId, creatorName: row.creator.name,
    priority: row.priority, deadline: row.deadline.toISOString(), status: row.status,
    report: row.report, submittedAt: row.submittedAt?.toISOString() ?? null, lateFlag: row.lateFlag,
    attachment: row.attachment ? { id: row.attachment.id, fileName: row.attachment.originalName,
      mimeType: row.attachment.mimeType, size: row.attachment.size } : null,
    reviewed: Boolean(row.review),
    review: showReview && row.review ? {
      id: row.review.id, reviewerName: row.review.reviewer.name,
      factualEvidence: row.review.factualEvidence, evaluation: row.review.evaluation,
      recommendation: row.review.recommendation, decision: row.review.decision,
      createdAt: row.review.createdAt.toISOString(),
    } : null,
    version: row.version, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class TasksService {
  constructor(@Inject(Database) private readonly db: Database,
    @Inject(PrivateStorageService) private readonly storage: PrivateStorageService) {}

  private staff(user: User) {
    if (user.role === 'CUSTOMER') throw new ForbiddenException('Staff access required.');
  }
  private visible(user: User, task: { assigneeId: string }) {
    this.staff(user);
    if (allowed(user, 'TASK_ASSIGN') || task.assigneeId === user.id) return;
    throw new NotFoundException('Task not found.');
  }
  private async write<T>(user: User, run: (tx: Prisma.TransactionClient, current: { id: string; role: User['role']; active: boolean }) => Promise<T>) {
    return this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(740015)`;
      const current = await tx.user.findUnique({ where: { id: user.id }, select: { id: true, role: true, active: true } });
      if (!current?.active || current.role === 'CUSTOMER') throw new ForbiddenException('Staff access required.');
      return run(tx, current);
    });
  }
  private async record(tx: Prisma.TransactionClient, actorId: string, taskId: string, action: string, before: unknown, after: unknown) {
    await tx.auditEntry.create({ data: { actorId, action, entity: 'task', recordId: taskId,
      before: before === null ? Prisma.JsonNull : json(before), after: json(after) } });
    await tx.changeEvent.create({ data: { entity: 'task', recordId: taskId } });
  }

  async assignees(user: User) {
    if (!allowed(user, 'TASK_ASSIGN')) throw new ForbiddenException('Task assignment access required.');
    return this.db.user.findMany({ where: { active: true, role: { not: 'CUSTOMER' } },
      select: { id: true, name: true, role: true }, orderBy: [{ name: 'asc' }, { id: 'asc' }] });
  }
  async list(user: User, query: { page: number; status?: 'TODO' | 'IN_PROGRESS' | 'SUBMITTED' | 'DONE' }) {
    this.staff(user);
    const where: Prisma.TaskWhereInput = {
      ...(allowed(user, 'TASK_ASSIGN') ? {} : { assigneeId: user.id }),
      ...(query.status ? { status: query.status } : {}),
    };
    const [rows, count] = await this.db.$transaction([
      this.db.task.findMany({ where, include: taskInclude, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * pageSize, take: pageSize }),
      this.db.task.count({ where }),
    ]);
    return { results: rows.map((row) => view(row, allowed(user, 'KPI_REVIEW'))), count,
      page: query.page, pageSize };
  }
  async detail(user: User, id: string) {
    const row = await this.db.task.findUnique({ where: { id }, include: taskInclude });
    if (!row) throw new NotFoundException('Task not found.');
    this.visible(user, row);
    return view(row, allowed(user, 'KPI_REVIEW'));
  }
  async create(user: User, input: { title: string; instructions: string; assigneeId: string; priority: TaskPriority; deadline: string }) {
    if (!allowed(user, 'TASK_ASSIGN')) throw new ForbiddenException('Task assignment access required.');
    const deadline = new Date(input.deadline);
    if (deadline.getTime() <= Date.now()) throw new BadRequestException('Choose a future deadline.');
    return this.write(user, async (tx, current) => {
      if (!allowed(current, 'TASK_ASSIGN')) throw new ForbiddenException('Your task access has changed.');
      const assignee = await tx.user.findUnique({ where: { id: input.assigneeId }, select: { active: true, role: true } });
      if (!assignee?.active || assignee.role === 'CUSTOMER') throw new BadRequestException('Choose an active staff assignee.');
      const row = await tx.task.create({ data: { title: input.title, instructions: input.instructions,
        assigneeId: input.assigneeId, creatorId: user.id, priority: input.priority, deadline }, include: taskInclude });
      await this.record(tx, user.id, row.id, 'task.assigned', null,
        { title: row.title, assigneeId: row.assigneeId, deadline: row.deadline.toISOString(), priority: row.priority });
      return view(row, allowed(current, 'KPI_REVIEW'));
    });
  }
  async start(user: User, id: string, version: number) {
    return this.write(user, async (tx, current) => {
      const before = await tx.task.findUnique({ where: { id } });
      if (!before || before.assigneeId !== user.id) throw new NotFoundException('Task not found.');
      if (before.version !== version) throw new ConflictException('Task changed. Refresh and try again.');
      if (before.status !== 'TODO') throw new ConflictException('Only a new task can be started.');
      const row = await tx.task.update({ where: { id }, data: { status: 'IN_PROGRESS', version: { increment: 1 } }, include: taskInclude });
      await this.record(tx, user.id, id, 'task.started', { status: before.status }, { status: row.status });
      return view(row, allowed(current, 'KPI_REVIEW'));
    });
  }
  async submit(user: User, id: string, version: number, report: string, upload?: PrivateUpload) {
    this.staff(user);
    if (!report && !upload) throw new BadRequestException('Add a report or an attachment before submitting.');
    const file = upload ? this.storage.validateDocument(upload) : undefined;
    const storageKey = file ? await this.storage.saveDocument(file) : undefined;
    try {
      return await this.write(user, async (tx, current) => {
        const before = await tx.task.findUnique({ where: { id } });
        if (!before || before.assigneeId !== user.id) throw new NotFoundException('Task not found.');
        if (before.version !== version) throw new ConflictException('Task changed. Refresh and try again.');
        if (before.status !== 'TODO' && before.status !== 'IN_PROGRESS') throw new ConflictException('Task was already submitted.');
        const submittedAt = new Date();
        const stored = file && storageKey ? await tx.storedFile.create({ data: { storageKey,
          originalName: Array.from(file.originalname).slice(0, 255).join('') || 'task-evidence', mimeType: file.mimetype,
          size: file.size, uploadedById: user.id } }) : null;
        const row = await tx.task.update({ where: { id }, data: { status: 'SUBMITTED', report,
          submittedAt, lateFlag: submittedAt.getTime() > before.deadline.getTime(),
          ...(stored ? { attachmentFileId: stored.id } : {}), version: { increment: 1 } }, include: taskInclude });
        await this.record(tx, user.id, id, 'task.submitted', { status: before.status },
          { status: row.status, submittedAt: row.submittedAt?.toISOString(), lateFlag: row.lateFlag,
            hasReport: Boolean(report), attachmentFileId: row.attachmentFileId });
        return view(row, allowed(current, 'KPI_REVIEW'));
      });
    } catch (error) {
      if (storageKey) await this.storage.remove(storageKey);
      throw error;
    }
  }
  async complete(user: User, id: string, version: number) {
    if (!allowed(user, 'TASK_ASSIGN')) throw new ForbiddenException('Task assignment access required.');
    return this.write(user, async (tx, current) => {
      if (!allowed(current, 'TASK_ASSIGN')) throw new ForbiddenException('Your task access has changed.');
      const before = await tx.task.findUnique({ where: { id }, include: { review: { select: { id: true } } } });
      if (!before) throw new NotFoundException('Task not found.');
      if (before.version !== version) throw new ConflictException('Task changed. Refresh and try again.');
      if (before.status !== 'SUBMITTED') throw new ConflictException('Only submitted tasks can be completed.');
      if (before.lateFlag && !before.review) throw new ConflictException('A late submission needs a human KPI review first.');
      const row = await tx.task.update({ where: { id }, data: { status: 'DONE', version: { increment: 1 } }, include: taskInclude });
      await this.record(tx, user.id, id, 'task.completed', { status: before.status }, { status: row.status });
      return view(row, allowed(current, 'KPI_REVIEW'));
    });
  }
  async attachment(user: User, id: string) {
    this.staff(user);
    const row = await this.db.task.findUnique({ where: { id }, include: { attachment: true } });
    if (!row?.attachment || !(row.assigneeId === user.id || allowed(user, 'TASK_ASSIGN') || allowed(user, 'KPI_REVIEW')))
      throw new NotFoundException('Task attachment not found.');
    return { data: await this.storage.read(row.attachment.storageKey), mimeType: row.attachment.mimeType,
      originalName: row.attachment.originalName };
  }
  async kpiQueue(user: User, page: number) {
    if (!allowed(user, 'KPI_REVIEW')) throw new ForbiddenException('KPI review access required.');
    const where: Prisma.TaskWhereInput = { status: 'SUBMITTED', lateFlag: true, review: { is: null } };
    const [rows, count] = await this.db.$transaction([
      this.db.task.findMany({ where, include: taskInclude, orderBy: [{ submittedAt: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize, take: pageSize }),
      this.db.task.count({ where }),
    ]);
    return { results: rows.map((row) => view(row, true)), count, page, pageSize };
  }
  async kpiReviews(user: User, page: number) {
    if (!allowed(user, 'KPI_REVIEW')) throw new ForbiddenException('KPI review access required.');
    const [rows, count] = await this.db.$transaction([
      this.db.kpiReview.findMany({ include: { task: { select: { title: true, assignee: { select: { name: true } } } },
        reviewer: { select: { name: true } } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize, take: pageSize }),
      this.db.kpiReview.count(),
    ]);
    return { results: rows.map((row) => ({ id: row.id, taskId: row.taskId, taskTitle: row.task.title,
      assigneeName: row.task.assignee.name, reviewerName: row.reviewer.name,
      factualEvidence: row.factualEvidence, evaluation: row.evaluation, recommendation: row.recommendation,
      decision: row.decision, createdAt: row.createdAt.toISOString() })), count, page, pageSize };
  }
  async review(user: User, input: { taskId: string; version: number; evaluation: string; recommendation: string; decision: KpiDecision }) {
    if (!allowed(user, 'KPI_REVIEW')) throw new ForbiddenException('KPI review access required.');
    return this.write(user, async (tx, current) => {
      if (!allowed(current, 'KPI_REVIEW')) throw new ForbiddenException('Your KPI access has changed.');
      const task = await tx.task.findUnique({ where: { id: input.taskId }, include: { review: { select: { id: true } } } });
      if (!task) throw new NotFoundException('Task not found.');
      if (task.version !== input.version) throw new ConflictException('Task changed. Refresh and review it.');
      if (task.status !== 'SUBMITTED' || task.review) throw new ConflictException('Only an unreviewed submission can be reviewed.');
      const evidence = `Submitted ${task.submittedAt!.toISOString()} vs deadline ${task.deadline.toISOString()} (${task.lateFlag ? 'LATE' : 'on time'}).`;
      const review = await tx.kpiReview.create({ data: { taskId: task.id, reviewerId: user.id,
        factualEvidence: evidence, evaluation: input.evaluation, recommendation: input.recommendation,
        decision: input.decision } });
      await tx.task.update({ where: { id: task.id }, data: { version: { increment: 1 } } });
      await this.record(tx, user.id, task.id, 'kpi.reviewed', { reviewed: false },
        { reviewed: true, reviewId: review.id, decision: review.decision, reviewerId: user.id });
      return { id: review.id, taskId: task.id, decision: review.decision, factualEvidence: evidence,
        evaluation: review.evaluation, recommendation: review.recommendation, createdAt: review.createdAt.toISOString() };
    });
  }
}
