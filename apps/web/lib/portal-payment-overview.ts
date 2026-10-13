import type { Payment, PortalScheduleItem, PortalSummary } from "./api";

const cents = (value: string | null | undefined) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.max(0, Math.round(amount * 100)) : 0;
};

export function verifiedPaymentPercent(summary: Pick<PortalSummary, "total_due" | "verified_paid"> | null) {
  if (!summary || summary.total_due == null || summary.verified_paid == null) return null;
  const total = cents(summary.total_due);
  if (total === 0 || !Number.isFinite(Number(summary.verified_paid))) return null;
  return Math.min(100, (cents(summary.verified_paid) * 100) / total);
}

export function installmentChart(items: PortalScheduleItem[]) {
  const sorted = [...items].sort((a, b) => a.sequence_no - b.sequence_no);
  const next = sorted.findIndex(item => cents(item.expected_amount) > cents(item.paid_applied));
  const start = Math.min(Math.max(0, next === -1 ? sorted.length - 5 : next - 1), Math.max(0, sorted.length - 5));
  return sorted.slice(start, start + 5).map(item => ({
    sequence: item.sequence_no,
    expected: cents(item.expected_amount) / 100,
    verified: cents(item.paid_applied) / 100,
  }));
}

export type PaymentStaff = { id: string; name: string; roles: string[]; paymentId: Payment["id"] };

export function paymentStaff(payments: Payment[]) {
  const staff = new Map<string, PaymentStaff>();
  function add(id: Payment["recorded_by"], name: string | null | undefined, role: string, paymentId: Payment["id"]) {
    if (!name?.trim()) return;
    const key = id == null ? `name:${name.trim().toLowerCase()}` : String(id);
    const existing = staff.get(key);
    if (existing) {
      if (!existing.roles.includes(role)) existing.roles.push(role);
    } else staff.set(key, { id: key, name: name.trim(), roles: [role], paymentId });
  }
  for (const payment of payments) {
    if (payment.status.toLowerCase() !== "verified") continue;
    add(payment.recorded_by, payment.recorded_by_name, "Recorder", payment.id);
    add(payment.verified_by, payment.verifier_name, "Finance verifier", payment.id);
  }
  return [...staff.values()];
}
