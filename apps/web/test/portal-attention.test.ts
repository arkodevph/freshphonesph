import { test } from "node:test";
import assert from "node:assert/strict";
import { manilaToday, portalAttention } from "../lib/portal-attention";
import type { DocumentRequirement, PortalScheduleItem, SupportCase } from "../lib/api";

test("attention uses Manila calendar dates and the unpaid verified allocation", () => {
  assert.equal(manilaToday(new Date("2026-09-25T16:30:00Z")), "2026-09-26");
  const schedule: PortalScheduleItem[] = [
    { sequence_no: 1, due_date: "2026-09-25", expected_amount: "1000.00", paid_applied: "1000.00", status: "paid" },
    { sequence_no: 2, due_date: "2026-09-26", expected_amount: "1000.00", paid_applied: "250.00", status: "partial" },
    { sequence_no: 3, due_date: "2026-09-27", expected_amount: "1000.00", paid_applied: "0.00", status: "upcoming" },
  ];
  const attention = portalAttention([], [], schedule, "2026-09-26");
  assert.equal(attention.length, 1);
  assert.equal(attention[0].href, "/portal/schedule#installment-2");
  assert.match(attention[0].detail, /₱750\.00/);
  assert.doesNotMatch(attention[0].detail, /₱1,750/);
});

test("attention links actual document corrections and waiting support requests", () => {
  const documents = [
    { key: "PHOTO_ID", label: "Valid photo ID", status: "NEEDS_CLARIFICATION", latest: { clarification: "Please show all corners." } },
    { key: "SIGNED_AGREEMENT", label: "Signed client agreement", status: "SUBMITTED", latest: null },
  ] as DocumentRequirement[];
  const cases = [
    { id: "waiting-1", status: "waiting_for_client" },
    { id: "open-1", status: "open" },
  ] as SupportCase[];
  const attention = portalAttention(documents, cases, []);
  assert.deepEqual(attention.map((item) => item.href), [
    "/portal/documents#document-PHOTO_ID", "/portal/support#case-waiting-1",
  ]);
  assert.match(attention[0].detail, /show all corners/);
});
