import "reflect-metadata";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import {
  roles,
  effectivePermissions,
  type StaffAlertPage,
  type Role,
} from "@freshphones/contracts";
import { createApp } from "../src/app";
import { StaffAlertsService } from "../src/staff/staff-alerts.service";
import { RealtimeController } from "../src/realtime/realtime.controller";
import { Database } from "../src/database";
import { hashPassword } from "../src/auth/password";
import type { Config } from "../src/config";

const databaseUrl = process.env.TEST_DATABASE_URL;

if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith("_test")) {
  throw new Error(
    "Payment workflow tests require a dedicated TEST_DATABASE_URL ending in _test.",
  );
}

const origin = "http://localhost:3100";

const suffix = randomUUID().slice(0, 8);

const sessions = new Map<string, { id: string; cookie: string }>();

let app: INestApplication;

let db: Database;

let base: string;

let batchId: string;

let clientId: string;

const request = (
  role: string,
  path: string,
  body?: unknown,
  method = body ? "POST" : "GET",
) => {
  return fetch(`${base}/api${path}`, {
    method,
    headers: {
      Origin: origin,
      Cookie: sessions.get(role)?.cookie ?? "",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
};

const row = (id: string) => {
  return db.payment.findUniqueOrThrow({ where: { id } });
};

async function payment(proof = true) {
  const stored = proof
    ? await db.storedFile.create({
        data: {
          storageKey: randomUUID(),
          originalName: "receipt.png",
          mimeType: "image/png",
          size: 8,
          uploadedById: sessions.get("BATCH_HANDLER")!.id,
        },
      })
    : null;

  return db.payment.create({
    data: {
      clientId,
      batchId,
      amount: "10.00",
      method: "GCash",
      paymentDate: new Date("2049-03-01"),
      recordedById: sessions.get("BATCH_HANDLER")!.id,
      proofFileId: stored?.id,
    },
  });
}

async function review(
  id: string,
  role: string,
  stage: string,
  decision = "APPROVED",
  version?: number,
) {
  return request(role, `/payments/${id}/operational-review`, {
    stage,
    decision,
    notes: "Receipt, member, amount and batch checked.",
    version: version ?? (await row(id)).version,
  });
}

async function approve(id: string) {
  assert.equal((await review(id, "RECORDS", "RECORDS")).status, 200);

  assert.equal((await review(id, "BATCH_MANAGER", "MANAGER")).status, 200);
}

async function finance(id: string, version?: number, decision = "VERIFIED") {
  return request("FINANCE_OFFICER", `/payments/${id}/verify`, {
    decision,
    notes: "External receipt verified.",
    version: version ?? (await row(id)).version,
  });
}

async function correct(id: string, version?: number) {
  return request(
    "BATCH_HANDLER",
    `/payments/${id}`,
    {
      version: version ?? (await row(id)).version,
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
}

before(async () => {
  app = await createApp({
    NODE_ENV: "test",
    PORT: 4100,
    HOST: "127.0.0.1",
    DATABASE_URL: databaseUrl,
    WEB_ORIGIN: origin,
    JWT_SECRET: "payment-workflow-test-secret-longer-than-32-characters",
    EMAIL_FROM: "test@example.test",
    CUSTOMER_REMINDER_DAYS_BEFORE: "",
    PRIVATE_STORAGE_PROVIDER: "local",
    PRIVATE_STORAGE_S3_REGION: "ap-southeast-1",
  } as Config);

  await app.listen(0, "127.0.0.1");

  base = await app.getUrl();

  db = app.get(Database);

  const password = "Payment-workflow-password-123!";

  const passwordHash = await hashPassword(password);

  batchId = (
    await db.batch.create({
      data: {
        code: `HANDOFF-${suffix}`,
        model: "Test",
        startDate: new Date("2049-01-01"),
        endDate: new Date("2049-12-31"),
      },
    })
  ).id;

  clientId = (
    await db.client.create({
      data: {
        batchId,
        name: "Workflow client",
        email: `client-${suffix}@example.test`,
        phone: "Test",
      },
    })
  ).id;

  await db.loginAttempt.deleteMany();

  for (const role of [...roles, "OTHER_MANAGER"]) {
    const user = await db.user.create({
      data: {
        name: `Workflow ${role}`,
        email: `${role.toLowerCase()}-${suffix}@example.test`,
        passwordHash,
        role: role === "OTHER_MANAGER" ? "BATCH_MANAGER" : (role as Role),
        ...(role === "CUSTOMER" ? { clientId } : {}),
      },
    });

    const response = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email, password }),
    });

    assert.equal(response.status, 200);

    sessions.set(role, {
      id: user.id,
      cookie: response.headers
        .getSetCookie()
        .map((c) => {
          return c.split(";")[0];
        })
        .join("; "),
    });
  }

  await db.batch.update({
    where: { id: batchId },
    data: {
      managerId: sessions.get("BATCH_MANAGER")!.id,
      handlerId: sessions.get("BATCH_HANDLER")!.id,
    },
  });

  const network = await db.agent.create({
    data: { name: "Synthetic handoff agent", code: `HANDOFF-NET-${suffix}` },
  });

  await db.user.update({
    where: { id: sessions.get("AGENT")!.id },
    data: {
      agentProfileId: network.id,
      supervisorId: sessions.get("PIONEER_AGENT")!.id,
    },
  });

  await db.user.update({
    where: { id: sessions.get("PIONEER_AGENT")!.id },
    data: { supervisorId: sessions.get("OPERATIONS_COORDINATOR")!.id },
  });

  await db.batch.update({
    where: { id: batchId },
    data: { agentId: network.id },
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

async function alerts(
  role: string,
  scope = "workflow",
  extra = "",
): Promise<StaffAlertPage> {
  const response = await request(role, `/staff/alerts?scope=${scope}${extra}`);

  assert.equal(response.status, 200, await response.clone().text());

  return response.json();
}

async function alertFor(role: string, id: string, scope = "workflow") {
  const page = await alerts(role, scope);

  return page.items.find((item) => {
    return item.id === id;
  });
}

async function flag(id: string, version = 0, status = "OPEN") {
  const response = await request(
    "COO",
    `/operations/monitor/PAYMENT/${id}/follow-up`,
    {
      sourceVersion: (await row(id)).version,
      version,
      status,
      note: "Private operational note must never appear in alert copy",
      dueAt: null,
    },
  );

  assert.equal(response.status, 200, await response.clone().text());

  return response.json() as Promise<{ version: number }>;
}

async function readAlert(
  role: string,
  alert: NonNullable<Awaited<ReturnType<typeof alertFor>>>,
) {
  assert(alert.entity === "workflow" || alert.entity === "payment");

  return request(role, `/staff/alerts/${alert.id}/read`, {
    entity: alert.entity,
    version: alert.version,
    ...(alert.entity === "workflow" ? { kind: alert.kind } : {}),
  });
}

test("current stages notify only responsible active roles; Finance starts after both reviews", async () => {
  const noProof = await payment(false);

  const submitted = await payment();

  for (const role of roles) {
    const permissions = effectivePermissions({ role });

    const canWorkflow = [
      "OPERATIONS_MONITOR",
      "PAYMENT_COMPLETENESS_REVIEW",
      "PAYMENT_MANAGER_REVIEW",
      "PAYMENT_RECORD",
      "PAYMENT_VERIFY",
      "GCASH_HISTORY_REVIEW",
    ].some((permission) => {
      return permissions.includes(permission as never);
    });

    const response = await request(role, "/staff/alerts?scope=workflow");

    assert.equal(response.status, canWorkflow ? 200 : 403, role);

    if (canWorkflow) {
      const data: StaffAlertPage = await response.json();

      assert.equal(
        data.items.some((item) => {
          return item.id === submitted.id;
        }),
        role === "RECORDS",
        role,
      );

      assert.equal(
        data.items.some((item) => {
          return item.id === noProof.id;
        }),
        role === "BATCH_HANDLER",
        role,
      );

      assert.equal(data.workflowCount, data.filteredCount);

      for (const item of data.items) {
        assert(!("amount" in item));

        assert(!("clientName" in item));

        assert(!JSON.stringify(item).includes("Workflow client"));
      }
    }
  }

  assert.equal(
    await alertFor("FINANCE_OFFICER", submitted.id, "finance"),
    undefined,
  );

  assert.equal(
    (await alertFor("BATCH_HANDLER", noProof.id))?.kind,
    "PAYMENT_PROOF_REQUIRED",
  );

  assert.equal((await review(submitted.id, "RECORDS", "RECORDS")).status, 200);

  assert.equal(await alertFor("RECORDS", submitted.id), undefined);

  const manager = await alertFor("BATCH_MANAGER", submitted.id);

  assert.equal(manager?.kind, "PAYMENT_MANAGER_PENDING");

  assert.equal(manager?.targetPath, `/system/payments?payment=${submitted.id}`);

  assert.equal(await alertFor("OTHER_MANAGER", submitted.id), undefined);

  assert.equal(
    await alertFor("FINANCE_OFFICER", submitted.id, "finance"),
    undefined,
  );

  assert.equal(
    (await review(submitted.id, "BATCH_MANAGER", "MANAGER")).status,
    200,
  );

  assert.equal(await alertFor("BATCH_MANAGER", submitted.id), undefined);

  assert.equal(
    (await alertFor("FINANCE_OFFICER", submitted.id, "finance"))?.kind,
    "FINANCE_PENDING",
  );

  assert.equal(
    (await request("FINANCE_OFFICER", "/staff/finance-alerts")).status,
    200,
  );

  assert.equal((await finance(submitted.id)).status, 200);

  assert.equal(
    await alertFor("FINANCE_OFFICER", submitted.id, "finance"),
    undefined,
  );
});

test("returns, evidence corrections and statement revisions replace obsolete alerts", async () => {
  const p = await payment();

  const old = (await alertFor("RECORDS", p.id))!;

  assert.equal((await readAlert("RECORDS", old)).status, 200);

  assert.equal(
    (await review(p.id, "RECORDS", "RECORDS", "RETURNED")).status,
    200,
  );

  assert.equal(await alertFor("RECORDS", p.id), undefined);

  const returned = await alertFor("BATCH_HANDLER", p.id);

  assert.equal(returned?.kind, "PAYMENT_RETURNED");

  assert.equal((await readAlert("RECORDS", old)).status, 404);

  assert.equal((await correct(p.id)).status, 200);

  const revised = (await alertFor("RECORDS", p.id))!;

  assert.equal(revised.kind, "PAYMENT_RECORDS_PENDING");

  assert.equal(revised.readAt, null);

  assert(
    revised.entity === "workflow" &&
      old.entity === "workflow" &&
      revised.version > old.version,
  );

  assert.equal((await readAlert("RECORDS", old)).status, 409);

  assert.equal(await alertFor("BATCH_HANDLER", p.id), undefined);

  const file = await db.storedFile.create({
    data: {
      storageKey: randomUUID(),
      originalName: "private-statement.pdf",
      mimeType: "application/pdf",
      size: 8,
      uploadedById: sessions.get("BATCH_HANDLER")!.id,
    },
  });

  const history = await db.gcashHistory.create({
    data: {
      batchId,
      periodStart: new Date("2049-01-01"),
      periodEnd: new Date("2049-01-31"),
    },
  });

  await db.gcashHistorySubmission.create({
    data: {
      historyId: history.id,
      revision: 1,
      fileId: file.id,
      uploadedById: sessions.get("BATCH_HANDLER")!.id,
    },
  });

  const statement = (await alertFor("RECORDS", history.id))!;

  assert.equal(statement.kind, "STATEMENT_RECORDS_PENDING");

  assert.equal(
    statement.targetPath,
    `/system/gcash-history?history=${history.id}`,
  );

  assert(!JSON.stringify(statement).includes(file.id));

  assert.equal((await readAlert("RECORDS", statement)).status, 200);

  await db.gcashHistory.update({
    where: { id: history.id },
    data: { status: "NEEDS_CLARIFICATION", version: { increment: 1 } },
  });

  assert.equal(
    (await alertFor("BATCH_HANDLER", history.id))?.kind,
    "STATEMENT_RETURNED",
  );

  assert.equal(await alertFor("RECORDS", history.id), undefined);

  await db.gcashHistory.update({
    where: { id: history.id },
    data: { status: "SUBMITTED", version: { increment: 1 } },
  });

  assert.equal((await alertFor("RECORDS", history.id))?.readAt, null);

  await db.gcashHistory.update({
    where: { id: history.id },
    data: { status: "REVIEWED", version: { increment: 1 } },
  });

  assert.equal(await alertFor("RECORDS", history.id), undefined);
});

test("follow-up alerts honor RLS, dedupe concurrent reads, reopen unread and never grant monitoring writes", async () => {
  const principal = await db.$queryRaw<
    { rolsuper: boolean; rolbypassrls: boolean }[]
  >`SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`;

  assert.equal(principal[0].rolsuper, false);

  assert.equal(principal[0].rolbypassrls, false);

  const p = await payment(false);

  await flag(p.id);

  const owner = (await alerts("COO")).items.find((item) => {
    return item.entity === "workflow" && item.sourceId === p.id;
  })!;

  const handler = (await alerts("BATCH_HANDLER")).items.find((item) => {
    return (
      item.kind === "OPERATIONS_FOLLOW_UP" &&
      item.entity === "workflow" &&
      item.sourceId === p.id
    );
  })!;

  assert(handler);

  assert.equal(owner.id, handler.id);

  assert.equal(
    owner.targetPath,
    `/system/operations-monitor?source=PAYMENT&itemId=${p.id}`,
  );

  assert.equal(handler.targetPath, `/system/payments?payment=${p.id}`);

  assert(!JSON.stringify(handler).includes("Private operational note"));

  assert.deepEqual(await db.operationsFollowUp.findMany(), []);

  const before = await row(p.id);

  const concurrent = await Promise.all([
    readAlert("BATCH_HANDLER", handler),
    readAlert("BATCH_HANDLER", handler),
  ]);

  assert(
    concurrent.every((response) => {
      return response.status === 200;
    }),
  );

  assert.equal(
    (await concurrent[0].json()).readAt,
    (await concurrent[1].json()).readAt,
  );

  assert.equal(
    await db.staffNotification.count({
      where: {
        recipientId: sessions.get("BATCH_HANDLER")!.id,
        eventKey: "workflow.read",
        dedupeKey: { startsWith: `workflow:${handler.id}:` },
      },
    }),
    1,
  );

  assert.equal((await alertFor("COO", owner.id))?.readAt, null);

  const generic = await (
    await request("BATCH_HANDLER", "/notifications")
  ).json();

  assert(
    !generic.items.some((notice: { eventKey: string }) => {
      return notice.eventKey === "workflow.read";
    }),
  );

  assert.equal(
    (await request("BATCH_HANDLER", `/operations/monitor/PAYMENT/${p.id}`))
      .status,
    403,
  );

  assert.equal(
    (
      await request(
        "BATCH_HANDLER",
        `/operations/monitor/PAYMENT/${p.id}/follow-up`,
        {
          sourceVersion: 1,
          version: 1,
          status: "RESOLVED",
          note: "forged",
          dueAt: null,
        },
      )
    ).status,
    403,
  );

  assert.deepEqual(await row(p.id), before);

  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.monitor_actor_id', ${sessions.get("BATCH_HANDLER")!.id}, true)`;

    assert.equal(
      await tx.operationsFollowUp.count({ where: { id: owner.id } }),
      1,
    );

    assert.equal(
      await tx.operationsFollowUpEvent.count({
        where: { followUpId: owner.id },
      }),
      0,
    );

    assert.equal(
      (
        await tx.operationsFollowUp.updateMany({
          where: { id: owner.id },
          data: { note: "forged" },
        })
      ).count,
      0,
    );
  });

  await assert.rejects(
    db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.monitor_actor_id', ${sessions.get("BATCH_HANDLER")!.id}, true)`;

      return tx.operationsFollowUpEvent.create({
        data: {
          followUpId: owner.id,
          actorId: sessions.get("BATCH_HANDLER")!.id,
          status: "OPEN",
          note: "Forged staff history",
        },
      });
    }),
  );

  await flag(p.id, 1, "RESOLVED");

  assert.equal(await alertFor("COO", owner.id), undefined);

  assert.equal(await alertFor("BATCH_HANDLER", handler.id), undefined);

  await flag(p.id, 2);

  assert.equal((await alertFor("BATCH_HANDLER", handler.id))?.readAt, null);

  assert.equal((await readAlert("BATCH_HANDLER", handler)).status, 409);

  assert.equal(
    await db.notificationDelivery.count({
      where: { notification: { eventKey: "workflow.read" } },
    }),
    0,
  );

  const event = await db.changeEvent.findFirst({
    where: { entity: "operations-monitor", recordId: batchId },
  });

  assert(event);

  const realtime = app.get(RealtimeController) as unknown as {
    visible(
      user: unknown,
      event: { entity: string; recordId: string },
    ): Promise<boolean>;
  };

  const user = await db.user.findUniqueOrThrow({
    where: { id: sessions.get("COO")!.id },
  });

  assert.equal(await realtime.visible(user, event), true);

  assert.equal(await realtime.visible({ ...user, role: "CEO" }, event), false);
});

test("selected workflow read-all spans pages and preserves other categories and recipients", async () => {
  const task = await db.task.create({
    data: {
      title: "Independent task",
      assigneeId: sessions.get("RECORDS")!.id,
      creatorId: sessions.get("COO")!.id,
      deadline: new Date("2049-03-01"),
    },
  });

  const ids: string[] = [];

  for (let i = 0; i < 23; i++) {
    ids.push((await payment()).id);
  }

  const before = await alerts("RECORDS");

  assert(before.total > before.pageSize);

  const all = await Promise.all([
    request("RECORDS", "/staff/alerts/read-all", { scope: "workflow" }),
    request("RECORDS", "/staff/alerts/read-all", { scope: "workflow" }),
  ]);

  assert(
    all.every((response) => {
      return response.status === 200;
    }),
  );

  assert.equal(
    (await alerts("RECORDS", "workflow", "&unreadOnly=true")).total,
    0,
  );

  assert.equal((await alertFor("RECORDS", task.id, "tasks"))?.readAt, null);

  assert.equal(
    (
      await request("RECORDS", "/staff/alerts/read-all", {
        scope: "workflow",
      }).then((r) => {
        return r.json();
      })
    ).updated,
    0,
  );

  const pageTwo = await alerts("RECORDS", "workflow", "&page=2");

  assert(
    pageTwo.items.every((item) => {
      return item.readAt;
    }),
  );

  const coo = (await alerts("COO")).items;

  assert(
    coo.every((item) => {
      return item.readAt === null;
    }),
  );

  assert.equal(
    await db.payment.count({ where: { id: { in: ids }, status: "PENDING" } }),
    ids.length,
  );
});

test("reassignment, inactive reviewers and self-review constraints invalidate current recipients and Finance reads", async () => {
  const p = await payment();

  await approve(p.id);

  const financeAlert = (await alertFor("FINANCE_OFFICER", p.id, "finance"))!;

  await db.batch.update({
    where: { id: batchId },
    data: {
      managerId: sessions.get("OTHER_MANAGER")!.id,
      version: { increment: 1 },
    },
  });

  assert.equal(await alertFor("FINANCE_OFFICER", p.id, "finance"), undefined);

  assert.equal((await readAlert("FINANCE_OFFICER", financeAlert)).status, 404);

  assert.equal(await alertFor("BATCH_MANAGER", p.id), undefined);

  const replacement = (await alertFor("OTHER_MANAGER", p.id))!;

  assert.equal(replacement.kind, "PAYMENT_MANAGER_PENDING");

  const staleUser = await db.user.findUniqueOrThrow({
    where: { id: sessions.get("OTHER_MANAGER")!.id },
  });

  await db.user.update({
    where: { id: staleUser.id },
    data: { active: false },
  });

  await assert.rejects(
    app.get(StaffAlertsService).read(staleUser as never, p.id, {
      entity: "workflow",
      kind: "PAYMENT_MANAGER_PENDING",
      version: replacement.entity === "workflow" ? replacement.version : 1,
    }),
    /access has changed/,
  );

  await db.user.update({ where: { id: staleUser.id }, data: { active: true } });

  await db.batch.update({
    where: { id: batchId },
    data: {
      managerId: sessions.get("BATCH_MANAGER")!.id,
      version: { increment: 1 },
    },
  });

  await db.user.update({
    where: { id: sessions.get("RECORDS")!.id },
    data: { active: false },
  });

  assert.equal(
    (await alerts("BATCH_MANAGER")).items.some((item) => {
      return item.id === p.id;
    }),
    false,
  );

  await db.user.update({
    where: { id: sessions.get("RECORDS")!.id },
    data: { active: true },
  });

  const login = await request("", "/auth/login", {
    email: `records-${suffix}@example.test`,
    password: "Payment-workflow-password-123!",
  });

  assert.equal(login.status, 200);

  sessions.get("RECORDS")!.cookie = login.headers
    .getSetCookie()
    .map((value) => {
      return value.split(";")[0];
    })
    .join("; ");

  const self = await payment();

  await db.payment.update({
    where: { id: self.id },
    data: { recordedById: sessions.get("RECORDS")!.id },
  });

  assert.equal(await alertFor("RECORDS", self.id), undefined);
});

test("Handler reassignment and Moderator network changes retire alerts without leaking source access", async () => {
  const p = await payment(false);

  await flag(p.id);

  const handler = (await alertFor("BATCH_HANDLER", p.id))!;

  const coordinator = (await alerts("OPERATIONS_COORDINATOR")).items.find(
    (item) => {
      return item.entity === "workflow" && item.sourceId === p.id;
    },
  )!;

  assert(coordinator);

  assert.equal(
    coordinator.targetPath,
    `/system/operations-monitor?source=PAYMENT&itemId=${p.id}`,
  );

  assert(!JSON.stringify(coordinator).includes("Private operational note"));

  await db.batch.update({
    where: { id: batchId },
    data: {
      handlerId: sessions.get("CORE_HANDLER")!.id,
      version: { increment: 1 },
    },
  });

  assert.equal(await alertFor("BATCH_HANDLER", p.id), undefined);

  assert.equal((await readAlert("BATCH_HANDLER", handler)).status, 404);

  assert.equal((await alertFor("CORE_HANDLER", p.id))?.readAt, null);

  const pioneer = sessions.get("PIONEER_AGENT")!.id;

  await db.user.update({
    where: { id: pioneer },
    data: { supervisorId: null },
  });

  assert.equal(
    await alertFor("OPERATIONS_COORDINATOR", coordinator.id),
    undefined,
  );

  assert.equal(
    (await readAlert("OPERATIONS_COORDINATOR", coordinator)).status,
    404,
  );

  await db.user.update({
    where: { id: pioneer },
    data: { supervisorId: sessions.get("OPERATIONS_COORDINATOR")!.id },
  });

  await db.batch.update({
    where: { id: batchId },
    data: {
      handlerId: sessions.get("BATCH_HANDLER")!.id,
      version: { increment: 1 },
    },
  });

  const visible = (await alertFor("BATCH_HANDLER", p.id))!;

  assert.equal(
    (
      await request("BATCH_HANDLER", `/staff/alerts/${p.id}/read`, {
        entity: "workflow",
        kind: visible.kind,
        version: 0,
      })
    ).status,
    400,
  );

  assert.equal((await readAlert("CORE_HANDLER", visible)).status, 404);
});
