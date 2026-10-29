import "reflect-metadata";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import { rolePermissions, type Role, type User } from "@freshphones/contracts";
import { createApp } from "../src/app";
import { Database } from "../src/database";
import { hashPassword } from "../src/auth/password";
import { ReportsService } from "../src/reports/reports.service";
import { AuthService } from "../src/auth/auth.service";
import { queueTaskEmail } from "../src/staff/email-queue";
import { StaffEmailService } from "../src/staff/staff-email.service";
import type { Config } from "../src/config";

const databaseUrl = process.env.TEST_DATABASE_URL;

if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith("_test")) {
  throw new Error(
    "CEO access tests require a dedicated TEST_DATABASE_URL ending in _test.",
  );
}

const origin = "http://localhost:3100";

const suffix = randomUUID().slice(0, 8);

const password = "Synthetic-CEO-access-test-123!";

let app: INestApplication;

let db: Database;

let base: string;

let snapshotId: string;

const sessions = new Map<Role, { cookie: string; id: string; user: User }>();

async function request(
  role: Role | null,
  path: string,
  method = "GET",
  body?: unknown,
) {
  return fetch(`${base}/api${path}`, {
    method,
    headers: {
      Origin: origin,
      Cookie: role ? sessions.get(role)!.cookie : "",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

before(async () => {
  app = await createApp({
    NODE_ENV: "test",
    PORT: 4100,
    HOST: "127.0.0.1",
    DATABASE_URL: databaseUrl,
    WEB_ORIGIN: origin,
    JWT_SECRET: "ceo-access-test-secret-at-least-32-characters",
    LOCAL_DEMO_AUTH: false,
    EMAIL_FROM: "synthetic@example.test",
    CUSTOMER_REMINDER_DAYS_BEFORE: "",
    PRIVATE_STORAGE_PROVIDER: "local",
    PRIVATE_STORAGE_S3_REGION: "ap-southeast-1",
    ABUSE_LIMITS: { expensive: [[1000, 60]], read: [[1000, 60]] },
  } as Config);

  await app.listen(0, "127.0.0.1");

  base = await app.getUrl();

  db = app.get(Database);

  await db.abuseBucket.deleteMany();

  const passwordHash = await hashPassword(password);

  for (const role of ["CEO", "COO", "FINANCE_OFFICER"] as const) {
    const user = await db.user.create({
      data: {
        name: `Synthetic ${role}`,
        email: `ceo-access-${role.toLowerCase()}-${suffix}@example.test`,
        role,
        passwordHash,
      },
    });

    const response = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email, password }),
    });

    assert.equal(response.status, 200);

    sessions.set(role, {
      id: user.id,
      user: (await response.json()).user,
      cookie: response.headers
        .getSetCookie()
        .map((cookie) => {
          return cookie.split(";")[0];
        })
        .join("; "),
    });
  }

  const snapshot = await request("COO", "/reports/snapshots", "POST", {
    kind: "PAYMENTS",
    periodStart: "2045-02-01",
    periodEnd: "2045-02-28",
  });

  assert.equal(snapshot.status, 201);

  snapshotId = (await snapshot.json()).id;
});

after(async () => {
  if (app) {
    await app.close();
  }
});

test("CEO can read all existing report families, history and exports", async () => {
  const identity = await request("CEO", "/auth/me");

  const user = await identity.json();

  assert.equal(user.role, "CEO");

  assert.deepEqual(user.permissions, ["REPORT_VIEW"]);

  for (const path of [
    "/reports/charts",
    "/reports/dashboard",
    "/reports/payments",
    "/reports/batches",
    "/reports/collections",
    "/reports/reconciliation",
    "/reports/tasks",
    "/reports/support",
    "/reports/snapshots",
    "/reports/export?kind=payments&format=csv",
    "/reports/export?kind=collections&format=xlsx",
    "/auth/security",
    "/legal/status",
  ]) {
    assert.equal((await request("CEO", path)).status, 200, path);
  }

  assert.equal((await request(null, "/reports/dashboard")).status, 401);
});

