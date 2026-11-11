import "reflect-metadata";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { INestApplication } from "@nestjs/common";
import {
  roles,
  type Role,
  type StaffAlertPage,
  type User,
} from "@freshphones/contracts";
import { createApp } from "../src/app";
import { Database } from "../src/database";
import type { Config } from "../src/config";
import { hashPassword } from "../src/auth/password";
import { safeUser } from "../src/auth/auth.service";
import { StaffAlertsService } from "../src/staff/staff-alerts.service";
import { NotificationsService } from "../src/notifications/notifications.service";
import { RealtimeController } from "../src/realtime/realtime.controller";
import { paymentReviewAlertRows } from "../src/staff/payment-review-alerts";
import { Prisma } from "../src/generated/prisma/client";

const databaseUrl = process.env.TEST_DATABASE_URL;

if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith("_test")) {
  throw new Error(
    "Dedicated migrated TEST_DATABASE_URL ending in _test required.",
  );
}

const suffix = randomUUID().slice(0, 8);

const origin = "http://localhost:3100";

const identities = new Map<
  string,
  { id: string; cookie: string; user: User }
>();

let app: INestApplication,
  db: Database,
  base: string,
  batchId: string,
  clientId: string;

const request = (
  key: string,
  path: string,
  body?: unknown,
  method = body ? "POST" : "GET",
) => {
  return fetch(`${base}/api${path}`, {
    method,
    headers: {
      Origin: origin,
      Cookie: identities.get(key)?.cookie ?? "",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
};

const list = async (key = "BATCH_HANDLER", query = "scope=reviews") => {
  const response = await request(key, `/staff/alerts?${query}`);

  assert.equal(response.status, 200, await response.clone().text());

  return response.json() as Promise<StaffAlertPage>;
};

async function payment() {
  const proof = await db.storedFile.create({
    data: {
      storageKey: randomUUID(),
      originalName: "receipt.png",
      mimeType: "image/png",
      size: 8,
      uploadedById: identities.get("BATCH_HANDLER")!.id,
    },
  });

  return db.payment.create({
    data: {
      clientId,
      batchId,
      amount: "10.00",
      method: "GCash",
      paymentDate: new Date("2049-03-01"),
      recordedById: identities.get("BATCH_HANDLER")!.id,
      proofFileId: proof.id,
    },
  });
}

async function review(
  id: string,
  stage: "RECORDS" | "MANAGER",
  decision = "APPROVED",
  notes = "Synthetic review note\nKeep the receipt legible.",
) {
  const row = await db.payment.findUniqueOrThrow({ where: { id } });

  const response = await request(
    stage === "RECORDS" ? "RECORDS" : "BATCH_MANAGER",
    `/payments/${id}/operational-review`,
    { stage, decision, notes, version: row.version },
  );

  assert.equal(response.status, 200, await response.clone().text());

  return db.paymentOperationalReview.findFirstOrThrow({
    where: { paymentId: id, paymentVersion: row.version, stage },
  });
}

const read = (id: string, version: number, key = "BATCH_HANDLER") => {
  return request(key, `/staff/alerts/${id}/read`, {
    entity: "payment-review",
    version,
  });
};

before(async () => {
  app = await createApp({
    NODE_ENV: "test",
    PORT: 4100,
    HOST: "127.0.0.1",
    DATABASE_URL: databaseUrl,
    WEB_ORIGIN: origin,
    JWT_SECRET: "handler-notification-test-secret-longer-than-32",
    EMAIL_FROM: "test@example.test",
    CUSTOMER_REMINDER_DAYS_BEFORE: "",
    ABUSE_LIMITS: {
      auth: [[10000, 60]],
      accountRead: [[100000, 60]],
      accountWrite: [[100000, 60]],
      expensive: [[100000, 60]],
    },
    PRIVATE_STORAGE_PROVIDER: "local",
    PRIVATE_STORAGE_S3_REGION: "ap-southeast-1",
  } as Config);

  await app.listen(0, "127.0.0.1");

  base = await app.getUrl();

  db = app.get(Database);

  batchId = (
    await db.batch.create({
      data: {
        code: `HANDLER-NOTIFY-${suffix}`,
        model: "Synthetic device",
        startDate: new Date("2049-01-01"),
        endDate: new Date("2049-12-31"),
      },
    })
  ).id;

  clientId = (
    await db.client.create({
      data: {
        batchId,
        name: "Synthetic notification member",
        email: "",
        phone: "",
      },
    })
  ).id;

  const password = "Synthetic-handler-notifications-123!";

  const passwordHash = await hashPassword(password);

  await db.loginAttempt.deleteMany();

  for (const key of [...roles, "HANDLER_B"]) {
    const user = await db.user.create({
      data: {
        name: `Synthetic ${key}`,
        email: `handler-notify-${key.toLowerCase()}-${suffix}@example.test`,
        passwordHash,
        role: key === "HANDLER_B" ? "BATCH_HANDLER" : (key as Role),
        ...(key === "CUSTOMER" ? { clientId } : {}),
      },
    });

    const response = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email, password }),
    });

    assert.equal(response.status, 200, `${key} login`);

    identities.set(key, {
      id: user.id,
      user: safeUser(user),
      cookie: response.headers
        .getSetCookie()
        .map((value) => {
          return value.split(";")[0];
        })
        .join("; "),
    });
  }

  await db.batch.update({
    where: { id: batchId },
    data: {
      handlerId: identities.get("BATCH_HANDLER")!.id,
      managerId: identities.get("BATCH_MANAGER")!.id,
    },
  });

  await db.scheduleItem.create({
    data: {
      clientId,
      sequenceNo: 1,
      dueDate: new Date("2049-03-01"),
      expectedAmount: "100.00",
    },
  });
});

