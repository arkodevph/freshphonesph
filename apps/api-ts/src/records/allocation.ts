import { amountInCents, centsAsAmount } from './schedule';

export function allocateVerifiedPayments(
  items: { sequenceNo: number; dueDate: string; expectedAmount: string }[],
  verifiedPaid: string,
  today: string,
) {
  let available = amountInCents(verifiedPaid);
  return items.map((item) => {
    const expected = amountInCents(item.expectedAmount);
    const applied = available < expected ? available : expected;
    available -= applied;
    return {
      ...item,
      paidApplied: centsAsAmount(applied),
      status: applied === expected ? 'PAID' : applied > 0n ? 'PARTIAL' : item.dueDate < today ? 'OVERDUE' : 'UPCOMING',
    };
  });
}
