import "reflect-metadata";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import {
  roles,
  type Role,
  financePaymentQueues,
  type FinanceOverview,
} from "@freshphones/contracts";
import { createApp } from "../src/app";
import { Database } from "../src/database";
import { hashPassword } from "../src/auth/password";
import { prepareFinanceReview } from "./helpers/payment-workflow";
import { financePeriod } from "../src/finance/finance-overview.service";
import { financeReadySql } from "../src/finance/payment-workflow-query";
import { writeFileSync } from "node:fs";

const url = process.env.TEST_DATABASE_URL;

if (!url || !new URL(url).pathname.endsWith("_test")) {
  throw new Error(
    "Dedicated migrated TEST_DATABASE_URL ending in _test required.",
  );
}

const origin = "http://localhost:3100";

const suffix = randomUUID().slice(0, 8);

const sessions = new Map<string, { id: string; cookie: string }>();

let app: INestApplication,
  db: Database,
  base: string,
  batchId: string,
  clientId: string;

const readyIds: string[] = [];

let managerPayment: string, blockedPayment: string, closedPayment: string;

async function request(role: string | null, path: string) {
  return fetch(`${base}/api${path}`, {
    headers: {
      Origin: origin,
      ...(role ? { Cookie: sessions.get(role)!.cookie } : {}),
    },
  });
}

async function get(path: string) {
  const response = await request("FINANCE_OFFICER", path);

  assert.equal(response.status, 200, await response.clone().text());

  return response.json();
}

async function payment(
  input: {
    batchId?: string;
    clientId?: string;
    ready?: boolean;
    status?: "PENDING" | "VERIFIED" | "NEEDS_CLARIFICATION";
    reference?: string;
    date?: Date;
    amount?: string;
  } = {},
) {
  const row = await db.payment.create({
    data: {
      batchId: input.batchId ?? batchId,
      clientId: input.clientId ?? clientId,
      amount: input.amount ?? "10.00",
      paymentDate: input.date ?? new Date("2049-03-01"),
      method: "GCash",
      referenceNumber: input.reference ?? `FINANCE-${randomUUID()}`,
      recordedById: sessions.get("BATCH_HANDLER")!.id,
      status: input.status ?? "PENDING",
      ...(input.status === "VERIFIED"
        ? {
            verifierId: sessions.get("FINANCE_OFFICER")!.id,
            verifiedAt: new Date(),
          }
        : {}),
    },
  });

  if (input.ready) {
    await prepareFinanceReview(db, row.id);
  }

  return row;
}

