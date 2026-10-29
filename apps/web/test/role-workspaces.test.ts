import assert from "node:assert/strict";
import { test } from "node:test";
import { effectivePermissions, type Role } from "@freshphones/contracts";
import {
  canOpenWorkspace,
  workspacePermissions,
} from "../lib/workspace-access";

test("every business role has a matching workspace policy, including direct URL denial", () => {
  const expected: Partial<Record<Role, string[]>> = {
    CEO: ["/system/reports"],
    HR_PAYROLL: ["/system/personnel", "/system/tasks", "/system/recruitment"],
    KPI_OFFICER: ["/system/personnel", "/system/tasks", "/system/reports"],
    AGENT: ["/system/agent-network", "/system/enrollments", "/system/tasks"],
    PIONEER_AGENT: [
      "/system/personnel",
      "/system/agent-network",
      "/system/enrollments",
      "/system/tasks",
    ],
    OPERATIONS_COORDINATOR: [
      "/system/personnel",
      "/system/agent-network",
      "/system/enrollments",
      "/system/tasks",
    ],
    CSR: [
      "/system/inquiries",
      "/system/support",
      "/system/customer-work",
      "/system/tasks",
      "/system/reports",
    ],
    BATCH_HANDLER: [
      "/system/records",
      "/system/clients",
      "/system/payments",
      "/system/gcash-history",
      "/system/tasks",
    ],
    FINANCE_OFFICER: [
      "/system/records",
      "/system/clients",
      "/system/payments",
      "/system/gcash-history",
      "/system/reports",
      "/system/tasks",
      "/system/customer-work",
    ],
  };

  for (const [role, pages] of Object.entries(expected)) {
    const grants = effectivePermissions({ role: role as Role });

    assert.equal(canOpenWorkspace(role.toLowerCase(), "/system", grants), true);

    for (const path of Object.keys(workspacePermissions)) {
      assert.equal(
        canOpenWorkspace(role.toLowerCase(), path, grants),
        pages.includes(path),
        role + path,
      );
    }
  }

  assert.equal(canOpenWorkspace("coo", "/system/team"), true);

  assert.equal(canOpenWorkspace("coo", "/system/retention"), false);

  assert.equal(canOpenWorkspace("customer", "/system/payments"), false);
});

test("an explicit HR grant enables only the corresponding private workspace", () => {
  assert.equal(
    canOpenWorkspace(
      "hr_payroll",
      "/system/hr-actions",
      effectivePermissions({ role: "HR_PAYROLL" }),
    ),
    false,
  );

  assert.equal(
    canOpenWorkspace(
      "hr_payroll",
      "/system/hr-actions",
      effectivePermissions({ role: "HR_PAYROLL", hrConfidentialAccess: true }),
    ),
    true,
  );

  assert.equal(canOpenWorkspace("kpi_officer", "/system/hr-actions"), false);

  assert.equal(canOpenWorkspace("agent", "/system/not-a-workspace"), false);
});
