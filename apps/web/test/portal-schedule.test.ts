import test from "node:test";
import assert from "node:assert/strict";
import { installmentState, scheduleDueNow } from "../lib/portal-schedule";
import type { PortalScheduleItem } from "../lib/api";

const rows = [
  { sequence_no: 1, due_date: "2026-09-24", expected_amount: "5000.00", paid_applied: "2000.00", status: "partial" },
  { sequence_no: 2, due_date: "2026-09-26", expected_amount: "5000.00", paid_applied: "0.00", status: "upcoming" },
  { sequence_no: 3, due_date: "2026-10-26", expected_amount: "5000.00", paid_applied: "0.00", status: "upcoming" },
] as PortalScheduleItem[];

test("partial payment and overdue timing remain separate, and due now excludes future installments", () => {
  assert.deepEqual(installmentState(rows[0], "2026-09-26"), { remaining: 3000, payment: "Partially paid", timing: "Overdue", isDue: true });
  assert.deepEqual(installmentState(rows[1], "2026-09-26"), { remaining: 5000, payment: "Unpaid", timing: "Due today", isDue: true });
  assert.equal(scheduleDueNow(rows, "2026-09-26"), 8000);
});
