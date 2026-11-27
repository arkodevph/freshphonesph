import "reflect-metadata";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import {
  effectivePermissions,
  type Role,
  type User,
} from "@freshphones/contracts";
import { createApp } from "../src/app";
import { Database } from "../src/database";
import { hashPassword } from "../src/auth/password";
import { TasksService } from "../src/tasks/tasks.service";

const url = process.env.TEST_DATABASE_URL;

if (!url || !new URL(url).pathname.endsWith("_test")) {
  throw new Error("Dedicated migrated Pioneer task _test database required.");
}

const origin = "http://localhost:3100";

const people = new Map<string, { id: string; cookie: string }>();

const suffix = randomUUID().slice(0, 8);

let app: INestApplication, db: Database, base: string;

async function request(
  key: string | null,
  path: string,
  method = "GET",
  body?: unknown,
  replay?: string,
) {
  return fetch(`${base}/api${path}`, {
    method,
    headers: {
      Origin: origin,
      ...(key ? { Cookie: people.get(key)!.cookie } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(replay === undefined ? {} : { "Idempotency-Key": replay }),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

async function body(response: Response, status = 200) {
  assert.equal(response.status, status, await response.clone().text());

  return response.json();
}

function assignment(assignee = "agent") {
  return {
    title: "Synthetic enrollment follow-up",
    instructions: "Provide a factual update.",
    assigneeId: people.get(assignee)!.id,
    priority: "MEDIUM",
    deadline: new Date(Date.now() + 86400000).toISOString(),
  };
}

before(async () => {
  app = await createApp({
    NODE_ENV: "test",
    HOST: "127.0.0.1",
    PORT: 4100,
    DATABASE_URL: url!,
    WEB_ORIGIN: origin,
    JWT_SECRET: "synthetic-pioneer-tasks-secret-longer-than32-characters",
    LOCAL_DEMO_AUTH: false,
    EMAIL_FROM: "test@example.test",
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

  const password = "Synthetic-pioneer-task-password-123!";

  const passwordHash = await hashPassword(password);

  for (const [key, role, supervisor] of [
    ["coordinator", "OPERATIONS_COORDINATOR", null],
    ["pioneer", "PIONEER_AGENT", "coordinator"],
    ["other", "PIONEER_AGENT", "coordinator"],
    ["agent", "AGENT", "pioneer"],
    ["peer", "AGENT", "pioneer"],
    ["foreign", "AGENT", "other"],
    ["kpi", "KPI_OFFICER", null],
    ["finance", "FINANCE_OFFICER", null],
  ] as const) {
    const user = await db.user.create({
      data: {
        name: `Synthetic ${key}`,
        email: `task-${key}-${suffix}@example.test`,
        role: role as Role,
        passwordHash,
        ...(supervisor ? { supervisorId: people.get(supervisor)!.id } : {}),
      },
    });

    const login = await request(null, "/auth/login", "POST", {
      email: user.email,
      password,
    });

    assert.equal(login.status, 200);

    people.set(key, {
      id: user.id,
      cookie: login.headers
        .getSetCookie()
        .map((v) => {
          return v.split(";")[0];
        })
        .join("; "),
    });
  }

  await db.task.createMany({
    data: ["pioneer", "agent", "peer", "foreign"].flatMap((key) => {
      return Array.from({ length: 25 }, (_, index) => {
        return {
          title: `Synthetic ${key} task ${index}`,
          assigneeId: people.get(key)!.id,
          creatorId: people.get("coordinator")!.id,
          status: index % 2 ? ("TODO" as const) : ("IN_PROGRESS" as const),
          deadline: new Date("2099-01-01"),
        };
      });
    }),
  });
});

after(async () => {
  await app?.close();
});

test("Agent gains only own submission; assignment and formal KPI review remain unavailable", async () => {
  const permissions = effectivePermissions({ role: "AGENT" });

  assert(permissions.includes("TASK_SUBMIT"));

  assert(
    !permissions.includes("TASK_ASSIGN") && !permissions.includes("KPI_REVIEW"),
  );

  assert.equal(
    (await request("agent", "/tasks", "POST", assignment())).status,
    403,
  );

  assert.equal((await request("agent", "/kpi/reviews")).status, 403);

  assert.equal((await request(null, "/tasks?view=team")).status, 401);
});

test("own/team filters use complete scope and match rows/count beyond one page", async () => {
  const own = await body(await request("pioneer", "/tasks?view=own&page=1"));

  const team = await body(await request("pioneer", "/tasks?view=team&page=1"));

  const next = await body(await request("pioneer", "/tasks?view=team&page=2"));

  assert.equal(own.count, 25);

  assert.equal(team.count, 50);

  assert.equal(team.results.length, 20);

  assert(
    !team.results.some((a: { id: string }) => {
      return next.results.some((b: { id: string }) => {
        return a.id === b.id;
      });
    }),
  );

  assert(
    own.results.every((row: { assigneeId: string }) => {
      return row.assigneeId === people.get("pioneer")!.id;
    }),
  );

  const filtered = await body(
    await request("pioneer", "/tasks?view=team&status=TODO"),
  );

  assert.equal(filtered.count, 24);

  assert.equal((await request("finance", "/tasks?view=own")).status, 403);

  assert.equal((await request("pioneer", "/tasks?view=all")).status, 400);
});

test("keyed concurrent assignment creates one task, audit and notification; mismatch and invalid keys fail", async () => {
  const input = {
    ...assignment(),
    assigneeId: people.get("agent")!.id.toUpperCase(),
  };

  const key = randomUUID();

  const responses = await Promise.all([
    request("pioneer", "/tasks", "POST", input, key),
    request("pioneer", "/tasks", "POST", input, key),
  ]);

  const rows = await Promise.all(
    responses.map((r) => {
      return body(r, 201);
    }),
  );

  assert.equal(rows[0].id, rows[1].id);

  assert.equal(
    await db.auditEntry.count({
      where: { entity: "task", recordId: rows[0].id, action: "task.assigned" },
    }),
    1,
  );

  assert.equal(
    await db.staffEmail.count({
      where: { taskId: rows[0].id, kind: "TASK_ASSIGNED" },
    }),
    1,
  );

  assert.equal(
    (
      await request(
        "pioneer",
        "/tasks",
        "POST",
        { ...input, title: "Different task" },
        key,
      )
    ).status,
    409,
  );

  assert.equal(
    (await request("pioneer", "/tasks", "POST", input, "bad")).status,
    400,
  );

  assert.equal(
    (
      await request(
        "pioneer",
        "/tasks",
        "POST",
        assignment("foreign"),
        randomUUID(),
      )
    ).status,
    400,
  );

  await db.user.update({
    where: { id: people.get("agent")!.id },
    data: { supervisorId: people.get("other")!.id },
  });

  try {
    assert.equal(
      (await request("pioneer", "/tasks", "POST", input, key)).status,
      400,
    );
  } finally {
    await db.user.update({
      where: { id: people.get("agent")!.id },
      data: { supervisorId: people.get("pioneer")!.id },
    });
  }
});

test("Pioneer assigns, Agent starts/submits own evidence, Pioneer completes and Coordinator sees own report", async () => {
  const task = await body(
    await request("pioneer", "/tasks", "POST", assignment(), randomUUID()),
    201,
  );

  assert.equal(
    (
      await request("agent", `/work/tasks/${task.id}/progress`, "PATCH", {
        version: task.version,
        status: "IN_PROGRESS",
      })
    ).status,
    403,
  );

  assert.equal(
    (
      await request("agent", `/work/tasks/${task.id}/submit`, "POST", {
        version: task.version,
      })
    ).status,
    403,
  );

  assert.equal(
    (
      await request("peer", `/tasks/${task.id}/start`, "PATCH", {
        version: task.version,
      })
    ).status,
    404,
  );

  assert.equal(
    (
      await request("pioneer", `/tasks/${task.id}/start`, "PATCH", {
        version: task.version,
      })
    ).status,
    404,
  );

  const started = await body(
    await request("agent", `/tasks/${task.id}/start`, "PATCH", {
      version: task.version,
    }),
  );

  const form = new FormData();

  form.set("version", String(started.version));

  form.set("report", "Synthetic completed coaching evidence");

  form.set(
    "attachment",
    new Blob(["%PDF-1.4\nSynthetic task evidence\n%%EOF"], {
      type: "application/pdf",
    }),
    "coaching-evidence.pdf",
  );

  const response = await fetch(`${base}/api/tasks/${task.id}/submit`, {
    method: "POST",
    headers: { Origin: origin, Cookie: people.get("agent")!.cookie },
    body: form,
  });

  const submitted = await body(response);

  assert.equal(submitted.status, "SUBMITTED");

  assert.equal(submitted.lateFlag, false);

  assert.equal(
    (await request("agent", `/tasks/${task.id}/attachment`)).status,
    200,
  );

  assert.equal(
    (await request("pioneer", `/tasks/${task.id}/attachment`)).status,
    200,
  );

  assert.equal(
    (await request("other", `/tasks/${task.id}/attachment`)).status,
    404,
  );

  assert.equal((await request("peer", `/tasks/${task.id}`)).status, 404);

  assert.equal(
    (
      await request("agent", `/tasks/${task.id}/complete`, "POST", {
        version: submitted.version,
      })
    ).status,
    403,
  );

  assert.equal(
    (
      await request("pioneer", `/tasks/${task.id}/complete`, "POST", {
        version: started.version,
      })
    ).status,
    409,
  );

  const complete = await body(
    await request("pioneer", `/tasks/${task.id}/complete`, "POST", {
      version: submitted.version,
    }),
  );

  assert.equal(complete.status, "DONE");

  const duplicate = new FormData();

  duplicate.set("version", String(started.version));

  duplicate.set("report", "Duplicate attempt");

  assert.equal(
    (
      await fetch(`${base}/api/tasks/${task.id}/submit`, {
        method: "POST",
        headers: { Origin: origin, Cookie: people.get("agent")!.cookie },
        body: duplicate,
      })
    ).status,
    409,
  );

  assert.equal(
    await db.auditEntry.count({
      where: { recordId: task.id, action: "task.submitted" },
    }),
    1,
  );

  const own = await body(
    await request("coordinator", "/tasks", "POST", assignment("pioneer")),
    201,
  );

  const report = new FormData();

  report.set("version", String(own.version));

  report.set("report", "Pioneer progress report to Coordinator");

  assert.equal(
    (
      await fetch(`${base}/api/tasks/${own.id}/submit`, {
        method: "POST",
        headers: { Origin: origin, Cookie: people.get("pioneer")!.cookie },
        body: report,
      })
    ).status,
    200,
  );

  assert.equal(
    (await body(await request("coordinator", `/tasks/${own.id}`))).report,
    "Pioneer progress report to Coordinator",
  );
});

test("late submissions require formal KPI review and its evaluation remains private", async () => {
  const task = await db.task.create({
    data: {
      title: "Late evidence",
      assigneeId: people.get("agent")!.id,
      creatorId: people.get("pioneer")!.id,
      status: "SUBMITTED",
      report: "Late factual report",
      deadline: new Date("2000-01-01"),
      submittedAt: new Date(),
      lateFlag: true,
    },
  });

  assert.equal(
    (
      await request("pioneer", `/tasks/${task.id}/complete`, "POST", {
        version: task.version,
      })
    ).status,
    409,
  );

  const review = await body(
    await request("kpi", "/kpi/reviews", "POST", {
      taskId: task.id,
      version: task.version,
      evaluation: "Private human assessment",
      recommendation: "",
      decision: "NOTED",
    }),
    201,
  );

  assert(review);

  const latest = await body(await request("pioneer", `/tasks/${task.id}`));

  assert.equal(latest.review, null);

  assert.equal(latest.reviewed, true);

  assert.equal(
    (await body(await request("agent", `/tasks/${task.id}`))).review,
    null,
  );

  assert.equal(
    (
      await body(
        await request("pioneer", `/tasks/${task.id}/complete`, "POST", {
          version: latest.version,
        }),
      )
    ).status,
    "DONE",
  );
});

test("transfers and inactivity change rows, totals, task details and evidence access", async () => {
  const before = await body(await request("pioneer", "/tasks?view=team"));

  const target = before.results.find((r: { assigneeId: string }) => {
    return r.assigneeId === people.get("agent")!.id;
  });

  await db.user.update({
    where: { id: people.get("agent")!.id },
    data: { supervisorId: people.get("other")!.id },
  });

  try {
    const after = await body(await request("pioneer", "/tasks?view=team"));

    assert(after.count < before.count);

    assert.equal((await request("pioneer", `/tasks/${target.id}`)).status, 404);

    assert.equal((await request("other", `/tasks/${target.id}`)).status, 200);
  } finally {
    await db.user.update({
      where: { id: people.get("agent")!.id },
      data: { supervisorId: people.get("pioneer")!.id },
    });
  }

  await db.user.update({
    where: { id: people.get("peer")!.id },
    data: { active: false },
  });

  const after = await body(await request("pioneer", "/tasks?view=team"));

  assert(
    !after.results.some((r: { assigneeId: string }) => {
      return r.assigneeId === people.get("peer")!.id;
    }),
  );
});

test("Agent sees terminal cancellation and cannot start, submit, complete or read another task notice", async () => {
  const task = await body(
    await request("pioneer", "/tasks", "POST", assignment()),
    201,
  );

  const alerts = await body(
    await request("agent", "/staff/alerts?scope=tasks"),
  );

  const alert = alerts.items.find((item: { id: string }) => {
    return item.id === task.id;
  });

  assert(alert);

  assert.equal(alert.targetPath, `/system/tasks?task=${task.id}`);

  assert.equal(
    (
      await request("foreign", `/staff/alerts/${task.id}/read`, "POST", {
        entity: "task",
        kind: alert.kind,
        deadline: alert.deadline,
      })
    ).status,
    404,
  );

  const cancelled = await body(
    await request("pioneer", `/tasks/${task.id}/cancel`, "POST", {
      version: task.version,
      reason: "Synthetic cancelled assignment",
    }),
  );

  const current = await body(await request("agent", `/tasks/${task.id}`));

  assert.equal(current.status, "CANCELLED");

  assert.equal(current.cancellationReason, "Synthetic cancelled assignment");

  assert.equal(
    (
      await request("agent", `/tasks/${task.id}/start`, "PATCH", {
        version: cancelled.version,
      })
    ).status,
    409,
  );

  const form = new FormData();

  form.set("version", String(cancelled.version));

  form.set("report", "Must not submit cancelled work");

  assert.equal(
    (
      await fetch(`${base}/api/tasks/${task.id}/submit`, {
        method: "POST",
        headers: { Origin: origin, Cookie: people.get("agent")!.cookie },
        body: form,
      })
    ).status,
    409,
  );

  assert.equal(
    (
      await request("agent", `/tasks/${task.id}/complete`, "POST", {
        version: cancelled.version,
      })
    ).status,
    403,
  );

  assert.equal(
    await db.auditEntry.count({
      where: { recordId: task.id, action: "task.submitted" },
    }),
    0,
  );
});

test("write services reject stale submission permissions after the HTTP identity was captured", async () => {
  const user = (await body(await request("agent", "/auth/me"))) as User;

  const task = await db.task.create({
    data: {
      title: "Revoked permission",
      assigneeId: user.id,
      creatorId: people.get("pioneer")!.id,
      deadline: new Date("2099-01-01"),
    },
  });

  await db.user.update({ where: { id: user.id }, data: { role: "CEO" } });

  try {
    const service = app.get(TasksService);

    await assert.rejects(
      service.start(user, task.id, task.version),
      /submission access/i,
    );

    await assert.rejects(
      service.submit(
        user,
        task.id,
        task.version,
        "Unauthorized stale submission",
      ),
      /submission access/i,
    );

    assert.equal(
      (await db.task.findUniqueOrThrow({ where: { id: task.id } })).status,
      "TODO",
    );
  } finally {
    await db.user.update({ where: { id: user.id }, data: { role: "AGENT" } });
  }
});
