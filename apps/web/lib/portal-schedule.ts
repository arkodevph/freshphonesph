import type { PortalScheduleItem } from "./api";
import { today as manilaToday } from "./date";

const cents = (value: string | number) => {
  return Math.round(Number(value) * 100);
};

export function installmentState(
  item: PortalScheduleItem,
  today = manilaToday(),
) {
  const expected = cents(item.expected_amount);

  const applied = cents(item.paid_applied || "0");

  const remaining = Math.max(0, expected - applied);

  const released = cents(item.released_amount ?? "0");

  const payment =
    released > 0
      ? expected === 0
        ? "Handed over"
        : remaining === 0
          ? "Settled after handover"
          : applied > 0
            ? "Partially paid"
            : "Unpaid"
      : remaining === 0
        ? "Paid"
        : applied > 0
          ? "Partially paid"
          : "Unpaid";

  const dueDate = item.due_date.slice(0, 10);

  const timing =
    released > 0 && remaining === 0
      ? "Replacement joined"
      : remaining === 0
        ? "Settled"
        : dueDate < today
          ? "Overdue"
          : dueDate === today
            ? "Due today"
            : "Upcoming";

  return {
    remaining: remaining / 100,
    payment,
    timing,
    isDue: remaining > 0 && dueDate <= today,
  };
}

export function scheduleDueNow(
  items: PortalScheduleItem[],
  today = manilaToday(),
) {
  return (
    items.reduce((sum, item) => {
      const state = installmentState(item, today);

      return sum + (state.isDue ? Math.round(state.remaining * 100) : 0);
    }, 0) / 100
  );
}
