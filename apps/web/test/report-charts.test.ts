import { test } from "node:test";
import assert from "node:assert/strict";
import {
  barScale,
  chartMaximum,
  reportChartModels,
} from "../lib/report-chart-data";
import type { LoadedReport } from "../app/system/reports/report-view";

test("signed Finance corrections share one zero baseline without changing displayed amounts", () => {
  const scale = barScale([
    { label: "Original", value: "100.00" },
    { label: "Correction", value: "-50.00" },
    { label: "Net", value: "50.00" },
  ]);

  assert.ok(Math.abs(scale.zero - 100 / 3) < 1e-9);

  assert.equal(scale.rows[1].start, 0);

  assert.ok(Math.abs(scale.rows[1].width - 100 / 3) < 1e-9);

  assert.ok(Math.abs(scale.rows[0].start + scale.rows[0].width - 100) < 1e-9);

  assert.equal(scale.empty, false);
});

test("zero and empty data do not invent visible bars or invalid scales", () => {
  assert.deepEqual(barScale([{ label: "None", value: "0.00" }]), {
    zero: 0,
    empty: true,
    rows: [{ start: 0, width: 0 }],
  });

  assert.equal(barScale([]).empty, true);

  assert.equal(chartMaximum([0, 0]), 0);

  assert.equal(chartMaximum([84250, 16750]), 100000);
});

test("older saved payment summaries omit uncaptured rejected counts", () => {
  const report = {
    kind: "payments",
    data: {
      verifiedPayments: 2,
      pendingVerification: 1,
      needsClarification: 1,
      verifiedAmount: "100.00",
      pendingAmount: "25.00",
    },
  } as LoadedReport;

  const models = reportChartModels(report);

  assert.equal(models[0].rows.length, 3);

  assert.equal(
    models[0].rows.some((row) => {
      return row.label === "Rejected";
    }),
    false,
  );

  assert.deepEqual(
    models[1].rows.map((row) => {
      return row.value;
    }),
    ["100.00", "25.00"],
  );
});

test("task submission timing includes completed submissions and stays separate from task status", () => {
  const models = reportChartModels({
    kind: "tasks",
    data: {
      total: 10,
      byStatus: { TODO: 2, IN_PROGRESS: 2, SUBMITTED: 2, DONE: 4 },
      submitted: 6,
      late: 1,
      reviewed: 0,
      disclaimer: "Factual timing only",
    },
  });

  assert.deepEqual(
    models[0].rows.map((row) => {
      return row.value;
    }),
    [2, 2, 2, 4],
  );

  assert.deepEqual(
    models[1].rows.map((row) => {
      return row.value;
    }),
    [5, 1, 4],
  );
});

test("batch rankings disclose page scope and preserve exact values without mutating data", () => {
  const items = Array.from({ length: 8 }, (_, index) => {
    return {
      code: `B-${index}`,
      remainingBalance: `10.0${index}`,
      collectedInPeriod: `${index}.00`,
    };
  }) as any;

  const before = JSON.stringify(items);

  const live = reportChartModels({
    kind: "collections",
    data: { items, total: 50, page: 1, pageSize: 20, totals: {} },
  } as LoadedReport);

  assert.equal(live[0].rows.length, 6);

  assert.equal(live[0].rows[0].value, "10.07");

  assert.match(live[0].note, /on this page/);

  assert.equal(JSON.stringify(items), before);

  const saved = reportChartModels({
    kind: "collections",
    data: {
      batches: items,
      totals: {},
      balanceBasis: "current",
      paymentGrouping: "current_client_batch",
      filters: {},
    },
  } as LoadedReport);

  assert.match(saved[0].note, /Captured.*saved report/);
});

test("saved reconciliation charts omit missing adjustment fields instead of assuming zero", () => {
  const report = {
    kind: "reconciliation",
    data: {
      totals: {
        payments: 3,
        verifiedPayments: 2,
        pendingPayments: 1,
        clarificationPayments: 0,
        rejectedPayments: 0,
        auditedVerifiedPayments: 2,
        paymentsWithFlags: 1,
        verifiedWithoutSchedulePayments: 0,
        recordedAmount: "125.00",
        verifiedAmount: "100.00",
        pendingAmount: "25.00",
        clarificationAmount: "0.00",
        rejectedAmount: "0.00",
        auditedVerifiedAmount: "100.00",
        unmatchedVerifiedAmount: "0.00",
        duplicateReferencePayments: 1,
        unmatchedVerifiedPayments: 0,
        batchMismatchPayments: 0,
        scheduleMismatchPayments: 0,
      },
      groups: [],
      basis: "current_payment_state",
      paymentGrouping: "recorded_payment_batch",
      externalStatementMatched: false,
      filters: {},
    },
  } as LoadedReport;

  const models = reportChartModels(report);

  assert.deepEqual(models[0].rows, [
    { label: "Net verified credit", value: "100.00", tone: "verified" },
  ]);

  assert.equal(
    models[1].rows.some((row) => {
      return row.label === "Adjustment audit gaps";
    }),
    false,
  );
});
