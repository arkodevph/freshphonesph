import "reflect-metadata";
import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import { createApp } from "../src/app";
import { Database } from "../src/database";
import { hashPassword } from "../src/auth/password";

const url = process.env.TEST_DATABASE_URL;

if (!url || !new URL(url).pathname.endsWith("_test")) {
  throw new Error("Dedicated migrated Phase4 _test database required.");
}

let app: INestApplication,
  db: Database,
  base: string,
  batchId: string,
  lead: string,
  leadProfile: string;

const origin = "http://localhost:3100";

const suffix = randomUUID().slice(0, 8);

const people = new Map<string, { id: string; cookie: string }>();

async function request(
  key: string,
  path: string,
  method = "GET",
  data?: unknown,
  replay?: string,
) {
  return fetch(`${base}/api${path}`, {
    method,
    headers: {
      Origin: origin,
      Cookie: people.get(key)!.cookie,
      ...(data ? { "Content-Type": "application/json" } : {}),
      ...(replay ? { "Idempotency-Key": replay } : {}),
    },
    ...(data ? { body: JSON.stringify(data) } : {}),
  });
}

async function body<T = any>(response: Response, status = 200): Promise<T> {
  assert.equal(response.status, status, await response.clone().text());

  return response.json();
}

async function get(path: string, key = "pioneer") {
  return body(await request(key, path));
}

async function submitTask(
  key: string,
  id: string,
  version: number,
  report = "Phase4 factual report",
  attachment = false,
) {
  const form = new FormData();

  form.set("version", String(version));

  form.set("report", report);

  if (attachment) {
    form.set(
      "attachment",
      new Blob(["%PDF-1.4\nPhase4 synthetic evidence\n%%EOF"], {
        type: "application/pdf",
      }),
      "phase4-evidence.pdf",
    );
  }

  return fetch(`${base}/api/tasks/${id}/submit`, {
    method: "POST",
    headers: { Origin: origin, Cookie: people.get(key)!.cookie },
    body: form,
  });
}

async function verifyCounts() {
  const [team, network, tasks, list] = await Promise.all([
    get("/pioneer/overview/team"),
    get("/agent-network/agents"),
    get("/pioneer/overview/tasks"),
    get("/tasks?view=team"),
  ]);

  assert.equal(team.agents.total, network.summary.agents);

  assert.deepEqual(team.enrollments, network.summary.requests);

  assert.equal(tasks.team.total, list.count);

  assert.equal(
    tasks.team.outstanding,
    tasks.team.todo + tasks.team.inProgress + tasks.team.submitted,
  );

  return { team, network, tasks, list };
}

