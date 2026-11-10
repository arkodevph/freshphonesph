import "reflect-metadata";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import {
  previewInstallments,
  type InstallmentPlan,
  type Role,
} from "@freshphones/contracts";
import { createApp } from "../src/app";
import { Database } from "../src/database";
import { hashPassword } from "../src/auth/password";
import type { Config } from "../src/config";

const databaseUrl = process.env.TEST_DATABASE_URL;

if (
  !databaseUrl ||
  !["localhost", "127.0.0.1", "[::1]"].includes(
    new URL(databaseUrl).hostname,
  ) ||
  !new URL(databaseUrl).pathname.endsWith("_test")
) {
  throw new Error(
    "Calendar schedule integration requires an isolated local TEST_DATABASE_URL ending in _test.",
  );
}

const origin = "http://localhost:3100";

const suffix = randomUUID().slice(0, 8);

let app: INestApplication;

let db: Database;

let base: string;

let agentId: string;

let issuedBatch: string;

let issuedClient: string;

const cookies = new Map<Role, string>();

const plan = {
  model: "Synthetic calendar phone",
  status: "PLANNED",
  startDate: "2028-01-01",
  endDate: "2028-03-31",
  contractPrice: "100.00",
  installmentCount: 3,
  cadence: "MONTHLY",
  firstDueDate: "2028-01-31",
  monthEnd: true,
};

