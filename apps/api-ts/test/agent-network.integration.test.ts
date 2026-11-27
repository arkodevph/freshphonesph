import "reflect-metadata";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import type { INestApplication } from "@nestjs/common";
import type {
  NetworkAgent,
  NetworkBatch,
  NetworkEnrollmentPage,
  NetworkPage,
} from "@freshphones/contracts";
import {
  networkAgentsQuery,
  networkBatchesQuery,
  networkRequestsQuery,
} from "@freshphones/contracts";
import { createApp } from "../src/app";
import { Database } from "../src/database";
import { AgentNetworkService } from "../src/records/agent-network.service";
import { safeUser } from "../src/auth/auth.service";
import { hashPassword } from "../src/auth/password";

const url = process.env.TEST_DATABASE_URL;

if (!url || !new URL(url).pathname.endsWith("_test")) {
  throw new Error(
    "Dedicated migrated TEST_DATABASE_URL ending in _test required.",
  );
}

let app: INestApplication, db: Database, base: string;

const origin = "http://localhost:3002";

const people = new Map<string, { id: string; cookie: string }>();

const agents: string[] = [];

const profiles: string[] = [];

let foreignId: string;

let linkedApplicationId: string;

let initialAgentCount = 0;

// Stable labels are used only by the explicitly requested fresh QA fixture.
const namespace = process.env.PIONEER_PHASE2_FIXTURE_FILE
  ? ""
  : `${randomUUID().slice(0, 8)}-`;

const agentCodePrefix = `PA-${namespace}`;

const batchCodePrefix = `PA-${namespace}BATCH-`;

const pioneerEmail = namespace
  ? `${namespace}pioneer@phase2.example.test`
  : "pioneer@phase2.example.test";

const password = "Synthetic-phase-two-password-123!";

async function request(path: string, role: string | null = "PIONEER_AGENT") {
  return fetch(`${base}/api${path}`, {
    headers: {
      Origin: origin,
      ...(role ? { Cookie: people.get(role)!.cookie } : {}),
    },
  });
}

async function get<T>(path: string, role = "PIONEER_AGENT"): Promise<T> {
  const response = await request(path, role);

  assert.equal(response.status, 200, await response.clone().text());

  return response.json();
}