before(async () => {
  app = await createApp({
    NODE_ENV: "test",
    HOST: "127.0.0.1",
    PORT: 4100,
    DATABASE_URL: url!,
    WEB_ORIGIN: origin,
    JWT_SECRET: "synthetic-finance-workspace-secret-at-least-32-characters",
    LOCAL_DEMO_AUTH: false,
    EMAIL_FROM: "synthetic@example.test",
    CUSTOMER_REMINDER_DAYS_BEFORE: "",
    PRIVATE_STORAGE_PROVIDER: "local",
    PRIVATE_STORAGE_S3_REGION: "ap-southeast-1",
    ABUSE_LIMITS: {
      auth: [[10000, 60]],
      accountRead: [[100000, 60]],
      expensive: [[100000, 60]],
    },
  });

  await app.listen(0, "127.0.0.1");

  base = await app.getUrl();

  db = app.get(Database);

  const password = "Synthetic-finance-password-123!",
    passwordHash = await hashPassword(password);

  const batch = await db.batch.create({
    data: {
      code: `FINANCE-${suffix}`,
      model: "Synthetic device",
      startDate: new Date("2049-01-01"),
      endDate: new Date("2049-12-31"),
    },
  });

  batchId = batch.id;

  const client = await db.client.create({
    data: { batchId, name: "Finance queue client", email: "", phone: "" },
  });

  clientId = client.id;

  for (const role of roles) {
    const user = await db.user.create({
      data: {
        name: `Synthetic ${role}`,
        email: `finance-${role.toLowerCase()}-${suffix}@example.test`,
        role,
        passwordHash,
        ...(role === "CUSTOMER" ? { clientId } : {}),
      },
    });

    const response = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email, password }),
    });

    assert.equal(response.status, 200, `${role} login`);

    sessions.set(role, {
      id: user.id,
      cookie: response.headers
        .getSetCookie()
        .map((x) => {
          return x.split(";")[0];
        })
        .join("; "),
    });
  }

  await db.batch.update({
    where: { id: batchId },
    data: {
      handlerId: sessions.get("BATCH_HANDLER")!.id,
      managerId: sessions.get("BATCH_MANAGER")!.id,
    },
  });

  for (let i = 0; i < 25; i++) {
    readyIds.push(
      (
        await payment({
          ready: true,
          reference: `PAGE-${String(i).padStart(2, "0")}`,
        })
      ).id,
    );
  }

  await payment();

  const manager = await payment();

  managerPayment = manager.id;

  const proof = await db.storedFile.create({
    data: {
      storageKey: randomUUID(),
      originalName: "synthetic-proof.png",
      mimeType: "image/png",
      size: 8,
      uploadedById: sessions.get("BATCH_HANDLER")!.id,
    },
  });

  await db.payment.update({
    where: { id: manager.id },
    data: { proofFileId: proof.id },
  });

  const managerBatch = await db.batch.findUniqueOrThrow({
    where: { id: batchId },
  });

  await db.paymentOperationalReview.create({
    data: {
      paymentId: manager.id,
      stage: "RECORDS",
      decision: "APPROVED",
      reviewerId: sessions.get("RECORDS")!.id,
      evidenceVersion: manager.evidenceVersion,
      paymentVersion: manager.version,
      batchVersion: managerBatch.version,
      notes: "Synthetic completeness review only",
    },
  });

  const closedClient = await db.client.create({
    data: {
      batchId,
      name: "Handed-over member",
      email: "",
      phone: "",
      replacementCompletedAt: new Date(),
    },
  });

  closedPayment = (await payment({ ready: true, clientId: closedClient.id }))
    .id;

  await payment({ status: "NEEDS_CLARIFICATION" });

  const blockedBatch = await db.batch.create({
    data: {
      code: `EVIDENCE-${suffix}`,
      model: "Synthetic device",
      startDate: new Date("2049-01-01"),
      endDate: new Date("2049-12-31"),
    },
  });

  const blockedClient = await db.client.create({
    data: {
      batchId: blockedBatch.id,
      name: "Evidence client",
      email: "",
      phone: "",
    },
  });

  blockedPayment = (
    await payment({
      ready: true,
      batchId: blockedBatch.id,
      clientId: blockedClient.id,
    })
  ).id;

  await db.evidenceRequirement.create({
    data: {
      batchId: blockedBatch.id,
      kind: "RECEIPT",
      clientId: blockedClient.id,
      description: "Missing declared receipt",
      periodStart: new Date("2049-03-01"),
      periodEnd: new Date("2049-03-31"),
      reason: "Synthetic declared expectation",
    },
  });
});

after(async () => {
  await app?.close();
});

test("Finance overview and queue parameters deny anonymous and every unrelated role", async () => {
  assert.equal((await request(null, "/finance/overview")).status, 401);

  for (const role of roles.filter((role) => {
    return role !== "FINANCE_OFFICER";
  })) {
    assert.equal((await request(role, "/finance/overview")).status, 403, role);

    const response = await request(role, "/payments?financeQueue=ready");

    assert.equal(response.status, 403, `${role} queue`);

    const refunds = await request(role, "/withdrawals?refund=outstanding");

    assert.equal(refunds.status, 403, `${role} refund queue`);
  }

  assert.equal(
    (await request("FINANCE_OFFICER", "/payments?financeQueue=invented"))
      .status,
    400,
  );

  assert.equal(
    (await request("FINANCE_OFFICER", "/finance/overview?period=invented"))
      .status,
    400,
  );
});

