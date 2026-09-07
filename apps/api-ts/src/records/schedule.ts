import { BadRequestException } from '@nestjs/common';
import type { Cadence } from '@freshphones/contracts';

const days: Record<Cadence, number> = { WEEKLY: 7, SEMIMONTHLY: 15, MONTHLY: 30 };
export function amountInCents(value: string): bigint {
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
}
export function centsAsAmount(cents: bigint): string {
  return `${cents / 100n}.${(cents % 100n).toString().padStart(2, '0')}`;
}

// Preserve the Django baseline's fixed 7/15/30-day cadence. Calendar dates require policy approval.
export function generateSchedule(plan: {
  contractPrice: string; installmentCount: number; cadence: Cadence; startDate: Date;
}) {
  const total = amountInCents(plan.contractPrice);
  const count = BigInt(plan.installmentCount);
  if (count < 1n || count > 600n || total < count)
    throw new BadRequestException('Each installment must be at least one centavo.');
  const quotient = total / count;
  const remainder = total % count;
  // Preserve Decimal.quantize's half-even rounding when the final amount stays positive.
  const roundUp = remainder * 2n > count || (remainder * 2n === count && quotient % 2n === 1n);
  const rounded = quotient + (roundUp ? 1n : 0n);
  const per = total - rounded * (count - 1n) > 0n ? rounded : quotient;
  return Array.from({ length: plan.installmentCount }, (_, i) => {
    const dueDate = new Date(plan.startDate);
    dueDate.setUTCDate(dueDate.getUTCDate() + days[plan.cadence] * (i + 1));
    if (dueDate.getUTCFullYear() > 9999) throw new BadRequestException('Schedule exceeds the supported date range.');
    return {
      sequenceNo: i + 1,
      dueDate,
      expectedAmount: centsAsAmount(i + 1 === plan.installmentCount ? total - per * (count - 1n) : per),
    };
  });
}