before(async () => {
  app = await createApp({
    NODE_ENV: "test",
    HOST: "127.0.0.1",
    PORT: 4104,
    DATABASE_URL: url!,
    WEB_ORIGIN: origin,
    JWT_SECRET: "synthetic-phase-four-integration-secret-long-enough",
    LOCAL_DEMO_AUTH: false,
    EMAIL_FROM: "synthetic@example.test",
    CUSTOMER_REMINDER_DAYS_BEFORE: "",
    PRIVATE_STORAGE_PROVIDER: "local",
    PRIVATE_STORAGE_DIR: process.env.PIONEER_TEST_STORAGE_DIR,
    PRIVATE_STORAGE_S3_REGION: "ap-southeast-1",
    ABUSE_LIMITS: {
      auth: [[10000, 60]],
      accountRead: [[100000, 60]],
      accountWrite: [[10000, 60]],
      expensive: [[100000, 60]],
      upload: [[10000, 60]],
    },
  });

  await app.listen(0, "127.0.0.1");

  base = await app.getUrl();

  db = app.get(Database);

  const password = "Synthetic-phase4-test-password-123!",
    passwordHash = await hashPassword(password);

  for (const [key, role, supervisor] of [
    ["coordinator", "OPERATIONS_COORDINATOR", null],
    ["pioneer", "PIONEER_AGENT", "coordinator"],
    ["foreign-pioneer", "PIONEER_AGENT", "coordinator"],
    ["agent", "AGENT", "pioneer"],
    ["foreign-agent", "AGENT", "foreign-pioneer"],
    ["manager", "BATCH_MANAGER", null],
    ["kpi", "KPI_OFFICER", null],
    ["finance", "FINANCE_OFFICER", null],
    ["handler", "BATCH_HANDLER", null],
  ] as const) {
    const user = await db.user.create({
      data: {
        name: `Phase4 ${key}`,
        email: `${suffix}-${key}@phase4.example.test`,
        role,
        passwordHash,
        ...(supervisor ? { supervisorId: people.get(supervisor)!.id } : {}),
      },
    });

    const login = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email, password }),
    });

    assert.equal(login.status, 200);

    people.set(key, {
      id: user.id,
      cookie: login.headers
        .getSetCookie()
        .map((value) => {
          return value.split(";")[0];
        })
        .join("; "),
    });
  }

  lead = people.get("agent")!.id;

  const profiles = Array.from({ length: 502 }, (_, i) => {
    return {
      id: randomUUID(),
      name: `Phase4 profile ${i}`,
      code: `P4-${suffix}-${String(i).padStart(4, "0")}`,
      active: i !== 501,
    };
  });

  await db.agent.createMany({ data: profiles });

  leadProfile = profiles[0].id;

  await db.user.update({
    where: { id: lead },
    data: { agentProfileId: leadProfile },
  });

  await db.user.createMany({
    data: Array.from({ length: 502 }, (_, i) => {
      return {
        id: randomUUID(),
        name: `Phase4 Agent ${String(i + 1).padStart(4, "0")}`,
        email: `${suffix}-bulk-${i}@phase4.example.test`,
        role: "AGENT",
        passwordHash,
        supervisorId: people.get("pioneer")!.id,
        agentProfileId: profiles[i + 1]?.id ?? null,
      };
    }),
  });

  const batches = Array.from({ length: 105 }, (_, i) => {
    return {
      id: randomUUID(),
      code: `P4-${suffix}-B${String(i).padStart(3, "0")}`,
      model: "Synthetic phone",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2028-01-01"),
      agentId: leadProfile,
      managerId: people.get("manager")!.id,
      contractPrice: "100.00",
      installmentCount: 2,
      cadence: "MONTHLY" as const,
      firstDueDate: new Date("2027-01-15"),
    };
  });

  await db.batch.createMany({ data: batches });

  batchId = batches[0].id;

  await db.enrollmentRequest.createMany({
    data: Array.from({ length: 22 }, (_, i) => {
      return {
        submissionId: randomUUID(),
        batchId,
        submittedById: lead,
        applicant: {
          name: `Phase4 base applicant ${i}`,
          email: "",
          phone: "09000000000",
        },
      };
    }),
  });

  await db.task.createMany({
    data: Array.from({ length: 25 }, (_, i) => {
      return {
        title: `Phase4 existing task ${i}`,
        assigneeId: lead,
        creatorId: people.get("pioneer")!.id,
        deadline: new Date(Date.now() + 172800000),
      };
    }),
  });
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

test("all three phases reconcile whole-scope data beyond old caps", async () => {
  const { team, network, tasks } = await verifyCounts();

  assert.equal(team.agents.total, 503);

  assert.equal(team.agents.ready, 501);

  assert.equal(team.agents.missingProfile, 1);

  assert.equal(team.agents.inactiveProfile, 1);

  assert.equal(network.summary.batches, 105);

  assert.equal(team.enrollments.total, 22);

  assert.equal(tasks.team.total, 25);

  const last = await get("/agent-network/agents?page=26");

  assert.equal(last.items.length, 3);

  assert.equal((await get("/agent-network/batches?page=6")).items.length, 5);

  assert.equal((await get("/tasks?view=team&page=2")).results.length, 5);
});

test("real enrollment approval/rejection updates Agent detail, request filters and dashboard consistently", async () => {
  for (const decision of ["APPROVED", "REJECTED"] as const) {
    const created = await body(
      await request("agent", "/enrollment/requests", "POST", {
        submissionId: randomUUID(),
        batchId,
        name: `Phase4 ${decision} applicant`,
        email: "",
        phone: "09000000000",
      }),
      201,
    );

    assert.equal(
      (
        await request(
          "pioneer",
          `/enrollment/requests/${created.id}/review`,
          "POST",
          {
            version: created.version,
            decision,
            reason: "Unauthorized attempt",
          },
        )
      ).status,
      403,
    );

    const reviewed = await body(
      await request(
        "manager",
        `/enrollment/requests/${created.id}/review`,
        "POST",
        {
          version: created.version,
          decision,
          reason: `Phase4 authorized ${decision} outcome`,
        },
      ),
      201,
    );

    assert.equal(reviewed.status, decision);

    const detail = await get(`/agent-network/agents/${lead}`);

    const requests = await get(
      `/agent-network/requests?agentId=${lead}&status=${decision}&requestId=${created.id}`,
    );

    assert.equal(requests.items.length, 1);

    assert.equal(
      requests.items[0].reason,
      `Phase4 authorized ${decision} outcome`,
    );

    const overview = await verifyCounts();

    assert.deepEqual(detail.requests, overview.team.enrollments);

    assert.equal("publicApplicationId" in requests.items[0], false);
  }

  const final = await get("/pioneer/overview/team");

  assert.deepEqual(final.enrollments, {
    pending: 22,
    approved: 1,
    rejected: 1,
    total: 24,
  });
});