before(async () => {
  app = await createApp({
    NODE_ENV: "test",
    HOST: "127.0.0.1",
    PORT: 4102,
    DATABASE_URL: url!,
    WEB_ORIGIN: origin,
    JWT_SECRET: "synthetic-phase2-network-secret-longer-than-32-characters",
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

  db = app.get(Database);

  base = await app.getUrl();

  const passwordHash = await hashPassword(password);

  initialAgentCount = await db.user.count({
    where: { role: "AGENT", active: true },
  });

  for (const role of [
    "COO",
    "OPERATIONS_COORDINATOR",
    "PIONEER_AGENT",
    "AGENT",
    "FINANCE_OFFICER",
    "BATCH_HANDLER",
    "RECORDS",
    "BATCH_MANAGER",
    "other-pioneer",
  ] as const) {
    const actualRole = role === "other-pioneer" ? "PIONEER_AGENT" : role;

    const user = await db.user.create({
      data: {
        name:
          role === "PIONEER_AGENT" ? "Pioneer preview" : `Synthetic ${role}`,
        email:
          role === "PIONEER_AGENT"
            ? pioneerEmail
            : `${namespace}${role.toLowerCase()}@phase2.example.test`,
        passwordHash,
        role: actualRole,
      },
    });

    const login = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email, password }),
    });

    assert.equal(login.status, 200, `${role} login`);

    people.set(role, {
      id: user.id,
      cookie: login.headers
        .getSetCookie()
        .map((item) => {
          return item.split(";")[0];
        })
        .join("; "),
    });
  }

  await db.user.update({
    where: { id: people.get("PIONEER_AGENT")!.id },
    data: { supervisorId: people.get("OPERATIONS_COORDINATOR")!.id },
  });

  for (let index = 0; index < 503; index++) {
    profiles.push(randomUUID());

    agents.push(randomUUID());
  }

  await db.agent.createMany({
    data: profiles.slice(0, 502).map((id, index) => {
      return {
        id,
        name: `Agent ${index}`,
        code: `${agentCodePrefix}${String(index).padStart(4, "0")}`,
        active: index !== 501,
      };
    }),
  });

  await db.user.createMany({
    data: agents.map((id, index) => {
      return {
        id,
        name: `Agent ${String(index).padStart(4, "0")}`,
        email: `${namespace}agent-${index}@phase2.example.test`,
        passwordHash,
        role: "AGENT",
        supervisorId: people.get("PIONEER_AGENT")!.id,
        agentProfileId: index < 502 ? profiles[index] : null,
      };
    }),
  });

  const foreign = await db.user.create({
    data: {
      name: "Foreign private Agent",
      email: `${namespace}foreign@phase2.example.test`,
      passwordHash,
      role: "AGENT",
      supervisorId: people.get("other-pioneer")!.id,
    },
  });

  foreignId = foreign.id;

  const batches = Array.from({ length: 105 }, (_, index) => {
    return {
      id: randomUUID(),
      code: `${batchCodePrefix}${String(index).padStart(3, "0")}`,
      model: index === 104 ? "Beyond old batch cap" : "Synthetic device",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2027-01-01"),
      agentId: profiles[0],
    };
  });

  await db.batch.createMany({ data: batches });

  const clients = Array.from({ length: 14 }, () => {
    return {
      id: randomUUID(),
      name: "Synthetic approved member",
      email: "",
      phone: "",
      batchId: batches[0].id,
    };
  });

  await db.client.createMany({ data: clients });

  const pending = Array.from({ length: 43 }, (_, index) => {
    return {
      id: randomUUID(),
      submissionId: randomUUID(),
      submittedById: agents[0],
      batchId: batches[0].id,
      status: ["PENDING", "APPROVED", "REJECTED"][index % 3],
      applicant: {
        name: `Applicant ${String(index).padStart(3, "0")}`,
        email: "private@example.test",
        phone: "+639000000000",
      },
      reason: index % 3 ? "Reviewed synthetic outcome" : "",
      ...(index % 3 === 1
        ? { clientId: clients[Math.floor(index / 3)].id }
        : {}),
      createdAt: new Date(2026, 0, 1, 0, index),
      ...(index % 3
        ? {
            reviewedById: people.get("BATCH_MANAGER")!.id,
            reviewedAt: new Date(2026, 0, 2),
          }
        : {}),
    };
  });

  await db.enrollmentRequest.createMany({
    data: [
      ...pending,
      {
        submissionId: randomUUID(),
        submittedById: agents[502],
        batchId: batches[0].id,
        applicant: { name: "Beyond cap applicant" },
      },
      {
        submissionId: randomUUID(),
        submittedById: foreignId,
        batchId: batches[0].id,
        applicant: { name: "Foreign private applicant" },
      },
    ],
  });

  const previousRevision = await db.enrollmentFormRevision.aggregate({
    _max: { number: true },
  });

  const revision = await db.enrollmentFormRevision.create({
    data: {
      number: (previousRevision._max.number ?? 0) + 1,
      definition: {},
      receivingAgentId: agents[0],
    },
  });

  const linkedApplication = await db.publicEnrollmentApplication.create({
    data: {
      submissionId: randomUUID(),
      revisionId: revision.id,
      name: "Linked source applicant",
      email: "private@example.test",
      phone: "+639000000000",
      answers: {},
      assignedAgentId: agents[0],
      status: "FORWARDED",
      enrollmentRequestId: pending[0].id,
    },
  });

  linkedApplicationId = linkedApplication.id;

  if (process.env.PIONEER_PHASE2_FIXTURE_FILE) {
    writeFileSync(
      process.env.PIONEER_PHASE2_FIXTURE_FILE,
      JSON.stringify({
        pioneerId: people.get("PIONEER_AGENT")!.id,
        leadAgent: agents[0],
        foreignId,
        noProfileAgent: agents[502],
        inactiveProfileAgent: agents[501],
        requestId: pending[0].id,
      }),
      { mode: 0o600 },
    );
  }
});

