import { Prisma } from '../generated/prisma/client';

// Call inside a consistent read transaction when combining this with other figures.
export async function verifiedTotals(db: Prisma.TransactionClient, scope: Prisma.PaymentWhereInput = {}) {
  const where: Prisma.PaymentWhereInput = { AND: [scope, { status: 'VERIFIED' }] };
  const [payments, adjustments] = await Promise.all([
    db.payment.aggregate({ where, _sum: { amount: true }, _count: true }),
    db.paymentAdjustment.aggregate({ where: { payment: where }, _sum: { amount: true }, _count: true }),
  ]);
  const original = payments._sum.amount ?? new Prisma.Decimal(0);
  const adjustment = adjustments._sum.amount ?? new Prisma.Decimal(0);
  return { original, adjustment, effective: original.add(adjustment), count: payments._count, adjustments: adjustments._count };
}

export const adjustmentInclude = { orderBy: { sequence: 'asc' }, include: { actor: { select: { id: true, name: true } } } } as const;
export function effectiveAmount(payment: { amount: Prisma.Decimal; adjustments: { amount: Prisma.Decimal }[] }) {
  return payment.adjustments.reduce((total, adjustment) => total.add(adjustment.amount), payment.amount);
}
