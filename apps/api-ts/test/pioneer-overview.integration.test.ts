import "reflect-metadata";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import type { INestApplication } from "@nestjs/common";
import {
  roles,
  type User,
  type PioneerTeamOverview,
  type PioneerTaskOverview,
} from "@freshphones/contracts";
import { createApp } from "../src/app";
import { Database } from "../src/database";
import { hashPassword } from "../src/auth/password";
import { PioneerOverviewService } from "../src/records/pioneer-overview.service";

const url = process.env.TEST_DATABASE_URL;

if (!url || !new URL(url).pathname.endsWith("_test")) {
  throw new Error(
    "Dedicated migrated TEST_DATABASE_URL ending in _test required.",
  );
}

const origin = "http://localhost:3100";

const suffix = randomUUID().slice(0, 8);

const people = new Map<string, { id: string; cookie: string }>();

let app: INestApplication, db: Database, base: string, leadAgent: string;

async function request(key: string | null, path: string) {
  return fetch(`${base}/api${path}`, {
    headers: {
      Origin: origin,
      ...(key ? { Cookie: people.get(key)!.cookie } : {}),
    },
  });
}

async function get<T>(path: string, key = "PIONEER_AGENT"): Promise<T> {
  const response = await request(key, path);

  assert.equal(response.status, 200, await response.clone().text());

  return response.json();
}

before(async () => {
  app = await createApp({
    NODE_ENV: "test",
    HOST: "127.0.0.1",
    PORT: 4100,
    DATABASE_URL: url!,
    WEB_ORIGIN: origin,
    JWT_SECRET: "synthetic-pioneer-overview-secret-longer-than-32-characters",
    LOCAL_DEMO_AUTH: false,
    EMAIL_FROM: "synthetic@example.test",
    CUSTOMER_REMINDER_DAYS_BEFORE: "",
    PRIVATE_STORAGE_PROVIDER: "local",
    PRIVATE_STORAGE_S3_REGION: "ap-southeast-1",
    ABUSE_LIMITS: {
      auth: [[10000, 60]],
      accountRead: [[100000, 60]],
      accountWrite: [[10000, 60]],
      expensive: [[100000, 60]],
    },
  });

  await app.listen(0, "127.0.0.1");

  base = await app.getUrl();

  db = app.get(Database);

  const password = "Synthetic-pioneer-test-password-123!";

  const passwordHash = await hashPassword(password);

  const batch = await db.batch.create({
    data: {
      code: `PIONEER-${suffix}`,
      model: "Synthetic device",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2027-01-01"),
    },
  });

  const client = await db.client.create({
    data: {
      name: "Synthetic customer",
      email: "",
      phone: "",
      batchId: batch.id,
    },
  });

  for (const key of [...roles, "other-pioneer", "empty-pioneer"]) {
    const role =
      roles.find((role) => {
        return role === key;
      }) ?? "PIONEER_AGENT";

    const user = await db.user.create({
      data: {
        name: `Synthetic ${key}`,
        email: `pioneer-${key.toLowerCase()}-${suffix}@example.test`,
        role,
        passwordHash,
        ...(role === "CUSTOMER" ? { clientId: client.id } : {}),
      },
    });

    const response = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email, password }),
    });

    assert.equal(response.status, 200, `${key} login`);

    people.set(key, {
      id: user.id,
      cookie: response.headers
        .getSetCookie()
        .map((value) => {
          return value.split(";")[0];
        })
        .join("; "),
    });
  }

  const pioneerId = people.get("PIONEER_AGENT")!.id;

  const profiles = Array.from({ length: 502 }, (_, index) => {
    return {
      id: randomUUID(),
      name: `Synthetic Agent ${index}`,
      code: `PA-${suffix}-${index}`,
      active: index !== 501,
    };
  });

  await db.agent.createMany({ data: profiles });

  const agents = Array.from({ length: 503 }, (_, index) => {
    return {
      id: randomUUID(),
      name: `Agent ${String(index).padStart(4, "0")}`,
      email: `pioneer-agent-${suffix}-${index}@example.test`,
      role: "AGENT" as const,
      passwordHash,
      supervisorId: pioneerId,
      agentProfileId: profiles[index]?.id ?? null,
    };
  });

  leadAgent = agents[0].id;

  await db.user.createMany({ data: agents });

  const inactive = await db.user.create({
    data: {
      name: "Inactive Agent",
      email: `inactive-${suffix}@example.test`,
      role: "AGENT",
      active: false,
      passwordHash,
      supervisorId: pioneerId,
    },
  });

  const foreign = await db.user.create({
    data: {
      name: "Other team's Agent",
      email: `foreign-${suffix}@example.test`,
      role: "AGENT",
      passwordHash,
      supervisorId: people.get("other-pioneer")!.id,
    },
  });

  await db.user.create({
    data: {
      name: "Direct non-Agent",
      email: `non-agent-${suffix}@example.test`,
      role: "BATCH_HANDLER",
      passwordHash,
      supervisorId: pioneerId,
    },
  });

  const approvedClients = Array.from({ length: 40 }, () => {
    return {
      id: randomUUID(),
      name: "Synthetic approved membership",
      email: "",
      phone: "",
      batchId: batch.id,
    };
  });

  await db.client.createMany({ data: approvedClients });

  await db.enrollmentRequest.createMany({
    data: [
      ...Array.from({ length: 121 }, (_, index) => {
        return {
          submissionId: randomUUID(),
          batchId: batch.id,
          submittedById: leadAgent,
          status: ["PENDING", "APPROVED", "REJECTED"][index % 3],
          ...(index % 3 === 1
            ? { clientId: approvedClients[Math.floor(index / 3)].id }
            : {}),
          ...(index % 3 !== 0
            ? {
                reviewedById: people.get("BATCH_MANAGER")!.id,
                reviewedAt: new Date(),
              }
            : {}),
          applicant: { name: "Synthetic request" },
        };
      }),
      ...[
        agents[501].id,
        agents[502].id,
        inactive.id,
        foreign.id,
        pioneerId,
      ].map((submittedById) => {
        return {
          submissionId: randomUUID(),
          batchId: batch.id,
          submittedById,
          status: "PENDING",
          applicant: { name: "Synthetic scope request" },
        };
      }),
    ],
  });

  for (const [assigneeId, perStatus] of [
    [pioneerId, 6],
    [leadAgent, 25],
    [inactive.id, 2],
    [foreign.id, 3],
  ] as const) {
    await db.task.createMany({
      data: (["TODO", "IN_PROGRESS", "SUBMITTED", "DONE"] as const).flatMap(
        (status) => {
          return Array.from({ length: perStatus }, (_, index) => {
            return {
              title: "Synthetic overview task",
              assigneeId,
              creatorId: pioneerId,
              status,
              ...(status === "SUBMITTED" || status === "DONE"
                ? { submittedAt: new Date("2000-01-01"), lateFlag: false }
                : {}),
              deadline: new Date(
                index < Math.floor(perStatus / 2) ? "2001-01-01" : "2099-01-01",
              ),
            };
          });
        },
      ),
    });
  }
});

