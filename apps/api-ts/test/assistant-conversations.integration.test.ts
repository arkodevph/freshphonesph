import "reflect-metadata";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import { createApp } from "../src/app";
import { Database } from "../src/database";
import { hashPassword } from "../src/auth/password";
import { AssistantConversationsService } from "../src/assistant/conversations.service";
import type { Config } from "../src/config";
import type { AssistantConversationState } from "@freshphones/contracts";

const databaseUrl = process.env.TEST_DATABASE_URL;

if (
  !databaseUrl ||
  !new URL(databaseUrl).pathname.endsWith("_test") ||
  !["localhost", "127.0.0.1"].includes(new URL(databaseUrl).hostname)
) {
  throw new Error("Use a dedicated local database ending in _test.");
}

let app: INestApplication;

let db: Database;

let base: string;

let owner: { id: string; cookie: string };

let other: typeof owner;

let staff: typeof owner;

const createdUsers: string[] = [];

const origin = "http://localhost:3100";

const password = "Synthetic-History-1234!";

const state = (
  text = "Explain verified payments",
): AssistantConversationState => {
  return {
    draft: "",
    includeContext: true,
    questions: [
      {
        id: 1,
        text,
        context: null,
        response: null,
        error: "Response stopped.",
        partial: "Verified payments",
        status: "Stopped",
      },
    ],
  };
};

before(async () => {
  app = await createApp({
    NODE_ENV: "test",
    PORT: 4100,
    HOST: "127.0.0.1",
    DATABASE_URL: databaseUrl,
    WEB_ORIGIN: origin,
    JWT_SECRET: "assistant-history-test-at-least-thirty-two-characters",
    LOCAL_DEMO_AUTH: false,
    EMAIL_FROM: "synthetic@example.test",
    CUSTOMER_REMINDER_DAYS_BEFORE: "",
    PRIVATE_STORAGE_PROVIDER: "local",
    PRIVATE_STORAGE_S3_REGION: "ap-southeast-1",
    ABUSE_LIMITS: { accountRead: [[1000, 60]], accountWrite: [[1000, 60]] },
  } as Config);

  await app.listen(0, "127.0.0.1");

  base = await app.getUrl();

  db = app.get(Database);

  async function person(role: "CEO" | "ANALYTICS") {
    const user = await db.user.create({
      data: {
        name: "Synthetic history",
        email: `${randomUUID()}@example.test`,
        role,
        passwordHash: await hashPassword(password),
      },
    });

    createdUsers.push(user.id);

    const response = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email, password }),
    });

    assert.equal(response.status, 200);

    return {
      id: user.id,
      cookie: response.headers
        .getSetCookie()
        .map((value) => {
          return value.split(";")[0];
        })
        .join("; "),
    };
  }

  owner = await person("CEO");

  other = await person("CEO");

  staff = await person("ANALYTICS");
});

after(async () => {
  if (db) {
    await db.assistantConversation.deleteMany({
      where: { userId: { in: createdUsers } },
    });
  }

  await app?.close();
});

