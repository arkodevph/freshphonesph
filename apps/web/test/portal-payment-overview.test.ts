import test from "node:test";
import assert from "node:assert/strict";
import { installmentChart, paymentStaff, verifiedPaymentPercent } from "../lib/portal-payment-overview";
import type { Payment, PortalScheduleItem } from "../lib/api";

test("verified progress uses the verified balance and handles missing totals and overpayment", () => {
  assert.equal(verifiedPaymentPercent({ total_due: "30000.00", verified_paid: "1020.00" }), 3.4);
  assert.equal(verifiedPaymentPercent({ total_due: "100.00", verified_paid: "0.00" }), 0);
  assert.equal(verifiedPaymentPercent({ total_due: "100.00", verified_paid: "110.00" }), 100);
  assert.equal(verifiedPaymentPercent({ total_due: null, verified_paid: "20.00" }), null);
  assert.equal(verifiedPaymentPercent({ total_due: "0.00", verified_paid: "0.00" }), null);
  assert.equal(verifiedPaymentPercent({ total_due: "100.00", verified_paid: "unavailable" }), null);
});

test("the chart shows verified allocations around the next unpaid installment without changing the plan", () => {
  const plan: PortalScheduleItem[] = Array.from({ length: 12 }, (_, index) => ({
    sequence_no: index + 1, due_date: "2026-10-10", expected_amount: "5000.25",
    paid_applied: index < 5 ? "5000.25" : index === 5 ? "1020.10" : "0.00",
    status: index < 5 ? "paid" : "upcoming",
  }));
  const chart = installmentChart([...plan].reverse());
  assert.deepEqual(chart.map(item => item.sequence), [5, 6, 7, 8, 9]);
  assert.equal(chart[1].verified, 1020.10);
  assert.equal(chart[1].expected, 5000.25);
  assert.equal(chart[2].verified, 0);
  assert.equal(plan[0].sequence_no, 1);
  assert.deepEqual(installmentChart([]), []);
  assert.deepEqual(installmentChart(plan.map(item => ({ ...item, paid_applied: item.expected_amount }))).map(item => item.sequence), [8, 9, 10, 11, 12]);
});

test("staff come from verified records, merge roles by ID, and keep distinct staff with the same name", () => {
  const rows = [
    { id: "payment-1", status: "verified", recorded_by: "staff-1", recorded_by_name: "Alex", verified_by: "staff-1", verifier_name: "Alex" },
    { id: "payment-2", status: "verified", recorded_by: "staff-2", recorded_by_name: "Alex", verified_by: null, verifier_name: null },
    { id: "payment-3", status: "pending", recorded_by: "staff-3", recorded_by_name: "Pending recorder" },
    { id: "payment-4", status: "verified", recorded_by: "staff-4", recorded_by_name: "  ", verified_by: null },
  ] as Payment[];
  assert.deepEqual(paymentStaff(rows), [
    { id: "staff-1", name: "Alex", roles: ["Recorder", "Finance verifier"], paymentId: "payment-1" },
    { id: "staff-2", name: "Alex", roles: ["Recorder"], paymentId: "payment-2" },
  ]);
});