after(async () => {
  for (const person of people.values()) {
    await fetch(`${base}/api/auth/logout`, {
      method: "POST",
      headers: { Origin: origin, Cookie: person.cookie },
    });
  }

  await app?.close();
});

test("network reads require an authenticated session and existing grants", async () => {
  assert.equal((await request("/agent-network/agents", null)).status, 401);

  for (const role of [
    "FINANCE_OFFICER",
    "BATCH_HANDLER",
    "RECORDS",
    "BATCH_MANAGER",
  ]) {
    for (const path of [
      "/agent-network/agents",
      "/agent-network/batches",
      "/agent-network/requests",
      `/agent-network/agents/${agents[0]}`,
    ]) {
      assert.equal((await request(path, role)).status, 403, `${role} ${path}`);
    }
  }
});

test("Agents search and paging cover the full >500-account scope", async () => {
  const first = await get<NetworkPage<NetworkAgent>>("/agent-network/agents");

  const last = await get<NetworkPage<NetworkAgent>>(
    "/agent-network/agents?page=26",
  );

  assert.equal(first.total, 503);

  assert.equal(first.items.length, 20);

  assert.equal(last.items.length, 3);

  assert.equal(last.items.at(-1)!.id, agents[502]);

  assert.equal(first.summary.requests.total, 44);

  const match = await get<NetworkPage<NetworkAgent>>(
    `/agent-network/agents?q=${agentCodePrefix.toLowerCase()}0501`,
  );

  assert.equal(match.total, 1);

  assert.equal(match.items[0].id, agents[501]);

  assert.equal(match.summary.agents, 503);

  assert.equal(match.summary.requests.total, 44);

  assert.equal(match.items[0].agentProfile!.active, false);

  const clamped = await get<NetworkPage<NetworkAgent>>(
    "/agent-network/agents?q=Agent%200502&page=100",
  );

  assert.equal(clamped.page, 1);

  assert.equal(clamped.items[0].agentProfile, null);
});

test("server sorting is stable across pages and applies before pagination", async () => {
  const one = await get<NetworkPage<NetworkAgent>>(
    "/agent-network/agents?sort=name_desc",
  );

  const two = await get<NetworkPage<NetworkAgent>>(
    "/agent-network/agents?sort=name_desc&page=2",
  );

  assert.equal(one.items[0].id, agents[502]);

  assert.equal(two.items[0].id, agents[482]);

  assert.equal(
    new Set(
      [...one.items, ...two.items].map((item) => {
        return item.id;
      }),
    ).size,
    40,
  );

  const code = await get<NetworkPage<NetworkAgent>>(
    "/agent-network/agents?sort=code_asc",
  );

  assert.equal(code.items[0].agentProfile!.code, `${agentCodePrefix}0000`);
});

test("batches search and totals exceed the old 100-batch cap", async () => {
  const page = await get<NetworkPage<NetworkBatch>>(
    "/agent-network/batches?page=6",
  );

  assert.equal(page.total, 105);

  assert.equal(page.items.length, 5);

  assert.equal(page.items.at(-1)!.code, `${batchCodePrefix}104`);

  const match = await get<NetworkPage<NetworkBatch>>(
    "/agent-network/batches?q=beyond&sort=model_desc",
  );

  assert.equal(match.total, 1);

  assert.equal(match.summary.batches, 105);

  assert.equal(match.items[0].memberCount, 0);
});

test("stable Agent detail contains readiness and full per-status request totals", async () => {
  const agent = await get<NetworkAgent>(`/agent-network/agents/${agents[0]}`);

  assert.deepEqual(agent.requests, {
    pending: 15,
    approved: 14,
    rejected: 14,
    total: 43,
  });

  assert.equal(agent.agentProfile!.code, `${agentCodePrefix}0000`);

  assert.equal("email" in agent, false);

  assert.equal("passwordHash" in agent, false);

  const missing = await get<NetworkAgent>(
    `/agent-network/agents/${agents[502]}`,
  );

  assert.equal(missing.agentProfile, null);

  assert.equal(missing.requests.pending, 1);
});

