import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { z } from 'zod';
import { reportQuerySchema, reportSnapshotSchema, type PaymentReport, type ReportKind, type User } from '@freshphones/contracts';
import { Database } from '../database';
import { Prisma } from '../generated/prisma/client';
import { workbook } from './xlsx';
import { collections } from './collections';
import { reconciliation, reconciliationColumns, reconciliationExceptions } from './reconciliation';
import { allowed } from '../auth/access';
import { effectiveAmount, verifiedTotals } from '../finance/ledger';

type ReportQuery = z.infer<typeof reportQuerySchema>;
type SnapshotInput = z.infer<typeof reportSnapshotSchema>;
const csv = (value: unknown) => {
  const text = String(value ?? '');
  const safe = typeof value === 'string' && /^[=+\-@\t\r\n]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
};

@Injectable()
export class ReportsService {
  constructor(@Inject(Database) private readonly db: Database) {}

  private where(query: ReportQuery): Prisma.PaymentWhereInput {
    return {
      ...(query.q ? { OR: [
        { referenceNumber: { contains: query.q, mode: 'insensitive' as const } },
        { client: { name: { contains: query.q, mode: 'insensitive' as const } } },
        { batch: { code: { contains: query.q, mode: 'insensitive' as const } } },
      ] } : {}),
      ...(query.batchId ? { batchId: query.batchId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.dateFrom || query.dateTo ? { paymentDate: {
        ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
        ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
      } } : {}),
    };
  }

  async dashboard(query: ReportQuery) {
    const base = this.where({ ...query, status: undefined });
    return this.db.$transaction(async (tx) => {
      const [activeBatches, verified, pending, clarification, openConcerns, lateTasks] = await Promise.all([
        tx.batch.count({ where: { status: 'ACTIVE' } }), verifiedTotals(tx, base),
        tx.payment.aggregate({ where: { ...base, status: 'PENDING' }, _count: true, _sum: { amount: true } }),
        tx.payment.count({ where: { ...base, status: 'NEEDS_CLARIFICATION' } }),
        tx.supportCase.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_CLIENT'] } } }),
        tx.task.count({ where: { lateFlag: true } }),
      ]);
      return {
        activeBatches,
        verifiedPayments: verified.count,
        verifiedAmount: verified.effective.toFixed(2),
        originalVerifiedAmount: verified.original.toFixed(2), adjustmentAmount: verified.adjustment.toFixed(2),
        pendingVerification: pending._count,
        pendingAmount: (pending._sum.amount ?? new Prisma.Decimal(0)).toFixed(2),
        needsClarification: clarification,
        openConcerns,
        lateTasks,
      };
    }, { isolationLevel: 'RepeatableRead' });
  }

  async paymentReport(query: ReportQuery, db: Prisma.TransactionClient = this.db): Promise<PaymentReport> {
    if (db === this.db) return this.db.$transaction((tx) => this.paymentReport(query, tx), { isolationLevel: 'RepeatableRead' });
    const groups = await db.payment.groupBy({ by: ['status'], where: this.where(query), _count: true, _sum: { amount: true } });
    const verified = await verifiedTotals(db, this.where(query));
    const group = (status: string) => groups.find((item) => item.status === status);
    return {
      total: groups.reduce((total, item) => total + item._count, 0),
      verifiedPayments: group('VERIFIED')?._count ?? 0,
      verifiedAmount: verified.effective.toFixed(2),
      originalVerifiedAmount: verified.original.toFixed(2), adjustmentAmount: verified.adjustment.toFixed(2),
      pendingVerification: group('PENDING')?._count ?? 0,
      pendingAmount: (group('PENDING')?._sum.amount ?? new Prisma.Decimal(0)).toFixed(2),
      needsClarification: group('NEEDS_CLARIFICATION')?._count ?? 0,
      rejectedPayments: group('REJECTED')?._count ?? 0,
    };
  }

  async batchOptions(query: { q?: string; page: number }) {
    const where: Prisma.BatchWhereInput = query.q ? { code: { contains: query.q, mode: 'insensitive' } } : {};
    const [items, total] = await this.db.$transaction([
      this.db.batch.findMany({ where, select: { id: true, code: true }, orderBy: [{ code: 'asc' }, { id: 'asc' }],
        skip: (query.page - 1) * 20, take: 20 }),
      this.db.batch.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: 20 };
  }

  async paymentCsv(query: ReportQuery) {
    const rows = await this.paymentRows(query);
    return rows.map((row) => row.map(csv).join(',')).join('\r\n');
  }

  collectionReport(query: ReportQuery & { page?: number }) { return collections(this.db, query); }
  reconciliationReport(query: ReportQuery & { page?: number }) { return reconciliation(this.db, query); }
  reconciliationExceptions(user: User, query: ReportQuery & { page?: number }) {
    if (!allowed(user, 'PAYMENT_READ')) throw new ForbiddenException('Payment-read access is required to review individual exceptions.');
    return reconciliationExceptions(this.db, query);
  }

  private async paymentRows(query: ReportQuery) {
    const payments = await this.db.payment.findMany({
      where: this.where(query),
      select: {
        paymentDate: true, amount: true, method: true, status: true,
        batch: { select: { code: true } },
        adjustments: { select: { amount: true } },
      },
      orderBy: [{ paymentDate: 'asc' }, { id: 'asc' }],
    });
    return [['Payment date', 'Batch', 'Status', 'Method', 'Amount (PHP)', 'Finance adjustments (PHP)', 'Current credit / claim (PHP)'], ...payments.map((payment) => [
      payment.paymentDate.toISOString().slice(0, 10), payment.batch.code,
      payment.status, payment.method, payment.amount.toFixed(2),
      effectiveAmount(payment).sub(payment.amount).toFixed(2), effectiveAmount(payment).toFixed(2),
    ])];
  }

  async taskReport(query: ReportQuery, db: Prisma.TransactionClient = this.db) {
    const createdAt = this.dateRange(query);
    const tasks = await db.task.findMany({
      where: { ...(createdAt ? { createdAt } : {}) },
      select: { status: true, lateFlag: true, submittedAt: true, review: { select: { id: true } } },
    });
    const byStatus = Object.fromEntries(['TODO', 'IN_PROGRESS', 'SUBMITTED', 'DONE'].map((status) => [
      status, tasks.filter((task) => task.status === status).length,
    ]));
    return {
      total: tasks.length,
      byStatus,
      submitted: tasks.filter((task) => task.submittedAt).length,
      late: tasks.filter((task) => task.lateFlag === true).length,
      reviewed: tasks.filter((task) => Boolean(task.review)).length,
      disclaimer: 'Late status is an objective timing fact only and does not trigger a wage or disciplinary action.',
    };
  }

  async supportReport(query: ReportQuery, db: Prisma.TransactionClient = this.db) {
    const createdAt = this.dateRange(query);
    const cases = await db.supportCase.findMany({
      where: { ...(createdAt ? { createdAt } : {}) },
      select: { category: true, status: true, createdAt: true, closedAt: true },
    });
    const categories = new Map<string, { category: string; total: number; closed: number; turnaround: number[] }>();
    for (const item of cases) {
      const group = categories.get(item.category) ?? { category: item.category, total: 0, closed: 0, turnaround: [] };
      group.total++;
      if (item.closedAt) {
        group.closed++;
        group.turnaround.push((item.closedAt.getTime() - item.createdAt.getTime()) / 3_600_000);
      }
      categories.set(item.category, group);
    }
    return {
      total: cases.length,
      open: cases.filter((item) => !['RESOLVED', 'CLOSED'].includes(item.status)).length,
      closed: cases.filter((item) => ['RESOLVED', 'CLOSED'].includes(item.status)).length,
      categories: [...categories.values()].map((item) => ({
        category: item.category, total: item.total, closed: item.closed,
        averageTurnaroundHours: item.turnaround.length
          ? Math.round((item.turnaround.reduce((sum, value) => sum + value, 0) / item.turnaround.length) * 10) / 10
          : null,
      })).sort((a, b) => b.total - a.total || a.category.localeCompare(b.category)),
    };
  }

  private dateRange(query: ReportQuery) {
    if (!query.dateFrom && !query.dateTo) return undefined;
    return {
      ...(query.dateFrom ? { gte: new Date(`${query.dateFrom}T00:00:00.000Z`) } : {}),
      ...(query.dateTo ? { lte: new Date(`${query.dateTo}T23:59:59.999Z`) } : {}),
    };
  }

  async export(kind: ReportKind, format: 'csv' | 'xlsx', query: ReportQuery) {
    let rows: unknown[][];
    if (kind === 'payments') rows = await this.paymentRows(query);
    else if (kind === 'collections') {
      const report = await collections(this.db, query, true);
      const columns = ['clients', 'scheduledClients', 'clientsWithoutSchedule', 'agreedAmount', 'verifiedAmount',
        'pendingAmount', 'remainingBalance', 'overpaidAmount', 'collectedInPeriod', 'verifiedPaymentsInPeriod',
        'pendingInPeriod', 'pendingPaymentsInPeriod', 'adjustmentAmount', 'adjustmentsInPeriod'] as const;
      rows = [
        ['Period from', query.dateFrom ?? 'All earlier dates', 'Period to', query.dateTo ?? 'All later dates'],
        ['Balances use current issued schedules and verified credits including Finance adjustments, grouped by current client batch. Period credit uses the original payment date, not adjustment creation date.'],
        ['Overpaid amounts are unapplied verified funds, including clients without schedules. They are not a refund authorization.'],
        ['Batch', 'Status', 'Current clients', 'With issued schedule', 'Without issued schedule', 'Agreed / issued total (PHP)',
          'Verified overall (PHP)', 'Pending overall (PHP)', 'Remaining overall (PHP)', 'Overpaid overall (PHP)',
          'Verified in period (PHP)', 'Verified payments in period', 'Pending in period (PHP)', 'Pending payments in period', 'Finance adjustments overall (PHP)', 'Finance adjustments on period payments (PHP)'],
        ...report.items.map((item) => [item.code, item.status, ...columns.map((field) => item[field])]),
        ['All scoped batches', '', ...columns.map((field) => report.totals[field])],
      ];
    } else if (kind === 'reconciliation') {
      const report = await reconciliation(this.db, query, true);
      rows = [
        ['Period from', query.dateFrom ?? 'All earlier dates', 'Period to', query.dateTo ?? 'All later dates'],
        ['Internal payment and verification-audit comparison. External bank statements have not been matched. Dates use recorded payment dates; batch uses the recorded payment batch.'],
        ['Review flags may overlap and do not authorize an adjustment, refund or verification. Possible duplicate references compare all ledger records.'],
        ['Batch', 'Method', ...reconciliationColumns.map(([, label]) => label)],
        ...report.items.map((item) => [item.batchCode, item.method, ...reconciliationColumns.map(([field]) => item[field])]),
        ['All scoped records', '', ...reconciliationColumns.map(([field]) => report.totals[field])],
      ];
    } else if (kind === 'tasks') {
      const report = await this.taskReport(query);
      rows = [['Status', 'Tasks'], ...Object.entries(report.byStatus).map(([status, total]) => [status, total]),
        ['Submitted', report.submitted], ['Late', report.late], ['Reviewed', report.reviewed]];
    } else {
      const report = await this.supportReport(query);
      rows = [['Category', 'Cases', 'Closed', 'Average turnaround hours'], ...report.categories.map(item => [
        item.category, item.total, item.closed, item.averageTurnaroundHours ?? '',
      ])];
    }
    return format === 'xlsx' ? workbook(rows, kind) : rows.map((row) => row.map(csv).join(',')).join('\r\n');
  }

  async createSnapshot(user: User, input: SnapshotInput) {
    const query: ReportQuery = { dateFrom: input.periodStart, dateTo: input.periodEnd,
      ...(input.batchId ? { batchId: input.batchId } : {}), ...(input.status ? { status: input.status } : {}) };
    return this.db.$transaction(async (tx) => {
      const batch = input.batchId ? await tx.batch.findUnique({ where: { id: input.batchId }, select: { code: true } }) : null;
      if (input.batchId && !batch) throw new NotFoundException('This batch is no longer available.');
      const payload = input.kind === 'PAYMENTS' ? {
        ...await this.paymentReport(query, tx),
        filters: { ...(input.batchId ? { batchId: input.batchId, batchCode: batch!.code } : {}),
          ...(input.status ? { status: input.status } : {}) },
      } : input.kind === 'COLLECTIONS' ? await (async () => {
        const report = await collections(tx, query, true);
        return { totals: report.totals, batches: report.items, balanceBasis: 'current', paymentGrouping: 'current_client_batch',
          filters: input.batchId ? { batchId: input.batchId, batchCode: batch!.code } : {} };
      })() : input.kind === 'RECONCILIATION' ? await (async () => {
        const report = await reconciliation(tx, query, true);
        return { totals: report.totals, groups: report.items, basis: 'current_payment_state', paymentGrouping: 'recorded_payment_batch',
          externalStatementMatched: false, filters: input.batchId ? { batchId: input.batchId, batchCode: batch!.code } : {} };
      })() : input.kind === 'TASKS' ? await this.taskReport(query, tx) : await this.supportReport(query, tx);
      const snapshot = await tx.reportSnapshot.create({ data: {
        kind: input.kind,
        periodStart: new Date(input.periodStart),
        periodEnd: new Date(input.periodEnd),
        payload: JSON.parse(JSON.stringify(payload)) as Prisma.InputJsonValue,
        createdById: user.id,
      }, include: { createdBy: { select: { id: true, name: true } } } });
      await tx.auditEntry.create({ data: {
        actorId: user.id, action: 'report_snapshot.created', entity: 'report_snapshot',
        recordId: snapshot.id, after: JSON.parse(JSON.stringify(snapshot)) as Prisma.InputJsonValue,
      } });
      return snapshot;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  async snapshots(query: { page: number; kind?: string }) {
    const where = query.kind ? { kind: query.kind } : {};
    const [items, total] = await this.db.$transaction([
      this.db.reportSnapshot.findMany({ where, include: { createdBy: { select: { id: true, name: true } } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (query.page - 1) * 20, take: 20 }),
      this.db.reportSnapshot.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: 20 };
  }
}