after(async () => {
  await app?.close();
});

test("only Handler roles have the review scope; other staff all-alert views contain no review data", async () => {
  const p = await payment();

  await review(p.id, "RECORDS");

  for (const role of roles) {
    const response = await request(role, "/staff/alerts?scope=reviews");

    assert.equal(
      response.status,
      ["BATCH_HANDLER", "CORE_HANDLER"].includes(role) ? 200 : 403,
      role,
    );

    if (!["BATCH_HANDLER", "CORE_HANDLER", "CUSTOMER", "CEO"].includes(role)) {
      const all = await request(role, "/staff/alerts");

      if (all.status === 200) {
        const page = (await all.json()) as StaffAlertPage;

        assert.equal(page.reviewCount, 0);

        assert(
          !page.items.some((item) => {
            return item.entity === "payment-review";
          }),
        );
      }
    }
  }

  assert.equal((await list("HANDLER_B")).total, 0);
});

test("all four stage outcomes surface once, preserve reviewer notes and never change verified credit", async () => {
  const before = await (
    await request("BATCH_HANDLER", `/clients/${clientId}/balance`)
  ).json();

  const p = await payment();

  const records = await review(p.id, "RECORDS");

  const manager = await review(p.id, "MANAGER");

  const returned = await payment();

  const rr = await review(
    returned.id,
    "RECORDS",
    "RETURNED",
    "Synthetic Records return: reference does not match.",
  );

  const managerReturn = await payment();

  await review(managerReturn.id, "RECORDS");

  const mr = await review(
    managerReturn.id,
    "MANAGER",
    "RETURNED",
    "Synthetic Manager return: attach clearer proof.",
  );

  const page = await list();

  for (const [r, kind] of [
    [records, "RECORDS_APPROVED"],
    [manager, "MANAGER_APPROVED"],
    [rr, "RECORDS_RETURNED"],
    [mr, "MANAGER_RETURNED"],
  ] as const) {
    const alert = page.items.find((item) => {
      return item.id === r.id;
    });

    assert(alert);

    assert.equal(alert.kind, kind);

    assert.equal(
      alert.targetPath,
      `/system/payments?payment=${r.paymentId}&review=${r.id}`,
    );

    assert(!JSON.stringify(alert).includes(r.notes));

    const detailResponse = await request(
      "BATCH_HANDLER",
      `/staff/alerts/reviews/${r.id}`,
    );

    assert.equal(detailResponse.status, 200);

    const detail = await detailResponse.json();

    assert.equal(detail.notes, r.notes);

    assert.equal(detail.paymentId, r.paymentId);

    assert.equal(
      detail.currentStatus,
      r.decision === "RETURNED" ? "NEEDS_CLARIFICATION" : "PENDING",
    );
  }

  const again = await list();

  assert.equal(
    new Set(
      again.items.map((item) => {
        return item.id;
      }),
    ).size,
    again.items.length,
  );

  const after = await (
    await request("BATCH_HANDLER", `/clients/${clientId}/balance`)
  ).json();

  for (const field of [
    "totalDue",
    "verifiedPaid",
    "remainingBalance",
    "overpaid",
  ]) {
    assert.equal(after[field], before[field]);
  }

  assert.equal(
    await db.notificationDelivery.count({
      where: { notification: { eventKey: "payment.reviewed" } },
    }),
    0,
  );
});

