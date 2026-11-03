import "reflect-metadata";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import type { PortalApplicationSummary, Role } from "@freshphones/contracts";
import { createApp } from "../src/app";
import { Database } from "../src/database";
import { hashPassword } from "../src/auth/password";
import { Prisma } from "../src/generated/prisma/client";

const databaseUrl = process.env.TEST_DATABASE_URL;

if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith("_test")) {
  throw new Error("A dedicated migrated _test database is required.");
}

const origin = "http://localhost:3100";

const suffix = randomUUID().slice(0, 8);

const password = "Synthetic-application-summary-password-123!";

const sessions = new Map<string, { id: string; cookie: string }>();

let app: INestApplication, db: Database, base: string;

let primary: string, secondary: string, historical: string, foreign: string;

let empty: string, erased: string, invalidPlan: string, disabled: string;

function request(role = "customer", membership?: string) {
  return fetch(`${base}/api/portal/application-summary`, {
    headers: {
      Origin: origin,
      ...(sessions.has(role) ? { Cookie: sessions.get(role)!.cookie } : {}),
      ...(membership ? { "X-Membership-Id": membership } : {}),
    },
  });
}

async function identity(
  key: string,
  role: Role,
  hash: string,
  extra: object = {},
) {
  const user = await db.user.create({
    data: {
      name: `Synthetic application ${key}`,
      email: `application-${key.toLowerCase()}-${suffix}@example.test`,
      role,
      passwordHash: hash,
      ...extra,
    },
  });

  const login = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({ email: user.email, password }),
  });

  assert.equal(login.status, 200, await login.clone().text());

  sessions.set(key, {
    id: user.id,
    cookie: login.headers
      .getSetCookie()
      .map((value) => {
        return value.split(";")[0];
      })
      .join("; "),
  });

  return user;
}

