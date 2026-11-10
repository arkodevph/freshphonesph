import "reflect-metadata";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import {
  accountListQuerySchema,
  accountSchema,
  accountUpdateSchema,
  businessRoles,
  effectivePermissions,
  roleLabels,
  roles,
  type Role,
} from "@freshphones/contracts";
import { createApp } from "../src/app";
import { Database } from "../src/database";
import { hashPassword } from "../src/auth/password";
import { safeUser } from "../src/auth/auth.service";
import { allowed } from "../src/auth/access";

const url = process.env.TEST_DATABASE_URL;

if (!url || !new URL(url).pathname.endsWith("_test")) {
  throw new Error(
    "Dedicated migrated TEST_DATABASE_URL ending in _test required.",
  );
}

const origin = "http://localhost:3100",
  password = "Synthetic-Owner-CEO-merge-123!",
  suffix = randomUUID();

let app: INestApplication, db: Database, base: string, executiveId: string;

const cookies = new Map<Role, string>();

async function request(
  role: Role,
  path: string,
  method = "GET",
  body?: unknown,
) {
  return fetch(base + "/api" + path, {
    method,
    headers: {
      Origin: origin,
      Cookie: cookies.get(role) ?? "",
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

before(async () => {
  app = await createApp({
    NODE_ENV: "test",
    HOST: "127.0.0.1",
    PORT: 4100,
    DATABASE_URL: url!,
    WEB_ORIGIN: origin,
    JWT_SECRET: "synthetic-owner-ceo-secret-at-least-32-characters",
    LOCAL_DEMO_AUTH: false,
    EMAIL_FROM: "synthetic@example.test",
    CUSTOMER_REMINDER_DAYS_BEFORE: "",
    PRIVATE_STORAGE_PROVIDER: "local",
    PRIVATE_STORAGE_S3_REGION: "ap-southeast-1",
    ABUSE_LIMITS: {
      auth: [[1000, 60]],
      expensive: [[1000, 60]],
      accountRead: [[10000, 60]],
      accountWrite: [[10000, 60]],
    },
  });

  await app.listen(0, "127.0.0.1");

  base = await app.getUrl();

  db = app.get(Database);

  await db.abuseBucket.deleteMany();

  const passwordHash = await hashPassword(password);

  for (const role of ["CEO", "COO", "SYSTEM_ADMIN"] as const) {
    const user = await db.user.create({
      data: {
        name: "Synthetic " + role,
        email: `owner-ceo-${role.toLowerCase()}-${suffix}@example.test`,
        role,
        passwordHash,
      },
    });

    if (role === "CEO") {
      executiveId = user.id;
    }

    const response = await fetch(base + "/api/auth/login", {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email, password }),
    });

    assert.equal(response.status, 200, role);

    cookies.set(
      role,
      response.headers
        .getSetCookie()
        .map((cookie) => {
          return cookie.split(";")[0];
        })
        .join("; "),
    );
  }
});

after(async () => {
  await app?.close();
});

test("Owner and CEO have one report-only permission set, label and current business choice", () => {
  for (const role of ["CEO", "OWNER"] as const) {
    assert.deepEqual(
      effectivePermissions({ role, hrConfidentialAccess: true }),
      ["REPORT_VIEW"],
    );

    assert.equal(roleLabels[role], "Owner / CEO");

    for (const permission of [
      "ACCOUNT_MANAGE",
      "HR_CONFIDENTIAL",
      "PAYMENT_VERIFY",
      "PAYMENT_RECORD",
      "RETENTION_MANAGE",
    ] as const) {
      assert.equal(
        allowed({ role, hrConfidentialAccess: true }, permission),
        false,
        role + permission,
      );
    }
  }

  assert.equal(
    roles.some((role) => {
      return String(role) === "OWNER";
    }),
    false,
  );

  assert.equal(
    businessRoles.filter((role) => {
      return ["CEO", "OWNER"].includes(role);
    }).length,
    1,
  );

  assert.equal(businessRoles.includes("SYSTEM_ADMIN"), false);

  assert.equal(
    accountSchema.parse({
      name: "Synthetic business owner",
      email: "owner@example.test",
      role: "OWNER",
      password,
    }).role,
    "CEO",
  );

  assert.equal(
    accountUpdateSchema.parse({ version: 1, role: "OWNER" }).role,
    "CEO",
  );

  assert.equal(accountListQuerySchema.parse({ role: "OWNER" }).role, "CEO");

  assert.equal(
    safeUser({
      id: "legacy",
      name: "Legacy owner",
      email: "owner@example.test",
      role: "OWNER",
      clientId: null,
    }).role,
    "CEO",
  );
});

test("business Owner/CEO can read all reports but cannot recover former technical powers", async () => {
  const me = await (await request("CEO", "/auth/me")).json();

  assert.equal(me.role, "CEO");

  assert.deepEqual(me.permissions, ["REPORT_VIEW"]);

  for (const path of [
    "/reports/payments",
    "/reports/collections",
    "/reports/reconciliation",
    "/reports/tasks",
    "/reports/support",
    "/reports/snapshots",
  ]) {
    assert.equal((await request("CEO", path)).status, 200, path);
  }

  for (const path of [
    "/accounts",
    "/audit",
    "/staff/directory",
    "/batches",
    "/clients",
    "/payments",
    "/hr-actions",
    "/tasks",
    "/retention/policies",
    "/events",
  ]) {
    assert.equal((await request("CEO", path)).status, 403, path);
  }

  assert.equal(
    (
      await request("CEO", "/reports/snapshots", "POST", {
        kind: "PAYMENTS",
        periodStart: "2045-01-01",
        periodEnd: "2045-01-31",
      })
    ).status,
    403,
  );
});

test("COO creates the merged business role from the legacy spelling without provisioning an administrator", async () => {
  const created = await request("COO", "/accounts", "POST", {
    name: "Synthetic merged owner",
    email: `merged-owner-${suffix}@example.test`,
    role: "OWNER",
    password,
  });

  assert.equal(created.status, 201);

  const user = await created.json();

  assert.equal(user.role, "CEO");

  assert.equal(
    (await db.user.findUniqueOrThrow({ where: { id: user.id } })).role,
    "CEO",
  );

  assert.equal(
    (
      await request("COO", "/accounts", "POST", {
        name: "Synthetic forbidden admin",
        email: `forbidden-admin-${suffix}@example.test`,
        role: "SYSTEM_ADMIN",
        password,
      })
    ).status,
    403,
  );

  const admin = await db.user.findFirstOrThrow({
    where: { email: `owner-ceo-system_admin-${suffix}@example.test` },
  });

  assert.equal((await request("COO", `/accounts/${admin.id}`)).status, 404);

  assert.equal((await request("SYSTEM_ADMIN", "/accounts")).status, 200);

  assert.equal(
    (
      await request(
        "SYSTEM_ADMIN",
        `/payments/${randomUUID()}/verify`,
        "POST",
        {
          version: 1,
          decision: "VERIFIED",
          notes: "Synthetic forbidden verification",
        },
      )
    ).status,
    403,
  );
});

test("new legacy OWNER rows are rejected while executive identity and audit links stay intact", async () => {
  const executive = await db.user.findUniqueOrThrow({
    where: { id: executiveId },
  });

  await assert.rejects(
    db.user.create({
      data: {
        name: "Synthetic legacy spelling",
        email: `legacy-row-${suffix}@example.test`,
        role: "OWNER",
        passwordHash: executive.passwordHash,
      },
    }),
  );

  assert.equal(await db.user.count({ where: { role: "OWNER" } }), 0);

  assert.equal(
    (await db.user.findUniqueOrThrow({ where: { id: executiveId } })).id,
    executiveId,
  );
});
