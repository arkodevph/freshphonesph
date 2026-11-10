import { test } from "node:test";
import assert from "node:assert/strict";
import { philippineGreeting, today } from "../lib/date";

test("business dates advance at Manila midnight, not UTC midnight", () => {
  for (const [instant, expected] of [
    ["2026-10-13T15:59:59.999Z", "2026-10-13"],
    ["2026-10-13T16:00:00.000Z", "2026-10-14"],
    ["2026-10-13T16:30:00.000Z", "2026-10-14"],
    ["2026-10-13T23:59:59.999Z", "2026-10-14"],
    ["2026-10-14T00:00:00.000Z", "2026-10-14"],
    ["2026-12-31T16:00:00.000Z", "2027-01-01"],
    ["2028-02-28T16:00:00.000Z", "2028-02-29"],
  ]) {
    assert.equal(today(new Date(instant)), expected);
  }
});

test("form defaults use the current Manila business date", (context) => {
  context.mock.timers.enable({
    apis: ["Date"],
    now: Date.parse("2026-10-13T16:30:00.000Z"),
  });

  assert.equal(today(), "2026-10-14");
});

test("greetings follow Philippine time at morning, noon and evening boundaries", () => {
  for (const [instant, expected] of [
    ["2026-10-27T20:59:59Z", "Good evening"],
    ["2026-10-27T21:00:00Z", "Good morning"],
    ["2026-10-28T03:59:59Z", "Good morning"],
    ["2026-10-28T04:00:00Z", "Good afternoon"],
    ["2026-10-28T09:59:59Z", "Good afternoon"],
    ["2026-10-28T10:00:00Z", "Good evening"],
    ["2026-10-28T16:00:00Z", "Good evening"],
  ]) {
    assert.equal(philippineGreeting(new Date(instant)), expected);
  }
});