test("CEO cannot read operational modules or write reports, including direct API requests", async () => {
  const before = {
    snapshots: await db.reportSnapshot.count(),
    analyses: await db.reportAnalysis.count(),
    payments: await db.payment.count(),
    accounts: await db.user.count(),
  };

  const id = randomUUID();

  for (const path of [
    "/batches",
    "/clients",
    "/payments",
    "/accounts",
    "/catalog/items",
    "/agents",
    "/work/tasks",
    "/hr-actions",
    "/support/cases",
    "/recruitment/jobs",
    "/staff-notification-settings",
    "/operations",
    "/overview",
    "/staff/alerts",
    "/operations/customer-work?kind=documents",
    "/events",
    "/portal/support",
    "/reports/reconciliation/exceptions",
  ]) {
    assert.equal((await request("CEO", path)).status, 403, path);
  }

  for (const [path, method, body] of [
    ["/batches", "POST", {}],
    ["/clients", "POST", {}],
    ["/payments", "POST", {}],
    ["/accounts", "POST", {}],
    [`/accounts/${id}`, "PATCH", { role: "SYSTEM_ADMIN", version: 1 }],
    [`/payments/${id}/verify`, "POST", {}],
    [
      "/reports/snapshots",
      "POST",
      { kind: "PAYMENTS", periodStart: "2045-02-01", periodEnd: "2045-02-28" },
    ],
    [
      `/reports/snapshots/${snapshotId}/analysis`,
      "POST",
      { body: "CEO must not submit report analysis." },
    ],
  ] as const) {
    assert.equal(
      (await request("CEO", path, method, body)).status,
      403,
      `${method} ${path}`,
    );
  }

  assert.deepEqual(
    {
      snapshots: await db.reportSnapshot.count(),
      analyses: await db.reportAnalysis.count(),
      payments: await db.payment.count(),
      accounts: await db.user.count(),
    },
    before,
  );
});

test("report services recheck current access after a writer becomes CEO", async () => {
  const coo = sessions.get("COO")!;

  const user = (await app.get(AuthService).authenticate(coo.cookie)).user;

  const task = await db.task.create({
    data: {
      title: "An old operational task",
      assigneeId: coo.id,
      creatorId: coo.id,
      deadline: new Date(Date.now() + 86400000),
    },
  });

  await db.$transaction(async (tx) => {
    await queueTaskEmail(tx, task, "TASK_ASSIGNED");
  });

  const queued = await db.staffEmail.findFirstOrThrow({
    where: { taskId: task.id },
  });

  await db.user.update({ where: { id: coo.id }, data: { role: "CEO" } });

  try {
    const reports = app.get(ReportsService);

    await assert.rejects(
      reports.createSnapshot(user, {
        kind: "PAYMENTS",
        periodStart: "2045-02-01",
        periodEnd: "2045-02-28",
      }),
      /access has changed/,
    );

    await assert.rejects(
      reports.submitAnalysis(
        user,
        snapshotId,
        "A stale writer must not submit this analysis.",
      ),
      /access has changed/,
    );

    const emails = app.get(StaffEmailService);

    assert.match(
      (await db.$transaction((tx) => {
        return emails.eligibility(tx, queued, new Date());
      }))!,
      /no longer/,
    );

    await db.$transaction(async (tx) => {
      await queueTaskEmail(tx, task, "TASK_DUE_SOON");
    });

    assert.equal(await db.staffEmail.count({ where: { taskId: task.id } }), 1);

    assert.equal((await request("COO", "/batches")).status, 401);

    const login = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({
        email: `ceo-access-coo-${suffix}@example.test`,
        password,
      }),
    });

    assert.equal(login.status, 200);

    coo.cookie = login.headers
      .getSetCookie()
      .map((cookie) => {
        return cookie.split(";")[0];
      })
      .join("; ");

    assert.equal((await request("COO", "/batches")).status, 403);

    assert.equal((await request("COO", "/reports/payments")).status, 200);
  } finally {
    await db.user.update({ where: { id: coo.id }, data: { role: "COO" } });
  }
});

test("other report writers retain authoring and only Finance retains financial verification", async () => {
  const response = await request(
    "FINANCE_OFFICER",
    `/reports/snapshots/${snapshotId}/analysis`,
    "POST",
    {
      body: "Finance submitted this analysis while the CEO remains read-only.",
    },
  );

  assert.equal(response.status, 201);

  for (const [role, permissions] of Object.entries(rolePermissions)) {
    assert.equal(
      permissions.includes("PAYMENT_VERIFY"),
      role === "FINANCE_OFFICER",
      role,
    );
  }
});
