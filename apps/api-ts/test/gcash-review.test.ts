import { test } from "node:test";
import assert from "node:assert/strict";
import {
  gcashCorrectionSchema,
  gcashArchiveSchema,
  type GcashReading,
} from "@freshphones/contracts";
import { reconcileReading } from "../src/gcash-history/reconcile-reading";

const reading: GcashReading = {
  version: 1,
  status: "PARSED",
  method: "TEXT",
  pages: 1,
  transactionCount: 2,
  rows: [
    {
      page: 1,
      date: "2026-10-01",
      time: "09:00",
      description: "Synthetic receipt",
      reference: "0001",
      debit: null,
      credit: "0.20",
      balance: "0.30",
      warnings: [],
    },
    {
      page: 1,
      date: "2026-10-02",
      time: "09:00",
      description: "Synthetic fee",
      reference: "0002",
      debit: "0.10",
      credit: null,
      balance: "0.20",
      warnings: [],
    },
  ],
  openingBalance: "0.10",
  closingBalance: "0.20",
  totalDebit: "0.10",
  totalCredit: "0.20",
  calculatedDebit: "0.10",
  calculatedCredit: "0.20",
  checks: {
    debitTotalMatches: true,
    creditTotalMatches: true,
    runningBalancesMatch: true,
    closingBalanceMatches: true,
  },
  warnings: [],
};

test("correction reconciliation uses exact centavos and leaves the original untouched", () => {
  const before = structuredClone(reading);

  const result = reconcileReading(reading, structuredClone(reading.rows), {
    start: "2026-10-01",
    end: "2026-10-31",
  });

  assert.deepEqual(result.checks, reading.checks);

  assert.equal(result.calculatedCredit, "0.20");

  assert.deepEqual(reading, before);
});

test("whole-statement checks catch edited totals, intervening running balances and out-of-period dates", () => {
  const rows = structuredClone(reading.rows);

  rows[0].credit = "0.21";

  rows[1].date = "2026-11-01";

  const result = reconcileReading(reading, rows, {
    start: "2026-10-01",
    end: "2026-10-31",
  });

  assert.equal(result.checks.creditTotalMatches, false);

  assert.equal(result.checks.runningBalancesMatch, false);

  assert.equal(result.checks.closingBalanceMatches, true);

  assert.equal(result.status, "PARTIAL");

  assert.ok(
    result.warnings.some((item) => {
      return item.includes("covered period");
    }),
  );
});

test("missing balances remain unchecked and original OCR/parser warnings survive corrections", () => {
  const original = {
    ...reading,
    openingBalance: null,
    warnings: ["Synthetic OCR uncertainty"],
  };

  const rows = structuredClone(reading.rows);

  rows[1].balance = null;

  const result = reconcileReading(original, rows, {
    start: "2026-10-01",
    end: "2026-10-31",
  });

  assert.equal(result.checks.runningBalancesMatch, null);

  assert.equal(result.checks.closingBalanceMatches, null);

  assert.ok(result.warnings.includes("Synthetic OCR uncertainty"));
});

test("correction contracts reject ambiguous money, invalid dates/times, missing reasons and hidden row fields", () => {
  const { page: _, warnings: __, ...row } = reading.rows[0];

  const input = {
    version: 1,
    correctionVersion: 0,
    rowIndex: 0,
    reason: "Compare PDF",
    row,
  };

  assert.equal(gcashCorrectionSchema.safeParse(input).success, true);

  for (const patch of [
    { debit: "-1.00" },
    { credit: "1,000.00" },
    { credit: "1.234" },
    { date: "2026-02-30" },
    { time: "25:60" },
    { debit: "1.00", credit: "1.00" },
    { page: 2 },
    { verified: true },
  ]) {
    assert.equal(
      gcashCorrectionSchema.safeParse({ ...input, row: { ...row, ...patch } })
        .success,
      false,
      JSON.stringify(patch),
    );
  }

  assert.equal(
    gcashCorrectionSchema.safeParse({ ...input, reason: " " }).success,
    false,
  );

  assert.equal(
    gcashArchiveSchema.safeParse({ version: 1, reason: " ", archived: true })
      .success,
    false,
  );

  assert.equal(
    gcashArchiveSchema.safeParse({
      version: 0,
      reason: "test",
      archived: false,
    }).success,
    false,
  );
});