test("per-recipient concurrent reads are idempotent and generic receipts contain no copied review note", async () => {
  const p = await payment();

  const r = await review(p.id, "RECORDS");

  const responses = await Promise.all([
    read(r.id, r.paymentVersion),
    read(r.id, r.paymentVersion),
  ]);

  assert(
    responses.every((response) => {
      return response.status === 200;
    }),
  );

  assert.equal(
    (await list()).items.find((item) => {
      return item.id === r.id;
    })!.readAt !== null,
    true,
  );

  const receipts = await db.staffNotification.findMany({
    where: {
      dedupeKey: `payment-review:${r.id}:${identities.get("BATCH_HANDLER")!.id}`,
    },
  });

  assert.equal(receipts.length, 1);

  assert(!receipts[0].body.includes(r.notes));

  assert.equal(
    receipts[0].link,
    `/system/payments?payment=${p.id}&review=${r.id}`,
  );

  const generic = await request(
    "BATCH_HANDLER",
    `/notifications/${receipts[0].id}/read`,
    {},
    "PATCH",
  );

  assert.equal(generic.status, 200);

  assert.equal(
    await db.notificationDelivery.count({
      where: { notificationId: receipts[0].id },
    }),
    0,
  );
});

test("review read bodies reject forged identities, wrong versions and foreign review references", async () => {
  const p = await payment();

  const r = await review(p.id, "RECORDS");

  assert.equal((await read(r.id, r.paymentVersion + 1)).status, 409);

  assert.equal((await read(r.id, r.paymentVersion, "HANDLER_B")).status, 404);

  assert.equal((await read(randomUUID(), 1)).status, 404);

  for (const extra of [
    { userId: identities.get("HANDLER_B")!.id },
    { kind: "RECORDS_APPROVED" },
    { version: 0 },
  ]) {
    assert.equal(
      (
        await request("BATCH_HANDLER", `/staff/alerts/${r.id}/read`, {
          entity: "payment-review",
          version: r.paymentVersion,
          ...extra,
        })
      ).status,
      400,
    );
  }

  assert.equal(
    (await request("BATCH_HANDLER", "/staff/alerts/reviews/invalid")).status,
    400,
  );

  for (const key of [
    "COO",
    "RECORDS",
    "FINANCE_OFFICER",
    "BATCH_MANAGER",
    "AGENT",
    "CUSTOMER",
  ]) {
    assert.equal(
      (await request(key, `/staff/alerts/reviews/${r.id}`)).status,
      403,
      key,
    );
  }

  assert.equal(
    (await request("HANDLER_B", `/staff/alerts/reviews/${r.id}`)).status,
    404,
  );
});