const request = (
  path: string,
  actor = owner,
  method = "GET",
  body?: unknown,
) => {
  return fetch(`${base}/api/assistant/conversations${path}`, {
    method,
    headers: {
      Cookie: actor.cookie,
      Origin: origin,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
};

test("browser preflight permits authenticated conversation saves", async () => {
  const response = await fetch(
    `${base}/api/assistant/conversations/${randomUUID()}`,
    {
      method: "OPTIONS",
      headers: {
        Origin: origin,
        "Access-Control-Request-Method": "PUT",
        "Access-Control-Request-Headers": "content-type",
      },
    },
  );

  assert.equal(response.status, 204);

  assert.equal(response.headers.get("access-control-allow-origin"), origin);

  assert.equal(
    response.headers.get("access-control-allow-credentials"),
    "true",
  );

  assert.ok(
    response.headers
      .get("access-control-allow-methods")
      ?.split(",")
      .includes("PUT"),
    "The browser must be allowed to send conversation PUT requests",
  );

  assert.ok(
    response.headers
      .get("access-control-allow-headers")
      ?.toLowerCase()
      .split(",")
      .includes("content-type"),
  );
});

test("account history persists across new service instances; ownership and roles precede reads and writes", async () => {
  const id = randomUUID();

  let result = await request(`/${id}`, owner, "PUT", {
    accountId: owner.id,
    revision: 0,
    state: state(),
  });

  assert.equal(result.status, 200, await result.clone().text());

  assert.equal(result.headers.get("cache-control"), "private, no-store");

  const reopened = new AssistantConversationsService(db, {
    NODE_ENV: "test",
  } as Config);

  assert.equal(
    (await reopened.get(owner.id, id)).state.questions[0].text,
    "Explain verified payments",
  );

  assert.equal((await request(`/${id}`, other)).status, 404);

  assert.equal((await request(`/${id}`, staff)).status, 403);

  assert.equal(
    (await fetch(`${base}/api/assistant/conversations/${id}`)).status,
    401,
  );

  assert.equal(
    (
      await request(`/${id}`, other, "PUT", {
        accountId: other.id,
        revision: 1,
        state: state("attack"),
      })
    ).status,
    409,
  );

  assert.equal(
    (
      await request(`/${id}`, other, "PUT", {
        accountId: owner.id,
        revision: 1,
        state: state("stale account"),
      })
    ).status,
    403,
  );

  assert.equal(
    (
      await request("", other).then((r) => {
        return r.json();
      })
    ).length,
    0,
  );

  assert.equal(
    (
      await request("", owner).then((r) => {
        return r.json();
      })
    )[0].id,
    id,
  );
});

test("optimistic revisions reject old tab writes and deleted sessions cannot be resurrected by queued updates", async () => {
  const id = randomUUID();

  await request(`/${id}`, owner, "PUT", {
    accountId: owner.id,
    revision: 0,
    state: state(),
  });

  const updates = await Promise.all(
    ["new A", "new B"].map((text) => {
      return request(`/${id}`, owner, "PUT", {
        accountId: owner.id,
        revision: 1,
        state: state(text),
      });
    }),
  );

  assert.deepEqual(
    updates
      .map((r) => {
        return r.status;
      })
      .sort(),
    [200, 409],
  );

  const saved = await request(`/${id}`).then((r) => {
    return r.json();
  });

  assert.equal(saved.revision, 2);

  await request(`/${id}`, owner, "DELETE");

  assert.equal(
    (
      await request(`/${id}`, owner, "PUT", {
        accountId: owner.id,
        revision: 2,
        state: state("late"),
      })
    ).status,
    409,
  );

  assert.equal((await request(`/${id}`)).status, 404);
});

test("large report transcripts stay bounded; malformed replies and over-capacity histories are rejected", async () => {
  const id = randomUUID();

  const large = state();

  large.questions[0].partial = "x".repeat(59000);

  large.questions.push({ ...large.questions[0], id: 2 });

  assert.equal(
    (
      await request(`/${id}`, owner, "PUT", {
        accountId: owner.id,
        revision: 0,
        state: large,
      })
    ).status,
    200,
  );

  const bad = state();

  bad.questions[0].response = { paragraphs: ["bad"] } as never;

  assert.equal(
    (
      await request(`/${randomUUID()}`, owner, "PUT", {
        accountId: owner.id,
        revision: 0,
        state: bad,
      })
    ).status,
    400,
  );

  const excessive = state();

  excessive.questions = Array.from({ length: 201 }, (_, i) => {
    return {
      ...excessive.questions[0],
      id: i + 1,
    };
  });

  assert.equal(
    (
      await request(`/${randomUUID()}`, owner, "PUT", {
        accountId: owner.id,
        revision: 0,
        state: excessive,
      })
    ).status,
    400,
  );
});

test("cache outage falls back to PostgreSQL and is not reported as a missing conversation", async () => {
  const id = randomUUID();

  const service = new AssistantConversationsService(db, {
    REDIS_URL: "redis://127.0.0.1:1",
    REDIS_NAMESPACE: `history-test-${randomUUID()}`,
  } as Config);

  try {
    await service.save(owner.id, id, 0, state("Redis is optional"));

    const started = Date.now();

    assert.equal(
      (await service.get(owner.id, id)).state.questions[0].text,
      "Redis is optional",
    );

    assert.ok(Date.now() - started < 1500);

    assert.ok(service.cacheMetrics.fallback > 0);
  } finally {
    service.onApplicationShutdown();
  }
});

test(
  "real Redis validates hits, coalesces misses, and an old fill cannot replace a committed revision",
  { skip: !process.env.TEST_REDIS_URL },
  async () => {
    if (!process.env.TEST_REDIS_URL) {
      throw new Error("TEST_REDIS_URL is required for cache verification.");
    }

    const { Redis } = await import("ioredis");

    const redis = new Redis(process.env.TEST_REDIS_URL);

    const namespace = `assistant-history-test-${randomUUID()}`;

    const config = {
      REDIS_URL: process.env.TEST_REDIS_URL,
      REDIS_NAMESPACE: namespace,
    } as Config;

    const service = new AssistantConversationsService(db, config);

    const id = randomUUID();

    const key = `${namespace}:assistant:v1:user:${owner.id}:conversation:${id}:revision:1`;

    let fullReads = 0;

    const countedDb = {
      assistantConversation: {
        findFirst: async (
          args: Parameters<Database["assistantConversation"]["findFirst"]>[0],
        ) => {
          const result = await db.assistantConversation.findFirst(args);

          if (args?.where?.revision) {
            fullReads++;

            await new Promise((resolve) => {
              return setTimeout(resolve, 40);
            });
          }

          return result;
        },
      },
    } as unknown as Database;

    const counted = new AssistantConversationsService(countedDb, config);

    let releaseOld: () => void = () => {};

    let sawOld: () => void = () => {};

    const oldRead = new Promise<void>((resolve) => {
      sawOld = resolve;
    });

    const gate = new Promise<void>((resolve) => {
      releaseOld = resolve;
    });

    const delayedDb = {
      assistantConversation: {
        findFirst: async (
          args: Parameters<Database["assistantConversation"]["findFirst"]>[0],
        ) => {
          const result = await db.assistantConversation.findFirst(args);

          if (args?.where?.revision === 1) {
            sawOld();

            await gate;
          }

          return result;
        },
      },
    } as unknown as Database;

    const delayed = new AssistantConversationsService(delayedDb, config);

    try {
      await service.save(owner.id, id, 0, state("version one"));

      await service.get(owner.id, id);

      await service.get(owner.id, id);

      assert.equal(service.cacheMetrics.hit, 1);

      assert.ok((await redis.ttl(key)) >= 269 && (await redis.ttl(key)) <= 330);

      await redis.set(key, "invalid json", "EX", 30);

      assert.equal(
        (await service.get(owner.id, id)).state.questions[0].text,
        "version one",
      );

      assert.equal(service.cacheMetrics.invalid, 1);

      await redis.del(key);

      await Promise.all(
        Array.from({ length: 8 }, () => {
          return counted.get(owner.id, id);
        }),
      );

      assert.equal(fullReads, 1);

      assert.equal(counted.cacheMetrics.coalesced, 7);

      await redis.del(key);

      const old = delayed.get(owner.id, id);

      await oldRead;

      await service.save(owner.id, id, 1, state("version two"));

      releaseOld();

      assert.equal((await old).revision, 1);

      assert.equal(
        (await service.get(owner.id, id)).state.questions[0].text,
        "version two",
      );

      await assert.rejects(service.get(other.id, id), /not found/);

      await service.remove(owner.id, id);

      await assert.rejects(service.get(owner.id, id), /not found/);
    } finally {
      releaseOld();

      service.onApplicationShutdown();

      counted.onApplicationShutdown();

      delayed.onApplicationShutdown();

      const keys = await redis.keys(`${namespace}:*`);

      if (keys.length) {
        await redis.del(...keys);
      }

      redis.disconnect();
    }
  },
);

test("bounded local fallback caches payloads without Redis and expires them; database errors are never cached", async () => {
  const service = new AssistantConversationsService(db, {} as Config);

  const id = randomUUID();

  await service.save(owner.id, id, 0, state("local cached history"));

  await service.get(owner.id, id);

  await service.get(owner.id, id);

  assert.equal(service.cacheMetrics.hit, 1);

  const entries = Reflect.get(service, "local") as Map<
    string,
    { value: string; expires: number }
  >;

  for (const entry of entries.values()) {
    entry.expires = 0;
  }

  await service.get(owner.id, id);

  assert.equal(service.cacheMetrics.miss, 2);

  for (let index = 0; index < 17; index++) {
    const next = randomUUID();

    await service.save(owner.id, next, 0, state());

    await service.get(owner.id, next);
  }

  assert.ok(entries.size <= 16);

  let fail = true;

  const failingDb = {
    assistantConversation: {
      findFirst: async (
        args: Parameters<Database["assistantConversation"]["findFirst"]>[0],
      ) => {
        if (args?.where?.revision && fail) {
          fail = false;

          throw new Error("synthetic database unavailable");
        }

        return db.assistantConversation.findFirst(args);
      },
    },
  } as unknown as Database;

  const cold = new AssistantConversationsService(failingDb, {} as Config);

  await assert.rejects(
    cold.get(owner.id, id),
    /synthetic database unavailable/,
  );

  assert.equal(
    (await cold.get(owner.id, id)).state.questions[0].text,
    "local cached history",
  );

  assert.equal(cold.cacheMetrics.hit, 0);
});