test("dashboard counts, paged ready lists, alerts and Customer work describe exactly the same eligible records", async () => {
  const overview: FinanceOverview = await get("/finance/overview");

  assert.deepEqual(overview.queues, {
    ready: 25,
    waiting: 4,
    waiting_records: 1,
    waiting_manager: 1,
    waiting_evidence: 1,
    membership_closed: 1,
    clarification: 1,
  });

  const first = await get("/payments?financeQueue=ready"),
    second = await get("/payments?financeQueue=ready&page=2");

  assert.equal(first.total, 25);

  assert.equal(first.items.length, 20);

  assert.equal(second.items.length, 5);

  assert.deepEqual(
    new Set(
      [...first.items, ...second.items].map((x) => {
        return x.id;
      }),
    ),
    new Set(readyIds),
  );

  const work = await get("/operations/customer-work?kind=payments"),
    work2 = await get("/operations/customer-work?kind=payments&page=2");

  assert.equal(work.count, 25);

  assert.deepEqual(
    new Set(
      [...work.results, ...work2.results].map((x) => {
        return x.id;
      }),
    ),
    new Set(readyIds),
  );

  const alerts = await get("/staff/finance-alerts");

  assert.equal(alerts.pendingCount, 25);

  const blocked = await get("/payments?financeQueue=waiting");

  assert.equal(blocked.total, 4);

  const closed = blocked.items.find((x: { id: string }) => {
    return x.id === closedPayment;
  });

  assert.equal(closed.workflow.membershipOpen, false);

  assert.equal("replacementCompletedAt" in closed.client, false);

  assert.equal(first.items[0].workflow.membershipOpen, true);

  assert(
    blocked.items.some((x: { id: string }) => {
      return x.id === closedPayment;
    }),
  );

  for (const queue of financePaymentQueues) {
    assert.equal(
      (await get(`/payments?financeQueue=${queue}`)).total,
      overview.queues[queue],
    );
  }
});

test("queue filtering occurs before pagination and composes with literal search, dates, status and exact IDs", async () => {
  const found = await get(
    "/payments?financeQueue=ready&q=PAGE-24&dateFrom=2049-03-01&dateTo=2049-03-01",
  );

  assert.equal(found.total, 1);

  assert.equal(found.items.length, 1);

  assert.equal((await get("/payments?financeQueue=ready&q=%25")).total, 0);

  assert.equal(
    (await get("/payments?financeQueue=ready&status=VERIFIED")).total,
    0,
  );

  assert.equal(
    (await get(`/payments?id=${blockedPayment}`)).items[0].id,
    blockedPayment,
  );

  assert.equal(
    (await get(`/payments?financeQueue=ready&id=${blockedPayment}`)).total,
    0,
  );

  assert.equal((await get("/payments?financeQueue=ready&page=50")).total, 25);
});

test("manager reassignment, inactive reviewers and changed evidence invalidate readiness without changing credit", async () => {
  const original = await db.batch.findUniqueOrThrow({ where: { id: batchId } });

  const beforeBalance = await get(`/clients/${clientId}/balance`);

  await db.batch.update({
    where: { id: batchId },
    data: { version: { increment: 1 } },
  });

  assert.equal((await get("/finance/overview")).queues.ready, 0);

  await db.batch.update({
    where: { id: batchId },
    data: { version: original.version },
  });

  const reviewed = await db.paymentOperationalReview.findFirstOrThrow({
    where: { paymentId: readyIds[0], stage: "RECORDS" },
  });

  await db.user.update({
    where: { id: reviewed.reviewerId },
    data: { active: false },
  });

  assert.equal((await get("/finance/overview")).queues.ready, 0);

  await db.user.update({
    where: { id: reviewed.reviewerId },
    data: { active: true },
  });

  await db.payment.update({
    where: { id: readyIds[0] },
    data: { evidenceVersion: { increment: 1 } },
  });

  assert.equal((await get("/finance/overview")).queues.ready, 24);

  assert.equal(
    (await get(`/clients/${clientId}/balance`)).verifiedPaid,
    beforeBalance.verifiedPaid,
  );
});

