import "reflect-metadata";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import type { Role } from "@freshphones/contracts";
import { createApp } from "../src/app";
import { Database } from "../src/database";
import { hashPassword } from "../src/auth/password";

const databaseUrl = process.env.TEST_DATABASE_URL;

if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith("_test")) {
  throw new Error("A dedicated migrated _test database is required.");
}

const origin = "http://localhost:3100";

const suffix = randomUUID().slice(0, 8);

const password = "Synthetic-occupancy-test-password-123!";

const users = new Map<string, { id: string; cookie: string }>();

let app: INestApplication, db: Database, base: string;

let batchA: string, batchB: string, foreignBatch: string;

let membershipA: string, membershipB: string, foreignMembership: string;

function request(
  key: string,
  membership?: string,
  route = "/portal/batch-summary",
) {
  return fetch(base + "/api" + route, {
    headers: {
      Origin: origin,
      ...(users.has(key) ? { Cookie: users.get(key)!.cookie } : {}),
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
      name: `Synthetic count ${key}`,
      email: `count-${key}-${suffix}@example.test`,
      role,
      passwordHash: hash,
      ...extra,
    },
  });

  const login = await fetch(base + "/api/auth/login", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({ email: user.email, password }),
  });

  assert.equal(login.status, 200, await login.clone().text());

  users.set(key, {
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

async function member(batchId: string, label: string, memberId?: string) {
  const profile = memberId
    ? { id: memberId }
    : await db.member.create({
        data: {
          name: `Synthetic member ${label}`,
          email: `count-member-${label}-${suffix}@example.test`,
          phone: "+639170000000",
        },
      });

  return db.client.create({
    data: {
      memberId: profile.id,
      batchId,
      name: `Synthetic member ${label}`,
      email: `count-member-${label}-${suffix}@example.test`,
      phone: "+639170000000",
    },
  });
}

before(async () => {
  app = await createApp({
    NODE_ENV: "test",
    HOST: "127.0.0.1",
    PORT: 4100,
    DATABASE_URL: databaseUrl!,
    WEB_ORIGIN: origin,
    JWT_SECRET: "synthetic-portal-count-secret-at-least-32-characters",
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

  await identity("coo", "COO", hash);

  await identity("ceo", "CEO", hash);

  const batches = [];

  for (const label of ["A", "B", "FOREIGN"]) {
    batches.push(
      await db.batch.create({
        data: {
          code: `COUNT-${label}-${suffix.toUpperCase()}`,
          model: "Synthetic count device",
          status: label === "B" ? "ACTIVE" : "PLANNED",
          startDate: new Date("2026-11-01"),
          endDate: new Date("2027-12-31"),
          contractPrice: "800.00",
          installmentCount: 8,
          cadence: "MONTHLY",
        },
      }),
    );
  }

  [batchA, batchB, foreignBatch] = batches.map((batch) => {
    return batch.id;
  });

  const first = await member(batchA, "owner");

  membershipA = first.id;

  membershipB = (await member(batchB, "owner", first.memberId)).id;

  for (let i = 1; i < 6; i++) {
    await member(batchA, `a-${i}`);
  }

  for (let i = 1; i < 8; i++) {
    await member(batchB, `b-${i}`);
  }

  const foreign = await member(foreignBatch, "foreign");

  foreignMembership = foreign.id;

  await identity("customer", "CUSTOMER", hash, {
    clientId: membershipA,
    memberId: first.memberId,
  });

  await identity("foreign", "CUSTOMER", hash, {
    clientId: foreign.id,
    memberId: foreign.memberId,
  });

  await db.enrollmentRequest.create({
    data: {
      submissionId: randomUUID(),
      batchId: batchA,
      submittedById: users.get("coo")!.id,
      applicant: { name: "Synthetic pending applicant" },
    },
  });
});

after(async () => {
  await app?.close();
});

test("customer receives only their own batch aggregate with actual count and separate status", async () => {
  const response = await request("customer", membershipA);

  assert.equal(response.status, 200);

  const body = await response.json();

  assert.deepEqual(
    Object.keys(body).sort(),
    [
      "membershipId",
      "batchId",
      "batchNumber",
      "approvedMembers",
      "capacity",
      "remaining",
      "isFull",
      "batchStatus",
    ].sort(),
  );

  assert.equal(body.membershipId, membershipA);

  assert.equal(body.batchId, batchA);

  assert.equal(body.approvedMembers, 6);

  assert.equal(body.capacity, 8);

  assert.equal(body.remaining, 2);

  assert.equal(body.isFull, false);

  assert.equal(body.batchStatus, "PLANNED");

  assert.ok(
    !/placeholder|financial|email|phone|Synthetic member|_count|internal/i.test(
      JSON.stringify(body),
    ),
  );
});

test("selected second membership returns its own full batch without changing the primary membership", async () => {
  const response = await request("customer", membershipB);

  assert.equal(response.status, 200);

  const body = await response.json();

  assert.equal(body.batchId, batchB);

  assert.equal(body.approvedMembers, 8);

  assert.equal(body.isFull, true);

  assert.equal(body.remaining, 0);

  assert.equal(body.batchStatus, "ACTIVE");

  assert.equal(
    (
      await db.user.findUniqueOrThrow({
        where: { id: users.get("customer")!.id },
      })
    ).clientId,
    membershipA,
  );
});

test("foreign, malformed and nonexistent membership selections cannot disclose counts", async () => {
  assert.equal((await request("customer", foreignMembership)).status, 404);

  assert.equal((await request("customer", randomUUID())).status, 404);

  assert.equal((await request("customer", "invalid-membership")).status, 400);

  const own = await request(
    "customer",
    membershipA,
    `/portal/batch-summary?batchId=${foreignBatch}`,
  );

  assert.equal((await own.json()).batchId, batchA);
});

test("anonymous and staff requests cannot use the customer-only aggregate", async () => {
  assert.equal((await request("anonymous")).status, 401);

  assert.equal((await request("coo")).status, 403);

  assert.equal((await request("ceo")).status, 403);
});

test("pending requests and manual activation do not inflate occupancy or imply full", async () => {
  await db.batch.update({ where: { id: batchA }, data: { status: "ACTIVE" } });

  const response = await request("customer", membershipA);

  const body = await response.json();

  assert.equal(body.approvedMembers, 6);

  assert.equal(body.batchStatus, "ACTIVE");

  assert.equal(body.isFull, false);
});

test("legacy overcapacity is reported truthfully without exposing member rows", async () => {
  await member(batchB, "legacy-extra");

  const body = await (await request("customer", membershipB)).json();

  assert.equal(body.approvedMembers, 9);

  assert.equal(body.capacity, 8);

  assert.equal(body.isFull, true);

  assert.equal(body.remaining, 0);

  assert.equal("members" in body, false);
});

test("an old membership handed over to a replacement is excluded from actual occupied positions", async () => {
  const retired = await member(batchA, "replaced-history");

  await db.client.update({
    where: { id: retired.id },
    data: { replacementCompletedAt: new Date() },
  });

  const body = await (await request("customer", membershipA)).json();

  assert.equal(body.approvedMembers, 6);

  assert.equal(body.remaining, 2);

  assert.equal(await db.client.count({ where: { batchId: batchA } }), 7);
});

test("staff count, customer count and automatic activation agree when historical replaced rows exist", async () => {
  await db.batch.update({ where: { id: batchA }, data: { status: "PLANNED" } });

  for (const expected of [7, 8]) {
    const response = await fetch(base + "/api/clients", {
      method: "POST",
      headers: {
        Origin: origin,
        Cookie: users.get("coo")!.cookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `Synthetic approved position ${expected}`,
        email: `approved-${expected}-${suffix}@example.test`,
        phone: "+639170000003",
        batchId: batchA,
        status: "ACTIVE",
        releaseStatus: "NOT_READY",
      }),
    });

    assert.equal(response.status, 201, await response.clone().text());

    const customer = await (await request("customer", membershipA)).json();

    const staffResponse = await fetch(base + "/api/batches/" + batchA, {
      headers: { Origin: origin, Cookie: users.get("coo")!.cookie },
    });

    const staff = await staffResponse.json();

    assert.equal(customer.approvedMembers, expected);

    assert.equal(staff._count.clients, expected);

    assert.equal(customer.batchStatus, expected === 8 ? "ACTIVE" : "PLANNED");

    assert.equal(staff.status, customer.batchStatus);
  }
});

test("repeated aggregate reads leave financial and membership records unchanged", async () => {
  const snapshot = async () => {
    return Promise.all([
      db.batch.findMany({
        where: { id: { in: [batchA, batchB, foreignBatch] } },
        orderBy: { id: "asc" },
      }),
      db.client.findMany({
        where: { batchId: { in: [batchA, batchB, foreignBatch] } },
        orderBy: { id: "asc" },
      }),
      db.scheduleItem.count(),
      db.payment.count(),
    ]);
  };

  const before = await snapshot();

  await Promise.all([
    request("customer", membershipA),
    request("customer", membershipB),
    request("foreign", foreignMembership),
  ]);

  assert.deepEqual(await snapshot(), before);
});

test("current account deactivation removes access even with an existing session", async () => {
  await db.user.update({
    where: { id: users.get("foreign")!.id },
    data: { active: false },
  });

  assert.equal((await request("foreign", foreignMembership)).status, 401);
});
