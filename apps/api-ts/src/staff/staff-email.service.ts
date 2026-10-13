import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { staffEmailKinds, type StaffEmailDelivery, type StaffEmailKind, type StaffEmailSettings, type User } from '@freshphones/contracts';
import type { z } from 'zod';
import type { staffEmailQuerySchema, staffEmailTemplateSchema, staffEmailTimingSchema } from '@freshphones/contracts';
import { allowed } from '../auth/access';
import { CONFIG, type Config } from '../config';
import { Database } from '../database';
import { Prisma, type StaffEmail } from '../generated/prisma/client';
import { renderCustomerEmail } from '../portal/notification-settings.service';
import { defaultStaffBody, defaultStaffSubject, hasResultEmailAccess, queueTaskEmail, staffEmailWindowMs, staffTemplate, taskEmailStage } from './email-queue';
import { supportAlertIsVisible } from './support-alerts';
import { accountAlertIsVisible } from './account-alerts';

const timingAuditId = '7617ca2f-0f72-40c3-b32e-28152d60e400';
const templateAuditId = (kind: StaffEmailKind) => `7617ca2f-0f72-40c3-b32e-28152d60e${401 + staffEmailKinds.indexOf(kind)}`;
type SendEmail = (id: string, to: string, subject: string, text: string, sender: string, attemptId?: string) => Promise<void>;

@Injectable()
export class StaffEmailService {
  constructor(@Inject(Database) private readonly db: Database, @Inject(CONFIG) private readonly config: Config) {}