test("request filters intersect Agent/status/search with current scope", async () => {
  const page = await get<NetworkEnrollmentPage>(
    `/agent-network/requests?agentId=${agents[0]}&status=REJECTED&q=applicant&sort=oldest`,
  );

  assert.equal(page.total, 14);

  assert.equal(page.scopeCounts.total, 43);

  assert.equal(page.agent!.id, agents[0]);

  assert.equal(page.items[0].name, "Applicant 002");

  assert.equal(page.items[0].reason, "Reviewed synthetic outcome");

  assert.ok(page.items[0].reviewedBy);

  assert.ok(page.items[0].reviewedAt);

  assert.equal("email" in page.items[0], false);

  assert.equal("applicant" in page.items[0], false);

  assert.equal("publicApplicationId" in page.items[0], false);

  const newest = await get<NetworkEnrollmentPage>(
    `/agent-network/requests?agentId=${agents[0]}&page=2`,
  );

  assert.equal(newest.total, 43);

  assert.equal(newest.items[0].name, "Applicant 022");
});

test("direct foreign IDs do not expose identity, details or request totals", async () => {
  assert.equal(
    (await request(`/agent-network/agents/${foreignId}`)).status,
    404,
  );

  assert.equal(
    (await request(`/agent-network/requests?agentId=${foreignId}`)).status,
    404,
  );

  const match = await get<NetworkEnrollmentPage>(
    "/agent-network/requests?q=Foreign",
  );

  assert.equal(match.total, 0);

  assert.equal(match.scopeCounts.total, 44);
});

test("reassignment immediately removes Agent detail, totals and matching requests", async () => {
  await db.user.update({
    where: { id: agents[0] },
    data: { supervisorId: people.get("other-pioneer")!.id },
  });

  try {
    assert.equal(
      (await request(`/agent-network/agents/${agents[0]}`)).status,
      404,
    );

    assert.equal(
      (await request(`/agent-network/requests?agentId=${agents[0]}`)).status,
      404,
    );

    const current = await get<NetworkEnrollmentPage>("/agent-network/requests");

    assert.equal(current.total, 1);

    assert.equal(current.scopeCounts.total, 1);

    assert.equal(current.items[0].submittedById, agents[502]);
  } finally {
    await db.user.update({
      where: { id: agents[0] },
      data: { supervisorId: people.get("PIONEER_AGENT")!.id },
    });
  }
});

test("inactive accounts are unavailable while inactive or missing linked profiles remain explicit", async () => {
  await db.user.update({ where: { id: agents[502] }, data: { active: false } });

  try {
    assert.equal(
      (await request(`/agent-network/agents/${agents[502]}`)).status,
      404,
    );

    const requests = await get<NetworkEnrollmentPage>(
      "/agent-network/requests",
    );

    assert.equal(requests.total, 43);

    assert.equal(
      (await get<NetworkAgent>(`/agent-network/agents/${agents[501]}`))
        .agentProfile!.active,
      false,
    );
  } finally {
    await db.user.update({
      where: { id: agents[502] },
      data: { active: true },
    });
  }
});

