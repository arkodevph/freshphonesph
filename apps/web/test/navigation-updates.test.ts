import assert from "node:assert/strict";
import test from "node:test";
import {
  addNavigationUpdates,
  isCurrentNavigationRoute,
  navigationUpdateRoutes,
  parseLiveRecordChange,
} from "../lib/navigation-updates";

test("only valid change frames identify new data", () => {
  assert.deepEqual(
    parseLiveRecordChange('{"entity":"payment","recordId":"p1"}'),
    { entity: "payment", recordId: "p1" },
  );

  for (const data of [
    "{}",
    "null",
    "broken",
    '{"entity":"task"}',
    '{"entity":3,"recordId":"t1"}',
  ]) {
    assert.equal(parseLiveRecordChange(data), null);
  }
});

test("ready, unknown events and read receipts never invent badges", () => {
  const current = ["/system/tasks"];

  assert.equal(
    addNavigationUpdates(
      current,
      undefined,
      ["/system/tasks"],
      "/system",
      true,
    ),
    current,
  );

  assert.deepEqual(navigationUpdateRoutes("staff-alert-read"), []);

  assert.deepEqual(navigationUpdateRoutes("__proto__"), []);
});

test("changes badge only permitted destinations outside the visible page", () => {
  const change = { entity: "payment", recordId: "p1" };

  assert.deepEqual(
    addNavigationUpdates(
      [],
      change,
      ["/system/payments", "/system/reports"],
      "/system/payments",
      true,
    ),
    ["/system/reports"],
  );

  assert.deepEqual(
    addNavigationUpdates(
      [],
      change,
      ["/system/payments"],
      "/system/payments",
      false,
    ),
    ["/system/payments"],
  );

  const current = ["/system/reports"];

  assert.equal(
    addNavigationUpdates(current, change, ["/system/reports"], "/system", true),
    current,
  );
});

test("opening a nested detail acknowledges its section without matching similar names", () => {
  assert.equal(
    isCurrentNavigationRoute(
      "/system/enrollments",
      "/system/enrollments/applications",
    ),
    true,
  );

  assert.equal(isCurrentNavigationRoute("/system", "/system/reports"), false);

  assert.equal(
    isCurrentNavigationRoute("/system/agents", "/system/agent-network"),
    false,
  );
});
