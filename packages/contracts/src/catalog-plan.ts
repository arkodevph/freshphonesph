import { z } from 'zod';

export const catalogPlanIntervals = { WEEKLY: 7, SEMIMONTHLY: 15, MONTHLY: 30 } as const;
export const catalogPlanLabels = { WEEKLY: 'Every 7 days', SEMIMONTHLY: 'Every 15 days', MONTHLY: 'Every 30 days' } as const;
const cents = (value: string) => {
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
};
const amount = (value: bigint) => `${value / 100n}.${String(value % 100n).padStart(2, '0')}`;
export const catalogPlanSchema = z.object({
  totalAmount: z.string().regex(/^(0|[1-9]\d{0,9})(\.\d{1,2})?$/, 'Enter a total with at most two decimal places.'),
  installmentCount: z.number().int().min(1).max(600),
  cadence: z.enum(['WEEKLY', 'SEMIMONTHLY', 'MONTHLY']),
}).strict().superRefine((value, ctx) => {
  if (/^(0|[1-9]\d{0,9})(\.\d{1,2})?$/.test(value.totalAmount) &&
      Number.isInteger(value.installmentCount) && cents(value.totalAmount) < BigInt(value.installmentCount))
    ctx.addIssue({ code: 'custom', path: ['totalAmount'], message: 'The total must allow at least one centavo per installment.' });
});
export type CatalogPlan = z.infer<typeof catalogPlanSchema>;

// Same centavo allocation as issued record schedules, including half-even rounding
// and a positive final remainder. This function only produces a public illustration.
export function catalogPlanBreakdown(input: CatalogPlan) {
  const plan = catalogPlanSchema.parse(input);
  const total = cents(plan.totalAmount), count = BigInt(plan.installmentCount);
  const quotient = total / count, remainder = total % count;
  const roundUp = remainder * 2n > count || (remainder * 2n === count && quotient % 2n === 1n);
  const rounded = quotient + (roundUp ? 1n : 0n);
  const regular = total - rounded * (count - 1n) > 0n ? rounded : quotient;
  const final = total - regular * (count - 1n);
  const intervalDays = catalogPlanIntervals[plan.cadence];
  return {
    totalAmount: amount(total), regularAmount: amount(regular), finalAmount: amount(final),
    durationDays: intervalDays * plan.installmentCount,
    installments: Array.from({ length: plan.installmentCount }, (_, index) => ({
      sequenceNo: index + 1, dayOffset: intervalDays * (index + 1),
      amount: amount(index + 1 === plan.installmentCount ? final : regular),
    })),
  };
}
