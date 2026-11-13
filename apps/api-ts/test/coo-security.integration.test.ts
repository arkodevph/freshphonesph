import "reflect-metadata";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import { createApp } from "../src/app";
import type { Config } from "../src/config";
import { Database } from "../src/database";
import { hashPassword } from "../src/auth/password";
import { CooReadCache } from "../src/coo-security/read-cache.service";
import { canonicalJson } from "../src/coo-security/request-replay";

const databaseUrl = process.env.TEST_DATABASE_URL;

if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith("_test")) {
  throw new Error("Use a dedicated _test database.");
}

const suffix = randomUUID().slice(0, 8).toUpperCase();

const origin = "http://localhost:3100";

const config = {
  NODE_ENV: "test",
  PORT: 4100,
  HOST: "127.0.0.1",
  DATABASE_URL: databaseUrl,
  WEB_ORIGIN: origin,
  JWT_SECRET: "coo-security-test-secret-longer-than-32-characters",
  EMAIL_FROM: "test@example.test",
  CUSTOMER_REMINDER_DAYS_BEFORE: "",
  PRIVATE_STORAGE_PROVIDER: "local",
  PRIVATE_STORAGE_S3_REGION: "ap-southeast-1",
  REDIS_NAMESPACE: `coo-security-${suffix}`,
  ABUSE_LIMITS: {
    cooRead: [[10000, 60]],
    cooWrite: [[10000, 60]],
    accountRead: [[10000, 60]],
    accountWrite: [[10000, 60]],
    expensive: [[10000, 60]],
  },
} as Config;

let app: INestApplication;

let second: INestApplication;

let db: Database;

let base: string;

let otherBase: string;

const sessions = new Map<string, { id: string; cookie: string }>();

