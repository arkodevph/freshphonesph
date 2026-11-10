import { test } from "node:test";
import assert from "node:assert/strict";
import { canOpenWorkspace } from "../lib/workspace-access";
import {
  effectivePermissions,
  roleLabels,
  rolePermissions,
} from "@freshphones/contracts";

test("CEO has report viewing without business writes or private operational access", () => {
  assert.deepEqual(
    effectivePermissions({ role: "CEO", hrConfidentialAccess: true }),
    ["REPORT_VIEW"],
  );

  assert.equal(roleLabels.CEO, "Owner / CEO");

  for (const [role, permissions] of Object.entries(rolePermissions)) {
    if (
      !["CEO", "OWNER"].includes(role) &&
      permissions.includes("REPORT_VIEW")
    ) {
      assert.ok(
        permissions.includes("REPORT_WRITE"),
        `${role} retains report authoring`,
      );
    }
  }
});

test("CEO workspace admits reports and overview while blocking direct operational routes", () => {
  for (const path of ["/system", "/system/reports"]) {
    assert.equal(canOpenWorkspace("ceo", path), true, path);
  }

  for (const path of [
    "/system/payments",
    "/system/team",
    "/system/records",
    "/system/clients",
    "/system/catalog",
    "/system/agents",
    "/system/tasks",
    "/system/hr-actions",
    "/system/support",
    "/system/customer-work",
    "/system/recruitment",
    "/system/notification-settings",
    "/system/retention",
    "/system/reports-admin",
  ]) {
    assert.equal(canOpenWorkspace("ceo", path), false, path);
  }

  assert.equal(canOpenWorkspace("finance_officer", "/system/payments"), true);
});

test("legacy Owner and CEO share the executive workspace, never administrator navigation", () => {
  for (const role of ["owner", "ceo"]) {
    assert.equal(canOpenWorkspace(role, "/system/reports"), true);

    for (const path of [
      "/system/team",
      "/system/payments",
      "/system/hr-actions",
      "/system/retention",
    ]) {
      assert.equal(canOpenWorkspace(role, path), false, role + path);
    }
  }

  assert.equal(
    canOpenWorkspace("owner", "/system/team", ["ACCOUNT_MANAGE"]),
    false,
  );

  assert.equal(canOpenWorkspace("system_admin", "/system/team"), true);
});
