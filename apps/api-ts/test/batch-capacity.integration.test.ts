import "reflect-metadata";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import type { Role } from "@freshphones/contracts";
import { createApp } from "../src/app";
import { Database } from "../src/database";
import { hashPassword } from "../src/auth/password";
import type { Config } from "../src/config";
import type { Batch } from "../src/generated/prisma/client";

const databaseUrl = process.env.TEST_DATABASE_URL;

if (
  !databaseUrl ||
  !["localhost", "127.0.0.1", "[::1]"].includes(
    new URL(databaseUrl).hostname,
  ) ||
  !new URL(databaseUrl).pathname.endsWith("_test")
) {
  throw new Error("Capacity checks require an isolated local _test database.");
}

const origin = "http://localhost:3100";

const password = "Synthetic-capacity-password-123!";

const suffix = randomUUID().slice(0, 8);

const apps: INestApplication[] = [];

const bases: string[] = [];

const users = new Map<string, { id: string; cookie: string }>();

let db: Database;

let passwordHash: string;

let agentId: string;

let serial = 0;

function request(
  key: string,
  path: string,
  body?: unknown,
  method = body === undefined ? "GET" : "POST",
  server = 0,
) {
  return fetch(`${bases[server]}/api${path}`, {
    method,
    headers: {
      Origin: origin,
      Cookie: users.get(key)?.cookie ?? "",
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

async function identity(key: string, role: Role, extra: object = {}) {
  const email = `capacity-${key.toLowerCase()}-${suffix}@example.test`;

  const user = await db.user.create({
    data: { name: `Synthetic ${key}`, role, email, passwordHash, ...extra },
  });

  const login = await request("", "/auth/login", { email, password });

  assert.equal(login.status, 200, await login.clone().text());

  users.set(key, {
    id: user.id,
    cookie: login.headers
      .getSetCookie()
      .map((cookie) => {
        return cookie.split(";")[0];
      })
      .join("; "),
  });

  return user;
}

function batch(extra: object = {}) {
  return db.batch.create({
    data: {
      code: `CAPACITY-${suffix.toUpperCase()}-${++serial}`,
      model: "Synthetic capacity phone",
      status: "PLANNED",
      startDate: new Date("2026-10-01"),
      endDate: new Date("2027-04-01"),
      contractPrice: "1200.00",
      installmentCount: 6,
      cadence: "MONTHLY",
      managerId: users.get("MANAGER")!.id,
      agentId,
      ...extra,
    },
  });
}

function applicant(batchId: string) {
  return {
    name: `Synthetic applicant ${++serial}`,
    email: `capacity-member-${serial}-${suffix}@example.test`,
    phone: "+639170000000",
    batchId,
    status: "ACTIVE" as const,
    releaseStatus: "NOT_READY" as const,
  };
}

async function seedMembers(batchId: string, count: number) {
  const rows = [];

  for (let index = 0; index < count; index++) {
    rows.push(await db.client.create({ data: applicant(batchId) }));
  }

  return rows;
}

async function pending(batchId: string) {
  const { name, email, phone } = applicant(batchId);

  const response = await request("AGENT", "/enrollment/requests", {
    submissionId: randomUUID(),
    batchId,
    name,
    email,
    phone,
  });

  assert.equal(response.status, 201, await response.clone().text());

  return response.json() as Promise<{ id: string; version: number }>;
}

function review(id: string, version = 1, server = 0) {
  return request(
    "MANAGER",
    `/enrollment/requests/${id}/review`,
    { version, decision: "APPROVED", reason: "Synthetic reviewed enrollment" },
    "POST",
    server,
  );
}

function batchEdit(row: Batch, status: Batch["status"]) {
  return {
    version: row.version,
    record: {
      code: row.code,
      model: row.model,
      status,
      startDate: row.startDate.toISOString().slice(0, 10),
      endDate: row.endDate.toISOString().slice(0, 10),
    },
  };
}

before(async () => {
  const config = {
    NODE_ENV: "test",
    PORT: 4100,
    HOST: "127.0.0.1",
    DATABASE_URL: databaseUrl,
    WEB_ORIGIN: origin,
    JWT_SECRET: "capacity-test-only-secret-at-least-32-characters",
    LOCAL_DEMO_AUTH: false,
    EMAIL_FROM: "synthetic@example.test",
    CUSTOMER_REMINDER_DAYS_BEFORE: "",
    PRIVATE_STORAGE_PROVIDER: "local",
    PRIVATE_STORAGE_S3_REGION: "ap-southeast-1",
    ABUSE_LIMITS: {
      expensive: [[10000, 60]],
      auth: [[10000, 60]],
      accountWrite: [[10000, 60]],
      read: [[10000, 60]],
    },
  } as Config;

  for (let index = 0; index < 2; index++) {
    const app = await createApp(config);

    await app.listen(0, "127.0.0.1");

    apps.push(app);

    bases.push(await app.getUrl());
  }

  db = apps[0].get(Database);

  passwordHash = await hashPassword(password);

  for (const [key, role] of [
    ["COO", "COO"],
    ["MANAGER", "BATCH_MANAGER"],
    ["OTHER_MANAGER", "BATCH_MANAGER"],
    ["HANDLER", "BATCH_HANDLER"],
    ["FINANCE", "FINANCE_OFFICER"],
    ["CEO", "CEO"],
  ] as const) {
    await identity(key, role);
  }

  const agent = await db.agent.create({
    data: { name: "Synthetic capacity Agent", code: `CAP-${suffix}` },
  });

  agentId = agent.id;

  await identity("AGENT", "AGENT", { agentProfileId: agentId });
});

after(async () => {
  for (const app of apps) {
    await app.close();
  }
});

test("seven real enrollments keep a batch planned; the eighth activates and audits atomically", async () => {
  const row = await batch();

  await seedMembers(row.id, 6);

  const seventh = await request("MANAGER", "/clients", applicant(row.id));

  assert.equal(seventh.status, 201, await seventh.clone().text());

  assert.equal(
    (await db.batch.findUniqueOrThrow({ where: { id: row.id } })).status,
    "PLANNED",
  );

  const eighth = await request("MANAGER", "/clients", applicant(row.id));

  assert.equal(eighth.status, 201, await eighth.clone().text());

  const changed = await db.batch.findUniqueOrThrow({ where: { id: row.id } });

  assert.equal(changed.status, "ACTIVE");

  assert.equal(changed.version, row.version + 1);

  assert.equal(await db.client.count({ where: { batchId: row.id } }), 8);

  const audit = await db.auditEntry.findFirstOrThrow({
    where: { entity: "batch", recordId: row.id, action: "batch.activated" },
  });

  assert.equal((audit.before as { status: string }).status, "PLANNED");

  assert.equal((audit.after as { status: string }).status, "ACTIVE");

  assert.equal(audit.actorId, users.get("MANAGER")!.id);
});

test("a ninth enrollment rejects without creating identity, schedules, audit or financial changes", async () => {
  const row = await batch({ status: "ACTIVE" });

  await seedMembers(row.id, 8);

  const before = await Promise.all([
    db.member.count(),
    db.client.count(),
    db.scheduleItem.count(),
    db.payment.count(),
    db.auditEntry.count(),
    db.changeEvent.count(),
  ]);

  const response = await request("MANAGER", "/clients", applicant(row.id));

  assert.equal(response.status, 409);

  assert.deepEqual(
    await Promise.all([
      db.member.count(),
      db.client.count(),
      db.scheduleItem.count(),
      db.payment.count(),
      db.auditEntry.count(),
      db.changeEvent.count(),
    ]),
    before,
  );
});

test("automatic activation preserves existing member, schedule and payment values", async () => {
  const row = await batch();

  const [member] = await seedMembers(row.id, 7);

  const schedule = await db.scheduleItem.create({
    data: {
      clientId: member.id,
      sequenceNo: 1,
      dueDate: new Date("2026-10-31"),
      expectedAmount: "200.00",
    },
  });

  const payment = await db.payment.create({
    data: {
      clientId: member.id,
      batchId: row.id,
      scheduleItemId: schedule.id,
      amount: "75.25",
      paymentDate: new Date("2026-10-30"),
      method: "GCash",
      recordedById: users.get("HANDLER")!.id,
    },
  });

  assert.equal(
    (await request("MANAGER", "/clients", applicant(row.id))).status,
    201,
  );

  assert.deepEqual(
    await db.client.findUniqueOrThrow({ where: { id: member.id } }),
    member,
  );

  assert.deepEqual(
    await db.scheduleItem.findUniqueOrThrow({ where: { id: schedule.id } }),
    schedule,
  );

  assert.deepEqual(
    await db.payment.findUniqueOrThrow({ where: { id: payment.id } }),
    payment,
  );
});

test("a failed activation audit rolls back its eighth membership, identity and schedules", async () => {
  const row = await batch();

  await seedMembers(row.id, 7);

  const before = await Promise.all([
    db.member.count(),
    db.client.count(),
    db.scheduleItem.count(),
  ]);

  const guard = `capacity_audit_${suffix}`;

  await db.$executeRawUnsafe(
    `CREATE FUNCTION "${guard}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action = 'batch.activated' AND NEW."recordId" = '${row.id}' THEN RAISE EXCEPTION 'Synthetic activation audit failure'; END IF; RETURN NEW; END $$`,
  );

  await db.$executeRawUnsafe(
    `CREATE TRIGGER "${guard}" BEFORE INSERT ON "AuditEntry" FOR EACH ROW EXECUTE FUNCTION "${guard}"()`,
  );

  try {
    assert.equal(
      (await request("MANAGER", "/clients", applicant(row.id))).status,
      500,
    );

    assert.deepEqual(
      await Promise.all([
        db.member.count(),
        db.client.count(),
        db.scheduleItem.count(),
      ]),
      before,
    );

    const unchanged = await db.batch.findUniqueOrThrow({
      where: { id: row.id },
    });

    assert.equal(unchanged.status, "PLANNED");

    assert.equal(unchanged.version, row.version);

    assert.equal(
      await db.auditEntry.count({
        where: { entity: "batch", recordId: row.id },
      }),
      0,
    );
  } finally {
    await db.$executeRawUnsafe(`DROP TRIGGER "${guard}" ON "AuditEntry"`);

    await db.$executeRawUnsafe(`DROP FUNCTION "${guard}"()`);
  }
});

test("pending submissions do not occupy positions or activate the batch", async () => {
  const row = await batch();

  await seedMembers(row.id, 7);

  await pending(row.id);

  await pending(row.id);

  assert.equal(await db.client.count({ where: { batchId: row.id } }), 7);

  assert.equal(
    (await db.batch.findUniqueOrThrow({ where: { id: row.id } })).status,
    "PLANNED",
  );
});

test("two API instances approving the last position admit only one member and preserve the loser pending", async () => {
  const row = await batch();

  await seedMembers(row.id, 7);

  const first = await pending(row.id);

  const second = await pending(row.id);

  const responses = await Promise.all([
    review(first.id, first.version, 0),
    review(second.id, second.version, 1),
  ]);

  assert.deepEqual(
    responses
      .map((response) => {
        return response.status;
      })
      .sort(),
    [201, 409],
  );

  assert.equal(await db.client.count({ where: { batchId: row.id } }), 8);

  const requests = await db.enrollmentRequest.findMany({
    where: { id: { in: [first.id, second.id] } },
  });

  const winner = requests.find((row) => {
    return row.status === "APPROVED";
  })!;

  const loser = requests.find((row) => {
    return row.status === "PENDING";
  })!;

  assert.ok(winner.clientId);

  assert.equal(loser.clientId, null);

  assert.equal(loser.version, 1);

  assert.equal(
    await db.auditEntry.count({
      where: { recordId: loser.id, action: "enrollment.reviewed" },
    }),
    0,
  );

  assert.equal(
    await db.auditEntry.count({
      where: { recordId: row.id, action: "batch.activated" },
    }),
    1,
  );

  assert.equal((await review(winner.id)).status, 201);

  assert.equal(await db.client.count({ where: { batchId: row.id } }), 8);
});

test("an authorized Manager can manually activate before full with versioned audit", async () => {
  const row = await batch();

  await seedMembers(row.id, 2);

  const response = await request(
    "MANAGER",
    `/batches/${row.id}`,
    batchEdit(row, "ACTIVE"),
    "PATCH",
  );

  assert.equal(response.status, 200, await response.clone().text());

  assert.equal((await response.json()).status, "ACTIVE");

  assert.equal(await db.client.count({ where: { batchId: row.id } }), 2);

  assert.equal(
    await db.auditEntry.count({
      where: { recordId: row.id, action: "batch.updated" },
    }),
    1,
  );
});

test("manual activation rejects foreign Managers, non-managing roles, revoked access and stale versions", async () => {
  const row = await batch();

  assert.equal(
    (
      await request(
        "OTHER_MANAGER",
        `/batches/${row.id}`,
        batchEdit(row, "ACTIVE"),
        "PATCH",
      )
    ).status,
    404,
  );

  for (const key of ["HANDLER", "FINANCE", "CEO", "AGENT"]) {
    assert.equal(
      (
        await request(
          key,
          `/batches/${row.id}`,
          batchEdit(row, "ACTIVE"),
          "PATCH",
        )
      ).status,
      403,
      key,
    );
  }

  const revoked = await identity("REVOKED_MANAGER", "BATCH_MANAGER");

  const assigned = await batch({ managerId: revoked.id });

  await db.user.update({ where: { id: revoked.id }, data: { active: false } });

  assert.ok(
    [401, 403].includes(
      (
        await request(
          "REVOKED_MANAGER",
          `/batches/${assigned.id}`,
          batchEdit(assigned, "ACTIVE"),
          "PATCH",
        )
      ).status,
    ),
  );

  await db.batch.update({
    where: { id: row.id },
    data: { version: { increment: 1 } },
  });

  assert.equal(
    (
      await request(
        "MANAGER",
        `/batches/${row.id}`,
        batchEdit(row, "ACTIVE"),
        "PATCH",
      )
    ).status,
    409,
  );

  assert.equal(
    (await db.batch.findUniqueOrThrow({ where: { id: row.id } })).status,
    "PLANNED",
  );
});

test("capacity includes held, completed and retention-erased real memberships", async () => {
  const row = await batch();

  const members = await seedMembers(row.id, 7);

  await db.client.update({
    where: { id: members[0].id },
    data: { status: "ON_HOLD" },
  });

  await db.client.update({
    where: { id: members[1].id },
    data: { status: "COMPLETED" },
  });

  // Seed a historical erased membership; this does not execute the erasure workflow.
  const erasedIdentity = await db.member.create({
    data: { name: "Erased historical customer", email: "", phone: "" },
  });

  await db.client.create({
    data: {
      ...applicant(row.id),
      memberId: erasedIdentity.id,
      name: "Erased historical customer",
      email: "",
      phone: "",
      retentionErasedAt: new Date(),
    },
  });

  assert.equal(
    (await request("MANAGER", "/clients", applicant(row.id))).status,
    409,
  );

  assert.equal(await db.client.count({ where: { batchId: row.id } }), 8);

  assert.equal(
    (await db.batch.findUniqueOrThrow({ where: { id: row.id } })).status,
    "PLANNED",
  );
});

test("legacy overcapacity batches retain all identities without automatic backfill", async () => {
  const row = await batch();

  const members = await seedMembers(row.id, 10);

  const ids = members
    .map((member) => {
      return member.id;
    })
    .sort();

  const listed = await request("MANAGER", `/batches/${row.id}`);

  assert.equal(listed.status, 200);

  assert.equal((await listed.json())._count.clients, 10);

  assert.equal(
    (await request("MANAGER", "/clients", applicant(row.id))).status,
    409,
  );

  assert.deepEqual(
    (
      await db.client.findMany({
        where: { batchId: row.id },
        select: { id: true },
      })
    )
      .map((member) => {
        return member.id;
      })
      .sort(),
    ids,
  );

  assert.equal(
    (await db.batch.findUniqueOrThrow({ where: { id: row.id } })).status,
    "PLANNED",
  );
});

test("moving a schedule-less membership enforces target capacity and activates its eighth position", async () => {
  const source = await batch();

  const [member] = await seedMembers(source.id, 1);

  const target = await batch();

  await seedMembers(target.id, 7);

  const body = {
    version: member.version,
    record: {
      ...applicant(target.id),
      name: member.name,
      email: member.email,
      phone: member.phone,
    },
  };

  const response = await request(
    "MANAGER",
    `/clients/${member.id}`,
    body,
    "PATCH",
  );

  assert.equal(response.status, 200, await response.clone().text());

  assert.equal(
    (await db.batch.findUniqueOrThrow({ where: { id: target.id } })).status,
    "ACTIVE",
  );

  assert.equal(await db.client.count({ where: { batchId: target.id } }), 8);

  assert.equal(await db.client.count({ where: { batchId: source.id } }), 0);

  for (const id of [source.id, target.id]) {
    assert.ok(
      await db.changeEvent.count({ where: { entity: "batch", recordId: id } }),
    );
  }

  const blockedSource = await batch();

  const [blocked] = await seedMembers(blockedSource.id, 1);

  const denied = await request(
    "MANAGER",
    `/clients/${blocked.id}`,
    {
      version: blocked.version,
      record: {
        ...applicant(target.id),
        name: blocked.name,
        email: blocked.email,
        phone: blocked.phone,
      },
    },
    "PATCH",
  );

  assert.equal(denied.status, 409);

  assert.equal(
    (await db.client.findUniqueOrThrow({ where: { id: blocked.id } })).batchId,
    blockedSource.id,
  );
});

test("completed and cancelled batches reject enrollment; manually active batches never reactivate automatically", async () => {
  for (const status of ["COMPLETED", "CANCELLED"] as const) {
    const row = await batch({ status });

    assert.equal(
      (await request("MANAGER", "/clients", applicant(row.id))).status,
      400,
    );

    assert.equal(
      (await db.batch.findUniqueOrThrow({ where: { id: row.id } })).status,
      status,
    );
  }

  const active = await batch({ status: "ACTIVE" });

  await seedMembers(active.id, 7);

  assert.equal(
    (await request("MANAGER", "/clients", applicant(active.id))).status,
    201,
  );

  assert.equal(
    (await db.batch.findUniqueOrThrow({ where: { id: active.id } })).version,
    active.version,
  );

  assert.equal(
    await db.auditEntry.count({
      where: { recordId: active.id, action: "batch.activated" },
    }),
    0,
  );
});

test("internal placeholders create no stored entities and customers receive only their own memberships", async () => {
  const row = await batch();

  const [own, other] = await seedMembers(row.id, 2);

  await identity("CUSTOMER", "CUSTOMER", {
    clientId: own.id,
    memberId: own.memberId,
  });

  const before = await Promise.all([
    db.member.count(),
    db.client.count(),
    db.user.count(),
    db.scheduleItem.count(),
    db.payment.count(),
  ]);

  const staff = await request("MANAGER", `/batches/${row.id}`);

  assert.equal((await staff.json())._count.clients, 2);

  const response = await request("CUSTOMER", "/portal/memberships");

  assert.equal(response.status, 200, await response.clone().text());

  const memberships = await response.json();

  assert.equal(memberships.length, 1);

  assert.equal(memberships[0].id, own.id);

  assert.deepEqual(Object.keys(memberships[0].batch).sort(), [
    "code",
    "id",
    "model",
  ]);

  assert.ok(!JSON.stringify(memberships).includes(other.id));

  assert.ok(!JSON.stringify(memberships).includes("internalPlaceholders"));

  assert.equal((await request("CUSTOMER", `/batches/${row.id}`)).status, 403);

  assert.deepEqual(
    await Promise.all([
      db.member.count(),
      db.client.count(),
      db.user.count(),
      db.scheduleItem.count(),
      db.payment.count(),
    ]),
    before,
  );
});