test("existing history paginates with whole-scope counts and exact payments remain reachable beyond page one", async () => {
  const previous = (await list()).total;

  let oldest: { id: string; paymentId: string } | null = null;

  for (let i = 0; i < 25; i++) {
    const p = await payment();

    const r = await db.paymentOperationalReview.create({
      data: {
        paymentId: p.id,
        reviewerId: identities.get("RECORDS")!.id,
        stage: "RECORDS",
        decision: "APPROVED",
        notes: "Preexisting synthetic review",
        evidenceVersion: 1,
        paymentVersion: 1,
        batchVersion: 1,
        createdAt: new Date(Date.UTC(2000, 0, 1, 0, 0, i)),
      },
    });

    oldest ??= r;
  }

  const first = await list();

  assert.equal(first.total, previous + 25);

  assert.equal(first.reviewCount, first.total);

  assert.equal(first.items.length, 20);

  const all = [...first.items];

  for (let page = 2; all.length < first.total; page++) {
    all.push(
      ...(await list("BATCH_HANDLER", `scope=reviews&page=${page}`)).items,
    );
  }

  assert.equal(
    new Set(
      all.map((item) => {
        return item.id;
      }),
    ).size,
    first.total,
  );

  assert(
    all.some((item) => {
      return item.id === oldest!.id;
    }),
  );

  const exact = await request(
    "BATCH_HANDLER",
    `/payments?id=${oldest!.paymentId}`,
  );

  assert.equal(exact.status, 200);

  assert.equal((await exact.json()).items[0].id, oldest!.paymentId);
});

test("selected review mark-all covers every page and preserves task and Finance-result unread state", async () => {
  await db.task.create({
    data: {
      title: `Unrelated task ${suffix}`,
      deadline: new Date("2049-03-01"),
      assigneeId: identities.get("BATCH_HANDLER")!.id,
      creatorId: identities.get("COO")!.id,
    },
  });

  const p = await payment();

  await review(p.id, "RECORDS");

  await review(p.id, "MANAGER");

  const current = await db.payment.findUniqueOrThrow({ where: { id: p.id } });

  const decision = await request(
    "FINANCE_OFFICER",
    `/payments/${p.id}/verify`,
    {
      decision: "VERIFIED",
      notes: "Synthetic external receipt checked.",
      version: current.version,
    },
  );

  assert.equal(decision.status, 200);

  const taskUnread = (
    await list("BATCH_HANDLER", "scope=tasks&unreadOnly=true")
  ).total;

  const resultUnread = (
    await list("BATCH_HANDLER", "scope=results&unreadOnly=true")
  ).total;

  const balance = await (
    await request("BATCH_HANDLER", `/clients/${clientId}/balance`)
  ).json();

  const auditCount = await db.auditEntry.count();

  assert.equal(
    (
      await request("BATCH_HANDLER", "/staff/alerts/read-all", {
        scope: "reviews",
      })
    ).status,
    200,
  );

  assert.equal(
    (await list("BATCH_HANDLER", "scope=reviews&unreadOnly=true")).total,
    0,
  );

  assert.equal(
    (await list("BATCH_HANDLER", "scope=tasks&unreadOnly=true")).total,
    taskUnread,
  );

  assert.equal(
    (await list("BATCH_HANDLER", "scope=results&unreadOnly=true")).total,
    resultUnread,
  );

  assert.deepEqual(
    await (
      await request("BATCH_HANDLER", `/clients/${clientId}/balance`)
    ).json(),
    balance,
  );

  assert.equal(await db.auditEntry.count(), auditCount);
});