test("a ready payment can be verified once and leaves the dashboard, work queue and alerts together", async () => {
  const id = readyIds[1];

  const before = await get("/finance/overview");

  const current = await db.payment.findUniqueOrThrow({ where: { id } });

  const decide = () => {
    return fetch(`${base}/api/payments/${id}/verify`, {
      method: "POST",
      headers: {
        Origin: origin,
        Cookie: sessions.get("FINANCE_OFFICER")!.cookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        decision: "VERIFIED",
        notes: "Synthetic external payment checked.",
        version: current.version,
      }),
    });
  };

  const response = await decide();

  assert.equal(response.status, 200, await response.clone().text());

  const after = await get("/finance/overview");

  assert.equal(after.queues.ready, before.queues.ready - 1);

  assert.equal(
    (await get("/operations/customer-work?kind=payments")).count,
    after.queues.ready,
  );

  assert.equal(
    (await get("/staff/finance-alerts")).pendingCount,
    after.queues.ready,
  );

  const balance = await get(`/clients/${clientId}/balance`);

  assert.equal((await decide()).status, 409);

  assert.equal(
    (await get(`/clients/${clientId}/balance`)).verifiedPaid,
    balance.verifiedPaid,
  );
});

test("period figures include verified effective credit exactly once and use Manila calendar boundaries", async () => {
  const now = new Date();

  const { from, to } = financePeriod("this_month", now);

  const current = await payment({
    status: "VERIFIED",
    amount: "1000.00",
    date: to,
  });

  await db.paymentAdjustment.createMany({
    data: [
      {
        paymentId: current.id,
        actorId: sessions.get("FINANCE_OFFICER")!.id,
        requestId: randomUUID(),
        sequence: 1,
        paymentVersion: 1,
        amount: "-50.00",
        beforeAmount: "1000.00",
        afterAmount: "950.00",
        reason: "Synthetic correction",
      },
      {
        paymentId: current.id,
        actorId: sessions.get("FINANCE_OFFICER")!.id,
        requestId: randomUUID(),
        sequence: 2,
        paymentVersion: 1,
        amount: "20.00",
        beforeAmount: "950.00",
        afterAmount: "970.00",
        reason: "Synthetic correction",
      },
    ],
  });

  const prior = financePeriod("last_month", now);

  await payment({ status: "VERIFIED", amount: "500.00", date: prior.to });

  await payment({ amount: "9999.00", date: to });

  const overview: FinanceOverview = await get(
    "/finance/overview?period=this_month",
  );

  assert.equal(overview.collections.amount, "970.00");

  assert.equal(overview.collections.payments, 1);

  const matching = await get(
    `/payments?status=VERIFIED&dateFrom=${from.toISOString().slice(0, 10)}&dateTo=${to.toISOString().slice(0, 10)}`,
  );

  assert.equal(matching.total, overview.collections.payments);

  assert.equal(
    (await get("/finance/overview?period=last_month")).collections.amount,
    "500.00",
  );

  assert.equal(
    financePeriod("this_month", new Date("2026-12-31T16:01:00Z"))
      .from.toISOString()
      .slice(0, 10),
    "2027-01-01",
  );

  assert.equal(
    financePeriod("last_month", new Date("2027-01-01T00:01:00Z"))
      .from.toISOString()
      .slice(0, 10),
    "2026-12-01",
  );
});

