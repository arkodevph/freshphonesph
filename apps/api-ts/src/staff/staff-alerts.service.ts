import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { AccountAlertKind, PaymentResultDetail, PaymentResultKind, StaffAlert, StaffAlertPage, StaffAlertReadInput, StaffAlertScope, SupportAlertKind, TaskAlertKind, User } from '@freshphones/contracts';
import { allowed } from '../auth/access';
import { Database } from '../database';
import { Prisma } from '../generated/prisma/client';
import { FinanceAlertsService } from '../finance/finance-alerts.service';
import { alertScopeSql, financeAlertRows, markFinanceAlertsRead, paymentResultRows, taskAlertKind, taskAlertRows, taskStageSql, utcTimestamp } from './alert-queries';
import { canReadPaymentResults } from './payment-results';
import { supportAlertIsVisible, supportAlertRows, supportAlertTitles } from './support-alerts';
import { accountAlertIsVisible, accountAlertRows, accountAlertTitles } from './account-alerts';

type AlertRow = { id: string; paymentId: string | null; caseId: string | null; accountId: string | null; entity: 'task' | 'payment' | 'payment-result' | 'support' | 'account'; kind: AccountAlertKind | TaskAlertKind | PaymentResultKind | SupportAlertKind | 'FINANCE_PENDING'; version: number;
  amount: string | null; clientName: string | null; batchCode: string | null; taskTitle: string | null;
  deadline: Date | null; readAt: Date | null; occurredAt: Date };
const pageSize = 20;
const titles: Record<TaskAlertKind, string> = { TASK_ASSIGNED: 'Task assigned to you', TASK_DUE_SOON: 'Task due within 24 hours', TASK_OVERDUE: 'Task overdue' };
const resultTitles: Record<PaymentResultKind, string> = { PAYMENT_VERIFIED: 'Payment verified by Finance',
  PAYMENT_REJECTED: 'Payment rejected by Finance', PAYMENT_CLARIFICATION: 'Finance needs payment clarification' };

@Injectable()
export class StaffAlertsService {
  constructor(@Inject(Database) private readonly db: Database,
    @Inject(FinanceAlertsService) private readonly finance: FinanceAlertsService) {}