test("reassignment retains a redacted inbox receipt, hides details and live hints, and gives the new Handler independent unread history", async () => {
  const p = await payment();

  const r = await review(p.id, "RECORDS");

  await read(r.id, r.paymentVersion);

  const receipt = await db.staffNotification.findUniqueOrThrow({
    where: {
      dedupeKey: `payment-review:${r.id}:${identities.get("BATCH_HANDLER")!.id}`,
    },
  });

  const live = app.get(RealtimeController) as unknown as {
    visible: (
      user: User,
      hint: { entity: string; recordId: string },
    ) => Promise<boolean>;
  };

  try {
    await db.batch.update({
      where: { id: batchId },
      data: {
        handlerId: identities.get("HANDLER_B")!.id,
        version: { increment: 1 },
      },
    });

    const retained = await list();

    assert(retained.total > 0);

    assert(
      retained.items.every((item) => {
        return item.unavailable && item.targetPath === "";
      }),
    );

    assert(
      !JSON.stringify(retained.items).includes("Synthetic notification member"),
    );

    assert.equal(
      (await request("BATCH_HANDLER", `/staff/alerts/reviews/${r.id}`)).status,
      404,
    );

    assert.equal((await read(r.id, r.paymentVersion)).status, 404);

    assert.equal(
      (
        await request(
          "BATCH_HANDLER",
          `/notifications/${receipt.id}/read`,
          {},
          "PATCH",
        )
      ).status,
      404,
    );

    const generic = await (
      await request("BATCH_HANDLER", "/notifications")
    ).json();

    assert(
      !generic.items.some((item: { id: string }) => {
        return item.id === receipt.id;
      }),
    );

    assert.equal(
      await live.visible(identities.get("BATCH_HANDLER")!.user, {
        entity: "notification",
        recordId: receipt.id,
      }),
      false,
    );

    assert.equal(
      await live.visible(identities.get("BATCH_HANDLER")!.user, {
        entity: "payment",
        recordId: p.id,
      }),
      false,
    );

    const newPage = await list("HANDLER_B");

    assert(newPage.total > 0);

    assert.equal(
      newPage.items.find((item) => {
        return item.id === r.id;
      })!.readAt,
      null,
    );

    assert.equal((await read(r.id, r.paymentVersion, "HANDLER_B")).status, 200);

    assert.equal(
      (await request("HANDLER_B", `/staff/alerts/reviews/${r.id}`)).status,
      200,
    );
  } finally {
    await db.batch.update({
      where: { id: batchId },
      data: {
        handlerId: identities.get("BATCH_HANDLER")!.id,
        version: { increment: 1 },
      },
    });
  }
});

test("current role and active account are rechecked even when a service caller supplies an old identity", async () => {
  const user = identities.get("BATCH_HANDLER")!.user;

  const alerts = app.get(StaffAlertsService);

  const p = await payment();

  const r = await review(p.id, "RECORDS");

  for (const changed of [{ active: false }, { role: "COO" as Role }]) {
    try {
      await db.user.update({ where: { id: user.id }, data: changed });

      await assert.rejects(
        alerts.list(user, { page: 1, scope: "reviews", unreadOnly: false }),
        /access has changed/i,
      );

      await assert.rejects(alerts.review(user, r.id), /not found/i);

      await assert.rejects(
        alerts.read(user, r.id, {
          entity: "payment-review",
          version: r.paymentVersion,
        }),
      );
    } finally {
      await db.user.update({
        where: { id: user.id },
        data: { active: true, role: "BATCH_HANDLER" },
      });
    }
  }

  const login = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: `handler-notify-batch_handler-${suffix}@example.test`,
      password: "Synthetic-handler-notifications-123!",
    }),
  });

  assert.equal(login.status, 200);

  identities.get("BATCH_HANDLER")!.cookie = login.headers
    .getSetCookie()
    .map((value) => {
      return value.split(";")[0];
    })
    .join("; ");
});

test("legacy CORE_HANDLER sees only its current assignments with independent receipts", async () => {
  const p = await payment();

  const r = await review(p.id, "RECORDS");

  try {
    await db.batch.update({
      where: { id: batchId },
      data: { handlerId: identities.get("CORE_HANDLER")!.id },
    });

    assert(
      (await list("CORE_HANDLER")).items.some((item) => {
        return item.id === r.id;
      }),
    );

    assert.equal(
      (await request("CORE_HANDLER", `/staff/alerts/reviews/${r.id}`)).status,
      200,
    );

    assert.equal(
      (await read(r.id, r.paymentVersion, "CORE_HANDLER")).status,
      200,
    );
  } finally {
    await db.batch.update({
      where: { id: batchId },
      data: { handlerId: identities.get("BATCH_HANDLER")!.id },
    });
  }
});

