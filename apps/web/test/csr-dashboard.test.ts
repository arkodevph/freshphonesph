import assert from "node:assert/strict";
import { test } from "node:test";
import { supportPeriodQuery } from "../app/system/_role-designs/csr/app/system/csr-dashboard/csr-dashboard-data";

test("support report periods use UTC received dates across a Philippine midnight", () => {
  assert.deepEqual(
    supportPeriodQuery("month", new Date("2026-12-01T00:30:00+08:00")),
    { dateFrom: "2026-11-01", dateTo: "2026-11-30" },
  );
});

test("rolling support reporting includes exactly 30 calendar dates over a leap-day boundary", () => {
  assert.deepEqual(
    supportPeriodQuery("30days", new Date("2028-03-01T12:00:00Z")),
    { dateFrom: "2028-02-01", dateTo: "2028-03-01" },
  );
});

test("all-time support reporting removes date constraints without mutating the supplied clock", () => {
  const now = new Date("2026-01-05T04:00:00Z");

  assert.deepEqual(supportPeriodQuery("all", now), {});

  assert.deepEqual(supportPeriodQuery("30days", now), {
    dateFrom: "2025-12-07",
    dateTo: "2026-01-05",
  });

  assert.equal(now.toISOString(), "2026-01-05T04:00:00.000Z");
});
