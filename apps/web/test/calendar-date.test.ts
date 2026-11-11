import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calendarDate,
  calendarDays,
  moveCalendarDate,
  moveCalendarMonth,
} from "../lib/calendar-date";

test("calendar rejects rolled-over dates and preserves years below 100", () => {
  assert.equal(calendarDate("2026-02-29"), null);

  assert.equal(calendarDate("2026-04-31"), null);

  assert.equal(calendarDate("0000-01-01"), null);

  assert.equal(calendarDate("0099-12-31")?.getUTCFullYear(), 99);
});

test("month paging clamps the selected day across leap and century years", () => {
  assert.equal(moveCalendarMonth("2028-01-31", 1), "2028-02-29");

  assert.equal(moveCalendarMonth("2100-01-31", 1), "2100-02-28");

  assert.equal(moveCalendarMonth("2028-02-29", 12), "2029-02-28");

  assert.equal(moveCalendarMonth("2026-01-31", -1), "2025-12-31");
});

test("calendar navigation keeps date strings independent of DST and year boundaries", () => {
  assert.equal(moveCalendarDate("2026-03-08", 1), "2026-03-09");

  assert.equal(moveCalendarDate("2026-11-01", -1), "2026-10-31");

  assert.equal(moveCalendarDate("2026-12-31", 1), "2027-01-01");

  assert.equal(moveCalendarDate("0001-01-01", -1), "0001-01-01");

  assert.equal(moveCalendarMonth("9999-12-31", 1), "9999-12-31");
});

test("six-week month grids keep weekdays aligned and include every date exactly once", () => {
  const days = calendarDays("2028-02-01");

  assert.equal(days.length, 42);

  assert.equal(calendarDate(days[0])?.getUTCDay(), 0);

  assert.equal(
    days.filter((day) => {
      return day.startsWith("2028-02-");
    }).length,
    29,
  );

  assert.equal(new Set(days).size, 42);

  assert.equal(calendarDays("0001-01-01")[0], "");
});