before(async () => {
  app = await createApp({
    NODE_ENV: "test",
    HOST: "127.0.0.1",
    PORT: 4100,
    DATABASE_URL: databaseUrl!,
    WEB_ORIGIN: origin,
    JWT_SECRET: "synthetic-application-summary-secret-at-least-32-chars",
    LOCAL_DEMO_AUTH: false,
    EMAIL_FROM: "synthetic@example.test",
    CUSTOMER_REMINDER_DAYS_BEFORE: "",
    PRIVATE_STORAGE_PROVIDER: "local",
    PRIVATE_STORAGE_S3_REGION: "ap-southeast-1",
    ABUSE_LIMITS: {
      auth: [[10000, 60]],
      accountRead: [[100000, 60]],
      accountWrite: [[10000, 60]],
      expensive: [[10000, 60]],
    },
  });

  await app.listen(0, "127.0.0.1");

  base = await app.getUrl();

  db = app.get(Database);

  const hash = await hashPassword(password);

  for (const role of [
    "COO",
    "CEO",
    "FINANCE_OFFICER",
    "RECORDS",
    "AGENT",
  ] as const) {
    await identity(role, role, hash);
  }

  const batch = await db.batch.create({
    data: {
      code: `APP-${suffix.toUpperCase()}`,
      model: "Recorded batch model",
      status: "ACTIVE",
      startDate: new Date("2026-11-01"),
      endDate: new Date("2027-11-01"),
      contractPrice: "900.00",
      installmentCount: 9,
      cadence: "MONTHLY",
    },
  });

  const member = await db.member.create({
    data: {
      name: "María Peña — synthetic",
      email: `shared-${suffix}@example.test`,
      phone: "+639170000001",
    },
  });

  async function membership(
    label: string,
    separate = false,
    extra: object = {},
  ) {
    const targetBatch =
      label === "primary"
        ? batch
        : await db.batch.create({
            data: {
              code: `APP-${label}-${suffix}`,
              model: "Other recorded model",
              status: "PLANNED",
              startDate: new Date("2026-11-01"),
              endDate: new Date("2027-11-01"),
              contractPrice: "900.00",
              installmentCount: 9,
              cadence: "MONTHLY",
            },
          });

    const profile = separate
      ? await db.member.create({
          data: {
            name: "Foreign private identity",
            email: `foreign-${label}-${suffix}@example.test`,
            phone: "+639170000002",
          },
        })
      : member;

    return db.client.create({
      data: {
        memberId: profile.id,
        batchId: targetBatch.id,
        name:
          label === "primary" ? "María Peña — synthetic" : `Recorded ${label}`,
        email: `recorded-${label}-${suffix}@example.test`,
        phone: "+639170000003",
        joinedAt: new Date("2026-10-30"),
        unitModel: "Recorded selected unit",
        ...extra,
      },
    });
  }

  const first = await membership("primary");

  primary = first.id;

  const second = await membership("secondary", false, {
    membershipPlan: {
      startDate: "2026-12-01",
      endDate: "2027-01-31",
      contractPrice: "120.01",
      installmentCount: 2,
      cadence: "WEEKLY",
      firstDueDate: "2026-12-08",
      monthEnd: false,
      internalNote: "INTERNAL_PLAN_NOTE_DO_NOT_PROJECT",
    },
  });

  secondary = second.id;

  historical = (
    await membership("historical", false, {
      status: "COMPLETED",
      replacementCompletedAt: new Date("2026-10-30T05:00:00Z"),
    })
  ).id;

  foreign = (await membership("foreign", true)).id;

  empty = (
    await membership("empty", false, {
      joinedAt: null,
      unitModel: "",
    })
  ).id;

  erased = (
    await membership("erased", false, {
      retentionErasedAt: new Date(),
    })
  ).id;

  invalidPlan = (
    await membership("invalid", false, {
      membershipPlan: {
        startDate: "not-a-date",
        internalNote: "PRIVATE_INVALID",
      },
    })
  ).id;

  const disabledMembership = await membership("disabled", true);

  disabled = disabledMembership.id;

  await identity("customer", "CUSTOMER", hash, {
    clientId: primary,
    memberId: member.id,
  });

  await identity("foreign", "CUSTOMER", hash, {
    clientId: foreign,
    memberId: (await db.client.findUniqueOrThrow({ where: { id: foreign } }))
      .memberId,
  });

  const disabledUser = await identity("disabled", "CUSTOMER", hash, {
    clientId: disabled,
    memberId: disabledMembership.memberId,
  });

  await db.user.update({
    where: { id: disabledUser.id },
    data: { active: false },
  });

  for (const [clientId, amounts, dates] of [
    [primary, ["100.01", "200.02"], ["2026-11-30", "2026-12-31"]],
    [secondary, ["60.00", "60.01"], ["2026-12-15", "2026-12-08"]],
    [historical, ["80.00", "80.00"], ["2026-11-01", "2026-12-01"]],
  ] as const) {
    for (let i = 0; i < amounts.length; i++) {
      await db.scheduleItem.create({
        data: {
          clientId,
          sequenceNo: i + 1,
          dueDate: new Date(dates[i]!),
          expectedAmount: amounts[i]!,
          releasedAmount: clientId === historical ? amounts[i]! : "0.00",
        },
      });
    }
  }

  await db.enrollmentRequest.create({
    data: {
      submissionId: randomUUID(),
      batchId: first.batchId,
      submittedById: sessions.get("COO")!.id,
      clientId: primary,
      status: "APPROVED",
      applicant: { staffOnly: "PRIVATE_APPLICANT_JSON" },
      reason: "PRIVATE_REVIEW_REASON",
      reviewedAt: new Date(),
    },
  });
});

after(async () => {
  await app?.close();
});

async function read(id: string): Promise<PortalApplicationSummary> {
  const response = await request("customer", id);

  assert.equal(response.status, 200, await response.clone().text());

  assert.match(response.headers.get("cache-control") ?? "", /no-store/);

  return response.json();
}

test("summary projects only the selected customer's current record and original issued plan", async () => {
  const record = await read(primary);

  assert.deepEqual(
    Object.keys(record).sort(),
    ["title", "generatedAt", "notice", "membership", "batch", "plan"].sort(),
  );

  assert.deepEqual(
    Object.keys(record.membership).sort(),
    [
      "id",
      "name",
      "email",
      "phone",
      "joinedAt",
      "status",
      "replacementCompletedAt",
      "unitModel",
    ].sort(),
  );

  assert.deepEqual(
    Object.keys(record.batch).sort(),
    ["id", "code", "model", "status", "startDate", "endDate"].sort(),
  );

  assert.deepEqual(
    Object.keys(record.plan).sort(),
    ["individual", "startDate", "endDate", "cadence", "issuedSchedule"].sort(),
  );

  assert.equal(record.title, "Application summary");

  assert.equal(record.membership.id, primary);

  assert.equal(record.membership.name, "María Peña — synthetic");

  assert.equal(record.membership.joinedAt, "2026-10-30");

  assert.equal(record.plan.individual, false);

  assert.equal(record.plan.cadence, "MONTHLY");

  assert.deepEqual(record.plan.issuedSchedule, {
    installmentCount: 2,
    firstDueDate: "2026-11-30",
    lastDueDate: "2026-12-31",
    originalTotal: "300.03",
  });

  assert.ok(Number.isFinite(Date.parse(record.generatedAt)));

  assert.match(
    record.notice,
    /application and signed agreement are handled separately/,
  );

  assert.doesNotMatch(
    JSON.stringify(record),
    /PRIVATE_|passwordHash|reviewedBy|applicant|placeholder|verifiedPaid|remainingBalance/,
  );
});

