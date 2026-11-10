import "reflect-metadata";
import { test } from "node:test";
import assert from "node:assert/strict";
import { executiveChartQuerySchema } from "@freshphones/contracts";
import { chartPeriod } from "../src/reports/charts";

test("chart windows use Philippine calendar dates and include the current partial month", () => {
  assert.deepEqual(chartPeriod(6, new Date("2026-10-26T06:00:00Z")), {
    dateFrom: "2026-05-01",
    dateTo: "2026-10-26",
  });

  assert.deepEqual(chartPeriod(3, new Date("2026-10-31T16:30:00Z")), {
    dateFrom: "2026-09-01",
    dateTo: "2026-11-01",
  });
});

test("chart windows cross years and leap days without using fixed day intervals", () => {
  assert.deepEqual(chartPeriod(12, new Date("2026-01-01T03:00:00Z")), {
    dateFrom: "2025-02-01",
    dateTo: "2026-01-01",
  });

  assert.deepEqual(chartPeriod(3, new Date("2028-02-29T04:00:00Z")), {
    dateFrom: "2027-12-01",
    dateTo: "2028-02-29",
  });
});

test("chart requests allow only bounded periods and no injected filters", () => {
  assert.deepEqual(executiveChartQuerySchema.parse({}), { months: 6 });

  for (const months of ["3", "6", "12"]) {
    assert.equal(
      executiveChartQuerySchema.parse({ months }).months,
      Number(months),
    );
  }

  for (const months of ["0", "-1", "13", "100000", "abc", "3.5"]) {
    assert.equal(
      executiveChartQuerySchema.safeParse({ months }).success,
      false,
    );
  }

  assert.equal(
    executiveChartQuerySchema.safeParse({ months: 6, role: "SYSTEM_ADMIN" })
      .success,
    false,
  );
});