test("an Agent sees its own readiness and all assigned batches beyond the legacy cap", async () => {
  const login = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: `${namespace}agent-0@phase2.example.test`,
      password,
    }),
  });

  assert.equal(login.status, 200);

  people.set("lead-agent", {
    id: agents[0],
    cookie: login.headers
      .getSetCookie()
      .map((item) => {
        return item.split(";")[0];
      })
      .join("; "),
  });

  const profile = await get<NetworkPage<NetworkAgent>>(
    "/agent-network/agents",
    "lead-agent",
  );

  assert.equal(profile.total, 1);

  assert.equal(profile.items[0].id, agents[0]);

  assert.equal(profile.items[0].agentProfile!.active, true);

  const first = await get<NetworkPage<NetworkBatch>>(
    "/agent-network/batches",
    "lead-agent",
  );

  assert.equal(first.total, 105);

  assert.equal(first.items.length, 20);

  const last = await get<NetworkPage<NetworkBatch>>(
    "/agent-network/batches?page=6",
    "lead-agent",
  );

  assert.equal(last.items.length, 5);

  const found = await get<NetworkPage<NetworkBatch>>(
    "/agent-network/batches?q=Beyond%20old%20batch%20cap",
    "lead-agent",
  );

  assert.equal(found.total, 1);

  assert.equal(found.items[0].model, "Beyond old batch cap");

  assert.equal(found.summary.batches, 105);

  assert.equal(
    (await request(`/agent-network/agents/${foreignId}`, "lead-agent")).status,
    404,
  );

  assert.equal(
    (await request(`/agent-network/batches?agentId=${foreignId}`, "lead-agent"))
      .status,
    400,
  );

  assert.equal(
    (await request("/pioneer/overview/team", "lead-agent")).status,
    403,
  );

  assert.equal(
    (await request("/pioneer/overview/tasks", "lead-agent")).status,
    403,
  );

  await db.agent.update({
    where: { id: profiles[0] },
    data: { active: false },
  });

  try {
    const inactive = await get<NetworkPage<NetworkAgent>>(
      "/agent-network/agents",
      "lead-agent",
    );

    assert.equal(inactive.items[0].agentProfile!.active, false);

    assert.equal(
      (
        await get<NetworkPage<NetworkBatch>>(
          "/agent-network/batches",
          "lead-agent",
        )
      ).total,
      0,
    );

    const missing = await get<NetworkPage<NetworkAgent>>(
      "/agent-network/agents",
      "AGENT",
    );

    assert.equal(missing.items[0].agentProfile, null);

    assert.equal(
      (await get<NetworkPage<NetworkBatch>>("/agent-network/batches", "AGENT"))
        .total,
      0,
    );
  } finally {
    await db.agent.update({
      where: { id: profiles[0] },
      data: { active: true },
    });
  }
});

test("Agent open-task counts stay self scoped and available without an active profile", async () => {
  const assigneeId = people.get("AGENT")!.id;

  const statuses = [
    "TODO",
    "IN_PROGRESS",
    "SUBMITTED",
    "DONE",
    "CANCELLED",
  ] as const;

  await db.task.createMany({
    data: [assigneeId, agents[0]].flatMap((id) => {
      return statuses.map((status) => {
        return {
          title: `Synthetic Agent desk ${status}`,
          creatorId: people.get("PIONEER_AGENT")!.id,
          assigneeId: id,
          deadline: new Date("2099-01-01"),
          status,
        };
      });
    }),
  });

  type TaskPage = {
    count: number;
    results: { assigneeId: string; status: string }[];
  };

  const todo = await get<TaskPage>("/tasks?status=TODO&page=1", "AGENT");

  const active = await get<TaskPage>(
    "/tasks?status=IN_PROGRESS&page=1",
    "AGENT",
  );

  assert.equal(todo.count + active.count, 2);

  assert.deepEqual(
    todo.results.map((row) => {
      return row.assigneeId;
    }),
    [assigneeId],
  );

  assert.deepEqual(
    active.results.map((row) => {
      return row.status;
    }),
    ["IN_PROGRESS"],
  );

  assert.equal((await request("/tasks?view=team", "AGENT")).status, 403);

  await db.agent.update({
    where: { id: profiles[0] },
    data: { active: false },
  });

  try {
    const inactive = await get<TaskPage>("/tasks?status=TODO", "lead-agent");

    assert.equal(inactive.count, 1);

    assert.equal(inactive.results[0].assigneeId, agents[0]);
  } finally {
    await db.agent.update({
      where: { id: profiles[0] },
      data: { active: true },
    });
  }
});

test("current role revocation is enforced on an already signed-in session", async () => {
  const id = people.get("PIONEER_AGENT")!.id;

  await db.user.update({ where: { id }, data: { role: "FINANCE_OFFICER" } });

  try {
    assert.equal((await request("/agent-network/agents")).status, 401);

    assert.equal((await request("/agent-network/requests")).status, 401);
  } finally {
    await db.user.update({ where: { id }, data: { role: "PIONEER_AGENT" } });

    const login = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({
        email: pioneerEmail,
        password,
      }),
    });

    assert.equal(login.status, 200);

    people.get("PIONEER_AGENT")!.cookie = login.headers
      .getSetCookie()
      .map((item) => {
        return item.split(";")[0];
      })
      .join("; ");
  }
});

