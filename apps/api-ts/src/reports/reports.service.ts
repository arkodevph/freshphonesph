import { Inject, Injectable } from '@nestjs/common';
import type { z } from 'zod';
import { reportQuerySchema } from '@freshphones/contracts';
import { Database } from '../database';
import { Prisma } from '../generated/prisma/client';

type ReportQuery = z.infer<typeof reportQuerySchema>;
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
    const [activeBatches, verified, pending, clarification] = await this.db.$transaction([
      this.db.batch.count({ where: { status: 'ACTIVE' } }),
      this.db.payment.aggregate({ where: { ...base, status: 'VERIFIED' }, _count: true, _sum: { amount: true } }),
      this.db.payment.aggregate({ where: { ...base, status: 'PENDING' }, _count: true, _sum: { amount: true } }),
      this.db.payment.count({ where: { ...base, status: 'NEEDS_CLARIFICATION' } }),
    ]);
    return {
      activeBatches,
      verifiedPayments: verified._count,
      verifiedAmount: (verified._sum.amount ?? new Prisma.Decimal(0)).toFixed(2),
      pendingVerification: pending._count,
      pendingAmount: (pending._sum.amount ?? new Prisma.Decimal(0)).toFixed(2),
      needsClarification: clarification,
    };
  }

  async paymentCsv(query: ReportQuery) {
    const payments = await this.db.payment.findMany({
      where: this.where(query),
      select: {
        paymentDate: true, amount: true, method: true, status: true,
        batch: { select: { code: true } },
      },
      orderBy: [{ paymentDate: 'asc' }, { id: 'asc' }],
    });
    const rows = payments.map((payment) => [
      payment.paymentDate.toISOString().slice(0, 10), payment.batch.code,
      payment.status, payment.method, payment.amount.toFixed(2),
    ].map(csv).join(','));
    return ['"Payment date","Batch","Status","Method","Amount (PHP)"', ...rows].join('\r\n');
  }
}