function request(
  path: string,
  body?: unknown,
  role: Role | null = "COO",
  method = body === undefined ? "GET" : "POST",
) {
  return fetch(`${base}/api${path}`, {
    method,
    headers: {
      Origin: origin,
      Cookie: role ? (cookies.get(role) ?? "") : "",
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

async function create(changes: Record<string, unknown> = {}) {
  const response = await request("/batches", { ...plan, agentId, ...changes });

  assert.equal(response.status, 201, await response.clone().text());

  return response.json();
}

before(async () => {
  app = await createApp({
    NODE_ENV: "test",
    PORT: 4100,
    HOST: "127.0.0.1",
    DATABASE_URL: databaseUrl,
    WEB_ORIGIN: origin,
    JWT_SECRET: "calendar-test-only-secret-at-least-32-characters",
    LOCAL_DEMO_AUTH: false,
    EMAIL_FROM: "synthetic@example.test",
    CUSTOMER_REMINDER_DAYS_BEFORE: "",
    PRIVATE_STORAGE_PROVIDER: "local",
    PRIVATE_STORAGE_S3_REGION: "ap-southeast-1",
    ABUSE_LIMITS: { expensive: [[10000, 60]], read: [[10000, 60]] },
  } as Config);

  await app.listen(0, "127.0.0.1");

  base = await app.getUrl();

  db = app.get(Database);

  await db.abuseBucket.deleteMany();

  const password = "Synthetic-calendar-test-123!";

  const passwordHash = await hashPassword(password);

  for (const role of [
    "COO",
    "CEO",
    "FINANCE_OFFICER",
    "BATCH_HANDLER",
  ] as const) {
    const email = `calendar-${role.toLowerCase()}-${suffix}@example.test`;

    await db.user.create({
      data: { name: `Synthetic ${role}`, email, role, passwordHash },
    });

    const login = await request("/auth/login", { email, password }, null);

    assert.equal(login.status, 200);

    cookies.set(
      role,
      login.headers
        .getSetCookie()
        .map((cookie) => {
          return cookie.split(";")[0];
        })
        .join("; "),
    );
  }

  agentId = (
    await db.agent.create({
      data: { name: "Synthetic calendar Agent", code: `CAL-${suffix}` },
    })
  ).id;
});

after(async () => {
  if (app) {
    await app.close();
  }
});

test("calendar setup retains batch creation authorization and rejects report-only and scoped users", async () => {
  const body = { ...plan, agentId };

  assert.equal((await request("/batches", body, null)).status, 401);

  for (const role of ["CEO", "FINANCE_OFFICER", "BATCH_HANDLER"] as const) {
    assert.equal((await request("/batches", body, role)).status, 403, role);
  }

  assert.equal((await request("/batches", body, "COO")).status, 201);
});

test("issued calendar dates and exact amounts match the shared preview and earnings report", async () => {
  const batch = await create();

  issuedBatch = batch.id;

  assert.equal(batch.firstDueDate, "2028-01-31");

  assert.equal(batch.monthEnd, true);

  const response = await request("/clients", {
    name: "Synthetic calendar member",
    email: "calendar-member@example.test",
    phone: "",
    batchId: batch.id,
    status: "ACTIVE",
    releaseStatus: "NOT_READY",
  });

  assert.equal(response.status, 201, await response.clone().text());

  const member = await response.json();

  issuedClient = member.id;

  const stored = await db.scheduleItem.findMany({
    where: { clientId: member.id },
    orderBy: { sequenceNo: "asc" },
  });

  const preview = previewInstallments(plan as InstallmentPlan);

  assert.deepEqual(
    stored.map((item) => {
      return {
        sequenceNo: item.sequenceNo,
        dueDate: item.dueDate.toISOString().slice(0, 10),
        expectedAmount: item.expectedAmount.toFixed(2),
      };
    }),
    preview,
  );

  const balance = await (await request(`/clients/${member.id}/balance`)).json();

  assert.equal(balance.totalDue, "100.00");

  assert.equal(await db.payment.count({ where: { clientId: member.id } }), 0);

  const february = await (
    await request(
      `/reports/installment-earnings?year=2028&period=2&batchId=${batch.id}`,
      undefined,
      "CEO",
    )
  ).json();

  assert.equal(february.totals.scheduledAmount, "33.33");

  assert.equal(february.totals.installments, 1);

  const pair = await (
    await request(
      `/reports/installment-earnings?year=2028&frequency=EVERY_TWO_MONTHS&period=1&batchId=${batch.id}`,
      undefined,
      "CEO",
    )
  ).json();

  assert.equal(pair.totals.scheduledAmount, "66.66");
});

test("Bi-monthly starts exactly on the chosen cutoff and follows leap-month ends", async () => {
  const batch = await create({
    cadence: "SEMIMONTHLY",
    firstDueDate: "2028-01-31",
    monthEnd: false,
    installmentCount: 4,
  });

  const response = await request("/clients", {
    name: "Synthetic Bi-monthly member",
    email: "",
    phone: "",
    batchId: batch.id,
    status: "ACTIVE",
    releaseStatus: "NOT_READY",
  });

  assert.equal(response.status, 201);

  const member = await response.json();

  const rows = await db.scheduleItem.findMany({
    where: { clientId: member.id },
    orderBy: { sequenceNo: "asc" },
  });

  assert.deepEqual(
    rows.map((item) => {
      return item.dueDate.toISOString().slice(0, 10);
    }),
    ["2028-01-31", "2028-02-15", "2028-02-29", "2028-03-15"],
  );
});

test("legacy batches keep their fixed cadence and new schedule issuance remains idempotent", async () => {
  const batch = await create({
    firstDueDate: null,
    monthEnd: false,
    cadence: "SEMIMONTHLY",
  });

  assert.equal(batch.firstDueDate, null);

  const member = await db.client.create({
    data: {
      batchId: batch.id,
      name: "Synthetic legacy member",
      email: "",
      phone: "",
    },
  });

  const responses = await Promise.all([
    request(`/clients/${member.id}/schedule`, {}),
    request(`/clients/${member.id}/schedule`, {}),
  ]);

  assert.ok(
    responses.every((response) => {
      return response.status === 201;
    }),
  );

  const rows = await db.scheduleItem.findMany({
    where: { clientId: member.id },
    orderBy: { sequenceNo: "asc" },
  });

  assert.equal(rows.length, 3);

  assert.deepEqual(
    rows.map((item) => {
      return item.dueDate.toISOString().slice(0, 10);
    }),
    ["2028-01-16", "2028-01-31", "2028-02-15"],
  );
});

test("already issued schedules cannot be shifted, and unrelated status edits preserve the policy", async () => {
  const before = await db.scheduleItem.findMany({
    where: { clientId: issuedClient },
    orderBy: { sequenceNo: "asc" },
  });

  const batch = await (await request(`/batches/${issuedBatch}`)).json();

  const record = {
    code: batch.code,
    model: batch.model,
    status: batch.status,
    startDate: batch.startDate,
    endDate: batch.endDate,
    contractPrice: batch.contractPrice,
    installmentCount: batch.installmentCount,
    cadence: batch.cadence,
  };

  for (const changes of [
    { firstDueDate: "2028-02-29", monthEnd: true, endDate: "2028-04-30" },
    { firstDueDate: "2028-01-15", monthEnd: false },
    { firstDueDate: null, monthEnd: false },
  ]) {
    const response = await request(
      `/batches/${issuedBatch}`,
      { version: batch.version, record: { ...record, ...changes } },
      "COO",
      "PATCH",
    );

    assert.equal(response.status, 409, await response.clone().text());
  }

  const update = await request(
    `/batches/${issuedBatch}`,
    { version: batch.version, record: { ...record, status: "ACTIVE" } },
    "COO",
    "PATCH",
  );

  assert.equal(update.status, 200, await update.clone().text());

  const after = await update.json();

  assert.equal(after.firstDueDate, "2028-01-31");

  assert.equal(after.monthEnd, true);

  assert.deepEqual(
    await db.scheduleItem.findMany({
      where: { clientId: issuedClient },
      orderBy: { sequenceNo: "asc" },
    }),
    before,
  );
});

test("unissued plans can change first dates with audit history and stale writes are rejected", async () => {
  const batch = await create();

  const record = {
    code: batch.code,
    ...plan,
    firstDueDate: "2028-01-15",
    monthEnd: false,
  };

  const response = await request(
    `/batches/${batch.id}`,
    { version: batch.version, record },
    "COO",
    "PATCH",
  );

  assert.equal(response.status, 200, await response.clone().text());

  const changed = await response.json();

  assert.equal(changed.firstDueDate, "2028-01-15");

  const history = await (await request(`/batches/${batch.id}/history`)).json();

  assert.ok(JSON.stringify(history).includes("First installment due date"));

  assert.ok(JSON.stringify(history).includes("Month-end alignment"));

  assert.equal(
    (
      await request(
        `/batches/${batch.id}`,
        { version: batch.version, record },
        "COO",
        "PATCH",
      )
    ).status,
    409,
  );
});

test("invalid calendar plans cannot consume a number or create financial records", async () => {
  const before = {
    batches: await db.batch.count(),
    clients: await db.client.count(),
    schedules: await db.scheduleItem.count(),
    payments: await db.payment.count(),
    counters: await db.batchNumberCounter.findMany(),
  };

  for (const changes of [
    { firstDueDate: "2028-01-14", cadence: "SEMIMONTHLY", monthEnd: false },
    { firstDueDate: "2028-01-15", monthEnd: true },
    { firstDueDate: "2027-12-31" },
    { endDate: "2028-02-29" },
    { firstDueDate: "2027-02-29" },
    { monthEnd: true, firstDueDate: null },
  ]) {
    const response = await request("/batches", {
      ...plan,
      agentId,
      ...changes,
    });

    assert.equal(response.status, 400, await response.clone().text());
  }

  assert.deepEqual(
    {
      batches: await db.batch.count(),
      clients: await db.client.count(),
      schedules: await db.scheduleItem.count(),
      payments: await db.payment.count(),
      counters: await db.batchNumberCounter.findMany(),
    },
    before,
  );
});

test("editing a saved month-end plan without calendar fields still validates its actual final due date", async () => {
  const batch = await create({
    startDate: "2027-02-01",
    firstDueDate: "2027-02-28",
    endDate: "2027-04-30",
  });

  const record = {
    code: batch.code,
    model: batch.model,
    status: batch.status,
    startDate: batch.startDate,
    endDate: "2027-04-28",
    contractPrice: batch.contractPrice,
    installmentCount: batch.installmentCount,
    cadence: batch.cadence,
  };

  const rejected = await request(
    `/batches/${batch.id}`,
    { version: batch.version, record },
    "COO",
    "PATCH",
  );

  assert.equal(rejected.status, 400, await rejected.clone().text());

  const retained = await db.batch.findUniqueOrThrow({
    where: { id: batch.id },
  });

  assert.equal(retained.endDate.toISOString().slice(0, 10), "2027-04-30");

  assert.equal(retained.monthEnd, true);

  assert.equal(retained.version, batch.version);
});

test("a recorded payment locks calendar terms even before a schedule is issued", async () => {
  const batch = await create();

  const member = await db.client.create({
    data: {
      batchId: batch.id,
      name: "Synthetic payment-lock member",
      email: "",
      phone: "",
    },
  });

  const actor = await db.user.findUniqueOrThrow({
    where: { email: `calendar-coo-${suffix}@example.test` },
  });

  const payment = await db.payment.create({
    data: {
      batchId: batch.id,
      clientId: member.id,
      recordedById: actor.id,
      amount: "1.00",
      paymentDate: new Date("2028-01-31"),
      method: "Synthetic cash",
    },
  });

  const response = await request(`/batches/${batch.id}`);

  assert.equal((await response.json()).termsLocked, true);

  const rejected = await request(
    `/batches/${batch.id}`,
    {
      version: batch.version,
      record: {
        ...plan,
        code: batch.code,
        firstDueDate: "2028-01-15",
        monthEnd: false,
      },
    },
    "COO",
    "PATCH",
  );

  assert.equal(rejected.status, 409, await rejected.clone().text());

  assert.equal(
    await db.scheduleItem.count({ where: { clientId: member.id } }),
    0,
  );

  assert.deepEqual(
    await db.payment.findUniqueOrThrow({ where: { id: payment.id } }),
    payment,
  );
});
