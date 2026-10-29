import type { Payment, PortalScheduleItem, PortalSummary } from "./api";

const cents = (value: string | null | undefined) => {
  const amount = Number(value);

  return Number.isFinite(amount) ? Math.max(0, Math.round(amount * 100)) : 0;
};

export function verifiedPaymentPercent(
  summary: Pick<PortalSummary, "total_due" | "verified_paid"> | null,
) {
  if (!summary || summary.total_due == null || summary.verified_paid == null) {
    return null;
  }

  const total = cents(summary.total_due);

  if (total === 0 || !Number.isFinite(Number(summary.verified_paid))) {
    return null;
  }

  return Math.min(100, (cents(summary.verified_paid) * 100) / total);
}

export function installmentProgress(items: PortalScheduleItem[]) {
  const installments = [...items]
    .sort((a, b) => a.sequence_no - b.sequence_no)
    .map((item) => {
      const expected = cents(item.expected_amount);

      const verified = cents(item.paid_applied);

      return {
        sequence: item.sequence_no,
        dueDate: item.due_date,
        expected: expected / 100,
        verified: verified / 100,
        remaining: Math.max(0, expected - verified) / 100,
        percentage:
          expected > 0 ? Math.min(100, (verified / expected) * 100) : 100,
        complete: verified >= expected,
      };
    });

  return {
    installments,
    completed: installments.filter((item) => item.complete).length,
    next: installments.find((item) => !item.complete),
  };
}

export type PaymentStaff = {
  id: string;
  name: string;
  roles: string[];
  paymentId: Payment["id"];
};

export function paymentStaff(payments: Payment[]) {
  const staff = new Map<string, PaymentStaff>();

  function add(
    id: Payment["recorded_by"],
    name: string | null | undefined,
    role: string,
    paymentId: Payment["id"],
  ) {
    if (!name?.trim()) {
      return;
    }

    const key = id == null ? `name:${name.trim().toLowerCase()}` : String(id);

    const existing = staff.get(key);

    if (existing) {
      if (!existing.roles.includes(role)) {
        existing.roles.push(role);
      }
    } else {
      staff.set(key, { id: key, name: name.trim(), roles: [role], paymentId });
    }
  }

  for (const payment of payments) {
    if (payment.status.toLowerCase() !== "verified") {
      continue;
    }

    add(payment.recorded_by, payment.recorded_by_name, "Recorder", payment.id);

    add(
      payment.verified_by,
      payment.verifier_name,
      "Finance verifier",
      payment.id,
    );
  }

  return [...staff.values()];
}
