import type { PortalScheduleItem } from "./api";
import { manilaToday } from "./portal-attention";

const cents = (value: string | number) => Math.round(Number(value) * 100);

export function installmentState(item: PortalScheduleItem, today = manilaToday()) {
  const expected = cents(item.expected_amount);
  const applied = cents(item.paid_applied || "0");
  const remaining = Math.max(0, expected - applied);
  const payment = remaining === 0 ? "Paid" : applied > 0 ? "Partially paid" : "Unpaid";
  const dueDate = item.due_date.slice(0, 10);
  const timing = remaining === 0 ? "Settled" : dueDate < today ? "Overdue" : dueDate === today ? "Due today" : "Upcoming";
  return { remaining: remaining / 100, payment, timing, isDue: remaining > 0 && dueDate <= today };
}

export function scheduleDueNow(items: PortalScheduleItem[], today = manilaToday()) {
  return items.reduce((sum, item) => {
    const state = installmentState(item, today);
    return sum + (state.isDue ? Math.round(state.remaining * 100) : 0);
  }, 0) / 100;
}