  private access(user: Pick<User, 'role'>, scope: StaffAlertScope = 'all') {
    if (user.role === 'CUSTOMER') throw new ForbiddenException('Staff access required.');
    if (scope === 'finance' && !allowed(user, 'PAYMENT_VERIFY')) throw new ForbiddenException('Finance verification access required.');
    if (scope === 'results' && !canReadPaymentResults(user)) throw new ForbiddenException('Payment recording and read access required.');
    if (scope === 'support' && !allowed(user, 'SUPPORT_MANAGE')) throw new ForbiddenException('Customer Service access required.');
    if (scope === 'accounts' && !allowed(user, 'ACCOUNT_MANAGE')) throw new ForbiddenException('Owner account access required.');
  }
  async list(user: User, query: { page: number; unreadOnly: boolean; scope: StaffAlertScope }): Promise<StaffAlertPage> {
    this.access(user, query.scope);
    const now = new Date();
    let source = taskAlertRows(user.id, now);
    if (allowed(user, 'PAYMENT_VERIFY')) source = Prisma.sql`${source} UNION ALL ${financeAlertRows(user.id)}`;
    if (canReadPaymentResults(user)) source = Prisma.sql`${source} UNION ALL ${paymentResultRows(user.id)}`;
    if (allowed(user, 'SUPPORT_MANAGE')) source = Prisma.sql`${source} UNION ALL ${supportAlertRows(user.id)}`;
    if (allowed(user, 'ACCOUNT_MANAGE')) source = Prisma.sql`${source} UNION ALL ${accountAlertRows(user.id)}`;
    const scope = alertScopeSql(query.scope);
    const [rows, counts] = await this.db.$transaction([
      this.db.$queryRaw<AlertRow[]>`WITH alerts AS (${source}) SELECT * FROM alerts
        WHERE ${scope} ${query.unreadOnly ? Prisma.sql`AND "readAt" IS NULL` : Prisma.empty}
        ORDER BY "occurredAt" DESC, id DESC, entity DESC LIMIT ${pageSize} OFFSET ${(query.page - 1) * pageSize}`,
      this.db.$queryRaw<{ active: bigint; unread: bigint; filtered: bigint; filteredUnread: bigint; tasks: bigint; finance: bigint; results: bigint; support: bigint; accounts: bigint }[]>`
        WITH alerts AS (${source}) SELECT COUNT(*) AS active, COUNT(*) FILTER (WHERE "readAt" IS NULL) AS unread,
          COUNT(*) FILTER (WHERE ${scope}) AS filtered, COUNT(*) FILTER (WHERE ${scope} AND "readAt" IS NULL) AS "filteredUnread",
          COUNT(*) FILTER (WHERE entity = 'task') AS tasks, COUNT(*) FILTER (WHERE entity = 'payment') AS finance,
          COUNT(*) FILTER (WHERE entity = 'payment-result') AS results, COUNT(*) FILTER (WHERE entity = 'support') AS support,
          COUNT(*) FILTER (WHERE entity = 'account') AS accounts FROM alerts`,
    ], { isolationLevel: 'RepeatableRead' });
    const count = counts[0];
    return { items: rows.map((row): StaffAlert => {
      const base = { id: row.id, readAt: row.readAt?.toISOString() ?? null, occurredAt: row.occurredAt.toISOString() };
      if (row.entity === 'account') return { ...base, entity: 'account', kind: row.kind as AccountAlertKind,
        accountId: row.accountId!, version: row.version, title: accountAlertTitles[row.kind as AccountAlertKind],
        message: `${row.clientName} · ${row.taskTitle} · By ${row.batchCode}`, targetPath: `/system/team?account=${row.accountId}` };
      if (row.entity === 'support') return { ...base, entity: 'support', kind: row.kind as SupportAlertKind,
        caseId: row.caseId!, version: row.version, title: supportAlertTitles[row.kind as SupportAlertKind],
        message: `Case #${row.caseId!.slice(0, 8)} · Open the current concern and conversation`, targetPath: `/system/support?case=${row.caseId}` };
      if (row.entity === 'payment') return { ...base, entity: 'payment', kind: 'FINANCE_PENDING', version: row.version,
        title: 'Payment awaiting verification', message: `PHP ${row.amount} · ${row.clientName} · ${row.batchCode}`,
        targetPath: `/system/payments?payment=${row.id}` };
      if (row.entity === 'payment-result') return { ...base, entity: 'payment-result', kind: row.kind as PaymentResultKind,
        paymentId: row.paymentId!, version: row.version, title: resultTitles[row.kind as PaymentResultKind],
        message: `PHP ${row.amount} · ${row.clientName} · ${row.batchCode} · Open for Finance's decision and notes`,
        targetPath: `/system/payments?payment=${row.paymentId}&result=${row.id}` };
      const kind = row.kind as TaskAlertKind;
      const deadline = row.deadline!.toISOString();
      return { ...base, entity: 'task', kind, deadline, title: titles[kind],
        message: `${row.taskTitle} · Due ${new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila' }).format(row.deadline!)} PHT`,
        targetPath: `/system/tasks?task=${row.id}` };
    }), page: query.page, pageSize, total: Number(query.unreadOnly ? count.filteredUnread : count.filtered),
      activeCount: Number(count.active), unreadCount: Number(count.unread), filteredCount: Number(count.filtered),
      filteredUnreadCount: Number(count.filteredUnread), taskCount: Number(count.tasks), financeCount: Number(count.finance), resultCount: Number(count.results), supportCount: Number(count.support), accountCount: Number(count.accounts) };
  }
  private async write<T>(user: User, scope: StaffAlertScope, run: (tx: Prisma.TransactionClient, current: Pick<User, 'role'>, now: Date) => Promise<T>) {
    this.access(user, scope);
    return this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(740015)`;
      const current = await tx.user.findUnique({ where: { id: user.id }, select: { role: true, active: true } });
      if (!current?.active) throw new ForbiddenException('Your access has changed.');
      this.access(current, scope);
      return run(tx, current, new Date());
    });
  }
  async read(user: User, id: string, input: StaffAlertReadInput) {
    this.access(user);
    if (input.entity === 'payment') return this.finance.read(user, id, input.version);
    if (input.entity === 'account') return this.write(user, 'accounts', async (tx, _current, now) => {
      if (!await accountAlertIsVisible(tx, user.id, id)) throw new NotFoundException('Account alert not found.');
      const alert = await tx.accountAlert.findUniqueOrThrow({ where: { id } });
      if (alert.readAt) return { id, readAt: alert.readAt.toISOString() };
      await tx.accountAlert.update({ where: { id }, data: { readAt: now } });
      await tx.changeEvent.create({ data: { entity: 'staff-alert-read', recordId: user.id } });
      return { id, readAt: now.toISOString() };
    });
    if (input.entity === 'support') return this.write(user, 'support', async (tx, _current, now) => {
      if (!await supportAlertIsVisible(tx, user.id, id)) throw new NotFoundException('Active Support alert not found.');
      const alert = await tx.supportAlert.findUniqueOrThrow({ where: { id } });
      if (alert.readAt) return { id, readAt: alert.readAt.toISOString() };
      await tx.supportAlert.update({ where: { id }, data: { readAt: now } });
      await tx.changeEvent.create({ data: { entity: 'staff-alert-read', recordId: user.id } });
      return { id, readAt: now.toISOString() };
    });
    if (input.entity === 'payment-result') return this.write(user, 'results', async (tx, _current, now) => {
      const result = await tx.paymentResultAlert.findFirst({ where: { id, userId: user.id } });
      if (!result) throw new NotFoundException('Finance result alert not found.');
      if (result.readAt) return { id, readAt: result.readAt.toISOString() };
      const updated = await tx.paymentResultAlert.update({ where: { id }, data: { readAt: now } });
      await tx.changeEvent.create({ data: { entity: 'staff-alert-read', recordId: user.id } });
      return { id, readAt: updated.readAt!.toISOString() };
    });
    return this.write(user, 'tasks', async (tx, _current, now) => {
      const task = await tx.task.findFirst({ where: { id, assigneeId: user.id, status: { in: ['TODO', 'IN_PROGRESS'] } }, select: { deadline: true } });
      if (!task) throw new NotFoundException('Active task alert not found.');
      if (task.deadline.getTime() !== new Date(input.deadline).getTime() || taskAlertKind(task.deadline, now) !== input.kind)
        throw new ConflictException('This task alert changed. Refresh the alerts and open the current task.');
      const where = { userId_taskId_kind: { userId: user.id, taskId: id, kind: input.kind } };
      const previous = await tx.taskAlertRead.findUnique({ where });
      if (previous?.deadline.getTime() === task.deadline.getTime()) return { id, readAt: previous.readAt.toISOString() };
      const receipt = await tx.taskAlertRead.upsert({ where, create: { userId: user.id, taskId: id, kind: input.kind, deadline: task.deadline, readAt: now },
        update: { deadline: task.deadline, readAt: now } });
      await tx.changeEvent.create({ data: { entity: 'staff-alert-read', recordId: user.id } });
      return { id, readAt: receipt.readAt.toISOString() };
    });
  }
  async readAll(user: User, scope: StaffAlertScope) {
    return this.write(user, scope, async (tx, current, now) => {
      const tasks = scope === 'all' || scope === 'tasks' ? await tx.$executeRaw`
        INSERT INTO "TaskAlertRead" ("userId", "taskId", kind, deadline, "readAt")
        SELECT ${user.id}::uuid, t.id, (${taskStageSql(now)})::"TaskAlertKind", t.deadline, ${utcTimestamp(now)}::timestamp
        FROM "Task" t WHERE t."assigneeId" = ${user.id}::uuid AND t.status IN ('TODO', 'IN_PROGRESS')
        ON CONFLICT ("userId", "taskId", kind) DO UPDATE SET deadline = EXCLUDED.deadline, "readAt" = EXCLUDED."readAt"
          WHERE "TaskAlertRead".deadline <> EXCLUDED.deadline` : 0;
      const finance = (scope === 'all' || scope === 'finance') && allowed(current, 'PAYMENT_VERIFY') ? await markFinanceAlertsRead(tx, user.id) : 0;
      const results = (scope === 'all' || scope === 'results') && canReadPaymentResults(current)
        ? (await tx.paymentResultAlert.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: now } })).count : 0;
      const support = (scope === 'all' || scope === 'support') && allowed(current, 'SUPPORT_MANAGE') ? await tx.$executeRaw`
        UPDATE "SupportAlert" SET "readAt" = ${utcTimestamp(now)}::timestamp WHERE "readAt" IS NULL
          AND id IN (SELECT id FROM (${supportAlertRows(user.id)}) visible)` : 0;
      const accounts = (scope === 'all' || scope === 'accounts') && allowed(current, 'ACCOUNT_MANAGE')
        ? (await tx.accountAlert.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: now } })).count : 0;
      if (tasks + finance + results + support + accounts) await tx.changeEvent.create({ data: { entity: 'staff-alert-read', recordId: user.id } });
      return { updated: tasks + finance + results + support + accounts };
    });
  }
  async result(user: User, id: string): Promise<PaymentResultDetail> {
    this.access(user, 'results');
    const result = await this.db.paymentResultAlert.findFirst({ where: { id, userId: user.id },
      include: { payment: { select: { status: true, version: true } } } });
    if (!result) throw new NotFoundException('Finance result alert not found.');
    return { id: result.id, paymentId: result.paymentId, version: result.paymentVersion,
      decision: result.decision as PaymentResultDetail['decision'], amount: result.amount.toFixed(2),
      clientName: result.clientName, batchCode: result.batchCode, notes: result.notes,
      verifierName: result.verifierName, occurredAt: result.createdAt.toISOString(),
      currentStatus: result.payment.status, currentVersion: result.payment.version };
  }
}