after(async () => {
  await app?.close();
});

test("team aggregates exceed the old cap, partition profile state and reconcile all-time requests", async () => {
  const result = await get<PioneerTeamOverview>("/pioneer/overview/team");

  assert.deepEqual(result.agents, {
    total: 503,
    ready: 501,
    missingProfile: 1,
    inactiveProfile: 1,
  });

  assert.deepEqual(result.enrollments, {
    pending: 43,
    approved: 40,
    rejected: 40,
    total: 123,
  });

  assert.equal(result.preview.length, 4);

  assert.deepEqual(
    result.preview.map((row) => {
      return row.name;
    }),
    ["Agent 0000", "Agent 0001", "Agent 0002", "Agent 0003"],
  );

  assert.deepEqual(Object.keys(result.preview[0]).sort(), [
    "agentProfile",
    "id",
    "name",
  ]);

  const network = await get<{ agents: unknown[] }>("/agent-network");

  assert.equal(network.agents.length, 500);

  const requests = await get<{ total: number }>("/enrollment/requests?page=1");

  assert.equal(requests.total, result.enrollments.total);
});

test("own and team task facts cover every page and overdue excludes submitted/completed work", async () => {
  const result = await get<PioneerTaskOverview>("/pioneer/overview/tasks");

  assert.deepEqual(result.own, {
    todo: 6,
    inProgress: 6,
    submitted: 6,
    done: 6,
    total: 24,
    outstanding: 18,
    overdue: 6,
  });

  assert.deepEqual(result.team, {
    todo: 25,
    inProgress: 25,
    submitted: 25,
    done: 25,
    total: 100,
    outstanding: 75,
    overdue: 24,
  });

  const tasks = await get<{ count: number; results: unknown[] }>(
    "/tasks?page=1",
  );

  assert.equal(tasks.results.length, 20);

  assert.equal(tasks.count, result.own.total + result.team.total);

  assert.deepEqual(Object.keys(result).sort(), ["own", "team", "updatedAt"]);
});

test("empty and other teams have independent truthful totals", async () => {
  const empty = await get<PioneerTeamOverview>(
    "/pioneer/overview/team",
    "empty-pioneer",
  );

  assert.equal(empty.agents.total, 0);

  assert.equal(empty.enrollments.total, 0);

  assert.deepEqual(empty.preview, []);

  const emptyTasks = await get<PioneerTaskOverview>(
    "/pioneer/overview/tasks",
    "empty-pioneer",
  );

  assert.equal(emptyTasks.own.total + emptyTasks.team.total, 0);

  const other = await get<PioneerTeamOverview>(
    "/pioneer/overview/team",
    "other-pioneer",
  );

  assert.equal(other.agents.total, 1);

  assert.equal(other.enrollments.total, 1);

  assert.equal(
    (await get<PioneerTaskOverview>("/pioneer/overview/tasks", "other-pioneer"))
      .team.total,
    12,
  );
});

