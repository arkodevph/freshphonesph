import "reflect-metadata";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import type { Role, WithdrawalCase } from "@freshphones/contracts";
import { createApp } from "../src/app";
import { Database } from "../src/database";
import { hashPassword } from "../src/auth/password";
import type { Config } from "../src/config";
import { collections } from "../src/reports/collections";
import { installmentEarnings } from "../src/reports/installment-earnings";

const databaseUrl = process.env.TEST_DATABASE_URL;

if (
  !databaseUrl ||
  !["localhost", "127.0.0.1", "[::1]"].includes(
    new URL(databaseUrl).hostname,
  ) ||
  !new URL(databaseUrl).pathname.endsWith("_test")
) {
  throw new Error(
    "Withdrawal checks require an isolated local _test database.",
  );
}

const origin = "http://localhost:3100";

const suffix = randomUUID().slice(0, 8);

const password = "Synthetic-withdrawal-password-123!";

const users = new Map<string, { id: string; cookie: string }>();

const apps: INestApplication[] = [];

const bases: string[] = [];

let db: Database;

let passwordHash: string;

let agentId: string;

let otherAgentId: string;

let serial = 0;

function request(
  key: string,
  path: string,
  body?: unknown,
  membership?: string,
  server = 0,
) {
  return fetch(`${bases[server]}/api${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Origin: origin,
      Cookie: users.get(key)?.cookie ?? "",
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(membership ? { "X-Membership-Id": membership } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

async function checked(response: Promise<Response>, status = 200) {
  const result = await response;

  assert.equal(result.status, status, await result.clone().text());

  return result.json();
}

async function identity(key: string, role: Role, extra: object = {}) {
  const email = `withdrawal-${key.toLowerCase()}-${suffix}@example.test`;

  const user = await db.user.create({
    data: { name: `Synthetic ${key}`, email, role, passwordHash, ...extra },
  });

  const login = await request("", "/auth/login", { email, password });

  assert.equal(login.status, 200, await login.clone().text());

  users.set(key, {
    id: user.id,
    cookie: login.headers
      .getSetCookie()
      .map((cookie) => {
        return cookie.split(";")[0];
      })
      .join("; "),
  });

  return user;
}

async function fixture(paid = "20.00", full = false) {
  const number = ++serial;

  const batch = await db.batch.create({
    data: {
      code: `WITHDRAWAL-${suffix}-${number}`,
      model: "Synthetic phone",
      status: "ACTIVE",
      startDate: new Date("2028-01-01"),
      endDate: new Date("2028-03-15"),
      contractPrice: "100.00",
      installmentCount: 4,
      cadence: "SEMIMONTHLY",
      firstDueDate: new Date("2028-01-31"),
      monthEnd: false,
      agentId,
      managerId: users.get("MANAGER")!.id,
      handlerId: users.get("HANDLER")!.id,
    },
  });

  const source = await db.client.create({
    data: {
      name: `Departing member ${number}`,
      email: `source-${number}-${suffix}@example.test`,
      phone: "+639170000000",
      batchId: batch.id,
      joinedAt: new Date("2028-01-01"),
      schedule: {
        create: ["2028-01-31", "2028-02-15", "2028-02-29", "2028-03-15"].map(
          (date, index) => {
            return {
              sequenceNo: index + 1,
              dueDate: new Date(date),
              expectedAmount: "25.00",
            };
          },
        ),
      },
    },
    include: { schedule: { orderBy: { sequenceNo: "asc" } } },
  });

  const key = `MEMBER_${number}`;

  await identity(key, "CUSTOMER", { clientId: source.id });

  if (paid !== "0.00") {
    await payment(source.id, batch.id, paid, "VERIFIED");
  }

  if (full) {
    for (let index = 0; index < 7; index++) {
      await db.client.create({
        data: {
          name: `Other member ${number}-${index}`,
          email: "",
          phone: "+639170000001",
          batchId: batch.id,
        },
      });
    }
  }

  return { key, batch, source };
}

async function payment(
  clientId: string,
  batchId: string,
  amount: string,
  status: "VERIFIED" | "PENDING" | "NEEDS_CLARIFICATION",
) {
  return db.payment.create({
    data: {
      clientId,
      batchId,
      amount,
      paymentDate: new Date("2026-10-01"),
      method: "CASH",
      status,
      recordedById: users.get("HANDLER")!.id,
      ...(status === "VERIFIED"
        ? { verifierId: users.get("FINANCE")!.id, verifiedAt: new Date() }
        : {}),
    },
  });
}

async function submit(
  f: Awaited<ReturnType<typeof fixture>>,
  reason = "I need to withdraw because my circumstances changed.",
) {
  return checked(
    request(f.key, "/withdrawals", {
      submissionId: randomUUID(),
      clientId: f.source.id,
      reason,
    }),
    201,
  ) as Promise<WithdrawalCase>;
}

async function approve(f: Awaited<ReturnType<typeof fixture>>) {
  let row = await submit(f);

  row = await checked(
    request("AGENT", `/withdrawals/${row.id}/forward`, {
      version: row.version,
      note: "Agent's internal review confirms the circumstances.",
    }),
  );

  return checked(
    request("COO", `/withdrawals/${row.id}/decision`, {
      version: row.version,
      decision: "APPROVED",
      note: "Withdrawal approved; installments continue pending replacement.",
    }),
  ) as Promise<WithdrawalCase>;
}

async function terms(row: WithdrawalCase, restart = false) {
  return checked(
    request("COO", `/withdrawals/${row.id}/policy`, {
      version: row.version,
      mode: restart ? "RESTART" : "CONTINUE_UNPAID",
      consultationNote:
        "Discussed the financial position and replacement treatment with the CEO.",
      note: "Agreed replacement terms after consultation.",
      ...(restart
        ? {
            contractPrice: "240.00",
            installmentCount: 3,
            cadence: "MONTHLY",
            startDate: "2028-02-01",
            firstDueDate: "2028-02-29",
            monthEnd: true,
          }
        : {}),
    }),
  ) as Promise<WithdrawalCase>;
}

function proposal(row: WithdrawalCase) {
  const number = ++serial;

  return {
    version: row.version,
    submissionId: randomUUID(),
    name: `Replacement member ${number}`,
    email: `replacement-${number}-${suffix}@example.test`,
    phone: "+639170000002",
  };
}

async function propose(row: WithdrawalCase) {
  const input = proposal(row);

  return {
    row: (await checked(
      request("AGENT", `/withdrawals/${row.id}/replacement-request`, input),
      201,
    )) as WithdrawalCase,
    input,
  };
}

async function admit(row: WithdrawalCase, server = 0) {
  return checked(
    request(
      "MANAGER",
      `/enrollment/requests/${row.replacementEnrollmentId}/review`,
      {
        version: 1,
        decision: "APPROVED",
        reason:
          "Manager reviewed replacement enrollment and approved admission.",
      },
      undefined,
      server,
    ),
    201,
  );
}

before(async () => {
  const config = {
    NODE_ENV: "test",
    PORT: 4100,
    HOST: "127.0.0.1",
    DATABASE_URL: databaseUrl,
    WEB_ORIGIN: origin,
    JWT_SECRET: "withdrawal-isolated-test-secret-with-32-characters",
    LOCAL_DEMO_AUTH: false,
    EMAIL_FROM: "synthetic@example.test",
    CUSTOMER_REMINDER_DAYS_BEFORE: "",
    PRIVATE_STORAGE_PROVIDER: "local",
    PRIVATE_STORAGE_S3_REGION: "ap-southeast-1",
    ABUSE_LIMITS: {
      expensive: [[10000, 60]],
      auth: [[10000, 60]],
      accountWrite: [[10000, 60]],
      read: [[10000, 60]],
    },
  } as Config;

  for (let index = 0; index < 2; index++) {
    const app = await createApp(config);

    await app.listen(0, "127.0.0.1");

    apps.push(app);

    bases.push(await app.getUrl());
  }

  db = apps[0].get(Database);

  passwordHash = await hashPassword(password);

  for (const [key, role] of [
    ["COO", "COO"],
    ["MANAGER", "BATCH_MANAGER"],
    ["OTHER_MANAGER", "BATCH_MANAGER"],
    ["HANDLER", "BATCH_HANDLER"],
    ["FINANCE", "FINANCE_OFFICER"],
    ["CEO", "CEO"],
    ["ADMIN", "SYSTEM_ADMIN"],
  ] as const) {
    await identity(key, role);
  }

  agentId = (
    await db.agent.create({
      data: { name: "Current Agent", code: `W-${suffix}` },
    })
  ).id;

  otherAgentId = (
    await db.agent.create({
      data: { name: "Other Agent", code: `WO-${suffix}` },
    })
  ).id;

  await identity("AGENT", "AGENT", { agentProfileId: agentId });

  await identity("OTHER_AGENT", "AGENT", { agentProfileId: otherAgentId });
});

after(async () => {
  for (const app of apps) {
    await app.close();
  }
});

test("member submission is membership-scoped and idempotent; only assigned Agent can forward before COO decision", async () => {
  const f = await fixture();

  const other = await fixture();

  const input = {
    submissionId: randomUUID(),
    clientId: f.source.id,
    reason: "I need to withdraw for personal circumstances.",
  };

  let row: WithdrawalCase = await checked(
    request(f.key, "/withdrawals", input),
    201,
  );

  assert.equal(
    (await checked(request(f.key, "/withdrawals", input), 201)).id,
    row.id,
  );

  assert.equal(
    (
      await request(f.key, "/withdrawals", {
        ...input,
        submissionId: randomUUID(),
      })
    ).status,
    409,
  );

  assert.equal(
    (await request(other.key, `/withdrawals/${row.id}`)).status,
    404,
  );

  assert.equal(
    (await request(f.key, `/withdrawals/${row.id}`, undefined, other.source.id))
      .status,
    404,
  );

  assert.equal(
    (
      await request("OTHER_AGENT", `/withdrawals/${row.id}/forward`, {
        version: row.version,
        note: "Cannot review another Agent's member.",
      })
    ).status,
    404,
  );

  assert.equal(
    (
      await request("COO", `/withdrawals/${row.id}/decision`, {
        version: row.version,
        decision: "APPROVED",
        note: "Too early to decide.",
      })
    ).status,
    409,
  );

  for (const key of ["CEO", "FINANCE", "ADMIN", "MANAGER"]) {
    assert.equal(
      (
        await request(key, `/withdrawals/${row.id}/forward`, {
          version: row.version,
          note: "Unauthorized forwarding attempt.",
        })
      ).status,
      403,
    );
  }

  row = await checked(
    request("AGENT", `/withdrawals/${row.id}/forward`, {
      version: row.version,
      note: "Internal Agent details are private.",
    }),
  );

  const customer = await checked(request(f.key, `/withdrawals/${row.id}`));

  assert.equal(customer.agentNote, null);

  assert.ok(!JSON.stringify(customer).includes("Internal Agent details"));

  assert.equal(
    (
      await request("AGENT", `/withdrawals/${row.id}/decision`, {
        version: row.version,
        decision: "APPROVED",
        note: "Agent cannot approve.",
      })
    ).status,
    403,
  );

  const listed = await checked(
    request(
      "AGENT",
      "/withdrawals?q=" + encodeURIComponent(f.batch.code.toLowerCase()),
    ),
  );

  assert.equal(listed.total, 1);
});

test("clarification returns through Agent review, stale drafts conflict and cancellation preserves prior events", async () => {
  const f = await fixture();

  let row = await submit(f);

  const firstVersion = row.version;

  row = await checked(
    request("AGENT", `/withdrawals/${row.id}/forward`, {
      version: row.version,
      note: "Please review the request.",
    }),
  );

  assert.equal(
    (
      await request(f.key, `/withdrawals/${row.id}/cancel`, {
        version: row.version,
        note: "Cannot cancel COO review.",
      })
    ).status,
    409,
  );

  row = await checked(
    request("COO", `/withdrawals/${row.id}/decision`, {
      version: row.version,
      decision: "CHANGES_REQUESTED",
      note: "Please explain the changed circumstances.",
    }),
  );

  assert.equal(
    (
      await request(f.key, `/withdrawals/${row.id}/resubmit`, {
        version: firstVersion,
        reason: "A stale explanation must remain unsaved.",
      })
    ).status,
    409,
  );

  row = await checked(
    request(f.key, `/withdrawals/${row.id}/resubmit`, {
      version: row.version,
      reason: "Updated circumstances require withdrawal from this membership.",
    }),
  );

  assert.equal(row.status, "AWAITING_AGENT");

  assert.equal(row.agentNote, null);

  row = await checked(
    request(f.key, `/withdrawals/${row.id}/cancel`, {
      version: row.version,
      note: "I will continue my membership.",
    }),
  );

  assert.equal(row.status, "CANCELLED");

  assert.ok(
    row.events.some((event) => {
      return event.action === "changes_requested";
    }),
  );

  assert.equal((await submit(f)).status, "AWAITING_AGENT");
});

test("approval leaves dues and full capacity unchanged; continuing replacement releases only unpaid credit atomically", async () => {
  const f = await fixture("20.00", true);

  const before = f.source.schedule.map((item) => {
    return [item.id, item.expectedAmount.toFixed(2)];
  });

  const incomingBefore = await db.payment.findMany({
    where: { clientId: f.source.id },
  });

  let row = await approve(f);

  assert.equal(row.refundAmount, null);

  assert.equal(row.refundTargetDate, null);

  assert.equal(row.duesContinue, true);

  assert.equal(row.financial.remaining, "80.00");

  assert.equal(
    await db.client.count({
      where: { batchId: f.batch.id, replacementCompletedAt: null },
    }),
    8,
  );

  const queued = await db.notification.create({
    data: {
      userId: users.get(f.key)!.id,
      kind: "installment",
      title: "Due",
      message: "Remaining scheduled amount: PHP 5.00.",
      dedupeKey: `installment:${f.source.schedule[0].id}:0`,
    },
  });

  const sent = await db.notification.create({
    data: {
      userId: users.get(f.key)!.id,
      kind: "installment",
      title: "Prior delivery",
      message: "Prior installment notice",
      dedupeKey: `installment:${f.source.schedule[0].id}:1`,
      emailStatus: "SENT",
    },
  });

  row = await terms(row);

  const preview = await checked(
    request("MANAGER", `/withdrawals/${row.id}/replacement-preview`),
  );

  assert.deepEqual(
    preview.items.map((item: { expectedAmount: string }) => {
      return item.expectedAmount;
    }),
    ["5.00", "25.00", "25.00", "25.00"],
  );

  const proposed = await propose(row);

  row = proposed.row;

  assert.equal(
    (
      await checked(
        request(
          "AGENT",
          `/withdrawals/${row.id}/replacement-request`,
          proposed.input,
        ),
        201,
      )
    ).replacementEnrollmentId,
    row.replacementEnrollmentId,
  );

  assert.equal(
    (
      await request(
        "OTHER_MANAGER",
        `/enrollment/requests/${row.replacementEnrollmentId}/review`,
        {
          version: 1,
          decision: "APPROVED",
          reason: "Unassigned manager cannot admit.",
        },
      )
    ).status,
    404,
  );

  const admitted = await admit(row);

  assert.equal((await admit(row, 1)).clientId, admitted.clientId);

  const closed = await checked(request(f.key, `/withdrawals/${row.id}`));

  assert.equal(closed.status, "REPLACED");

  assert.equal(closed.duesContinue, false);

  assert.equal(closed.financial.totalDue, "20.00");

  assert.equal(closed.financial.verifiedPaid, "20.00");

  assert.equal(closed.financial.remaining, "0.00");

  assert.equal(closed.consultationNote, null);

  assert.equal(closed.replacementClientId, null);

  assert.equal(closed.replacementEnrollmentId, null);

  assert.equal(await db.client.count({ where: { batchId: f.batch.id } }), 9);

  const occupancy = await checked(request(f.key, "/portal/batch-summary"));

  assert.equal(occupancy.approvedMembers, 8);

  const after = await db.scheduleItem.findMany({
    where: { clientId: f.source.id },
    orderBy: { sequenceNo: "asc" },
  });

  assert.deepEqual(
    after.map((item) => {
      return [item.id, item.expectedAmount.toFixed(2)];
    }),
    before,
  );

  assert.deepEqual(
    after.map((item) => {
      return item.releasedAmount.toFixed(2);
    }),
    ["5.00", "25.00", "25.00", "25.00"],
  );

  assert.equal(
    await db.withdrawalScheduleRelease.count({
      where: { withdrawalId: row.id },
    }),
    4,
  );

  assert.deepEqual(
    await db.payment.findMany({ where: { clientId: f.source.id } }),
    incomingBefore,
  );

  const newBalance = await checked(
    request("FINANCE", `/clients/${admitted.clientId}/balance`),
  );

  assert.equal(newBalance.totalDue, "80.00");

  assert.equal(newBalance.verifiedPaid, "0.00");

  const report = await db.$transaction((tx) => {
    return collections(tx, { batchId: f.batch.id });
  });

  assert.equal(report.totals.agreedAmount, "100.00");

  assert.equal(report.totals.verifiedAmount, "20.00");

  assert.equal(report.totals.remainingBalance, "80.00");

  assert.equal(
    (await db.notification.findUniqueOrThrow({ where: { id: queued.id } }))
      .emailStatus,
    "SKIPPED",
  );

  assert.equal(
    (await db.notification.findUniqueOrThrow({ where: { id: sent.id } }))
      .emailStatus,
    "SENT",
  );

  const oldBalance = await checked(
    request(f.key, `/clients/${f.source.id}/balance`),
  );

  assert.equal(oldBalance.remainingBalance, "0.00");

  assert.equal(
    (
      await request("HANDLER", "/payments", {
        clientId: f.source.id,
        amount: "1.00",
        paymentDate: "2026-10-01",
        method: "CASH",
        referenceNumber: "POST-HANDOVER",
        notes: "Must remain read-only.",
      })
    ).status,
    409,
  );
});

test("restart gives the replacement its own leap-year plan and keeps original dates and gross receipts", async () => {
  const f = await fixture("30.00");

  const row = (await propose(await terms(await approve(f), true))).row;

  const admitted = await admit(row);

  const replacement = await db.client.findUniqueOrThrow({
    where: { id: admitted.clientId },
    include: { schedule: { orderBy: { sequenceNo: "asc" } } },
  });

  assert.deepEqual(
    replacement.schedule.map((item) => {
      return item.dueDate.toISOString().slice(0, 10);
    }),
    ["2028-02-29", "2028-03-31", "2028-04-30"],
  );

  assert.deepEqual(
    replacement.schedule.map((item) => {
      return item.expectedAmount.toFixed(2);
    }),
    ["80.00", "80.00", "80.00"],
  );

  const plan = replacement.membershipPlan as {
    contractPrice: string;
    endDate: string;
  };

  assert.equal(plan.contractPrice, "240.00");

  assert.equal(plan.endDate, "2028-04-30");

  const dto = await checked(request("MANAGER", `/clients/${replacement.id}`));

  assert.equal(dto.membershipPlan.contractPrice, "240.00");

  const batch = await db.batch.findUniqueOrThrow({ where: { id: f.batch.id } });

  assert.equal(batch.contractPrice?.toFixed(2), "100.00");

  assert.equal(batch.endDate.toISOString().slice(0, 10), "2028-03-15");

  assert.equal(
    await db.payment.count({ where: { clientId: replacement.id } }),
    0,
  );

  assert.equal(
    await db.withdrawalScheduleRelease.count({
      where: { withdrawalId: row.id, destinationScheduleItemId: { not: null } },
    }),
    0,
  );

  const earnings = await db.$transaction((tx) => {
    return installmentEarnings(tx, {
      year: 2028,
      frequency: "MONTHLY",
      period: 4,
      batchId: f.batch.id,
      groupBy: "batches",
      page: 1,
    });
  });

  assert.equal(earnings.totals.scheduledAmount, "80.00");
});

test("pending claims and changed paid credit block cutover until COO refreshes terms; current assignments remain enforced", async () => {
  const f = await fixture();

  let row = await approve(f);

  const pending = await payment(
    f.source.id,
    f.batch.id,
    "2.00",
    "NEEDS_CLARIFICATION",
  );

  assert.equal(
    (
      await request("COO", `/withdrawals/${row.id}/policy`, {
        version: row.version,
        mode: "CONTINUE_UNPAID",
        consultationNote: "Discussed with CEO.",
        note: "Cannot save with pending claims.",
      })
    ).status,
    409,
  );

  await db.payment.update({
    where: { id: pending.id },
    data: { status: "REJECTED" },
  });

  row = (await propose(await terms(row))).row;

  await payment(f.source.id, f.batch.id, "1.00", "VERIFIED");

  const stale = await request(
    "MANAGER",
    `/enrollment/requests/${row.replacementEnrollmentId}/review`,
    {
      version: 1,
      decision: "APPROVED",
      reason: "Attempt stale financial terms.",
    },
  );

  assert.equal(stale.status, 409);

  assert.equal(
    await db.withdrawalScheduleRelease.count({
      where: { withdrawalId: row.id },
    }),
    0,
  );

  row = await terms(row);

  const previous = await db.enrollmentRequest.findUniqueOrThrow({
    where: { id: row.replacementEnrollmentId! },
  });

  assert.equal(previous.status, "REJECTED");

  row = (await propose(row)).row;

  await db.batch.update({
    where: { id: f.batch.id },
    data: { agentId: otherAgentId },
  });

  assert.equal((await request("AGENT", `/withdrawals/${row.id}`)).status, 404);

  assert.equal(
    (
      await request(
        "MANAGER",
        `/enrollment/requests/${row.replacementEnrollmentId}/review`,
        {
          version: 1,
          decision: "APPROVED",
          reason: "Old Agent lost assignment.",
        },
      )
    ).status,
    409,
  );

  assert.equal(
    (await db.client.findUniqueOrThrow({ where: { id: f.source.id } }))
      .replacementCompletedAt,
    null,
  );
});

test("refund decisions are separate; Finance external partial payouts are idempotent, bounded and leave incoming balances untouched", async () => {
  const f = await fixture();

  let row = await approve(f);

  assert.equal(row.refundRemaining, null);

  assert.equal(
    (
      await request("FINANCE", `/withdrawals/${row.id}/payout`, {
        version: row.version,
        requestId: randomUUID(),
        amount: "1.00",
        paymentDate: "2026-10-01",
        method: "GCASH",
        reference: "NOT-APPROVED",
        note: "No refund amount approved.",
      })
    ).status,
    409,
  );

  row = await checked(
    request("COO", `/withdrawals/${row.id}/refund`, {
      version: row.version,
      decision: "APPROVED",
      amount: "15.00",
      targetDate: null,
      note: "Approved discretionary amount based on financial position.",
    }),
  );

  assert.equal(row.refundTargetDate, null);

  const body = {
    version: row.version,
    requestId: randomUUID(),
    amount: "5.00",
    paymentDate: "2026-10-01",
    method: "gcash",
    reference: `refund-${suffix}-${++serial}`,
    note: "Recorded actual external refund transfer.",
  };

  for (const key of ["COO", "AGENT", "ADMIN", "MANAGER", "CEO", f.key]) {
    assert.equal(
      (await request(key, `/withdrawals/${row.id}/payout`, body)).status,
      403,
    );
  }

  row = await checked(
    request("FINANCE", `/withdrawals/${row.id}/payout`, body),
  );

  assert.equal(row.refundPaid, "5.00");

  assert.equal(row.refundRemaining, "10.00");

  assert.equal(
    (await checked(request("FINANCE", `/withdrawals/${row.id}/payout`, body)))
      .refundPaid,
    "5.00",
  );

  assert.equal(
    (
      await request("FINANCE", `/withdrawals/${row.id}/payout`, {
        ...body,
        version: row.version,
        requestId: randomUUID(),
        method: "GCASH",
        reference: body.reference.toUpperCase(),
      })
    ).status,
    409,
  );

  assert.equal(
    (
      await request("FINANCE", `/withdrawals/${row.id}/payout`, {
        ...body,
        version: row.version,
        requestId: randomUUID(),
        amount: "10.01",
        reference: randomUUID(),
      })
    ).status,
    409,
  );

  assert.equal(
    (
      await request("COO", `/withdrawals/${row.id}/refund`, {
        version: row.version,
        decision: "APPROVED",
        amount: "4.00",
        targetDate: null,
        note: "Cannot reduce below payout.",
      })
    ).status,
    409,
  );

  const balance = await checked(
    request(f.key, `/clients/${f.source.id}/balance`),
  );

  assert.equal(balance.verifiedPaid, "20.00");

  assert.equal(balance.remainingBalance, "80.00");

  assert.equal(await db.payment.count({ where: { clientId: f.source.id } }), 1);
});

test("two API instances cannot pay beyond the approved refund or duplicate the replacement swap", async () => {
  const f = await fixture("0.00", true);

  let row = await approve(f);

  row = await checked(
    request("COO", `/withdrawals/${row.id}/refund`, {
      version: row.version,
      decision: "APPROVED",
      amount: "10.00",
      targetDate: null,
      note: "Approved amount for concurrency boundary.",
    }),
  );

  const payout = (server: number) => {
    return request(
      "FINANCE",
      `/withdrawals/${row.id}/payout`,
      {
        version: row.version,
        requestId: randomUUID(),
        amount: "7.00",
        paymentDate: "2026-10-01",
        method: "CASH",
        reference: randomUUID(),
        note: "Actual external payment recorded.",
      },
      undefined,
      server,
    );
  };

  const payouts = await Promise.all([payout(0), payout(1)]);

  assert.deepEqual(
    payouts
      .map((response) => {
        return response.status;
      })
      .sort(),
    [200, 409],
  );

  row = await checked(request("COO", `/withdrawals/${row.id}`));

  row = (await propose(await terms(row))).row;

  const [a, b] = await Promise.all([admit(row, 0), admit(row, 1)]);

  assert.equal(a.clientId, b.clientId);

  assert.equal(await db.client.count({ where: { batchId: f.batch.id } }), 9);

  assert.equal(
    await db.client.count({
      where: { batchId: f.batch.id, replacementCompletedAt: null },
    }),
    8,
  );

  assert.equal(
    await db.withdrawalScheduleRelease.count({
      where: { withdrawalId: row.id },
    }),
    4,
  );

  const ordinary = await request("MANAGER", "/clients", {
    name: "Ninth ordinary member",
    email: "",
    phone: "+639170000003",
    batchId: f.batch.id,
    status: "ACTIVE",
    releaseStatus: "NOT_READY",
  });

  assert.equal(ordinary.status, 409);
});
