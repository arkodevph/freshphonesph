import assert from "node:assert/strict";
import { test } from "node:test";
import { kpiPeriod } from "../app/system/_role-designs/kpi_officer/app/system/useKpiOverview";

test("KPI month starts at Manila midnight", (context) => {
  context.mock.timers.enable({
    apis: ["Date"],
    now: Date.parse("2026-11-30T16:30:00Z"),
  });

  assert.deepEqual(kpiPeriod("month"), {
    dateFrom: "2026-12-01",
    dateTo: "2026-12-01",
  });
});

test("KPI previous month crosses a year boundary", (context) => {
  context.mock.timers.enable({
    apis: ["Date"],
    now: Date.parse("2026-12-31T16:30:00Z"),
  });

  assert.deepEqual(kpiPeriod("previous"), {
    dateFrom: "2026-12-01",
    dateTo: "2026-12-31",
  });
});

test("KPI previous month includes leap day", (context) => {
  context.mock.timers.enable({
    apis: ["Date"],
    now: Date.parse("2028-02-29T16:30:00Z"),
  });

  assert.deepEqual(kpiPeriod("previous"), {
    dateFrom: "2028-02-01",
    dateTo: "2028-02-29",
  });
});

test("KPI all-time selection sends no date filter", () => {
  assert.deepEqual(kpiPeriod("all"), {});
});