  private async owner<T>(user: User, run: (tx: Prisma.TransactionClient) => Promise<T>) {
    return this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(740015)`;
      const current = await tx.user.findUnique({ where: { id: user.id } });
      if (!current?.active || !allowed(current, 'ACCOUNT_MANAGE')) throw new ForbiddenException('Owner access is required.');
      return run(tx);
    });
  }
  async settings(user: User): Promise<StaffEmailSettings> {
    return this.owner(user, async (tx) => {
      const [templates, timing] = await Promise.all([tx.staffEmailTemplate.findMany(), tx.staffNotificationConfig.findUnique({ where: { key: 'staff' } })]);
      return { dueSoonHours: timing?.dueSoonHours ?? 24, overdueHours: timing?.overdueHours ?? 0, timingVersion: timing?.version ?? 0,
        deliveryMode: this.config.NODE_ENV === 'production' ? 'provider' : 'local',
        templates: staffEmailKinds.map((kind) => {
          const row = templates.find((item) => item.kind === kind);
          return { kind, enabled: row?.enabled ?? true, subject: row?.subject ?? defaultStaffSubject, body: row?.body ?? defaultStaffBody, version: row?.version ?? 0 };
        }),
      };
    });
  }
  async updateTemplate(user: User, kind: StaffEmailKind, input: z.infer<typeof staffEmailTemplateSchema>) {
    return this.owner(user, async (tx) => {
      const before = await tx.staffEmailTemplate.findUnique({ where: { kind } });
      if ((before?.version ?? 0) !== input.version) throw new ConflictException('Staff template changed. Refresh and review the latest wording.');
      const data = { enabled: input.enabled, subject: input.subject, body: input.body };
      const after = before ? await tx.staffEmailTemplate.update({ where: { kind }, data: { ...data, version: { increment: 1 } } })
        : await tx.staffEmailTemplate.create({ data: { kind, ...data } });
      await tx.auditEntry.create({ data: { actorId: user.id, action: 'staff_email_template.updated', entity: 'staff_email_template', recordId: templateAuditId(kind),
        before: before ? { enabled: before.enabled, subject: before.subject, body: before.body, version: before.version } : Prisma.JsonNull,
        after: { ...data, version: after.version } } });
      return { kind, ...data, version: after.version };
    });
  }
  async updateTiming(user: User, input: z.infer<typeof staffEmailTimingSchema>) {
    return this.owner(user, async (tx) => {
      const before = await tx.staffNotificationConfig.findUnique({ where: { key: 'staff' } });
      if ((before?.version ?? 0) !== input.version) throw new ConflictException('Staff reminder timing changed. Refresh and review the latest values.');
      const data = { dueSoonHours: input.dueSoonHours, overdueHours: input.overdueHours };
      const after = before ? await tx.staffNotificationConfig.update({ where: { key: 'staff' }, data: { ...data, version: { increment: 1 } } })
        : await tx.staffNotificationConfig.create({ data: { key: 'staff', ...data } });
      await tx.auditEntry.create({ data: { actorId: user.id, action: 'staff_email_timing.updated', entity: 'staff_notification_config', recordId: timingAuditId,
        before: before ? { dueSoonHours: before.dueSoonHours, overdueHours: before.overdueHours, version: before.version } : Prisma.JsonNull,
        after: { ...data, version: after.version } } });
      return { ...data, version: after.version };
    });
  }

  /** One reminder per recipient, task, captured deadline and stage, across API replicas. */
  async queueReminders(now = new Date()) {
    let cursor: string | undefined;
    for (;;) {
      const timing = await this.db.staffNotificationConfig.findUnique({ where: { key: 'staff' } });
      const rows = await this.db.task.findMany({ where: { status: { in: ['TODO', 'IN_PROGRESS'] },
        deadline: { lte: new Date(now.getTime() + (timing?.dueSoonHours ?? 24) * 3_600_000) } },
        select: { id: true }, orderBy: { id: 'asc' }, take: 100, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) });
      for (const candidate of rows) {
        await this.db.$transaction(async (tx) => {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(740015)`;
          const task = await tx.task.findUnique({ where: { id: candidate.id } });
          if (!task || !['TODO', 'IN_PROGRESS'].includes(task.status)) return;
          const currentTiming = await tx.staffNotificationConfig.findUnique({ where: { key: 'staff' } });
          const kind = taskEmailStage(task.deadline, now, currentTiming?.dueSoonHours ?? 24, currentTiming?.overdueHours ?? 0);
          if (kind) await queueTaskEmail(tx, task, kind);
        });
      }
      if (rows.length < 100) break;
      cursor = rows.at(-1)!.id;
    }
  }

  async eligibility(tx: Prisma.TransactionClient, row: StaffEmail, now: Date, allowFutureReminder = false): Promise<string | null> {
    const user = await tx.user.findUnique({ where: { id: row.userId } });
    if (!user?.active || user.role === 'CUSTOMER') return 'Recipient no longer has active staff access.';
    if (user.email !== row.recipientEmail) return 'Recipient email changed; review the current account.';
    if (row.accountAlertId) {
      if (!allowed(user, 'ACCOUNT_MANAGE')) return 'Recipient no longer has Owner account access.';
      return await accountAlertIsVisible(tx, user.id, row.accountAlertId) ? null : 'Account event is no longer available to this recipient.';
    }
    if (row.supportAlertId) {
      if (!allowed(user, 'SUPPORT_MANAGE')) return 'Recipient no longer has Customer Service access.';
      return await supportAlertIsVisible(tx, user.id, row.supportAlertId) ? null : 'Support case was reassigned, finished or already answered.';
    }
    if (row.taskId) {
      const task = await tx.task.findUnique({ where: { id: row.taskId } });
      if (!task || task.assigneeId !== user.id || !['TODO', 'IN_PROGRESS'].includes(task.status) || task.deadline.getTime() !== row.deadline?.getTime())
        return 'Task was submitted, completed, reassigned or rescheduled.';
      if (row.kind !== 'TASK_ASSIGNED') {
        const timing = await tx.staffNotificationConfig.findUnique({ where: { key: 'staff' } });
        const availableAt = task.deadline.getTime() + (row.kind === 'TASK_DUE_SOON' ? -(timing?.dueSoonHours ?? 24) : (timing?.overdueHours ?? 0)) * 3_600_000;
        if (!(allowFutureReminder && now.getTime() <= availableAt) && taskEmailStage(task.deadline, now, timing?.dueSoonHours ?? 24, timing?.overdueHours ?? 0) !== row.kind)
          return 'Task reminder no longer matches the current deadline stage.';
      }
    } else if (row.kind === 'FINANCE_PENDING') {
      if (!allowed(user, 'PAYMENT_VERIFY')) return 'Recipient no longer has Finance review access.';
      const payment = await tx.payment.findUnique({ where: { id: row.paymentId! } });
      if (!payment || payment.status !== 'PENDING' || payment.version !== row.paymentVersion) return 'Payment was reviewed or updated.';
    } else {
      if (!hasResultEmailAccess(user)) return 'Recipient no longer has payment recording and reading access.';
      const result = await tx.paymentResultAlert.findUnique({ where: { id: row.resultId! } });
      if (!result || result.userId !== user.id || result.paymentId !== row.paymentId || result.paymentVersion !== row.paymentVersion)
        return 'Saved Finance result is no longer available to this recipient.';
    }
    return null;
  }

  /** Claim with a lease and a fencing token; retries retain the exact provider payload. */
  async deliver(send: SendEmail, onlyId?: string) {
    const now = new Date();
    const due = await this.db.staffEmail.findMany({ where: { ...(onlyId ? { id: onlyId } : {}), status: { in: ['PENDING', 'SENDING'] }, nextAt: { lte: now } },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: 20, select: { id: true } });
    for (const candidate of due) {
      const row = await this.db.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(740015)`;
        const current = await tx.staffEmail.findUnique({ where: { id: candidate.id } });
        const claimedAt = new Date();
        if (!current || !['PENDING', 'SENDING'].includes(current.status) || current.nextAt > claimedAt) return null;
        const reason = await this.eligibility(tx, current, claimedAt, true);
        if (reason || claimedAt.getTime() - current.createdAt.getTime() >= staffEmailWindowMs || current.attempts >= 5) {
          await tx.staffEmail.update({ where: { id: current.id }, data: { status: reason ? 'SKIPPED' : 'FAILED', attemptId: null,
            error: reason ?? (current.attempts >= 5 ? 'Maximum delivery attempts reached.' : 'Delivery window expired; review the in-app alert.'), version: { increment: 1 } } });
          return null;
        }
        if (current.kind === 'TASK_DUE_SOON' || current.kind === 'TASK_OVERDUE') {
          const timing = await tx.staffNotificationConfig.findUnique({ where: { key: 'staff' } });
          const availableAt = current.deadline!.getTime() + (current.kind === 'TASK_DUE_SOON' ? -(timing?.dueSoonHours ?? 24) : (timing?.overdueHours ?? 0)) * 3_600_000 + (current.kind === 'TASK_OVERDUE' ? 1 : 0);
          if (availableAt > claimedAt.getTime()) {
            await tx.staffEmail.update({ where: { id: current.id }, data: { nextAt: new Date(availableAt), version: { increment: 1 } } });
            return null;
          }
        }
        if (!(await staffTemplate(tx, current.kind)).enabled) {
          // Paused items do not consume attempts or block the first page of the queue.
          await tx.staffEmail.update({ where: { id: current.id }, data: { nextAt: new Date(claimedAt.getTime() + 60_000), version: { increment: 1 } } });
          return null;
        }
        const rendered = renderCustomerEmail({ subject: current.subjectTemplate, body: current.bodyTemplate }, {
          title: current.title, message: current.message, url: `${this.config.WEB_ORIGIN}${current.targetPath}`,
        });
        return tx.staffEmail.update({ where: { id: current.id }, data: { status: 'SENDING', attemptId: randomUUID(),
          attempts: { increment: 1 }, totalAttempts: { increment: 1 }, nextAt: new Date(claimedAt.getTime() + 120_000), version: { increment: 1 },
          renderedSubject: current.renderedSubject ?? rendered.subject, renderedBody: current.renderedBody ?? rendered.text,
          sender: current.sender ?? this.config.EMAIL_FROM,
        } });
      });
      if (!row) continue;
      try {
        await send(row.id, row.recipientEmail, row.renderedSubject!, row.renderedBody!, row.sender!, row.attemptId!);
        await this.db.staffEmail.updateMany({ where: { id: row.id, status: 'SENDING', attemptId: row.attemptId },
          data: { status: 'SENT', sentAt: new Date(), error: null, attemptId: null, version: { increment: 1 } } });
      } catch {
        await this.db.staffEmail.updateMany({ where: { id: row.id, status: 'SENDING', attemptId: row.attemptId }, data: {
          status: row.attempts >= 5 ? 'FAILED' : 'PENDING', attemptId: null, version: { increment: 1 },
          nextAt: new Date(Date.now() + Math.min(60, 2 ** row.attempts) * 60_000), error: 'Delivery failed; check the email provider or retry.',
        } });
        console.error('Staff notification email delivery failed.');
      }
    }
  }

  async deliveries(user: User, query: z.infer<typeof staffEmailQuerySchema>) {
    return this.owner(user, async (tx) => {
      const where: Prisma.StaffEmailWhereInput = { ...(query.status ? { status: query.status } : {}), ...(query.kind ? { kind: query.kind } : {}) };
      const [rows, total] = await Promise.all([tx.staffEmail.findMany({ where, include: { user: { select: { name: true } } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (query.page - 1) * 20, take: 20 }), tx.staffEmail.count({ where })]);
      const items: StaffEmailDelivery[] = [];
      for (const row of rows) items.push({ id: row.id, kind: row.kind, status: row.status,
        recipient: { name: row.user.name, email: row.recipientEmail }, attempts: row.attempts, totalAttempts: row.totalAttempts,
        createdAt: row.createdAt.toISOString(), nextAt: row.nextAt.toISOString(), sentAt: row.sentAt?.toISOString() ?? null,
        error: row.error, version: row.version, canRetry: row.status === 'FAILED' && Date.now() - row.createdAt.getTime() < staffEmailWindowMs &&
          (await staffTemplate(tx, row.kind)).enabled && !await this.eligibility(tx, row, new Date()),
      });
      return { items, total, page: query.page, pageSize: 20 };
    });
  }
  async retry(user: User, id: string, version: number) {
    return this.owner(user, async (tx) => {
      const row = await tx.staffEmail.findUnique({ where: { id } });
      if (!row) throw new NotFoundException('Staff email delivery not found.');
      if (row.version !== version) throw new ConflictException('Delivery changed. Refresh its status before retrying.');
      if (row.status !== 'FAILED') throw new ConflictException('Only failed staff emails can be retried.');
      if (Date.now() - row.createdAt.getTime() >= staffEmailWindowMs) throw new ConflictException('Delivery window expired. Review the in-app alert instead.');
      if (!(await staffTemplate(tx, row.kind)).enabled) throw new ConflictException('This staff email type is paused.');
      const reason = await this.eligibility(tx, row, new Date());
      if (reason) throw new ConflictException(reason);
      const after = await tx.staffEmail.update({ where: { id }, data: { status: 'PENDING', attempts: 0, nextAt: new Date(),
        error: null, attemptId: null, version: { increment: 1 } } });
      await tx.auditEntry.create({ data: { actorId: user.id, action: 'staff_email.retried', entity: 'staff_email', recordId: id,
        before: { status: row.status, attempts: row.attempts, totalAttempts: row.totalAttempts, version: row.version },
        after: { status: after.status, attempts: after.attempts, totalAttempts: after.totalAttempts, version: after.version } } });
      return { id, status: after.status, version: after.version };
    });
  }
}
