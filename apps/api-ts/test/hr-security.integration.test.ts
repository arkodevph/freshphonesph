import "reflect-metadata";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import { createApp } from "../src/app";
import type { Config } from "../src/config";
import { Database } from "../src/database";
import { hashPassword } from "../src/auth/password";

const databaseUrl = process.env.TEST_DATABASE_URL;

if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith("_test")) {
  throw new Error("Use a migrated dedicated _test database.");
}

const suffix = randomUUID();

const origin = "http://localhost:3100";

const config = {
  NODE_ENV: "test",
  PORT: 4100,
  HOST: "127.0.0.1",
  DATABASE_URL: databaseUrl,
  WEB_ORIGIN: origin,
  JWT_SECRET: "hr-security-test-secret-at-least-32-characters",
  EMAIL_FROM: "test@example.test",
  CUSTOMER_REMINDER_DAYS_BEFORE: "",
  PRIVATE_STORAGE_PROVIDER: "local",
  PRIVATE_STORAGE_S3_REGION: "ap-southeast-1",
  REDIS_NAMESPACE: `hr-security-${suffix}`,
  ABUSE_LIMITS: {
    cooRead: [[10000, 60]],
    cooWrite: [[10000, 60]],
    accountRead: [[10000, 60]],
    accountWrite: [[10000, 60]],
  },
} as Config;

let app: INestApplication, second: INestApplication, db: Database;

let base: string, otherBase: string;

const actors = new Map<string, { id: string; cookie: string }>();

function request(
  actor: string,
  path: string,
  input?: unknown,
  key?: string,
  server = base,
) {
  return fetch(`${server}/api${path}`, {
    method: input === undefined ? "GET" : "POST",
    headers: {
      Origin: origin,
      Cookie: actors.get(actor)?.cookie ?? "",
      ...(input === undefined ? {} : { "Content-Type": "application/json" }),
      ...(key ? { "Idempotency-Key": key } : {}),
    },
    ...(input === undefined ? {} : { body: JSON.stringify(input) }),
  });
}

async function body(response: Response, expected = 201) {
  assert.equal(response.status, expected, await response.clone().text());

  return response.json();
}

function job() {
  return {
    title: `HR security ${randomUUID()}`,
    description: "Synthetic position for security validation.",
    location: "Remote",
    employmentType: "Full time",
    isOpen: true,
  };
}

before(async () => {
  app = await createApp(config);

  second = await createApp(config);

  await app.listen(0, "127.0.0.1");

  await second.listen(0, "127.0.0.1");

  base = await app.getUrl();

  otherBase = await second.getUrl();

  db = app.get(Database);

  const password = "Synthetic-HR-security-password-123!";

  const passwordHash = await hashPassword(password);

  for (const [actor, role] of [
    ["hr", "HR_PAYROLL"],
    ["otherHr", "HR_PAYROLL"],
    ["coo", "COO"],
    ["csr", "CSR"],
  ] as const) {
    const user = await db.user.create({
      data: {
        name: `Synthetic ${actor}`,
        email: `hr-security-${actor}-${suffix}@example.test`.toLowerCase(),
        passwordHash,
        role,
        hrConfidentialAccess: role === "HR_PAYROLL" || role === "COO",
      },
    });

    const login = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email, password }),
    });

    await body(login, 200);

    actors.set(actor, {
      id: user.id,
      cookie: login.headers
        .getSetCookie()
        .map((cookie) => {
          return cookie.split(";")[0];
        })
        .join("; "),
    });
  }
});

after(async () => {
  await second?.close();

  await app?.close();
});

test("HR retries across replicas produce one job and audit; keys bind actor and intent", async () => {
  const input = job();

  const key = randomUUID();

  const responses = await Promise.all(
    Array.from({ length: 6 }, (_, index) => {
      return request(
        "hr",
        "/recruitment/jobs",
        input,
        key,
        index % 2 ? base : otherBase,
      );
    }),
  );

  const results = await Promise.all(
    responses.map((response) => {
      return body(response);
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
      return response.headers.get("Idempotency-Replayed") === "true";
    }).length,
    5,
  );

  assert.equal(await db.jobOpening.count({ where: { title: input.title } }), 1);

  assert.equal(
    await db.auditEntry.count({ where: { recordId: results[0].id } }),
    1,
  );

  assert.equal(
    (
      await request(
        "hr",
        "/recruitment/jobs",
        { ...input, title: "Changed intent" },
        key,
      )
    ).status,
    409,
  );

  const other = await body(
    await request("otherHr", "/recruitment/jobs", input, key),
  );

  assert.notEqual(other.id, results[0].id);

  assert.equal(
    (await request("csr", "/recruitment/jobs", input, key)).status,
    403,
  );
});

test("HR rejects malformed and expired replay keys without creating another record", async () => {
  const input = job();

  assert.equal(
    (await request("hr", "/recruitment/jobs", input, "short")).status,
    400,
  );

  assert.equal(await db.jobOpening.count({ where: { title: input.title } }), 0);

  const key = randomUUID();

  await body(await request("hr", "/recruitment/jobs", input, key));

  await db.$executeRaw`UPDATE "CooRequestReplay" SET "expiresAt" = clock_timestamp() - INTERVAL '1 second' WHERE "actorId" = ${actors.get("hr")!.id}::uuid`;

  assert.equal(
    (await request("hr", "/recruitment/jobs", input, key, otherBase)).status,
    409,
  );

  assert.equal(await db.jobOpening.count({ where: { title: input.title } }), 1);
});

