import { test } from "node:test";
import assert from "node:assert/strict";
import { previousReportPeriod, reportChange } from "../lib/report-comparison";
import { reportHighlights } from "../lib/report-summary";
import type { CollectionReport } from "@freshphones/contracts";

test("comparison uses the preceding equal inclusive period and preserves filters", () => {
  const current = {
    dateFrom: "2026-11-01",
    dateTo: "2026-11-06",
    batchId: "batch-a",
    status: "VERIFIED",
  };

  assert.deepEqual(previousReportPeriod(current), {
    ...current,
    dateFrom: "2026-10-26",
    dateTo: "2026-10-31",
  });

  assert.deepEqual(
    previousReportPeriod({
      ...current,
      dateFrom: "2024-03-01",
      dateTo: "2024-03-01",
    }),
    { ...current, dateFrom: "2024-02-29", dateTo: "2024-02-29" },
  );

  assert.deepEqual(
    previousReportPeriod({
      ...current,
      dateFrom: "2026-01-01",
      dateTo: "2026-01-01",
    }),
    { ...current, dateFrom: "2025-12-31", dateTo: "2025-12-31" },
  );

  for (const patch of [
    { dateFrom: "" },
    { dateTo: "" },
    { dateFrom: "2026-02-30" },
    { dateFrom: "2026-12-01" },
  ]) {
    assert.equal(previousReportPeriod({ ...current, ...patch }), null);
  }
});

test("small changes retain direction, percentage precision and zero-baseline honesty", () => {
  assert.equal(reportChange("1001.20", "1000.00").label, "0.12%");

  assert.equal(reportChange("1001.20", "1000.00").direction, "up");

  assert.equal(reportChange("998.80", "1000.00").direction, "down");

  assert.equal(reportChange("998.80", "1000.00").label, "0.12%");

  assert.equal(reportChange(0, 100).label, "100.00%");

  assert.equal(reportChange(0, 0).direction, "flat");

  assert.equal(reportChange(0, 0).label, "0.00%");

  assert.equal(reportChange(10, 0).label, "New");

  assert.equal(reportChange(1.00001, 1).label, "<0.01%");

  assert.equal(reportChange(undefined, undefined).label, "No history");

  assert.equal(reportChange(5, undefined).direction, "unavailable");

  assert.equal(reportChange("not captured", 10).direction, "unavailable");

  assert.equal(reportChange(10, -10).label, "No baseline");
});

test("lifetime collections totals never masquerade as period comparisons", () => {
  const totals: CollectionReport["totals"] = {
    clients: 1,
    scheduledClients: 0,
    clientsWithoutSchedule: 1,
    agreedAmount: "0.00",
    verifiedAmount: "0.00",
    pendingAmount: "0.00",
    remainingBalance: "0.00",
    collectedInPeriod: "0.00",
    pendingInPeriod: "0.00",
    verifiedPaymentsInPeriod: 0,
    pendingPaymentsInPeriod: 0,
    overpaidAmount: "0.00",
    adjustmentAmount: "0.00",
  };

  const report: CollectionReport = {
    totals,
    items: [],
    total: 0,
    page: 1,
    pageSize: 20,
  };

  const highlights = reportHighlights({ kind: "collections", data: report });

  assert.equal(highlights[0].comparisonValue, "0.00");

  assert.equal(highlights[1].comparisonValue, "0.00");

  assert.equal(highlights[2].comparisonValue, undefined);

  assert.equal(highlights[3].comparisonValue, undefined);
});