test("assignment retry, evidence submission and completion reconcile dashboard/tasks and task notices", async () => {
  const key = randomUUID(),
    input = {
      title: "Phase4 complete coaching",
      instructions: "Record the factual follow-up",
      assigneeId: lead,
      priority: "MEDIUM",
      deadline: new Date(Date.now() + 86400000).toISOString(),
    };

  const responses = await Promise.all([
    request("pioneer", "/tasks", "POST", input, key),
    request("pioneer", "/tasks", "POST", input, key),
  ]);

  const [created, replay] = await Promise.all(
    responses.map((r) => {
      return body(r, 201);
    }),
  );

  assert.equal(created.id, replay.id);

  assert.equal(
    await db.auditEntry.count({
      where: { recordId: created.id, action: "task.assigned" },
    }),
    1,
  );

  assert.equal(
    await db.staffEmail.count({
      where: { taskId: created.id, kind: "TASK_ASSIGNED" },
    }),
    1,
  );

  assert.equal((await verifyCounts()).tasks.team.todo, 26);

  const started = await body(
    await request("agent", `/tasks/${created.id}/start`, "PATCH", {
      version: created.version,
    }),
  );

  assert.equal((await verifyCounts()).tasks.team.inProgress, 1);

  const submitted = await body(
    await submitTask(
      "agent",
      created.id,
      started.version,
      "Phase4 factual coaching report",
      true,
    ),
  );

  const pending = await verifyCounts();

  assert.equal(pending.tasks.team.submitted, 1);

  assert.equal(pending.tasks.team.outstanding, 26);

  const alerts = await get("/staff/alerts?scope=tasks", "agent");

  assert(
    !alerts.items.some((item: any) => {
      return item.id === created.id;
    }),
  );

  assert.equal(
    (await request("foreign-pioneer", `/tasks/${created.id}/attachment`))
      .status,
    404,
  );

  assert.equal(
    (await request("pioneer", `/tasks/${created.id}/attachment`)).status,
    200,
  );

  assert.equal(
    (
      await request("agent", `/work/tasks/${created.id}/submit`, "POST", {
        version: submitted.version,
      })
    ).status,
    403,
  );

  assert.equal(
    (
      await request("agent", `/tasks/${created.id}/complete`, "POST", {
        version: submitted.version,
      })
    ).status,
    403,
  );

  const completed = await body(
    await request("pioneer", `/tasks/${created.id}/complete`, "POST", {
      version: submitted.version,
    }),
  );

  assert.equal(completed.status, "DONE");

  const final = await verifyCounts();

  assert.equal(final.tasks.team.done, 1);

  assert.equal(final.tasks.team.outstanding, 25);

  assert.equal(
    (
      await request("pioneer", `/tasks/${created.id}/complete`, "POST", {
        version: submitted.version,
      })
    ).status,
    409,
  );

  assert.equal(
    await db.auditEntry.count({
      where: { recordId: created.id, action: "task.completed" },
    }),
    1,
  );
});

test("Pioneer's own report belongs to the Coordinator flow and not Agent-team totals", async () => {
  const created = await body(
    await request("coordinator", "/tasks", "POST", {
      title: "Phase4 Pioneer report",
      instructions: "Own report",
      assigneeId: people.get("pioneer")!.id,
      priority: "MEDIUM",
      deadline: new Date(Date.now() + 86400000).toISOString(),
    }),
    201,
  );

  const before = await verifyCounts();

  assert.equal(before.tasks.own.total, 1);

  const submitted = await body(
    await submitTask(
      "pioneer",
      created.id,
      created.version,
      "Phase4 own report",
    ),
  );

  const completed = await body(
    await request("coordinator", `/tasks/${created.id}/complete`, "POST", {
      version: submitted.version,
    }),
  );

  assert.equal(completed.status, "DONE");

  const after = await verifyCounts();

  assert.equal(after.tasks.own.done, 1);

  assert.equal(after.tasks.team.total, before.tasks.team.total);
});

