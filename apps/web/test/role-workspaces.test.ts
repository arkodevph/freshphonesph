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
    HR_PAYROLL: [
      "/system/personnel",
      "/system/tasks",
      "/system/recruitment",
      "/system/notifications",
    ],
    KPI_OFFICER: [
      "/system/personnel",
      "/system/tasks",
      "/system/reports",
      "/system/notifications",
    ],
    AGENT: [
      "/system/agent-network",
      "/system/enrollments",
      "/system/tasks",
      "/system/withdrawals",
    ],
    PIONEER_AGENT: [
      "/system/personnel",
      "/system/agent-network",
      "/system/enrollments",
      "/system/tasks",
    ],
    OPERATIONS_COORDINATOR: [
      "/system/operations-monitor",
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
      "/system/withdrawals",
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
    if (role !== "CEO" && !pages.includes("/system/notifications")) {
      pages.push("/system/notifications");
    }
  }

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

  assert.equal(canOpenWorkspace("customer", "/system/notifications"), false);

  assert.equal(
    canOpenWorkspace("batch_handler", "/system/notifications", []),
    false,
  );
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

test("the owner AI workspace denies other roles even with reporting grants", () => {
  assert.equal(
    canOpenWorkspace("ceo", "/system/assistant", ["REPORT_VIEW"]),
    true,
  );

  assert.equal(canOpenWorkspace("owner", "/system/assistant"), true);

  for (const role of [
    "finance_officer",
    "records",
    "customer",
    "system_admin",
  ]) {
    assert.equal(
      canOpenWorkspace(role, "/system/assistant", ["REPORT_VIEW"]),
      false,
      role,
    );
  }
});
