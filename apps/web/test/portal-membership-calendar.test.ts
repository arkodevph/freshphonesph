import test from "node:test";
import assert from "node:assert/strict";
import { calendarDate, calendarMonthDays, membershipCalendarEvents, membershipMilestones, moveCalendarDate, moveCalendarMonth } from "../lib/portal-membership-calendar";
import type { PortalScheduleItem } from "../lib/api";

test("membership dates retain their date-only value and reject missing or impossible dates", () => {
  assert.equal(calendarDate("2026-09-01T00:00:00+08:00"), "2026-09-01");
  assert.equal(calendarDate("2028-02-29"), "2028-02-29");
  for (const value of [null, undefined, "", "not recorded", "2026-02-29", "2026-02-30", "2026-13-01"]) assert.equal(calendarDate(value), null);
  assert.deepEqual(membershipMilestones({ joined_at: "2026-09-01", batch_start_date: null, batch_end_date: "2026-02-30" }).map(item => item.date), ["2026-09-01", null, null]);
});

test("calendar keeps milestones sharing a date and all recorded installment due dates", () => {
  const milestones = membershipMilestones({ joined_at: "2026-09-01", batch_start_date: "2026-09-01", batch_end_date: "2027-02-28" });
  const schedule = [
    { sequence_no: 6, due_date: "2027-02-28", expected_amount: "5000", paid_applied: "0", status: "upcoming" },
    { sequence_no: 1, due_date: "2026-09-01", expected_amount: "5000", paid_applied: "5000", status: "paid" },
    { sequence_no: 2, due_date: "invalid", expected_amount: "5000", paid_applied: "0", status: "upcoming" },
  ] satisfies PortalScheduleItem[];
  const events = membershipCalendarEvents(milestones, schedule);
  assert.deepEqual(events.filter(event => event.date === "2026-09-01").map(event => event.label), ["Joined", "Batch start", "Installment 1 due"]);
  assert.equal(events.length, 5);
  assert.equal(events.find(event => event.id === "installment-6")?.href, "/portal/schedule#installment-6");
  assert.equal(schedule[0].sequence_no, 6);
  assert.deepEqual(membershipCalendarEvents(membershipMilestones({}), []), []);
});

test("calendar weeks start on Sunday and include leap days and adjacent months", () => {
  const september = calendarMonthDays("2026-09");
  assert.equal(september.length, 42);
  assert.equal(september[0], "2026-08-30");
  assert.equal(september[2], "2026-09-01");
  assert.equal(september[41], "2026-10-10");
  assert.ok(calendarMonthDays("2028-02").includes("2028-02-29"));
  assert.equal(calendarMonthDays("2027-02").filter(day => day.startsWith("2027-02")).length, 28);
  assert.ok(calendarMonthDays("2027-01").includes("2026-12-27"));
  assert.deepEqual(calendarMonthDays("2026-13"), []);
});

test("month navigation clamps the selected day rather than skipping February", () => {
  assert.equal(moveCalendarMonth("2027-01-31", 1), "2027-02-28");
  assert.equal(moveCalendarMonth("2028-01-31", 1), "2028-02-29");
  assert.equal(moveCalendarMonth("2028-03-31", -1), "2028-02-29");
  assert.equal(moveCalendarMonth("2026-12-01", 1), "2027-01-01");
  assert.equal(moveCalendarMonth("2027-01-01", -1), "2026-12-01");
});

test("day navigation crosses month and year boundaries without shifting dates by timezone", () => {
  assert.equal(moveCalendarDate("2027-01-01", -1), "2026-12-31");
  assert.equal(moveCalendarDate("2028-02-28", 1), "2028-02-29");
  assert.equal(moveCalendarDate("2028-02-29", 1), "2028-03-01");
  assert.equal(moveCalendarDate("2026-09-01", -7), "2026-08-25");
});
