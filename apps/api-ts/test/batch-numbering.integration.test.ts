import "reflect-metadata";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import { createApp } from "../src/app";
import { Database } from "../src/database";
import { hashPassword } from "../src/auth/password";
import type { Config } from "../src/config";
import type { Role } from "@freshphones/contracts";

const databaseUrl = process.env.TEST_DATABASE_URL;

if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith("_test")) {
  throw new Error(
    "Batch numbering requires a dedicated TEST_DATABASE_URL ending in _test.",
  );
}

const origin = "http://localhost:3100";

const password = "Synthetic-numbering-test-123!";

const suffix = randomUUID().slice(0, 8);

const apps: INestApplication[] = [];

const bases: string[] = [];

const cookies = new Map<Role, string>();

let db: Database;

const terms = {
  model: "Numbered iPhone",
  status: "PLANNED",
  startDate: "2026-10-01",
  endDate: "2027-04-01",
  contractPrice: "1200.00",
  installmentCount: 6,
  cadence: "MONTHLY",
};

function request(
  path: string,
  body?: unknown,
  role: Role = "COO",
  method = "POST",
  server = 0,
) {
  return fetch(`${bases[server]}/api${path}`, {
    method,
    headers: {
      Origin: origin,
      Cookie: cookies.get(role) ?? "",
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

function agent(code: string, active = true) {
  return db.agent.create({ data: { code, name: `Synthetic ${code}`, active } });
}

async function create(agentId: string, server = 0) {
  const response = await request(
    "/batches",
    { ...terms, agentId },
    "COO",
    "POST",
    server,
  );

  assert.equal(response.status, 201, await response.clone().text());

  return response.json();
}

before(async () => {
  const config = {
    NODE_ENV: "test",
    PORT: 4100,
    HOST: "127.0.0.1",
    DATABASE_URL: databaseUrl,
    WEB_ORIGIN: origin,
    JWT_SECRET: "numbering-test-secret-at-least-32-characters",
    LOCAL_DEMO_AUTH: false,
    EMAIL_FROM: "synthetic@example.test",
    CUSTOMER_REMINDER_DAYS_BEFORE: "",
    PRIVATE_STORAGE_PROVIDER: "local",
    PRIVATE_STORAGE_S3_REGION: "ap-southeast-1",
    ABUSE_LIMITS: { expensive: [[1000, 60]], read: [[1000, 60]] },
  } as Config;

  for (let index = 0; index < 2; index++) {
    const app = await createApp(config);

    await app.listen(0, "127.0.0.1");

    apps.push(app);

    bases.push(await app.getUrl());
  }

  db = apps[0].get(Database);

  const passwordHash = await hashPassword(password);

  for (const role of [
    "COO",
    "CEO",
    "RECORDS",
    "BATCH_MANAGER",
    "FINANCE_OFFICER",
    "BATCH_HANDLER",
  ] as const) {
    const user = await db.user.create({
      data: {
        name: `Numbering ${role}`,
        email: `numbering-${role.toLowerCase()}-${suffix}@example.test`,
        passwordHash,
        role,
      },
    });

    const response = await fetch(`${bases[0]}/api/auth/login`, {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email, password }),
    });

    assert.equal(response.status, 200);

    cookies.set(
      role,
      response.headers
        .getSetCookie()
        .map((value) => {
          return value.split(";")[0];
        })
        .join("; "),
    );
  }
});

after(async () => {
  for (const app of apps) {
    await app.close();
  }
});

test("numbers start at 001 for each Agent and are included in the atomic audit", async () => {
  const ab = await agent("AB");

  const cd = await agent("CD");

  const first = await create(ab.id);

  assert.equal(first.code, "AB-001");

  assert.equal(first.agentId, ab.id);

  assert.equal(first.numberingAgentId, ab.id);

  assert.equal(first.numberSequence, 1);

  assert.equal((await create(ab.id)).code, "AB-002");

  assert.equal((await create(cd.id)).code, "CD-001");

  const audit = await db.auditEntry.findFirstOrThrow({
    where: { recordId: first.id, action: "batch.created" },
  });

  assert.equal((audit.after as { code: string }).code, first.code);

  assert.equal(
    await db.changeEvent.count({
      where: { recordId: first.id, entity: "batch" },
    }),
    1,
  );
});

test("two API instances allocate unique, continuous numbers under concurrent creation", async () => {
  const representative = await agent("CONCURRENT");

  const batches = await Promise.all(
    Array.from({ length: 8 }, (_, index) => {
      return create(representative.id, index % 2);
    }),
  );

  assert.deepEqual(
    batches
      .map((batch) => {
        return batch.numberSequence;
      })
      .sort((left, right) => {
        return left - right;
      }),
    [1, 2, 3, 4, 5, 6, 7, 8],
  );

  assert.equal(
    new Set(
      batches.map((batch) => {
        return batch.code;
      }),
    ).size,
    8,
  );

  assert.equal(
    (
      await db.batchNumberCounter.findUniqueOrThrow({
        where: { agentId: representative.id },
      })
    ).lastNumber,
    8,
  );
});

test("legacy codes, cancelled batches, lowercase prefixes and unassigned records are preserved and skipped", async () => {
  const representative = await agent("LEGACY");

  for (const code of ["LEGACY-007", "legacy-010", "LEGACY-note"]) {
    await db.batch.create({
      data: {
        code,
        model: "Legacy phone",
        status: "CANCELLED",
        startDate: new Date(terms.startDate),
        endDate: new Date(terms.endDate),
      },
    });
  }

  assert.equal((await create(representative.id)).code, "LEGACY-011");

  assert.equal(
    await db.batch.count({
      where: {
        code: { in: ["LEGACY-007", "legacy-010", "LEGACY-note"] },
        numberingAgentId: null,
      },
    }),
    3,
  );
});

test("reassignment and unassignment preserve the number and its original Agent's sequence", async () => {
  const original = await agent("ORIGINAL");

  const replacement = await agent("REPLACEMENT");

  const batch = await create(original.id);

  for (const [index, agentId] of [replacement.id, null].entries()) {
    const response = await request(
      `/batches/${batch.id}/assignments`,
      {
        version: index + 1,
        agentId,
        handlerId: null,
      },
      "COO",
      "PATCH",
    );

    assert.equal(response.status, 200);

    const changed = await response.json();

    assert.equal(changed.code, "ORIGINAL-001");

    assert.equal(changed.numberingAgentId, original.id);

    assert.equal(changed.agentId, agentId);
  }

  assert.equal((await create(original.id)).code, "ORIGINAL-002");

  assert.equal((await create(replacement.id)).code, "REPLACEMENT-001");
});

test("Agent code changes and inactive/reactive transitions never reset that Agent's sequence", async () => {
  const representative = await agent("BEFORE");

  const first = await create(representative.id);

  for (const [index, active] of [false, true].entries()) {
    const response = await request(
      `/agents/${representative.id}`,
      {
        version: index + 1,
        record: { name: representative.name, code: "AFTER", active },
      },
      "COO",
      "PATCH",
    );

    assert.equal(response.status, 200);

    if (!active) {
      assert.equal(
        (await request("/batches", { ...terms, agentId: representative.id }))
          .status,
        400,
      );
    }
  }

  assert.equal((await create(representative.id)).code, "AFTER-002");

  assert.equal(
    (await db.batch.findUniqueOrThrow({ where: { id: first.id } })).code,
    "BEFORE-001",
  );
});

test("generated codes cannot be renamed while normal versioned batch edits remain available", async () => {
  const representative = await agent("PERMANENT");

  const batch = await create(representative.id);

  const before = await db.auditEntry.count({ where: { recordId: batch.id } });

  assert.equal(
    (
      await request(
        `/batches/${batch.id}`,
        {
          version: 1,
          record: { ...terms, code: "FORGED-001" },
        },
        "COO",
        "PATCH",
      )
    ).status,
    400,
  );

  assert.equal(
    await db.auditEntry.count({ where: { recordId: batch.id } }),
    before,
  );

  const changed = await request(
    `/batches/${batch.id}`,
    {
      version: 1,
      record: { ...terms, code: batch.code, model: "Updated iPhone" },
    },
    "COO",
    "PATCH",
  );

  assert.equal(changed.status, 200);

  assert.equal((await changed.json()).code, batch.code);
});

test("missing/inactive Agents, manual codes, forged counters and invalid terms do not consume numbers", async () => {
  const representative = await agent("VALIDATION");

  const inactive = await agent("INACTIVE", false);

  const before = await db.batch.count();

  for (const input of [
    terms,
    { ...terms, agentId: randomUUID() },
    { ...terms, agentId: inactive.id },
    { ...terms, agentId: representative.id, code: "OVERRIDE-001" },
    { ...terms, agentId: representative.id, numberSequence: 100 },
    { ...terms, agentId: representative.id, endDate: "2026-01-01" },
    { ...terms, agentId: representative.id, endDate: "2026-11-01" },
    { ...terms, agentId: representative.id, installmentCount: 0 },
  ]) {
    assert.equal((await request("/batches", input)).status, 400);
  }

  assert.equal(await db.batch.count(), before);

  assert.equal(
    await db.batchNumberCounter.findUnique({
      where: { agentId: representative.id },
    }),
    null,
  );

  assert.equal((await create(representative.id)).code, "VALIDATION-001");
});

test("an audit failure rolls back both the batch and its reserved sequence", async () => {
  const representative = await agent("ROLLBACK");

  const before = await db.batch.count();

  await db.$executeRawUnsafe(
    `ALTER TABLE "AuditEntry" ADD CONSTRAINT "numbering_test_failure" CHECK (action <> 'batch.created') NOT VALID`,
  );

  try {
    assert.equal(
      (await request("/batches", { ...terms, agentId: representative.id }))
        .status,
      500,
    );
  } finally {
    await db.$executeRawUnsafe(
      `ALTER TABLE "AuditEntry" DROP CONSTRAINT "numbering_test_failure"`,
    );
  }

  assert.equal(await db.batch.count(), before);

  assert.equal(
    await db.batchNumberCounter.findUnique({
      where: { agentId: representative.id },
    }),
    null,
  );

  assert.equal((await create(representative.id)).code, "ROLLBACK-001");
});

test("sequences grow beyond 999, support the full Agent code length, and fail cleanly at exhaustion", async () => {
  const growing = await agent("GROWING");

  await db.batchNumberCounter.create({
    data: { agentId: growing.id, lastNumber: 999 },
  });

  assert.equal((await create(growing.id)).code, "GROWING-1000");

  const long = await agent("A".repeat(60));

  await db.batchNumberCounter.create({
    data: { agentId: long.id, lastNumber: 2147483646 },
  });

  assert.equal((await create(long.id)).code, `${long.code}-2147483647`);

  assert.equal(
    (await request("/batches", { ...terms, agentId: long.id })).status,
    409,
  );

  assert.equal(
    (
      await db.batchNumberCounter.findUniqueOrThrow({
        where: { agentId: long.id },
      })
    ).lastNumber,
    2147483647,
  );
});

test("roles without batch creation access cannot allocate numbers or read Agent choices", async () => {
  const representative = await agent("AUTHORIZATION");

  const before = await db.batch.count();

  for (const role of [
    "CEO",
    "BATCH_MANAGER",
    "FINANCE_OFFICER",
    "BATCH_HANDLER",
  ] as const) {
    assert.equal(
      (
        await request(
          "/batches",
          { ...terms, agentId: representative.id },
          role,
        )
      ).status,
      403,
    );
  }

  assert.equal(
    (await request("/records/assignment-options", undefined, "CEO", "GET"))
      .status,
    403,
  );

  assert.equal(await db.batch.count(), before);

  assert.equal(
    await db.batchNumberCounter.findUnique({
      where: { agentId: representative.id },
    }),
    null,
  );

  const options = await request(
    "/records/assignment-options",
    undefined,
    "COO",
    "GET",
  );

  const data = await options.json();

  assert.equal(
    data.agents.find((item: { id: string }) => {
      return item.id === representative.id;
    }).code,
    representative.code,
  );
});

test("current Records creators get numbering choices while operational readers retain minimized fields", async () => {
  const representative = await agent("RECORDS-CREATOR");

  const options = await request(
    "/records/assignment-options",
    undefined,
    "RECORDS",
    "GET",
  );

  assert.equal(options.status, 200);

  const data = await options.json();

  assert.ok(Array.isArray(data.managers));

  assert.equal(
    data.agents.find((item: { id: string }) => {
      return item.id === representative.id;
    }).code,
    representative.code,
  );

  const created = await request(
    "/batches",
    { ...terms, agentId: representative.id },
    "RECORDS",
  );

  assert.equal(created.status, 201, await created.clone().text());

  assert.equal((await created.json()).code, "RECORDS-CREATOR-001");

  const reader = await request(
    "/records/assignment-options",
    undefined,
    "FINANCE_OFFICER",
    "GET",
  );

  assert.equal(reader.status, 200);

  assert.ok(
    (await reader.json()).agents.every((item: Record<string, unknown>) => {
      return !("code" in item);
    }),
  );
});