test("Coordinator/COO scope remains compatible and Agent gets no other team's records", async () => {
  const coordinator = await get<NetworkPage<NetworkAgent>>(
    "/agent-network/agents",
    "OPERATIONS_COORDINATOR",
  );

  assert.equal(coordinator.total, 503);

  const coo = await get<NetworkPage<NetworkAgent>>(
    "/agent-network/agents",
    "COO",
  );

  assert.equal(coo.total, initialAgentCount + 505);

  const self = await get<NetworkEnrollmentPage>(
    "/agent-network/requests",
    "AGENT",
  );

  assert.equal(self.total, 0);

  assert.equal(
    (await request(`/agent-network/agents/${agents[0]}`, "AGENT")).status,
    404,
  );
});

test("invalid filters are rejected instead of broadening a read", async () => {
  for (const query of [
    "page=0",
    "page=10001",
    "q=" + "a".repeat(101),
    "sort=secret",
    "agentId=not-a-uuid",
    "unexpected=true",
  ]) {
    assert.equal(
      (await request(`/agent-network/requests?${query}`)).status,
      400,
      query,
    );
  }

  assert.equal(
    networkAgentsQuery.safeParse({ sort: "__proto__" }).success,
    false,
  );

  assert.equal(networkBatchesQuery.safeParse({ page: -1 }).success, false);

  assert.equal(
    networkRequestsQuery.safeParse({ status: "DELETED" }).success,
    false,
  );
});

test("equal sort values keep deterministic ID ordering", async () => {
  await db.user.updateMany({
    where: { id: { in: agents.slice(0, 2) } },
    data: { name: "Same display name" },
  });

  try {
    const page = await get<NetworkPage<NetworkAgent>>(
      "/agent-network/agents?q=Same%20display%20name",
    );

    assert.deepEqual(
      page.items.map((row) => {
        return row.id;
      }),
      agents.slice(0, 2).sort(),
    );
  } finally {
    for (const [index, id] of agents.slice(0, 2).entries()) {
      await db.user.update({
        where: { id },
        data: { name: `Agent ${String(index).padStart(4, "0")}` },
      });
    }
  }
});

test("exact request selection stays scoped and omits unavailable linked application actions", async () => {
  const source = await db.publicEnrollmentApplication.findUniqueOrThrow({
    where: { id: linkedApplicationId },
  });

  const result = await get<NetworkEnrollmentPage>(
    `/agent-network/requests?requestId=${source.enrollmentRequestId}`,
  );

  assert.equal(result.items.length, 1);

  assert.equal(result.items[0].id, source.enrollmentRequestId);

  assert.equal("publicApplicationId" in result.items[0], false);

  assert.equal(
    (await request(`/enrollment/applications/${source.id}`)).status,
    403,
  );

  const foreign = await db.enrollmentRequest.findFirstOrThrow({
    where: { submittedById: foreignId },
  });

  const unavailable = await get<NetworkEnrollmentPage>(
    `/agent-network/requests?requestId=${foreign.id}`,
  );

  assert.equal(unavailable.total, 0);

  assert.deepEqual(unavailable.items, []);
});

test("service reads recheck current access inside the same snapshot as the scoped data", async () => {
  const id = people.get("PIONEER_AGENT")!.id;

  const previous = safeUser(await db.user.findUniqueOrThrow({ where: { id } }));

  const service = app.get(AgentNetworkService);

  await db.user.update({ where: { id }, data: { active: false } });

  try {
    await assert.rejects(
      service.agents(previous, networkAgentsQuery.parse({})),
      /access has changed/i,
    );

    await assert.rejects(
      service.requests(previous, networkRequestsQuery.parse({})),
      /access has changed/i,
    );
  } finally {
    await db.user.update({ where: { id }, data: { active: true } });
  }
});