test("a non-primary owned membership uses its own agreed plan and actual issued dates", async () => {
  const record = await read(secondary);

  assert.equal(record.membership.id, secondary);

  assert.equal(record.plan.individual, true);

  assert.equal(record.plan.startDate, "2026-12-01");

  assert.equal(record.plan.endDate, "2027-01-31");

  assert.equal(record.plan.cadence, "WEEKLY");

  assert.equal(record.batch.startDate, "2026-11-01");

  assert.deepEqual(record.plan.issuedSchedule, {
    installmentCount: 2,
    firstDueDate: "2026-12-08",
    lastDueDate: "2026-12-15",
    originalTotal: "120.01",
  });

  assert.doesNotMatch(JSON.stringify(record), /INTERNAL_PLAN_NOTE/);
});

test("missing join date and unissued schedule stay explicit without manufacturing a financial plan", async () => {
  const record = await read(empty);

  assert.equal(record.membership.joinedAt, null);

  assert.equal(record.membership.unitModel, "");

  assert.equal(record.plan.issuedSchedule, null);
});

test("retained replaced history stays available and original issued amount is not treated as current balance", async () => {
  const record = await read(historical);

  assert.equal(record.membership.status, "COMPLETED");

  assert.ok(record.membership.replacementCompletedAt);

  assert.equal(record.plan.issuedSchedule?.originalTotal, "160.00");

  assert.doesNotMatch(
    JSON.stringify(record),
    /remaining|verifiedPaid|releasedAmount/,
  );
});

test("foreign selection and arbitrary missing UUID cannot export another member", async () => {
  assert.equal((await request("customer", foreign)).status, 404);

  assert.equal((await request("foreign", primary)).status, 404);

  assert.equal((await request("customer", randomUUID())).status, 404);
});

test("malformed selection fails validation without falling back to primary", async () => {
  assert.equal((await request("customer", "not-a-membership")).status, 400);
});

test("anonymous and deactivated accounts cannot export private summaries", async () => {
  assert.equal((await request("anonymous", primary)).status, 401);

  const response = await request("disabled", disabled);

  assert.ok([401, 403].includes(response.status));
});

test("staff roles including Finance and report-only CEO cannot use the customer export", async () => {
  for (const role of ["COO", "CEO", "FINANCE_OFFICER", "RECORDS", "AGENT"]) {
    assert.equal((await request(role)).status, 403, role);
  }
});

test("erased membership is not exportable", async () => {
  assert.equal((await request("customer", erased)).status, 404);
});

test("invalid stored individual plan fails for review instead of inventing batch terms", async () => {
  const response = await request("customer", invalidPlan);

  assert.equal(response.status, 409);

  assert.doesNotMatch(await response.text(), /PRIVATE_INVALID/);
});

test("summary reads preserve schedules, member records and financial rows", async () => {
  async function snapshot() {
    return db.$transaction(
      async (tx) => {
        return {
          client: await tx.client.findUniqueOrThrow({ where: { id: primary } }),
          items: await tx.scheduleItem.findMany({
            where: { clientId: primary },
            orderBy: { sequenceNo: "asc" },
          }),
          payments: await tx.payment.count(),
          releases: await tx.withdrawalScheduleRelease.count(),
          payouts: await tx.withdrawalPayout.count(),
          enrollment: await tx.enrollmentRequest.findUnique({
            where: { clientId: primary },
          }),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  const before = await snapshot();

  await read(primary);

  await read(primary);

  assert.deepEqual(await snapshot(), before);
});
