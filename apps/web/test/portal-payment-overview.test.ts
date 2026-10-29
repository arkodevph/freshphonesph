import test from "node:test";
import assert from "node:assert/strict";
import {
  installmentProgress,
  paymentStaff,
  verifiedPaymentPercent,
} from "../lib/portal-payment-overview";
import type { Payment, PortalScheduleItem } from "../lib/api";

test("verified progress uses the verified balance and handles missing totals and overpayment", () => {
  assert.equal(
    verifiedPaymentPercent({ total_due: "30000.00", verified_paid: "1020.00" }),
    3.4,
  );

  assert.equal(
    verifiedPaymentPercent({ total_due: "100.00", verified_paid: "0.00" }),
    0,
  );

  assert.equal(
    verifiedPaymentPercent({ total_due: "100.00", verified_paid: "110.00" }),
    100,
  );

  assert.equal(
    verifiedPaymentPercent({ total_due: null, verified_paid: "20.00" }),
    null,
  );

  assert.equal(
    verifiedPaymentPercent({ total_due: "0.00", verified_paid: "0.00" }),
    null,
  );

  assert.equal(
    verifiedPaymentPercent({
      total_due: "100.00",
      verified_paid: "unavailable",
    }),
    null,
  );
});

test("installment progress includes the entire plan and preserves partial verified payments", () => {
  const plan: PortalScheduleItem[] = Array.from({ length: 24 }, (_, index) => ({
    sequence_no: index + 1,
    due_date: "2026-10-30",
    expected_amount: "5000.25",
    paid_applied: index < 5 ? "5000.25" : index === 5 ? "1020.10" : "0.00",
    status: "upcoming",
  }));

  const progress = installmentProgress([...plan].reverse());

  assert.equal(progress.installments.length, 24);
  assert.equal(progress.completed, 5);
  assert.equal(progress.next?.sequence, 6);
  assert.equal(progress.next?.remaining, 3980.15);
  assert.equal(progress.next?.verified, 1020.1);
  assert.equal(progress.next?.dueDate, "2026-10-30");
  assert.ok(progress.next!.percentage > 20 && progress.next!.percentage < 21);
  assert.equal(progress.installments[23].percentage, 0);
  assert.equal(plan[0].sequence_no, 1);

  const paid = installmentProgress(
    plan.map((item) => ({
      ...item,
      paid_applied: "6000.00",
    })),
  );

  assert.equal(paid.completed, 24);
  assert.equal(paid.next, undefined);
  assert.ok(
    paid.installments.every(
      (item) => item.percentage === 100 && item.remaining === 0,
    ),
  );
  assert.deepEqual(installmentProgress([]), {
    installments: [],
    completed: 0,
    next: undefined,
  });
});

test("installment completion is based on verified allocations rather than a status label", () => {
  const progress = installmentProgress([
    {
      sequence_no: 1,
      due_date: "2026-10-30",
      expected_amount: "2000.00",
      paid_applied: "0.00",
      status: "paid",
    },
  ]);

  assert.equal(progress.completed, 0);
  assert.equal(progress.next?.remaining, 2000);
  assert.equal(progress.next?.percentage, 0);
});

test("staff come from verified records, merge roles by ID, and keep distinct staff with the same name", () => {
  const rows = [
    {
      id: "payment-1",
      status: "verified",
      recorded_by: "staff-1",
      recorded_by_name: "Alex",
      verified_by: "staff-1",
      verifier_name: "Alex",
    },
    {
      id: "payment-2",
      status: "verified",
      recorded_by: "staff-2",
      recorded_by_name: "Alex",
      verified_by: null,
      verifier_name: null,
    },
    {
      id: "payment-3",
      status: "pending",
      recorded_by: "staff-3",
      recorded_by_name: "Pending recorder",
    },
    {
      id: "payment-4",
      status: "verified",
      recorded_by: "staff-4",
      recorded_by_name: "  ",
      verified_by: null,
    },
  ] as Payment[];

  assert.deepEqual(paymentStaff(rows), [
    {
      id: "staff-1",
      name: "Alex",
      roles: ["Recorder", "Finance verifier"],
      paymentId: "payment-1",
    },
    {
      id: "staff-2",
      name: "Alex",
      roles: ["Recorder"],
      paymentId: "payment-2",
    },
  ]);
});