test("saved return notes retain their decision while a corrected payment shows its current pending status", async () => {
  const p = await payment();

  const r = await review(
    p.id,
    "RECORDS",
    "RETURNED",
    "Synthetic original return note.",
  );

  const current = await db.payment.findUniqueOrThrow({ where: { id: p.id } });

  const correction = await request(
    "BATCH_HANDLER",
    `/payments/${p.id}`,
    {
      version: current.version,
      record: {
        clientId,
        amount: "12.00",
        method: "GCash",
        paymentDate: "2049-03-01",
        referenceNumber: "corrected",
      },
    },
    "PATCH",
  );

  assert.equal(correction.status, 200);

  const detail = await (
    await request("BATCH_HANDLER", `/staff/alerts/reviews/${r.id}`)
  ).json();

  assert.equal(detail.decision, "RETURNED");

  assert.equal(detail.notes, r.notes);

  assert.equal(detail.currentStatus, "PENDING");

  assert(detail.currentVersion > detail.paymentVersion);
});

test("receipt failures roll back mark-all without touching source reviews or creating deliveries", async () => {
  const p = await payment();

  const r = await review(p.id, "RECORDS");

  const userId = identities.get("BATCH_HANDLER")!.id;

  await db.$executeRawUnsafe(
    `CREATE FUNCTION handler_notice_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."eventKey" = 'payment.reviewed' THEN RAISE EXCEPTION 'synthetic receipt failure'; END IF; RETURN NEW; END $$`,
  );

  await db.$executeRawUnsafe(
    `CREATE TRIGGER handler_notice_fail BEFORE INSERT ON "StaffNotification" FOR EACH ROW EXECUTE FUNCTION handler_notice_fail()`,
  );

  try {
    await assert.rejects(
      app
        .get(StaffAlertsService)
        .readAll(identities.get("BATCH_HANDLER")!.user, "reviews"),
      /synthetic receipt failure/,
    );
  } finally {
    await db.$executeRawUnsafe(
      'DROP TRIGGER handler_notice_fail ON "StaffNotification"',
    );

    await db.$executeRawUnsafe("DROP FUNCTION handler_notice_fail()");
  }

  assert.equal(
    await db.staffNotification.count({
      where: { dedupeKey: `payment-review:${r.id}:${userId}` },
    }),
    0,
  );

  assert.deepEqual(
    await db.paymentOperationalReview.findUniqueOrThrow({
      where: { id: r.id },
    }),
    r,
  );

  assert.equal(
    await db.notificationDelivery.count({
      where: { notification: { eventKey: "payment.reviewed" } },
    }),
    0,
  );
});

test("scoped review queries have a bounded page, stable ordering and inspected PostgreSQL plan", async () => {
  const query = Prisma.sql`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT * FROM (${paymentReviewAlertRows(identities.get("BATCH_HANDLER")!.id)}) visible ORDER BY "occurredAt" DESC, id DESC LIMIT 20`;

  const plan = await db.$queryRaw<
    {
      "QUERY PLAN": {
        Plan: { "Actual Rows": number };
        "Execution Time": number;
      }[];
    }[]
  >(query);

  assert(plan[0]["QUERY PLAN"][0].Plan["Actual Rows"] <= 20);

  if (process.env.HANDLER_NOTICE_TEST_OUTPUT) {
    await writeFile(
      join(
        process.env.HANDLER_NOTICE_TEST_OUTPUT,
        "review-query-plan-populated.json",
      ),
      JSON.stringify(
        {
          fixture: "isolated Handler history and per-recipient receipts",
          plan: plan[0]["QUERY PLAN"],
        },
        null,
        2,
      ),
    );
  }

  assert.equal((await list()).items.length, 20);

  const notes = await app
    .get(NotificationsService)
    .list(identities.get("BATCH_HANDLER")!.user, 1, false);

  assert(
    notes.items.every((notice) => {
      return notice.recipientId === identities.get("BATCH_HANDLER")!.id;
    }),
  );
});