function request(
  actor: string,
  path: string,
  method = "GET",
  body?: unknown,
  key?: string,
  server = base,
) {
  return fetch(`${server}/api${path}`, {
    method,
    headers: {
      Origin: origin,
      Cookie: sessions.get(actor)?.cookie ?? "",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(key ? { "Idempotency-Key": key } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

async function body<T>(response: Response, expected = 200): Promise<T> {
  assert.equal(response.status, expected, await response.clone().text());

  return response.json() as Promise<T>;
}

before(async () => {
  app = await createApp(config);

  await app.listen(0, "127.0.0.1");

  base = await app.getUrl();

  db = app.get(Database);

  const password = "Coo-security-test-password-123!";

  const passwordHash = await hashPassword(password);

  for (const [actor, role] of [
    ["first", "COO"],
    ["second", "COO"],
    ["csr", "CSR"],
    ["agent", "AGENT"],
  ] as const) {
    const user = await db.user.create({
      data: {
        name: `Security ${actor}`,
        email: `security-${actor}-${suffix}@example.test`.toLowerCase(),
        passwordHash,
        role,
      },
    });

    const login = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email, password }),
    });

    assert.equal(login.status, 200, await login.clone().text());

    sessions.set(actor, {
      id: user.id,
      cookie: login.headers
        .getSetCookie()
        .map((cookie) => {
          return cookie.split(";")[0];
        })
        .join("; "),
    });
  }

  second = await createApp(config);

  await second.listen(0, "127.0.0.1");

  otherBase = await second.getUrl();
});

after(async () => {
  await second?.close();

  await app?.close();
});

test("concurrent retries across API replicas commit one command and one audit", async () => {
  const key = randomUUID();

  const input = {
    name: `Atomic ${suffix}`,
    code: `AT-${suffix}`,
    active: true,
  };

  const responses = await Promise.all(
    Array.from({ length: 8 }, (_, index) => {
      return request(
        "first",
        "/agents",
        "POST",
        input,
        key,
        index % 2 ? base : otherBase,
      );
    }),
  );

  const results = await Promise.all(
    responses.map((response) => {
      return body<{ id: string }>(response, 201);
    }),
  );

  assert.equal(
    new Set(
      results.map((result) => {
        return result.id;
      }),
    ).size,
    1,
  );

  assert.equal(
    responses.filter((response) => {
      return response.headers.get("Idempotency-Replayed") === "false";
    }).length,
    1,
  );

  assert.equal(
    responses.filter((response) => {
      return response.headers.get("Idempotency-Replayed") === "true";
    }).length,
    7,
  );

  assert.equal(await db.agent.count({ where: { code: input.code } }), 1);

  assert.equal(
    await db.auditEntry.count({
      where: { recordId: results[0].id, action: "agent.created" },
    }),
    1,
  );

  const changed = await request(
    "first",
    "/agents",
    "POST",
    { ...input, name: "Different intent" },
    key,
  );

  assert.equal(changed.status, 409);

  assert.equal(
    (await request("csr", "/agents", "POST", input, key)).status,
    403,
  );

  await body(
    await request(
      "second",
      "/agents",
      "POST",
      { ...input, code: `OTHER-${suffix}` },
      key,
    ),
    201,
  );

  const rows = await db.$queryRaw<
    { keyHash: string; fingerprint: string }[]
  >`SELECT "keyHash", fingerprint FROM "CooRequestReplay" WHERE "actorId" = ${sessions.get("first")!.id}::uuid`;

  assert.ok(rows.length > 0);

  assert.ok(
    rows.every((row) => {
      return /^[0-9a-f]{64}$/.test(row.keyHash) && !row.keyHash.includes(key);
    }),
  );
});

test("failed transactions leave no replay success and an expired key cannot execute again", async () => {
  const key = randomUUID();

  const existing = {
    name: "Already exists",
    code: `AT-${suffix}`,
    active: true,
  };

  assert.equal(
    (await request("first", "/agents", "POST", existing, key)).status,
    409,
  );

  const input = { ...existing, code: `ROLLBACK-${suffix}` };

  await body(await request("first", "/agents", "POST", input, key), 201);

  await db.$executeRaw`UPDATE "CooRequestReplay" SET "expiresAt" = clock_timestamp() - INTERVAL '1 second' WHERE "actorId" = ${sessions.get("first")!.id}::uuid`;

  assert.equal(
    (await request("first", "/agents", "POST", input, key)).status,
    409,
  );

  assert.equal(await db.agent.count({ where: { code: input.code } }), 1);

  assert.equal(
    (
      await request(
        "first",
        "/agents",
        "POST",
        { ...input, code: `BAD-${suffix}` },
        "short",
      )
    ).status,
    400,
  );
});

test("task retries do not duplicate assignments, audit entries or email outboxes", async () => {
  const key = randomUUID();

  const input = {
    title: `Single task ${suffix}`,
    instructions: "Synthetic test",
    assigneeId: sessions.get("agent")!.id,
    priority: "MEDIUM",
    deadline: new Date(Date.now() + 86400000).toISOString(),
  };

  const first = await body<{ id: string }>(
    await request("first", "/tasks", "POST", input, key),
    201,
  );

  const emails = await db.staffEmail.count();

  const replay = await body<{ id: string }>(
    await request("first", "/tasks", "POST", input, key, otherBase),
    201,
  );

  assert.equal(replay.id, first.id);

  assert.equal(await db.task.count({ where: { title: input.title } }), 1);

  assert.equal(
    await db.auditEntry.count({
      where: { recordId: first.id, action: "task.assigned" },
    }),
    1,
  );

  assert.equal(await db.staffEmail.count(), emails);
});

test("a committed COO policy write is visible immediately through another replica's warm cache", async () => {
  const before = await body<{
    policy: { version: number; reviewDueHours: number };
  }>(await request("first", "/operations/monitor"));

  await body(
    await request(
      "first",
      "/operations/monitor",
      "GET",
      undefined,
      undefined,
      otherBase,
    ),
  );

  const cache = app.get(CooReadCache);

  const hits = cache.metrics.hit;

  await body(await request("first", "/operations/monitor"));

  assert.equal(
    cache.metrics.hit,
    hits + 1,
    "rate-limit bookkeeping must not invalidate a business read",
  );

  const key = randomUUID();

  const input = {
    version: before.policy.version,
    reviewDueHours: before.policy.reviewDueHours === 12 ? 24 : 12,
  };

  const saved = await body<{ version: number; reviewDueHours: number }>(
    await request("first", "/operations/monitor/policy", "POST", input, key),
  );

  const replay = await request(
    "first",
    "/operations/monitor/policy",
    "POST",
    input,
    key,
    otherBase,
  );

  assert.deepEqual(await body(replay), saved);

  assert.equal(replay.headers.get("Idempotency-Replayed"), "true");

  const fresh = await body<{
    policy: { version: number; reviewDueHours: number };
  }>(
    await request(
      "first",
      "/operations/monitor",
      "GET",
      undefined,
      undefined,
      otherBase,
    ),
  );

  assert.equal(fresh.policy.version, saved.version);

  assert.equal(fresh.policy.reviewDueHours, input.reviewDueHours);

  const response = await request("first", "/operations/monitor");

  assert.equal(response.headers.get("cache-control"), "private, no-store");
});

test("cached reads and completed command keys never bypass revoked or disabled access", async () => {
  await body(await request("second", "/operations/monitor"));

  const key = randomUUID();

  const input = {
    name: "Revocation fixture",
    code: `REVOKE-${suffix}`,
    active: true,
  };

  await body(await request("second", "/agents", "POST", input, key), 201);

  await db.user.update({
    where: { id: sessions.get("second")!.id },
    data: { role: "CSR" },
  });

  assert.ok(
    [401, 403].includes(
      (await request("second", "/operations/monitor")).status,
    ),
  );

  assert.ok(
    [401, 403].includes(
      (await request("second", "/agents", "POST", input, key)).status,
    ),
  );

  await db.user.update({
    where: { id: sessions.get("second")!.id },
    data: { role: "COO", active: false },
  });

  assert.ok(
    [401, 403].includes(
      (await request("second", "/operations/monitor")).status,
    ),
  );

  await db.user.update({
    where: { id: sessions.get("second")!.id },
    data: { active: true },
  });
});

test("memory entries are isolated by actor and query, and returned objects cannot mutate the cache", async () => {
  const cache = new CooReadCache(db, config);

  let loads = 0;

  const identity = {
    account: sessions.get("first")!.id,
    query: "private-name@example.test",
    page: 1,
  };

  const load = async () => {
    return { name: "Temporary response", sequence: ++loads };
  };

  try {
    const first = await cache.read(identity, load);

    first.name = "Caller mutation";

    assert.equal((await cache.read(identity, load)).name, "Temporary response");

    assert.equal(loads, 1);

    assert.equal(
      (
        await cache.read(
          { ...identity, account: sessions.get("second")!.id },
          load,
        )
      ).sequence,
      2,
    );

    assert.equal(
      (await cache.read({ ...identity, page: 2 }, load)).sequence,
      3,
    );

    assert.equal(cache.status().mode, "memory");
  } finally {
    cache.onModuleDestroy();
  }
});

test("a late stale fill cannot replace the cache version used after commit", async () => {
  const agent = await db.agent.create({
    data: { name: "Old value", code: `RACE-${suffix}` },
  });

  let release!: () => void;

  let captured!: () => void;

  const held = new Promise<void>((resolve) => {
    release = resolve;
  });

  const started = new Promise<void>((resolve) => {
    captured = resolve;
  });

  const identity = { race: agent.id };

  const cache = app.get(CooReadCache);

  const old = cache.read(identity, async () => {
    const row = await db.agent.findUniqueOrThrow({ where: { id: agent.id } });

    captured();

    await held;

    return { name: row.name };
  });

  await started;

  await db.agent.update({
    where: { id: agent.id },
    data: { name: "Committed value" },
  });

  const load = async () => {
    return {
      name: (await db.agent.findUniqueOrThrow({ where: { id: agent.id } }))
        .name,
    };
  };

  assert.equal((await cache.read(identity, load)).name, "Committed value");

  release();

  assert.equal((await old).name, "Old value");

  assert.equal((await cache.read(identity, load)).name, "Committed value");
});

test("an older transaction committing late changes visibility even without a change-event ID", async () => {
  let release!: () => void;

  let staged!: () => void;

  const held = new Promise<void>((resolve) => {
    release = resolve;
  });

  const started = new Promise<void>((resolve) => {
    staged = resolve;
  });

  const code = `LATE-${suffix}`;

  const transaction = db.$transaction(
    async (tx) => {
      await tx.agent.create({ data: { name: "Late commit", code } });

      staged();

      await held;
    },
    { timeout: 10000 },
  );

  await started;

  const cache = app.get(CooReadCache);

  const load = () => {
    return db.agent.count({ where: { code } });
  };

  assert.equal(await cache.read({ late: code }, load), 0);

  release();

  await transaction;

  assert.equal(await cache.read({ late: code }, load), 1);
});

test("concurrent misses coalesce and source failures are not cached", async () => {
  const cache = app.get(CooReadCache);

  let loads = 0;

  const result = await Promise.all(
    Array.from({ length: 12 }, () => {
      return cache.read({ singleFlight: suffix }, async () => {
        loads++;

        await new Promise((resolve) => {
          return setTimeout(resolve, 100);
        });

        return { items: ["result"] };
      });
    }),
  );

  assert.equal(loads, 1);

  result[0].items.push("changed");

  assert.equal(result[1].items.length, 1);

  await assert.rejects(
    cache.read({ failure: suffix }, async () => {
      throw new Error("Primary unavailable");
    }),
    /Primary unavailable/,
  );

  assert.deepEqual(
    await cache.read({ failure: suffix }, async () => {
      return { recovered: true };
    }),
    { recovered: true },
  );
});

test("database failure never serves a cached success or caches an error", async () => {
  let failed = false;

  const source = {
    $queryRaw: (...args: Parameters<Database["$queryRaw"]>) => {
      return failed
        ? Promise.reject(new Error("Database unavailable"))
        : db.$queryRaw(...args);
    },
  } as unknown as Database;

  const cache = new CooReadCache(source, config);

  try {
    assert.equal(
      await cache.read({ primaryFailure: suffix }, async () => {
        return "fresh";
      }),
      "fresh",
    );

    failed = true;

    await assert.rejects(
      cache.read({ primaryFailure: suffix }, async () => {
        return "unsafe";
      }),
      /Database unavailable/,
    );
  } finally {
    cache.onModuleDestroy();
  }
});

test("local cache memory and value sizes stay bounded under high-cardinality queries", async () => {
  const cache = new CooReadCache(db, config);

  for (let index = 0; index < 40; index++) {
    await cache.read({ cardinality: index }, async () => {
      return {
        text: "x".repeat(300 * 1024),
      };
    });
  }

  assert.ok(cache.status().bytes <= 8 * 1024 * 1024);

  assert.ok(cache.status().entries <= 32);

  let largeLoads = 0;

  for (let count = 0; count < 2; count++) {
    await cache.read({ oversized: suffix }, async () => {
      largeLoads++;

      return "x".repeat(600 * 1024);
    });
  }

  assert.equal(largeLoads, 2);

  cache.onModuleDestroy();
});

test("COO budgets are shared across replicas and key/query rotation cannot reset them", async () => {
  const tight = {
    ...config,
    REDIS_NAMESPACE: `coo-tight-${suffix}`,
    ABUSE_LIMITS: {
      ...config.ABUSE_LIMITS,
      cooWrite: [[2, 3600]],
      cooRead: [[2, 3600]],
    },
  } as Config;

  const left = await createApp(tight);

  const right = await createApp(tight);

  await left.listen(0, "127.0.0.1");

  await right.listen(0, "127.0.0.1");

  try {
    const a = await left.getUrl();

    const b = await right.getUrl();

    await body(
      await request(
        "first",
        "/agents",
        "POST",
        { name: "Limit one", code: `LIMIT1-${suffix}`, active: true },
        randomUUID(),
        a,
      ),
      201,
    );

    await body(
      await request(
        "first",
        "/agents",
        "POST",
        { name: "Limit two", code: `LIMIT2-${suffix}`, active: true },
        randomUUID(),
        b,
      ),
      201,
    );

    const denied = await request(
      "first",
      "/agents",
      "POST",
      { name: "Limit denied", code: `LIMIT3-${suffix}`, active: true },
      randomUUID(),
      a,
    );

    assert.equal(denied.status, 429);

    assert.ok(Number(denied.headers.get("Retry-After")) > 0);

    assert.equal(
      await db.agent.count({ where: { code: `LIMIT3-${suffix}` } }),
      0,
    );

    assert.equal(
      (await request("first", "/agents?page=1", "GET", undefined, undefined, a))
        .status,
      200,
    );

    assert.equal(
      (await request("first", "/agents?page=2", "GET", undefined, undefined, b))
        .status,
      200,
    );

    assert.equal(
      (await request("first", "/agents?page=3", "GET", undefined, undefined, a))
        .status,
      429,
    );
  } finally {
    await right.close();

    await left.close();
  }
});

test("canonical fingerprints preserve array order, normalize object order and bound nesting", () => {
  assert.equal(
    canonicalJson({ b: 2, a: [1, 2] }),
    canonicalJson({ a: [1, 2], b: 2 }),
  );

  assert.notEqual(canonicalJson([1, 2]), canonicalJson([2, 1]));

  const dangerous = JSON.parse('{"__proto__":{"polluted":true},"a":1}');

  assert.match(canonicalJson(dangerous), /__proto__/);

  assert.equal(({} as Record<string, unknown>).polluted, undefined);

  let deep: unknown = null;

  for (let index = 0; index < 45; index++) {
    deep = { child: deep };
  }

  assert.throws(() => {
    return canonicalJson(deep);
  }, /deeply nested/);
});

test("response caches expire within five seconds and do not replace durable idempotency", async () => {
  const cache = new CooReadCache(db, config);

  const key = randomUUID();

  const input = { name: "Expiry fixture", code: "TTL-" + suffix, active: true };

  await body(await request("first", "/agents", "POST", input, key), 201);

  let loads = 0;

  try {
    const load = async () => {
      return { value: ++loads };
    };

    assert.equal((await cache.read({ ttl: suffix }, load)).value, 1);

    assert.equal((await cache.read({ ttl: suffix }, load)).value, 1);

    await new Promise((resolve) => {
      return setTimeout(resolve, 5100);
    });

    assert.equal(cache.status().entries, 0);

    assert.equal(cache.status().bytes, 0);

    assert.equal((await cache.read({ ttl: suffix }, load)).value, 2);

    const replay = await request("first", "/agents", "POST", input, key);

    await body(replay, 201);

    assert.equal(replay.headers.get("Idempotency-Replayed"), "true");
  } finally {
    cache.onModuleDestroy();
  }
});
