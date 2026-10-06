import { Inject, Injectable } from '@nestjs/common';
import type { z } from 'zod';
import { reportQuerySchema, reportSnapshotSchema, type User } from '@freshphones/contracts';
import { Database } from '../database';
import { Prisma } from '../generated/prisma/client';
import { workbook } from './xlsx';

type ReportQuery = z.infer<typeof reportQuerySchema>;
type SnapshotInput = z.infer<typeof reportSnapshotSchema>;
const csv = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;

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
    const [activeBatches, verified, pending, clarification, openConcerns, lateTasks] = await this.db.$transaction([
      this.db.batch.count({ where: { status: 'ACTIVE' } }),
      this.db.payment.aggregate({ where: { ...base, status: 'VERIFIED' }, _count: true, _sum: { amount: true } }),
      this.db.payment.aggregate({ where: { ...base, status: 'PENDING' }, _count: true, _sum: { amount: true } }),
      this.db.payment.count({ where: { ...base, status: 'NEEDS_CLARIFICATION' } }),
      this.db.supportCase.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_CLIENT'] } } }),
      this.db.task.count({ where: { lateFlag: true } }),
    ]);
    return {
      activeBatches,
      verifiedPayments: verified._count,
      verifiedAmount: (verified._sum.amount ?? new Prisma.Decimal(0)).toFixed(2),
      pendingVerification: pending._count,
      pendingAmount: (pending._sum.amount ?? new Prisma.Decimal(0)).toFixed(2),
      needsClarification: clarification,
      openConcerns,
      lateTasks,
    };
  }

  async paymentCsv(query: ReportQuery) {
    const rows = await this.paymentRows(query);
    return rows.map((row) => row.map(csv).join(',')).join('\r\n');
  }

  private async paymentRows(query: ReportQuery) {
    const payments = await this.db.payment.findMany({
      where: this.where(query),
      select: {
        paymentDate: true, amount: true, method: true, status: true,
        batch: { select: { code: true } },
      },
      orderBy: [{ paymentDate: 'asc' }, { id: 'asc' }],
    });
    return [['Payment date', 'Batch', 'Status', 'Method', 'Amount (PHP)'], ...payments.map((payment) => [
      payment.paymentDate.toISOString().slice(0, 10), payment.batch.code,
      payment.status, payment.method, payment.amount.toFixed(2),
    ])];
  }

  async taskReport(query: ReportQuery) {
    const createdAt = this.dateRange(query);
    const tasks = await this.db.task.findMany({
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

  async supportReport(query: ReportQuery) {
    const createdAt = this.dateRange(query);
    const cases = await this.db.supportCase.findMany({
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

  async export(kind: 'payments' | 'tasks' | 'support', format: 'csv' | 'xlsx', query: ReportQuery) {
    let rows: unknown[][];
    if (kind === 'payments') rows = await this.paymentRows(query);
    else if (kind === 'tasks') {
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
    const query = { dateFrom: input.periodStart, dateTo: input.periodEnd } as ReportQuery;
    const payload = input.kind === 'PAYMENTS' ? await this.dashboard(query)
      : input.kind === 'TASKS' ? await this.taskReport(query) : await this.supportReport(query);
    return this.db.$transaction(async (tx) => {
      const snapshot = await tx.reportSnapshot.create({ data: {
        kind: input.kind,
        periodStart: new Date(input.periodStart),
        periodEnd: new Date(input.periodEnd),
        payload: JSON.parse(JSON.stringify(payload)) as Prisma.InputJsonValue,
        createdById: user.id,
      } });
      await tx.auditEntry.create({ data: {
        actorId: user.id, action: 'report_snapshot.created', entity: 'report_snapshot',
        recordId: snapshot.id, after: JSON.parse(JSON.stringify(snapshot)) as Prisma.InputJsonValue,
      } });
      return snapshot;
    });
  }

  async snapshots(page: number) {
    const [items, total] = await this.db.$transaction([
      this.db.reportSnapshot.findMany({ include: { createdBy: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * 20, take: 20 }),
      this.db.reportSnapshot.count(),
    ]);
    return { items, total, page, pageSize: 20 };
  }
}