test("a task notification is captured at assignment even with email disabled and stays after completion", async () => {
  const previous = await db.staffEmailTemplate.findUnique({
    where: { kind: "TASK_ASSIGNED" },
  });

  await db.staffEmailTemplate.upsert({
    where: { kind: "TASK_ASSIGNED" },
    create: {
      kind: "TASK_ASSIGNED",
      enabled: false,
      subject: "{title}",
      body: "{message}",
    },
    update: { enabled: false },
  });

  try {
    const response = await request("COO", "/tasks", {
      title: "Keep reference FP-QA-20261110",
      instructions: "Synthetic persistence check.",
      assigneeId: identities.get("BATCH_HANDLER")!.id,
      priority: "MEDIUM",
      deadline: "2049-12-25T10:00:00.000Z",
    });

    assert.equal(response.status, 201, await response.clone().text());

    const task = await response.json();

    const received = await db.staffInboxNotification.findFirstOrThrow({
      where: {
        taskId: task.id,
        recipientId: identities.get("BATCH_HANDLER")!.id,
      },
    });

    assert.equal(received.kind, "TASK_ASSIGNED");

    assert(JSON.stringify(received.payload).includes("FP-QA-20261110"));

    await db.task.update({
      where: { id: task.id },
      data: { status: "DONE", title: "Changed after receipt" },
    });

    const notices = await list("BATCH_HANDLER", "scope=tasks");

    const saved = notices.items.find((notice) => {
      return notice.inboxId === received.id;
    });

    assert(saved && saved.message.includes("FP-QA-20261110"));

    assert.equal(saved.unavailable, undefined);

    assert.equal(
      (
        await request(
          "BATCH_HANDLER",
          `/staff/alerts/inbox/${received.id}/read`,
          {},
        )
      ).status,
      200,
    );

    assert(
      (await list("BATCH_HANDLER", "scope=tasks")).items.some((notice) => {
        return notice.inboxId === received.id && notice.readAt;
      }),
    );

    assert.equal(
      (await request("BATCH_HANDLER", `/tasks/${task.id}`)).status,
      200,
    );
  } finally {
    if (previous) {
      await db.staffEmailTemplate.update({
        where: { kind: "TASK_ASSIGNED" },
        data: { enabled: previous.enabled },
      });
    } else {
      await db.staffEmailTemplate.delete({ where: { kind: "TASK_ASSIGNED" } });
    }
  }
});

test("Delete clears only a recipient's inbox copy and polling cannot resurrect the same event", async () => {
  const p = await payment();

  const reviewRow = await review(p.id, "RECORDS");

  const row = await db.staffInboxNotification.findFirstOrThrow({
    where: {
      sourceId: reviewRow.id,
      recipientId: identities.get("BATCH_HANDLER")!.id,
    },
  });

  const paymentBefore = await db.payment.findUniqueOrThrow({
    where: { id: p.id },
  });

  const before = await list();

  assert.equal(
    (
      await request(
        "HANDLER_B",
        `/staff/alerts/inbox/${row.id}`,
        undefined,
        "DELETE",
      )
    ).status,
    404,
  );

  for (const key of ["CUSTOMER", "COO", "FINANCE_OFFICER", "RECORDS"]) {
    assert.equal(
      (await request(key, `/staff/alerts/inbox/${row.id}`, undefined, "DELETE"))
        .status,
      403,
    );
  }

  assert.equal(
    (
      await request(
        "BATCH_HANDLER",
        "/staff/alerts/inbox/not-a-uuid",
        undefined,
        "DELETE",
      )
    ).status,
    400,
  );

  const responses = await Promise.all([
    request(
      "BATCH_HANDLER",
      `/staff/alerts/inbox/${row.id}`,
      undefined,
      "DELETE",
    ),
    request(
      "BATCH_HANDLER",
      `/staff/alerts/inbox/${row.id}`,
      undefined,
      "DELETE",
    ),
  ]);

  assert(
    responses.every((response) => {
      return response.status === 200;
    }),
  );

  for (let attempt = 0; attempt < 3; attempt++) {
    const after = await list();

    assert.equal(after.total, before.total - 1);

    assert(
      !after.items.some((notice) => {
        return notice.inboxId === row.id;
      }),
    );
  }

  const tombstone = await db.staffInboxNotification.findUniqueOrThrow({
    where: { id: row.id },
  });

  assert(tombstone.deletedAt);

  assert.equal(tombstone.payload, null);

  assert.equal(
    (await request("BATCH_HANDLER", `/staff/alerts/inbox/${row.id}/read`, {}))
      .status,
    404,
  );

  assert.deepEqual(
    await db.payment.findUniqueOrThrow({ where: { id: p.id } }),
    paymentBefore,
  );

  assert.deepEqual(
    await db.paymentOperationalReview.findUniqueOrThrow({
      where: { id: reviewRow.id },
    }),
    reviewRow,
  );
});

