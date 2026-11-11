import test from "node:test";
import assert from "node:assert/strict";
import {
  manilaDueAt,
  manilaInput,
  monitorAge,
} from "../app/system/operations-monitor/monitor-view";
import { canOpenWorkspace } from "../lib/workspace-access";

test("monitor due dates round-trip Philippine wall time without browser timezone drift", () => {
  assert.equal(manilaDueAt("2026-11-10T09:30"), "2026-11-10T01:30:00.000Z");

  assert.equal(manilaInput("2026-11-10T01:30:00Z"), "2026-11-10T09:30");

  assert.equal(manilaDueAt(""), null);

  assert.equal(manilaInput(null), "");

  assert.throws(() => {
    return manilaDueAt("invalid");
  });

  assert.equal(
    monitorAge("2026-11-09T00:00:00Z", "2026-11-10T01:00:00Z"),
    "1d 1h",
  );
});

test("operations queue route is available only to authorized operational roles", () => {
  for (const role of ["COO", "OPERATIONS_COORDINATOR", "SYSTEM_ADMIN"]) {
    assert(canOpenWorkspace(role, "/system/operations-monitor"));
  }

  for (const role of [
    "CEO",
    "OWNER",
    "RECORDS",
    "BATCH_HANDLER",
    "FINANCE_OFFICER",
    "CUSTOMER",
  ]) {
    assert(!canOpenWorkspace(role, "/system/operations-monitor"));
  }
});