test("late completion waits for human KPI review without exposing the evaluation", async () => {
  const task = await db.task.create({
    data: {
      title: "Phase4 late task",
      assigneeId: lead,
      creatorId: people.get("pioneer")!.id,
      deadline: new Date(Date.now() - 60000),
    },
  });

  assert.equal((await get("/pioneer/overview/tasks")).team.overdue, 1);

  const submitted = await body(
    await submitTask("agent", task.id, task.version, "Phase4 late report"),
  );

  assert.equal(submitted.lateFlag, true);

  assert.equal((await get("/pioneer/overview/tasks")).team.overdue, 0);

  assert.equal(
    (
      await request("pioneer", `/tasks/${task.id}/complete`, "POST", {
        version: submitted.version,
      })
    ).status,
    409,
  );

  await body(
    await request("kpi", "/kpi/reviews", "POST", {
      taskId: task.id,
      version: submitted.version,
      evaluation: "Private Phase4 KPI assessment",
      recommendation: "",
      decision: "NOTED",
    }),
    201,
  );

  const latest = await get(`/tasks/${task.id}`);

  assert.equal(latest.review, null);

  assert.equal(latest.reviewed, true);

  assert.equal((await get(`/tasks/${task.id}`, "agent")).review, null);

  await body(
    await request("pioneer", `/tasks/${task.id}/complete`, "POST", {
      version: latest.version,
    }),
  );

  await verifyCounts();
});

test("reassignment removes dashboard/network/request/task/file scope together", async () => {
  await db.user.update({
    where: { id: lead },
    data: { supervisorId: people.get("foreign-pioneer")!.id },
  });

  try {
    const result = await verifyCounts();

    assert.equal(result.team.agents.total, 502);

    assert.equal(result.team.enrollments.total, 0);

    assert.equal(result.tasks.team.total, 0);

    assert.equal(
      (await request("pioneer", `/agent-network/agents/${lead}`)).status,
      404,
    );

    assert.equal(
      (await request("pioneer", `/agent-network/requests?agentId=${lead}`))
        .status,
      404,
    );

    const foreign = await get(
      `/agent-network/agents/${lead}`,
      "foreign-pioneer",
    );

    assert.equal(foreign.requests.total, 24);
  } finally {
    await db.user.update({
      where: { id: lead },
      data: { supervisorId: people.get("pioneer")!.id },
    });
  }

  await verifyCounts();
});

test("profile state is distinct from account activity across all overview and directory reads", async () => {
  await db.agent.update({
    where: { id: leadProfile },
    data: { active: false },
  });

  try {
    const result = await verifyCounts();

    assert.equal(result.team.agents.total, 503);

    assert.equal(result.team.agents.inactiveProfile, 2);

    assert.equal(
      (await get(`/agent-network/agents/${lead}`)).agentProfile.active,
      false,
    );
  } finally {
    await db.agent.update({
      where: { id: leadProfile },
      data: { active: true },
    });
  }

  await db.user.update({ where: { id: lead }, data: { active: false } });

  try {
    const result = await verifyCounts();

    assert.equal(result.team.agents.total, 502);

    assert.equal(result.team.enrollments.total, 0);

    assert.equal(result.tasks.team.total, 0);

    assert.equal(
      (await request("pioneer", `/agent-network/agents/${lead}`)).status,
      404,
    );
  } finally {
    await db.user.update({ where: { id: lead }, data: { active: true } });
  }
});

test("unrelated roles cannot acquire Pioneer reads or task/evidence authority", async () => {
  for (const role of ["finance", "handler"]) {
    for (const path of [
      "/pioneer/overview/team",
      "/agent-network/agents",
      "/agent-network/requests",
    ]) {
      assert.equal((await request(role, path)).status, 403);
    }
  }

  assert.equal(
    (await request("foreign-agent", `/agent-network/agents/${lead}`)).status,
    404,
  );

  assert.equal(
    (await request("pioneer", "/enrollment/applications")).status,
    403,
  );

  assert.equal((await request("pioneer", "/kpi/reviews")).status, 403);
});