test("retained notifications can be read and deleted after assignment changes without exposing the saved member identity", async () => {
  const p = await payment();

  const reviewRow = await review(p.id, "RECORDS");

  const own = await db.staffInboxNotification.findFirstOrThrow({
    where: {
      sourceId: reviewRow.id,
      recipientId: identities.get("BATCH_HANDLER")!.id,
    },
  });

  try {
    await db.batch.update({
      where: { id: batchId },
      data: { handlerId: identities.get("HANDLER_B")!.id },
    });

    const retained = (await list()).items.find((item) => {
      return item.inboxId === own.id;
    });

    assert(retained?.unavailable && retained.targetPath === "");

    assert(!JSON.stringify(retained).includes("Synthetic notification member"));

    assert.equal(
      (await request("BATCH_HANDLER", `/staff/alerts/inbox/${own.id}/read`, {}))
        .status,
      200,
    );

    const other = (await list("HANDLER_B")).items.find((item) => {
      return item.id === reviewRow.id;
    });

    assert(other && !other.readAt && other.inboxId !== own.id);

    assert.equal(
      (
        await request(
          "BATCH_HANDLER",
          `/staff/alerts/inbox/${own.id}`,
          undefined,
          "DELETE",
        )
      ).status,
      200,
    );

    assert(
      (await list("HANDLER_B")).items.some((item) => {
        return item.inboxId === other.inboxId;
      }),
    );

    assert.equal(
      (await request("BATCH_HANDLER", `/staff/alerts/reviews/${reviewRow.id}`))
        .status,
      404,
    );
  } finally {
    await db.batch.update({
      where: { id: batchId },
      data: { handlerId: identities.get("BATCH_HANDLER")!.id },
    });
  }
});

test("saved-inbox SQL applies recipient/deletion filters before pagination and has a matching index", async () => {
  const plan = await db.$queryRaw`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
    SELECT id FROM "StaffInboxNotification" WHERE "recipientId"=${identities.get("BATCH_HANDLER")!.id}::uuid AND "deletedAt" IS NULL
    ORDER BY "occurredAt" DESC, id DESC LIMIT 20`;

  const indexes = await db.$queryRaw<
    { indexdef: string }[]
  >`SELECT indexdef FROM pg_indexes WHERE tablename='StaffInboxNotification'`;

  assert(
    indexes.some((row) => {
      return row.indexdef.includes(
        '"recipientId", "deletedAt", "occurredAt", id',
      );
    }),
  );

  if (process.env.HANDLER_NOTICE_TEST_OUTPUT) {
    await writeFile(
      join(process.env.HANDLER_NOTICE_TEST_OUTPUT, "inbox-query-plan.json"),
      JSON.stringify(plan, null, 2),
    );
  }
});