test("HR and COO proposals replay atomically without duplicate HR audits or events", async () => {
  for (const actor of ["hr", "coo"]) {
    const task = await db.task.create({
      data: {
        title: "Synthetic reviewed task",
        creatorId: actors.get("coo")!.id,
        assigneeId: actors.get("csr")!.id,
        deadline: new Date("2026-01-01"),
        status: "SUBMITTED",
        review: {
          create: {
            reviewerId: actors.get(actor)!.id,
            factualEvidence: "Synthetic recorded evidence.",
            evaluation: "Human reviewed the context.",
            recommendation: "Discuss expectations.",
            decision: "ACTION_RECOMMENDED",
          },
        },
      },
      include: { review: true },
    });

    const input = {
      reviewId: task.review!.id,
      proposedAction: "Schedule a coaching conversation",
      rationale: "A human reviewed the work and recommended a conversation.",
    };

    const key = randomUUID();

    const responses = await Promise.all([
      request(actor, "/hr-actions", input, key),
      request(actor, "/hr-actions", input, key, otherBase),
    ]);

    const results = await Promise.all(
      responses.map((response) => {
        return body(response);
      }),
    );

    assert.deepEqual(results[0], results[1]);

    assert.equal(
      await db.hrActionRequest.count({ where: { reviewId: input.reviewId } }),
      1,
    );

    assert.equal(
      await db.auditEntry.count({
        where: { recordId: results[0].id, action: "hr_action.requested" },
      }),
      1,
    );

    assert.equal(
      await db.changeEvent.count({
        where: { entity: "hr_action_request", recordId: results[0].id },
      }),
      1,
    );

    assert.equal(
      (
        await request(
          actor,
          "/hr-actions",
          {
            ...input,
            rationale: "A changed human rationale for a different intent.",
          },
          key,
        )
      ).status,
      409,
    );
  }
});

test("HR receives COO read/write budgets across replicas despite query and key rotation", async () => {
  const tight = {
    ...config,
    REDIS_NAMESPACE: `hr-tight-${suffix}`,
    ABUSE_LIMITS: {
      ...config.ABUSE_LIMITS,
      cooRead: [[2, 3600]],
      cooWrite: [[2, 3600]],
    },
  } as Config;

  const left = await createApp(tight);

  const right = await createApp(tight);

  try {
    await left.listen(0, "127.0.0.1");

    await right.listen(0, "127.0.0.1");

    const a = await left.getUrl();

    const b = await right.getUrl();

    await body(
      await request("hr", "/recruitment/jobs", job(), randomUUID(), a),
    );

    await body(
      await request("hr", "/recruitment/jobs", job(), randomUUID(), b),
    );

    const input = job();

    const denied = await request(
      "hr",
      "/recruitment/jobs",
      input,
      randomUUID(),
      a,
    );

    assert.equal(denied.status, 429);

    assert.ok(Number(denied.headers.get("Retry-After")) > 0);

    assert.equal(
      await db.jobOpening.count({ where: { title: input.title } }),
      0,
    );

    await body(
      await request(
        "hr",
        "/personnel/onboarding?page=1",
        undefined,
        undefined,
        a,
      ),
      200,
    );

    await body(
      await request(
        "hr",
        "/personnel/onboarding?page=2",
        undefined,
        undefined,
        b,
      ),
      200,
    );

    assert.equal(
      (
        await request(
          "hr",
          "/personnel/onboarding?page=3",
          undefined,
          undefined,
          a,
        )
      ).status,
      429,
    );
  } finally {
    await right.close();

    await left.close();
  }
});

test("HR confidential revocation blocks completed replays, and disabled accounts cannot read or write", async () => {
  const key = randomUUID();

  const input = job();

  await body(await request("otherHr", "/recruitment/jobs", input, key));

  const privateRead = await request("otherHr", "/personnel/onboarding");

  await body(privateRead, 200);

  assert.match(privateRead.headers.get("Cache-Control") ?? "", /no-store/);

  await db.user.update({
    where: { id: actors.get("otherHr")!.id },
    data: { hrConfidentialAccess: false },
  });

  assert.ok(
    [401, 403].includes(
      (
        await request(
          "otherHr",
          "/personnel/onboarding",
          undefined,
          undefined,
          otherBase,
        )
      ).status,
    ),
  );

  // A completed key cannot bypass session revocation or the changed access fingerprint.
  assert.ok(
    [401, 403, 409].includes(
      (await request("otherHr", "/recruitment/jobs", input, key, otherBase))
        .status,
    ),
  );

  assert.equal(await db.jobOpening.count({ where: { title: input.title } }), 1);

  await db.user.update({
    where: { id: actors.get("otherHr")!.id },
    data: { active: false },
  });

  assert.equal((await request("otherHr", "/personnel/onboarding")).status, 401);

  assert.equal(
    (await request("otherHr", "/recruitment/jobs", input, key)).status,
    401,
  );
});

test("HR security controls enforce same-origin writes and required staff MFA", async () => {
  const denied = await fetch(`${base}/api/recruitment/jobs`, {
    method: "POST",
    headers: {
      Origin: "https://untrusted.example",
      Cookie: actors.get("hr")!.cookie,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(job()),
  });

  assert.equal(denied.status, 403);

  const mfa = await createApp({ ...config, AUTH_REQUIRE_STAFF_MFA: "true" });

  try {
    await mfa.listen(0, "127.0.0.1");

    for (const actor of ["hr", "coo"]) {
      assert.equal(
        (
          await request(
            actor,
            "/personnel/onboarding",
            undefined,
            undefined,
            await mfa.getUrl(),
          )
        ).status,
        412,
      );
    }
  } finally {
    await mfa.close();
  }
});