test("approved refund totals and their drill-down exclude paid, undecided and ineligible cases", async () => {
  const requesterId = sessions.get("CUSTOMER")!.id;

  for (const [status, refundStatus, paid] of [
    ["APPROVED", "APPROVED", "40.00"],
    ["REPLACED", "APPROVED", "100.00"],
    ["REJECTED", "APPROVED", "0.00"],
    ["APPROVED", "PENDING", "0.00"],
  ]) {
    const refundClient = await db.client.create({
      data: {
        batchId,
        name: `Synthetic refund ${randomUUID()}`,
        email: "",
        phone: "",
      },
    });

    const row = await db.withdrawalRequest.create({
      data: {
        clientId: refundClient.id,
        requesterId,
        submissionId: randomUUID(),
        reason: "Synthetic withdrawal test",
        status,
        refundStatus,
        refundAmount: refundStatus === "APPROVED" ? "100.00" : null,
      },
    });

    if (paid !== "0.00") {
      await db.withdrawalPayout.create({
        data: {
          requestId: randomUUID(),
          withdrawalId: row.id,
          amount: paid,
          paymentDate: new Date(),
          method: "GCASH",
          reference: randomUUID(),
          note: "Synthetic external payout",
          recordedById: sessions.get("FINANCE_OFFICER")!.id,
        },
      });
    }
  }

  const overview = await get("/finance/overview");

  assert.deepEqual(overview.refunds, { count: 1, remaining: "60.00" });

  const list = await get("/withdrawals?refund=outstanding");

  assert.equal(list.total, 1);

  assert.equal(list.items[0].refundRemaining, "60.00");
});

test("dashboard task totals include only the signed-in Finance officer's open tasks", async () => {
  for (const [role, status] of [
    ["FINANCE_OFFICER", "TODO"],
    ["FINANCE_OFFICER", "IN_PROGRESS"],
    ["FINANCE_OFFICER", "DONE"],
    ["RECORDS", "TODO"],
  ] as const) {
    await db.task.create({
      data: {
        title: "Synthetic finance task",
        assigneeId: sessions.get(role)!.id,
        creatorId: sessions.get("COO")!.id,
        deadline: new Date(),
        status,
      },
    });
  }

  const overview = await get("/finance/overview");

  assert.equal(overview.tasks.count, 2);

  assert.equal(overview.tasks.items.length, 2);
});

test("readiness query plan is captured for representative fixture scope", async () => {
  const rows =
    await db.$queryRaw`EXPLAIN (FORMAT JSON) SELECT p.id FROM "Payment" p JOIN "Batch" b ON b.id = p."batchId" WHERE ${financeReadySql()}`;

  if (process.env.FINANCE_QUERY_PLAN_FILE) {
    const membershipPlan =
      await db.$queryRaw`EXPLAIN (FORMAT JSON) SELECT p.id FROM "Payment" p JOIN "Client" c ON c.id = p."clientId" WHERE c."batchId" = ${batchId}::uuid AND p.status = 'VERIFIED' ORDER BY p."createdAt" DESC, p.id DESC LIMIT 20`;

    writeFileSync(
      process.env.FINANCE_QUERY_PLAN_FILE.replace(".json", "-membership.json"),
      JSON.stringify(membershipPlan, null, 2),
    );

    writeFileSync(
      process.env.FINANCE_QUERY_PLAN_FILE,
      JSON.stringify(rows, null, 2),
    );
  }

  assert(Array.isArray(rows));
});

