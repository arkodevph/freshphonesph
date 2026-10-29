import "reflect-metadata";
import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import {
  roles,
  effectivePermissions,
  type Role,
  type StaffAlertPage,
  type User,
} from "@freshphones/contracts";
import { createApp } from "../src/app";
import { Database } from "../src/database";
import { hashPassword } from "../src/auth/password";
import { safeUser } from "../src/auth/auth.service";
import { StaffAlertsService } from "../src/staff/staff-alerts.service";
import { RealtimeController } from "../src/realtime/realtime.controller";
import { markEnrollmentAlertsRead } from "../src/staff/enrollment-alerts";

const url = process.env.TEST_DATABASE_URL;

if (!url || !new URL(url).pathname.endsWith("_test")) {
  throw new Error(
    "Dedicated migrated TEST_DATABASE_URL ending in _test required.",
  );
}

const origin = "http://localhost:3100";

const password = "Synthetic-notification-test-123!";

const suffix = randomUUID().slice(0, 8);

const identities = new Map<
  string,
  { id: string; cookie: string; user: User }
>();

let app: INestApplication,
  db: Database,
  base: string,
  batchA: string,
  batchB: string;

async function request(
  key: string | null,
  path: string,
  method = "GET",
  body?: unknown,
  requestOrigin = origin,
) {
  return fetch(`${base}/api${path}`, {
    method,
    headers: {
      Origin: requestOrigin,
      ...(key ? { Cookie: identities.get(key)!.cookie } : {}),
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

async function identity(
  key: string,
  role: Role,
  passwordHash: string,
  extra: object = {},
) {
  const stored = await db.user.create({
    data: {
      name: `Synthetic ${key}`,
      email: `notify-${key.toLowerCase()}-${suffix}@example.test`,
      role,
      passwordHash,
      ...extra,
    },
  });

  const login = await request(null, "/auth/login", "POST", {
    email: stored.email,
    password,
  });

  assert.equal(login.status, 200, `${key} login`);

  identities.set(key, {
    id: stored.id,
    user: safeUser(stored),
    cookie: login.headers
      .getSetCookie()
      .map((value) => {
        return value.split(";")[0];
      })
      .join("; "),
  });
}

before(async () => {
  app = await createApp({
    NODE_ENV: "test",
    HOST: "127.0.0.1",
    PORT: 4100,
    DATABASE_URL: url!,
    WEB_ORIGIN: origin,
    JWT_SECRET: "synthetic-notification-secret-at-least-32-characters",
    LOCAL_DEMO_AUTH: false,
    EMAIL_FROM: "synthetic@example.test",
    CUSTOMER_REMINDER_DAYS_BEFORE: "",
    PRIVATE_STORAGE_PROVIDER: "local",
    PRIVATE_STORAGE_S3_REGION: "ap-southeast-1",
    ABUSE_LIMITS: {
      auth: [[10000, 60]],
      accountRead: [[100000, 60]],
      accountWrite: [[100000, 60]],
      expensive: [[100000, 60]],
    },
  });

  await app.listen(0, "127.0.0.1");

  base = await app.getUrl();

  db = app.get(Database);

  const passwordHash = await hashPassword(password);

  for (const role of roles.filter((role) => {
    return role !== "CUSTOMER";
  })) {
    await identity(role, role, passwordHash);
  }

  await identity("MANAGER_B", "BATCH_MANAGER", passwordHash);

  await identity("AGENT_B", "AGENT", passwordHash);

  for (const [key, manager] of [
    ["AGENT", "BATCH_MANAGER"],
    ["AGENT_B", "MANAGER_B"],
  ]) {
    const agent = await db.agent.create({
      data: { name: `Synthetic ${key}`, code: `NOTIFY-${key}-${suffix}` },
    });

    await db.user.update({
      where: { id: identities.get(key)!.id },
      data: { agentProfileId: agent.id },
    });

    const batch = await db.batch.create({
      data: {
        code: `NOTIFY-${key}-${suffix}`,
        model: "Synthetic device",
        startDate: new Date("2045-01-01"),
        endDate: new Date("2045-12-31"),
        contractPrice: "12000",
        installmentCount: 12,
        cadence: "MONTHLY",
        agentId: agent.id,
        managerId: identities.get(manager)!.id,
        handlerId: identities.get("BATCH_HANDLER")!.id,
      },
    });

    if (key === "AGENT") {
      batchA = batch.id;
    } else {
      batchB = batch.id;
    }
  }

  const client = await db.client.create({
    data: {
      batchId: batchA,
      name: "Synthetic notification customer",
      email: "",
      phone: "",
    },
  });

  await identity("CUSTOMER", "CUSTOMER", passwordHash, { clientId: client.id });
});

after(async () => {
  await app?.close();
});

async function submit(key = "AGENT", batchId = batchA) {
  const body = {
    submissionId: randomUUID(),
    batchId,
    name: `Synthetic notification member ${randomUUID().slice(0, 8)}`,
    email: "",
    phone: "09123456789",
  };

  const response = await request(key, "/enrollment/requests", "POST", body);

  assert.equal(response.status, 201);

  return {
    ...((await response.json()) as {
      id: string;
      version: number;
      status: string;
    }),
    body,
  };
}

async function alerts(
  key: string,
  scope = "enrollments",
  extra = "",
): Promise<StaffAlertPage> {
  const response = await request(key, `/staff/alerts?scope=${scope}${extra}`);

  assert.equal(response.status, 200, key);

  return response.json();
}

function read(key: string, id: string, version = 1) {
  return request(key, `/staff/alerts/${id}/read`, "POST", {
    entity: "enrollment",
    version,
  });
}

async function decide(
  id: string,
  decision: "APPROVED" | "REJECTED",
  reviewer = "BATCH_MANAGER",
) {
  const response = await request(
    reviewer,
    `/enrollment/requests/${id}/review`,
    "POST",
    { version: 1, decision, reason: "Synthetic requirements review" },
  );

  assert.equal(response.status, 201);

  return response.json();
}

test("enrollment alerts enforce every current role and expose no applicant contact or review-note data", async () => {
  const item = await submit();

  for (const role of roles) {
    const permissions = effectivePermissions({ role });

    const canEnroll =
      permissions.includes("ENROLLMENT_SUBMIT") ||
      permissions.includes("ENROLLMENT_REVIEW");

    const response = await request(role, "/staff/alerts?scope=enrollments");

    assert.equal(response.status, canEnroll ? 200 : 403, role);

    if (canEnroll) {
      const data = (await response.json()) as StaffAlertPage;

      assert.equal(
        data.items.some((row) => {
          return row.id === item.id;
        }),
        ["SYSTEM_ADMIN", "COO", "BATCH_MANAGER"].includes(role),
        role,
      );

      assert.equal(JSON.stringify(data).includes(item.body.phone), false);

      assert.equal(JSON.stringify(data).includes(item.body.name), false);
    }
  }

  assert.equal((await request(null, "/staff/alerts")).status, 401);

  assert.equal(
    (await alerts("MANAGER_B")).items.some((row) => {
      return row.id === item.id;
    }),
    false,
  );
});

test("existing pending requests need no backfill, and retrying submission never duplicates the bell", async () => {
  const item = await submit();

  const retry = await request(
    "AGENT",
    "/enrollment/requests",
    "POST",
    item.body,
  );

  assert.equal((await retry.json()).id, item.id);

  await db.staffNotification.deleteMany({
    where: { dedupeKey: { startsWith: `enrollment:${item.id}:` } },
  });

  const data = await alerts("BATCH_MANAGER");

  assert.equal(
    data.items.filter((row) => {
      return row.id === item.id;
    }).length,
    1,
  );

  const [alert] = data.items.filter((row) => {
    return row.id === item.id;
  });

  assert.equal(alert.readAt, null);

  assert.equal(alert.targetPath, `/system/enrollments?request=${item.id}`);

  assert.equal((await read("BATCH_MANAGER", item.id)).status, 200);
});

test("per-recipient read receipts are idempotent under simultaneous reads and shared with the generic API", async () => {
  const item = await submit();

  const [a, b] = await Promise.all([
    read("BATCH_MANAGER", item.id),
    read("BATCH_MANAGER", item.id),
  ]);

  assert.equal(a.status, 200);

  assert.equal(b.status, 200);

  assert.equal((await a.json()).readAt, (await b.json()).readAt);

  const receipt = await db.staffNotification.findUniqueOrThrow({
    where: {
      dedupeKey: `enrollment:${item.id}:${identities.get("BATCH_MANAGER")!.id}`,
    },
  });

  assert.ok(receipt.readAt);

  assert.equal(
    (await alerts("COO")).items.find((row) => {
      return row.id === item.id;
    })?.readAt,
    null,
  );

  const generic = await request(
    "BATCH_MANAGER",
    `/notifications/${receipt.id}/read`,
    "PATCH",
    {},
  );

  assert.equal(generic.status, 200);

  assert.equal((await generic.json()).readAt, receipt.readAt.toISOString());
});

test("reassignment retires old Manager alerts and generic notices while the new Manager inherits pending work", async () => {
  const item = await submit();

  const oldNotice = await db.staffNotification.findUniqueOrThrow({
    where: {
      dedupeKey: `enrollment:${item.id}:${identities.get("BATCH_MANAGER")!.id}`,
    },
  });

  await db.batch.update({
    where: { id: batchA },
    data: { managerId: identities.get("MANAGER_B")!.id },
  });

  try {
    assert.equal(
      (await alerts("BATCH_MANAGER")).items.some((row) => {
        return row.id === item.id;
      }),
      false,
    );

    assert.equal((await read("BATCH_MANAGER", item.id)).status, 404);

    const generic = await request("BATCH_MANAGER", "/notifications");

    assert.equal(
      (await generic.json()).items.some((row: { id: string }) => {
        return row.id === oldNotice.id;
      }),
      false,
    );

    assert.equal(
      (
        await request(
          "BATCH_MANAGER",
          `/notifications/${oldNotice.id}/read`,
          "PATCH",
          {},
        )
      ).status,
      404,
    );

    assert.equal(
      (await alerts("MANAGER_B")).items.some((row) => {
        return row.id === item.id;
      }),
      true,
    );

    assert.equal((await read("MANAGER_B", item.id)).status, 200);

    await request("BATCH_MANAGER", "/notifications/read-all", "POST", {});

    assert.equal(
      (
        await db.staffNotification.findUniqueOrThrow({
          where: { id: oldNotice.id },
        })
      ).readAt,
      null,
    );
  } finally {
    await db.batch.update({
      where: { id: batchA },
      data: { managerId: identities.get("BATCH_MANAGER")!.id },
    });
  }
});

test("approval replaces reviewer work with one Agent outcome and retains the Finance-only boundary", async () => {
  const item = await submit();

  const beforePayments = await db.payment.count();

  const result = await decide(item.id, "APPROVED");

  assert.ok(result.clientId);

  assert.equal(
    await db.scheduleItem.count({ where: { clientId: result.clientId } }),
    12,
  );

  assert.equal(
    (await alerts("BATCH_MANAGER")).items.some((row) => {
      return row.id === item.id;
    }),
    false,
  );

  const outcome = (await alerts("AGENT")).items.find((row) => {
    return row.id === item.id;
  })!;

  assert.equal(outcome.kind, "ENROLLMENT_APPROVED");

  assert.equal(
    (await alerts("AGENT_B")).items.some((row) => {
      return row.id === item.id;
    }),
    false,
  );

  assert.equal((await read("AGENT", item.id, 1)).status, 409);

  assert.equal((await read("AGENT", item.id, 2)).status, 200);

  assert.equal(
    (await request("AGENT", `/payments/${randomUUID()}/verify`, "POST", {}))
      .status,
    403,
  );

  assert.equal(await db.payment.count(), beforePayments);

  const retry = await decide(item.id, "APPROVED");

  assert.equal(retry.clientId, result.clientId);

  assert.equal(
    await db.staffNotification.count({
      where: { dedupeKey: `enrollment-review:${item.id}` },
    }),
    1,
  );
});

test("rejection informs only the submitting Agent and does not create members, schedules or deliveries", async () => {
  const item = await submit();

  const beforeCounts = [
    await db.client.count(),
    await db.scheduleItem.count(),
    await db.notificationDelivery.count(),
  ];

  await decide(item.id, "REJECTED", "COO");

  assert.equal(
    (await alerts("AGENT")).items.find((row) => {
      return row.id === item.id;
    })?.kind,
    "ENROLLMENT_REJECTED",
  );

  await read("AGENT", item.id, 2);

  assert.deepEqual(
    [
      await db.client.count(),
      await db.scheduleItem.count(),
      await db.notificationDelivery.count(),
    ],
    beforeCounts,
  );
});

test("exact-request links intersect current scope, including an older request beyond page one", async () => {
  const item = await submit();

  await db.enrollmentRequest.update({
    where: { id: item.id },
    data: { createdAt: new Date("2001-01-01") },
  });

  for (let index = 0; index < 22; index++) {
    await submit();
  }

  for (const [key, expected] of [
    ["BATCH_MANAGER", 1],
    ["AGENT", 1],
    ["COO", 1],
    ["MANAGER_B", 0],
    ["AGENT_B", 0],
  ] as const) {
    const response = await request(
      key,
      `/enrollment/requests?requestId=${item.id}`,
    );

    assert.equal(response.status, 200);

    const page = await response.json();

    assert.equal(page.total, expected, key);

    if (expected) {
      assert.equal(page.items[0].id, item.id);
    }
  }

  assert.equal(
    (await request("COO", "/enrollment/requests?requestId=bad")).status,
    400,
  );
});

test("selected enrollment mark-all covers every page and preserves tasks, Finance receipts, other recipients and source records", async () => {
  const task = await db.task.create({
    data: {
      title: "Synthetic unread task",
      deadline: new Date("2045-01-01"),
      assigneeId: identities.get("BATCH_MANAGER")!.id,
      creatorId: identities.get("COO")!.id,
    },
  });

  const before = [
    await db.client.count(),
    await db.scheduleItem.count(),
    await db.payment.count(),
    await db.auditEntry.count(),
    await db.notificationDelivery.count(),
  ];

  const outstanding = await alerts(
    "BATCH_MANAGER",
    "enrollments",
    "&unreadOnly=true",
  );

  assert.ok(outstanding.total > 20);

  const response = await request(
    "BATCH_MANAGER",
    "/staff/alerts/read-all",
    "POST",
    { scope: "enrollments" },
  );

  assert.equal(response.status, 200);

  assert.equal((await response.json()).updated, outstanding.total);

  assert.equal(
    (await alerts("BATCH_MANAGER", "enrollments", "&unreadOnly=true")).total,
    0,
  );

  assert.equal(
    (await alerts("BATCH_MANAGER", "tasks")).items.find((row) => {
      return row.id === task.id;
    })?.readAt,
    null,
  );

  assert.ok(
    (await alerts("COO", "enrollments", "&unreadOnly=true")).total > 20,
  );

  assert.deepEqual(
    [
      await db.client.count(),
      await db.scheduleItem.count(),
      await db.payment.count(),
      await db.auditEntry.count(),
      await db.notificationDelivery.count(),
    ],
    before,
  );

  assert.equal(
    (
      await (
        await request("BATCH_MANAGER", "/staff/alerts/read-all", "POST", {
          scope: "enrollments",
        })
      ).json()
    ).updated,
    0,
  );
});

test("generic read-all and bell receipts agree without exposing completed reviewer notifications", async () => {
  const item = await submit();

  assert.equal(
    (await request("COO", "/notifications/read-all", "POST", {})).status,
    200,
  );

  assert.ok(
    (await alerts("COO")).items.find((row) => {
      return row.id === item.id;
    })?.readAt,
  );

  await decide(item.id, "REJECTED");

  const notices = await (
    await request("BATCH_MANAGER", "/notifications")
  ).json();

  assert.equal(
    notices.items.some((row: { dedupeKey: string }) => {
      return (
        row.dedupeKey ===
        `enrollment:${item.id}:${identities.get("BATCH_MANAGER")!.id}`
      );
    }),
    false,
  );
});

test("forged cross-recipient reads, stale versions and invalid request bodies are rejected", async () => {
  const item = await submit("AGENT_B", batchB);

  assert.equal((await read("BATCH_MANAGER", item.id)).status, 404);

  assert.equal((await read("AGENT", item.id)).status, 404);

  assert.equal((await read("MANAGER_B", item.id, 99)).status, 409);

  for (const body of [
    { entity: "enrollment" },
    { entity: "enrollment", version: 0 },
    {
      entity: "enrollment",
      version: 1,
      recipientId: identities.get("MANAGER_B")!.id,
    },
  ]) {
    assert.equal(
      (
        await request(
          "MANAGER_B",
          `/staff/alerts/${item.id}/read`,
          "POST",
          body,
        )
      ).status,
      400,
    );
  }

  assert.equal(
    (
      await request(
        "MANAGER_B",
        `/staff/alerts/${item.id}/read`,
        "POST",
        { entity: "enrollment", version: 1 },
        "https://foreign.example",
      )
    ).status,
    403,
  );

  assert.equal(
    (await request("COO", "/staff/alerts?scope=enrollments&unknown=true"))
      .status,
    400,
  );
});

test("read actions refresh current roles and inactive access rather than trusting an old identity", async () => {
  const item = await submit("AGENT_B", batchB);

  const user = identities.get("MANAGER_B")!.user;

  const service = app.get(StaffAlertsService);

  await db.user.update({ where: { id: user.id }, data: { role: "CSR" } });

  try {
    await assert.rejects(
      service.read(user, item.id, { entity: "enrollment", version: 1 }),
      /Enrollment access required/,
    );

    assert.equal(
      (await request("MANAGER_B", "/staff/alerts?scope=enrollments")).status,
      401,
    );
  } finally {
    await db.user.update({
      where: { id: user.id },
      data: { role: "BATCH_MANAGER" },
    });
  }

  await db.user.update({ where: { id: user.id }, data: { active: false } });

  try {
    await assert.rejects(
      service.readAll(user, "enrollments"),
      /access has changed/,
    );
  } finally {
    await db.user.update({ where: { id: user.id }, data: { active: true } });
  }
});

test("live hints for stored enrollment notices obey current role and assignment visibility", async () => {
  const item = await submit();

  const user = identities.get("BATCH_MANAGER")!.user;

  const notice = await db.staffNotification.findUniqueOrThrow({
    where: { dedupeKey: `enrollment:${item.id}:${user.id}` },
  });

  const live = app.get(RealtimeController) as unknown as {
    visible(
      user: User,
      event: { entity: string; recordId: string },
    ): Promise<boolean>;
  };

  assert.equal(
    await live.visible(user, { entity: "notification", recordId: notice.id }),
    true,
  );

  assert.equal(
    await live.visible(identities.get("AGENT_B")!.user, {
      entity: "notification",
      recordId: notice.id,
    }),
    false,
  );

  await db.batch.update({
    where: { id: batchA },
    data: { managerId: identities.get("MANAGER_B")!.id },
  });

  try {
    assert.equal(
      await live.visible(user, { entity: "notification", recordId: notice.id }),
      false,
    );
  } finally {
    await db.batch.update({
      where: { id: batchA },
      data: { managerId: user.id },
    });
  }
});

test("a failed transaction leaves no receipt or delivery, and read versus review races remain consistent", async () => {
  const item = await submit();

  const userId = identities.get("SYSTEM_ADMIN")!.id;

  await assert.rejects(
    db.$transaction(async (tx) => {
      await markEnrollmentAlertsRead(tx, userId, new Date(), item.id);

      throw new Error("Synthetic rollback");
    }),
    /Synthetic rollback/,
  );

  assert.equal(
    await db.staffNotification.count({
      where: { dedupeKey: `enrollment:${item.id}:${userId}` },
    }),
    0,
  );

  const [readResult] = await Promise.all([
    read("BATCH_MANAGER", item.id),
    decide(item.id, "REJECTED"),
  ]);

  assert.ok([200, 404].includes(readResult.status));

  assert.equal(
    (await alerts("BATCH_MANAGER")).items.some((row) => {
      return row.id === item.id;
    }),
    false,
  );

  assert.equal(
    (await alerts("AGENT")).items.filter((row) => {
      return row.id === item.id;
    }).length,
    1,
  );
});