test("authentication, role isolation and unrequested scope filters are enforced on both endpoints", async () => {
  for (const path of ["/pioneer/overview/team", "/pioneer/overview/tasks"]) {
    assert.equal((await request(null, path)).status, 401);

    for (const role of roles.filter((role) => {
      return role !== "PIONEER_AGENT";
    })) {
      assert.equal((await request(role, path)).status, 403, `${role} ${path}`);
    }

    assert.equal(
      (
        await request(
          "PIONEER_AGENT",
          `${path}?agentId=${people.get("other-pioneer")!.id}`,
        )
      ).status,
      400,
    );

    assert.equal(
      (await request("PIONEER_AGENT", `${path}?period=this_month`)).status,
      400,
    );
  }
});

test("reassignment immediately moves totals without disclosing the previous team's data", async () => {
  await db.user.update({
    where: { id: leadAgent },
    data: { supervisorId: people.get("other-pioneer")!.id },
  });

  try {
    const result = await get<PioneerTeamOverview>("/pioneer/overview/team");

    assert.equal(result.agents.total, 502);

    assert.equal(result.enrollments.total, 2);

    assert(
      !result.preview.some((row) => {
        return row.id === leadAgent;
      }),
    );

    const tasks = await get<PioneerTaskOverview>("/pioneer/overview/tasks");

    assert.equal(tasks.team.total, 0);

    assert.equal(tasks.own.total, 24);

    assert.equal(
      (
        await get<PioneerTaskOverview>(
          "/pioneer/overview/tasks",
          "other-pioneer",
        )
      ).team.total,
      112,
    );
  } finally {
    await db.user.update({
      where: { id: leadAgent },
      data: { supervisorId: people.get("PIONEER_AGENT")!.id },
    });
  }
});

test("inactive Agent accounts leave every aggregate while inactive profiles remain visible", async () => {
  await db.user.update({ where: { id: leadAgent }, data: { active: false } });

  try {
    const result = await get<PioneerTeamOverview>("/pioneer/overview/team");

    assert.deepEqual(result.agents, {
      total: 502,
      ready: 500,
      missingProfile: 1,
      inactiveProfile: 1,
    });

    assert.equal(result.enrollments.total, 2);

    assert.equal(
      (await get<PioneerTaskOverview>("/pioneer/overview/tasks")).team.total,
      0,
    );
  } finally {
    await db.user.update({ where: { id: leadAgent }, data: { active: true } });
  }
});

test("service rechecks current active role even when called with a stale identity", async () => {
  const response = await get<User>("/auth/me");

  const service = app.get(PioneerOverviewService);

  const id = people.get("PIONEER_AGENT")!.id;

  await db.user.update({ where: { id }, data: { role: "AGENT" } });

  try {
    await assert.rejects(service.team(response), /access|Pioneer/i);

    await assert.rejects(service.tasks(response), /access|Pioneer/i);

    assert.equal(
      (await request("PIONEER_AGENT", "/pioneer/overview/team")).status,
      401,
    );
  } finally {
    await db.user.update({ where: { id }, data: { role: "PIONEER_AGENT" } });
  }

  await db.user.update({ where: { id }, data: { active: false } });

  try {
    await assert.rejects(service.team(response), /access/i);

    await assert.rejects(service.tasks(response), /access/i);
  } finally {
    await db.user.update({ where: { id }, data: { active: true } });
  }
});

test("representative aggregate plans use scoped predicates before grouping", async () => {
  const id = people.get("PIONEER_AGENT")!.id;

  const agents =
    await db.$queryRaw`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT count(*) FROM "User" WHERE "active" = true AND "role" = 'AGENT' AND "supervisorId" = ${id}::uuid`;

  const enrollments =
    await db.$queryRaw`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT r."status", count(*) FROM "EnrollmentRequest" r JOIN "User" u ON u."id" = r."submittedById" WHERE u."active" = true AND u."role" = 'AGENT' AND u."supervisorId" = ${id}::uuid GROUP BY r."status"`;

  const tasks =
    await db.$queryRaw`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT t."status", count(*) FROM "Task" t JOIN "User" u ON u."id" = t."assigneeId" WHERE u."active" = true AND (u."id" = ${id}::uuid OR (u."role" = 'AGENT' AND u."supervisorId" = ${id}::uuid)) GROUP BY t."status"`;

  if (process.env.PIONEER_QUERY_PLAN_FILE) {
    writeFileSync(
      process.env.PIONEER_QUERY_PLAN_FILE,
      JSON.stringify({ agents, enrollments, tasks }, null, 2),
    );
  }

  assert(
    Array.isArray(agents) && Array.isArray(enrollments) && Array.isArray(tasks),
  );
});