test("Finance sorting orders every matching eligible record before pagination in both directions", async () => {
  const early = await payment({
    ready: true,
    reference: "PAGE-PHASE2-EARLY",
    date: new Date("2049-02-28"),
  });

  const late = await payment({
    ready: true,
    reference: "PAGE-PHASE2-LATE",
    date: new Date("2049-03-02"),
  });

  const ids = [...readyIds.slice(2), early.id, late.id];

  for (const sortBy of ["clientName", "paymentDate", "createdAt"] as const) {
    for (const direction of ["asc", "desc"] as const) {
      const order =
        sortBy === "clientName"
          ? { client: { name: direction } }
          : { [sortBy]: direction };

      const expected = await db.payment.findMany({
        where: { id: { in: ids } },
        orderBy: [order, { id: direction }],
        select: { id: true },
      });

      const query = `/payments?financeQueue=ready&q=PAGE-&sortBy=${sortBy}&sortDirection=${direction}`;

      const first = await get(query),
        second = await get(query + "&page=2");

      assert.equal(first.total, ids.length);

      assert.deepEqual(
        [...first.items, ...second.items].map((row) => {
          return row.id;
        }),
        expected.map((row) => {
          return row.id;
        }),
      );
    }
  }

  assert.equal(
    (await request("FINANCE_OFFICER", "/payments?sortBy=effectiveAmount"))
      .status,
    400,
  );
});

test("Finance operational documents use authoritative verified credit and never confirm a pending claim", async () => {
  const statement = await get(`/clients/${clientId}/statement`);

  const balance = await get(`/clients/${clientId}/balance`);

  assert.equal(statement.officialTaxInvoice, false);

  assert.match(statement.notice, /not an official BIR/i);

  assert.equal(statement.balance.verifiedPaid, balance.verifiedPaid);

  const expected = await db.payment.findMany({
    where: { clientId, status: "VERIFIED" },
    select: { id: true },
  });

  assert.deepEqual(
    new Set(
      statement.verifiedPayments.map((row: { id: string }) => {
        return row.id;
      }),
    ),
    new Set(
      expected.map((row) => {
        return row.id;
      }),
    ),
  );

  const confirmation = await get(`/payments/${readyIds[1]}/confirmation`);

  assert.equal(confirmation.payment.id, readyIds[1]);

  assert.equal(confirmation.payment.status, "VERIFIED");

  assert.equal(confirmation.officialTaxInvoice, false);

  assert.equal(
    (await request("FINANCE_OFFICER", `/payments/${readyIds[2]}/confirmation`))
      .status,
    404,
  );

  assert.equal(
    (await request(null, `/clients/${clientId}/statement`)).status,
    401,
  );
});

test("Finance alerts open the exact payment and read receipts remain personal and scope-specific", async () => {
  const before = await get("/staff/alerts?scope=finance");

  const alert = before.items.find(
    (row: { entity: string; readAt: string | null }) => {
      return row.entity === "payment" && !row.readAt;
    },
  );

  assert(alert);

  assert.equal(
    new URL(alert.targetPath, base).searchParams.get("payment"),
    alert.id,
  );

  const exact = await get(`/payments?id=${alert.id}`);

  assert.equal(exact.items[0].id, alert.id);

  const read = await fetch(`${base}/api/staff/alerts/${alert.id}/read`, {
    method: "POST",
    headers: {
      Origin: origin,
      Cookie: sessions.get("FINANCE_OFFICER")!.cookie,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ entity: "payment", version: alert.version }),
  });

  assert.equal(read.status, 200, await read.clone().text());

  const after = await get("/staff/alerts?scope=finance");

  assert.equal(after.filteredUnreadCount, before.filteredUnreadCount - 1);

  const allRows = [
    ...after.items,
    ...(await get("/staff/alerts?scope=finance&page=2")).items,
  ];

  assert(
    allRows.find((row: { id: string; readAt: string | null }) => {
      return row.id === alert.id;
    })?.readAt,
  );

  const ownTasks = await get("/staff/alerts?scope=tasks");

  const all = await fetch(`${base}/api/staff/alerts/read-all`, {
    method: "POST",
    headers: {
      Origin: origin,
      Cookie: sessions.get("FINANCE_OFFICER")!.cookie,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ scope: "finance" }),
  });

  assert.equal(all.status, 200, await all.clone().text());

  assert.equal(
    (await get("/staff/alerts?scope=finance")).filteredUnreadCount,
    0,
  );

  assert.equal(
    (await get("/staff/alerts?scope=tasks")).filteredUnreadCount,
    ownTasks.filteredUnreadCount,
  );
});
