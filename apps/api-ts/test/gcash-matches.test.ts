import { test } from "node:test";
import assert from "node:assert/strict";
import type { GcashReading } from "@freshphones/contracts";
import { classifyMatches } from "../src/gcash-history/payment-matches";

const row: GcashReading["rows"][number] = {
  page: 1,
  date: "2026-10-01",
  time: "23:59",
  description: "Synthetic",
  reference: "0001",
  debit: null,
  credit: "0.20",
  balance: null,
  warnings: [],
};

const period = { from: "2026-10-01", to: "2026-10-31" };

const evidence = [
  { rowIndex: 0, references: 1, exact: 1, paymentId: "synthetic-payment" },
];

test("strict match is only a suggestion and leaves inputs untouched", () => {
  const before = structuredClone(row);

  assert.deepEqual(classifyMatches([row], evidence, period), [
    { rowIndex: 0, status: "SUGGESTED", paymentId: "synthetic-payment" },
  ]);

  assert.deepEqual(row, before);

  assert.equal(
    classifyMatches([row], [{ ...evidence[0], exact: 0 }], period)[0].status,
    "UNMATCHED",
  );
});

test("duplicate statement references across pages and duplicate recorded references suppress links", () => {
  const matches = classifyMatches(
    [row, { ...row, page: 2, credit: "5.00" }],
    evidence,
    period,
  );

  assert(
    matches.every((match) => {
      return match.status === "AMBIGUOUS" && match.paymentId === null;
    }),
  );

  assert.deepEqual(
    classifyMatches([row], [{ ...evidence[0], references: 2 }], period)[0],
    { rowIndex: 0, status: "AMBIGUOUS", paymentId: null },
  );
});

test("missing references, invalid and out-of-period dates, and outgoing rows cannot be suggested", () => {
  for (const [patch, status] of [
    [{ reference: " " }, "MISSING_REFERENCE"],
    [{ date: "2026-02-30" }, "CHECK_DATE"],
    [{ date: "2026-11-01" }, "CHECK_DATE"],
    [{ date: "unknown" }, "CHECK_DATE"],
    [{ credit: "0.00" }, "NOT_INCOMING"],
    [{ credit: null, debit: "0.20" }, "NOT_INCOMING"],
    [{ debit: "0.01" }, "NOT_INCOMING"],
  ] as const) {
    const match = classifyMatches([{ ...row, ...patch }], evidence, period)[0];

    assert.equal(match.status, status);

    assert.equal(match.paymentId, null);
  }
});
