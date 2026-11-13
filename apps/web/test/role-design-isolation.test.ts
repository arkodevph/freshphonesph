import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import {
  businessRole,
  effectivePermissions,
  roles,
} from "@freshphones/contracts";
import { workspaceDesignRole } from "../lib/workspace-design-role";
import {
  canOpenWorkspace,
  workspacePermissions,
} from "../lib/workspace-access";

const root = path.resolve(import.meta.dirname, "..");

const designs = path.join(root, "app/system/_role-designs");

const manifest = JSON.parse(
  readFileSync(path.join(designs, "manifest.json"), "utf8"),
) as {
  roles: Record<string, { routes: string[]; files: string[] }>;
};

test("every staff role owns its permitted page designs", () => {
  for (const role of roles) {
    if (businessRole(role) !== role || role === "CUSTOMER") {
      continue;
    }

    const key = role.toLowerCase();

    const design = manifest.roles[key];

    assert.ok(design, key);

    const grants = effectivePermissions({
      role,
      hrConfidentialAccess: role === "HR_PAYROLL",
    });

    for (const route of ["/system", ...Object.keys(workspacePermissions)]) {
      assert.equal(
        design.routes.includes(route),
        canOpenWorkspace(key, route, grants),
        `${key}: ${route}`,
      );
    }
  }
});

test("role designs cannot import another role or the original page designs", () => {
  for (const [role, design] of Object.entries(manifest.roles)) {
    const prefix = `@/app/system/_role-designs/${role}/`;

    for (const file of design.files) {
      const source = readFileSync(path.join(root, file), "utf8");

      const imports = source.matchAll(
        /(?:from\s*|import\s*\(?\s*)["'](@\/(?:app|components)\/[^"']+)["']/g,
      );

      for (const [, target] of imports) {
        // The dropdown context is runtime identity shared with the shell, not a view.
        assert.ok(
          target.startsWith(prefix) ||
            target === "@/components/dropdown/HandlerDropdownScope" ||
            /^use[A-Z]/.test(path.basename(target)),
          `${file} imports a shared design: ${target}`,
        );
      }
    }

    const theme = readFileSync(
      path.join(designs, role, "workspace.css"),
      "utf8",
    );

    for (const [, selectedRole] of theme.matchAll(
      /data-workspace-role="([^"]+)"/g,
    )) {
      assert.equal(
        selectedRole,
        role,
        `${role} theme leaks to ${selectedRole}`,
      );
    }
  }
});

test("compatibility roles use their business role and unknown roles fail closed", () => {
  assert.equal(workspaceDesignRole("owner"), "ceo");

  assert.equal(workspaceDesignRole("general_manager"), "batch_manager");

  assert.equal(workspaceDesignRole("cs_head"), "csr");

  assert.equal(workspaceDesignRole("cs_team"), "csr");

  assert.equal(workspaceDesignRole("core_handler"), "batch_handler");

  assert.equal(workspaceDesignRole("records_monitoring"), "records");

  assert.equal(workspaceDesignRole("customer"), null);

  assert.equal(workspaceDesignRole("unknown"), null);

  assert.equal(workspaceDesignRole(null), null);
});
