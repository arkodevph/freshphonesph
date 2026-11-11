import "reflect-metadata";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import type { MonitorItem, MonitorPage, Role } from "@freshphones/contracts";
import { createApp } from "../src/app";
import { Database } from "../src/database";
import { monitorRows } from "../src/operations-monitor/monitor-query";
import { safeUser } from "../src/auth/auth.service";
import { hashPassword } from "../src/auth/password";
import type { Config } from "../src/config";

const databaseUrl = process.env.TEST_DATABASE_URL;

if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith("_test")) {
  throw new Error("A dedicated TEST_DATABASE_URL ending in _test is required.");
}

const origin = "http://localhost:3100";

const suffix = randomUUID().slice(0, 8);

const sessions = new Map<string, { id: string; cookie: string }>();

let app: INestApplication;

let db: Database;

let base: string;

let batchId: string;

let clientId: string;

let paymentId: string;

let historyId: string;

const request = (role: string, path: string, body?: unknown) => {
  return fetch(`${base}/api${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Origin: origin,
      Cookie: sessions.get(role)?.cookie ?? "",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
};

const list = async (role = "COO", query = ""): Promise<MonitorPage> => {
  const response = await request(
    role,
    `/operations/monitor?batchId=${batchId}${query}`,
  );

  assert.equal(response.status, 200, await response.clone().text());

  return response.json();
};

const item = async (): Promise<MonitorItem> => {
  const response = await request(
    "COO",
    `/operations/monitor/PAYMENT/${paymentId}`,
  );

  assert.equal(response.status, 200);

  return (await response.json()).item;
};

const follow = async (body: Record<string, unknown>) => {
  const current = await item();

  return request("COO", `/operations/monitor/PAYMENT/${paymentId}/follow-up`, {
    sourceVersion: current.sourceVersion,
    version: current.followUp?.version ?? 0,
    status: "OPEN",
    note: "Request evidence from assigned staff",
    dueAt: null,
    ...body,
  });
};

before(async () => {
  app = await createApp({
    NODE_ENV: "test",
    PORT: 4100,
    HOST: "127.0.0.1",
    DATABASE_URL: databaseUrl,
    WEB_ORIGIN: origin,
    JWT_SECRET: "monitor-test-secret-longer-than-32-characters",
    EMAIL_FROM: "test@example.test",
    CUSTOMER_REMINDER_DAYS_BEFORE: "",
    PRIVATE_STORAGE_PROVIDER: "local",
    PRIVATE_STORAGE_S3_REGION: "ap-southeast-1",
  } as Config);

  await app.listen(0, "127.0.0.1");

  base = await app.getUrl();

  db = app.get(Database);

  const password = "Monitor-test-password-123!";

  const passwordHash = await hashPassword(password);

  await db.loginAttempt.deleteMany();

  for (const role of [
    "COO",
    "SYSTEM_ADMIN",
    "OPERATIONS_COORDINATOR",
    "RECORDS",
    "FINANCE_OFFICER",
    "CEO",
    "BATCH_HANDLER",
    "BATCH_MANAGER",
    "AGENT",
    "PIONEER_AGENT",
  ] as Role[]) {
    const user = await db.user.create({
      data: {
        name: `Monitor ${role}`,
        email: `monitor-${role.toLowerCase()}-${suffix}@example.test`,
        passwordHash,
        role,
      },
    });

    const login = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email, password }),
    });

    assert.equal(login.status, 200, await login.clone().text());

    sessions.set(role, {
      id: user.id,
      cookie: login.headers
        .getSetCookie()
        .map((c) => {
          return c.split(";")[0];
        })
        .join("; "),
    });
  }

  const agent = await db.agent.create({
    data: {
      name: "Monitor agent",
      code: `M-${suffix}`,
    },
  });

  await db.user.update({
    where: { id: sessions.get("AGENT")!.id },
    data: {
      agentProfileId: agent.id,
      supervisorId: sessions.get("PIONEER_AGENT")!.id,
    },
  });

  await db.user.update({
    where: { id: sessions.get("PIONEER_AGENT")!.id },
    data: { supervisorId: sessions.get("OPERATIONS_COORDINATOR")!.id },
  });

  const batch = await db.batch.create({
    data: {
      code: `MON-${suffix}`,
      model: "Test",
      startDate: new Date("2049-01-01"),
      endDate: new Date("2049-12-31"),
      managerId: sessions.get("BATCH_MANAGER")!.id,
      handlerId: sessions.get("BATCH_HANDLER")!.id,
      agentId: agent.id,
    },
  });

  batchId = batch.id;

  clientId = (
    await db.client.create({
      data: {
        batchId,
        name: "PRIVATE CUSTOMER",
        email: `private-${suffix}@example.test`,
        phone: "PRIVATE PHONE",
      },
    })
  ).id;

  paymentId = (
    await db.payment.create({
      data: {
        batchId,
        clientId,
        amount: "9876.54",
        method: "GCash",
        referenceNumber: "PRIVATE REFERENCE",
        paymentDate: new Date("2049-01-01"),
        recordedById: sessions.get("BATCH_HANDLER")!.id,
      },
    })
  ).id;

  historyId = (
    await db.gcashHistory.create({
      data: {
        batchId,
        periodStart: new Date("2049-01-01"),
        periodEnd: new Date("2049-01-31"),
        submissions: {
          create: {
            revision: 1,
            uploadedBy: {
              connect: { id: sessions.get("BATCH_HANDLER")!.id },
            },
            file: {
              create: {
                storageKey: randomUUID(),
                originalName: "statement.pdf",
                mimeType: "application/pdf",
                size: 8,
                uploadedById: sessions.get("BATCH_HANDLER")!.id,
              },
            },
          },
        },
      },
    })
  ).id;
});

after(async () => {
  await app?.close();
});

test("only operations roles enter; coordinator sees its network and no financial/customer fields", async () => {
  for (const role of [
    "CEO",
    "RECORDS",
    "FINANCE_OFFICER",
    "BATCH_HANDLER",
    "BATCH_MANAGER",
    "AGENT",
    "PIONEER_AGENT",
  ]) {
    assert.equal(
      (await request(role, "/operations/monitor")).status,
      403,
      role,
    );
  }

  assert.equal((await request("", "/operations/monitor")).status, 401);

  const page = await list("OPERATIONS_COORDINATOR");

  assert.equal(page.total, 2);

  for (const row of page.items) {
    assert.equal(row.href, null);
  }

  const wire = JSON.stringify(page);

  for (const privateValue of [
    "9876.54",
    "PRIVATE CUSTOMER",
    "PRIVATE PHONE",
    "PRIVATE REFERENCE",
    "clientId",
    "proofFileId",
    "amount",
  ]) {
    assert(!wire.includes(privateValue), privateValue);
  }

  await db.user.update({
    where: { id: sessions.get("PIONEER_AGENT")!.id },
    data: { supervisorId: null },
  });

  assert.equal((await list("OPERATIONS_COORDINATOR")).total, 0);

  assert.equal(
    (
      await request(
        "OPERATIONS_COORDINATOR",
        `/operations/monitor/PAYMENT/${paymentId}`,
      )
    ).status,
    404,
  );

  await db.user.update({
    where: { id: sessions.get("PIONEER_AGENT")!.id },
    data: { supervisorId: sessions.get("OPERATIONS_COORDINATOR")!.id },
  });
});

test("missing proof, statement reviews and stage/category filters use authoritative records", async () => {
  const page = await list();

  assert.equal(page.policy.reviewDueHours, 24);

  assert.equal(page.counts.missing_receipt, 1);

  assert.equal(
    page.items.find((row) => {
      return row.id === historyId;
    })?.stage,
    "RECORDS",
  );

  assert.equal((await item()).stage, "HANDLER");

  assert.equal(
    (await list("COO", "&stage=HANDLER&kind=missing_receipt")).total,
    1,
  );

  const proof = await db.storedFile.create({
    data: {
      storageKey: randomUUID(),
      originalName: "receipt.png",
      mimeType: "image/png",
      size: 8,
      uploadedById: sessions.get("BATCH_HANDLER")!.id,
    },
  });

  await db.payment.update({
    where: { id: paymentId },
    data: { proofFileId: proof.id, version: { increment: 1 } },
  });

  assert.equal((await item()).stage, "RECORDS");

  const p = await db.payment.findUniqueOrThrow({ where: { id: paymentId } });

  const batch = await db.batch.findUniqueOrThrow({ where: { id: batchId } });

  await db.paymentOperationalReview.create({
    data: {
      paymentId,
      reviewerId: sessions.get("RECORDS")!.id,
      stage: "RECORDS",
      decision: "APPROVED",
      notes: "Synthetic review",
      evidenceVersion: p.evidenceVersion,
      paymentVersion: p.version,
      batchVersion: batch.version,
    },
  });

  assert.equal(
    (await item()).stage,
    "RECORDS",
    "The submitted period statement still needs review",
  );

  const statement = await db.gcashHistory.findUniqueOrThrow({
    where: { id: historyId },
  });

  assert.equal(
    (
      await request("RECORDS", `/gcash-history/${historyId}/review`, {
        version: statement.version,
        status: "REVIEWED",
        note: "Checked account, period and receipt evidence.",
      })
    ).status,
    200,
  );

  assert.equal((await item()).stage, "MANAGER");

  const requirement = await db.evidenceRequirement.create({
    data: {
      batchId,
      clientId,
      kind: "RECEIPT",
      description: "Expected supporting receipt",
      periodStart: new Date("2049-01-01"),
      periodEnd: new Date("2049-01-31"),
      reason: "Declared evidence must be complete before advancing",
    },
  });

  const blocked = await item();

  assert.equal(blocked.stage, "RECORDS");

  assert.equal(blocked.responsibleName, "Records team");

  assert.equal(blocked.responsibleId, null);

  assert.equal(blocked.waitingSince, p.updatedAt.toISOString());

  assert.equal(
    (await list("COO", `&staffId=${sessions.get("BATCH_MANAGER")!.id}`)).total,
    0,
    "A checklist blocker must not place a Records item in the Manager queue",
  );

  await db.evidenceRequirement.update({
    where: { id: requirement.id },
    data: { cancelled: true },
  });

  assert.equal((await item()).stage, "MANAGER");

  await db.paymentOperationalReview.create({
    data: {
      paymentId,
      reviewerId: sessions.get("BATCH_MANAGER")!.id,
      stage: "MANAGER",
      decision: "APPROVED",
      notes: "Synthetic cross-check",
      evidenceVersion: p.evidenceVersion,
      paymentVersion: p.version,
      batchVersion: batch.version,
    },
  });

  assert.equal((await item()).stage, "FINANCE");

  await db.batch.update({
    where: { id: batchId },
    data: { version: { increment: 1 } },
  });

  assert.equal((await item()).stage, "MANAGER");

  await db.user.update({
    where: { id: sessions.get("RECORDS")!.id },
    data: { active: false },
  });

  assert.equal((await item()).stage, "RECORDS");

  await db.user.update({
    where: { id: sessions.get("RECORDS")!.id },
    data: { active: true },
  });

  await db.payment.update({
    where: { id: paymentId },
    data: {
      status: "NEEDS_CLARIFICATION",
      evidenceVersion: { increment: 1 },
      version: { increment: 1 },
    },
  });

  assert.equal((await list("COO", "&kind=returned")).total, 1);
});

test("follow-up history is audited and immutable; stale/concurrent edits cannot overwrite each other", async () => {
  const before = await db.payment.findUniqueOrThrow({
    where: { id: paymentId },
  });

  assert.equal((await follow({ dueAt: "2000-01-01T00:00:00Z" })).status, 200);

  assert.equal((await list("COO", "&kind=overdue")).total, 1);

  const current = await item();

  const payload = {
    version: current.followUp!.version,
    sourceVersion: current.sourceVersion,
    status: "OPEN",
    note: "Concurrent follow up",
    dueAt: null,
  };

  const results = await Promise.all([
    request(
      "COO",
      `/operations/monitor/PAYMENT/${paymentId}/follow-up`,
      payload,
    ),
    request(
      "COO",
      `/operations/monitor/PAYMENT/${paymentId}/follow-up`,
      payload,
    ),
  ]);

  assert.deepEqual(
    results
      .map((r) => {
        return r.status;
      })
      .sort(),
    [200, 409],
  );

  assert.equal((await follow({ sourceVersion: 9999 })).status, 409);

  assert.equal((await follow({ note: " " })).status, 400);

  assert.equal(
    (
      await follow({
        status: "RESOLVED",
        note: "Staff contacted; tracking resolved",
      })
    ).status,
    200,
  );

  assert.equal((await list("COO", "&view=RESOLVED")).total, 1);

  const detail = await (
    await request("COO", `/operations/monitor/PAYMENT/${paymentId}`)
  ).json();

  assert.equal(detail.history.length, 3);

  await assert.rejects(
    db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.monitor_actor_id', ${sessions.get("COO")!.id}, true)`;

      return tx.operationsFollowUpEvent.update({
        where: { id: detail.history[0].id },
        data: { note: "Rewrite history" },
      });
    }),
  );

  assert.equal(
    await db.auditEntry.count({
      where: {
        entity: "operations_follow_up",
        recordId: (
          await db.$transaction(async (tx) => {
            await tx.$executeRaw`SELECT set_config('app.monitor_actor_id', ${sessions.get("COO")!.id}, true)`;

            return tx.operationsFollowUp.findUniqueOrThrow({
              where: { paymentId },
            });
          })
        ).id,
      },
    }),
    3,
  );

  const after = await db.payment.findUniqueOrThrow({
    where: { id: paymentId },
  });

  assert.equal(after.version, before.version);

  assert.equal(after.status, before.status);

  assert.equal(after.amount.toString(), before.amount.toString());
});

test("only COO configures review deadline; overdue/filtering/pagination validation are enforced", async () => {
  assert.equal(
    (
      await request("OPERATIONS_COORDINATOR", "/operations/monitor/policy", {
        version: 0,
        reviewDueHours: 24,
      })
    ).status,
    403,
  );

  assert.equal(
    (
      await request("SYSTEM_ADMIN", "/operations/monitor/policy", {
        version: 0,
        reviewDueHours: 24,
      })
    ).status,
    403,
  );

  assert.equal(
    (
      await request("COO", "/operations/monitor/policy", {
        version: 0,
        reviewDueHours: 2,
      })
    ).status,
    200,
  );

  assert.equal(
    (
      await request("COO", "/operations/monitor/policy", {
        version: 0,
        reviewDueHours: 24,
      })
    ).status,
    409,
  );

  await db.gcashHistory.update({
    where: { id: historyId },
    data: {
      status: "SUBMITTED",
      updatedAt: new Date("2000-01-01"),
      submissions: {
        updateMany: {
          where: { revision: 1 },
          data: {
            status: "SUBMITTED",
            reviewedById: null,
            reviewedAt: null,
            reviewNote: "",
          },
        },
      },
    },
  });

  assert.equal((await list("COO", "&kind=overdue")).total, 1);

  assert.equal((await list("COO", "&page=2")).items.length, 0);

  for (const query of [
    "page=0",
    "staffId=bad",
    "minAgeHours=-1",
    "unknown=value",
  ]) {
    assert.equal(
      (await request("COO", `/operations/monitor?${query}`)).status,
      400,
    );
  }

  await db.gcashHistory.update({
    where: { id: historyId },
    data: { status: "REVIEWED" },
  });

  assert.equal(
    (await list()).items.some((row) => {
      return row.id === historyId;
    }),
    false,
  );
});

test("monitor list query plans run against a representative 2500-item test backlog", async (t) => {
  await db.payment.createMany({
    data: Array.from({ length: 2500 }, () => {
      return {
        batchId,
        clientId,
        amount: "1.00",
        method: "GCash",
        paymentDate: new Date("2049-01-01"),
        recordedById: sessions.get("BATCH_HANDLER")!.id,
      };
    }),
  });

  await db.$executeRaw`ANALYZE "Payment"`;

  for (const role of ["COO", "OPERATIONS_COORDINATOR"]) {
    const user = safeUser(
      await db.user.findUniqueOrThrow({
        where: { id: sessions.get(role)!.id },
      }),
    );

    const rows = monitorRows(user, new Date(), 24);

    const plans = await db.$queryRaw<
      Array<{
        "QUERY PLAN": Array<{
          "Execution Time": number;
          "Planning Time": number;
          Plan: { "Actual Rows": number };
        }>;
      }>
    >`${rows} SELECT * FROM observed WHERE stage = 'HANDLER' AND "batchId" = ${batchId}::uuid ORDER BY overdue DESC NULLS LAST, "waitingSince", source, id LIMIT 20`;

    assert.equal(plans.length, 20);

    const explain = await db.$queryRaw<
      Array<{
        "QUERY PLAN": Array<{
          "Execution Time": number;
          "Planning Time": number;
          Plan: { "Actual Rows": number };
        }>;
      }>
    >`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${rows} SELECT * FROM observed WHERE stage = 'HANDLER' AND "batchId" = ${batchId}::uuid ORDER BY overdue DESC NULLS LAST, "waitingSince", source, id LIMIT 20`;

    const plan = explain[0]["QUERY PLAN"][0];

    assert.equal(plan.Plan["Actual Rows"], 20);

    t.diagnostic(
      JSON.stringify({
        role,
        backlog: 2500,
        executionMs: plan["Execution Time"],
        planningMs: plan["Planning Time"],
      }),
    );
  }
});

test("forced RLS denies absent actors, cross-network SQL reads/writes and forged history authors", async () => {
  const tables = await db.$queryRaw<
    { relname: string; relrowsecurity: boolean; relforcerowsecurity: boolean }[]
  >`
    SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class
    WHERE relname IN ('OperationsMonitorPolicy', 'OperationsFollowUp', 'OperationsFollowUpEvent')`;

  assert.equal(tables.length, 3);

  assert(
    tables.every((table) => {
      return table.relrowsecurity && table.relforcerowsecurity;
    }),
  );

  const principal = await db.$queryRaw<
    { rolsuper: boolean; rolbypassrls: boolean }[]
  >`SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`;

  assert.equal(principal[0].rolsuper, false);

  assert.equal(principal[0].rolbypassrls, false);

  const asActor = <T>(
    role: string,
    run: (
      tx: import("../src/generated/prisma/client").Prisma.TransactionClient,
    ) => Promise<T>,
  ) => {
    return db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.monitor_actor_id', ${sessions.get(role)!.id}, true)`;

      return run(tx);
    });
  };

  assert.deepEqual(await db.operationsFollowUp.findMany(), []);

  assert.deepEqual(await db.operationsFollowUpEvent.findMany(), []);

  assert.deepEqual(await db.operationsMonitorPolicy.findMany(), []);

  const foreignBatch = await db.batch.create({
    data: {
      code: `RLS-FOREIGN-${suffix}`,
      model: "Test",
      startDate: new Date("2049-01-01"),
      endDate: new Date("2049-12-31"),
    },
  });

  const foreignClient = await db.client.create({
    data: {
      batchId: foreignBatch.id,
      name: "Foreign",
      email: `rls-${suffix}@example.test`,
      phone: "Test",
    },
  });

  const foreignPayment = await db.payment.create({
    data: {
      batchId: foreignBatch.id,
      clientId: foreignClient.id,
      amount: "1.00",
      method: "Cash",
      paymentDate: new Date("2049-01-01"),
      recordedById: sessions.get("BATCH_HANDLER")!.id,
    },
  });

  assert.equal(
    (
      await request(
        "COO",
        `/operations/monitor/PAYMENT/${foreignPayment.id}/follow-up`,
        {
          version: 0,
          sourceVersion: 1,
          status: "OPEN",
          note: "Foreign network follow-up",
          dueAt: null,
        },
      )
    ).status,
    200,
  );

  const foreignFlag = await asActor("COO", (tx) => {
    return tx.operationsFollowUp.findUniqueOrThrow({
      where: { paymentId: foreignPayment.id },
    });
  });

  assert.equal(
    await asActor("OPERATIONS_COORDINATOR", (tx) => {
      return tx.operationsFollowUp.count({ where: { id: foreignFlag.id } });
    }),
    0,
  );

  assert.equal(
    await asActor("OPERATIONS_COORDINATOR", (tx) => {
      return tx.operationsFollowUpEvent.count({
        where: { followUpId: foreignFlag.id },
      });
    }),
    0,
  );

  const update = await asActor("OPERATIONS_COORDINATOR", (tx) => {
    return tx.operationsFollowUp.updateMany({
      where: { id: foreignFlag.id },
      data: { note: "Forged cross-team note" },
    });
  });

  assert.equal(update.count, 0);

  await assert.rejects(
    asActor("OPERATIONS_COORDINATOR", (tx) => {
      return tx.operationsFollowUp.create({
        data: {
          paymentId: foreignPayment.id,
          status: "OPEN",
          note: "Forbidden cross-team flag",
        },
      });
    }),
  );

  const own = await asActor("OPERATIONS_COORDINATOR", (tx) => {
    return tx.operationsFollowUp.findUniqueOrThrow({ where: { paymentId } });
  });

  await assert.rejects(
    asActor("OPERATIONS_COORDINATOR", (tx) => {
      return tx.operationsFollowUpEvent.create({
        data: {
          followUpId: own.id,
          actorId: sessions.get("COO")!.id,
          status: "OPEN",
          note: "Forged author",
        },
      });
    }),
  );

  assert.equal(
    (
      await asActor("COO", (tx) => {
        return tx.operationsFollowUp.findUniqueOrThrow({
          where: { id: foreignFlag.id },
        });
      })
    ).note,
    "Foreign network follow-up",
  );

  const financeFlags = await asActor("FINANCE_OFFICER", (tx) => {
    return tx.operationsFollowUp.findMany();
  });

  assert(
    financeFlags.every((flag) => {
      return flag.status === "OPEN";
    }),
  );

  assert.equal(
    await asActor("FINANCE_OFFICER", (tx) => {
      return tx.operationsFollowUpEvent.count();
    }),
    0,
  );

  assert.equal(
    (
      await asActor("FINANCE_OFFICER", (tx) => {
        return tx.operationsFollowUp.updateMany({ data: { note: "forged" } });
      })
    ).count,
    0,
  );

  await assert.rejects(
    asActor("OPERATIONS_COORDINATOR", (tx) => {
      return tx.operationsMonitorPolicy.update({
        where: { id: "global" },
        data: { reviewDueHours: 1 },
      });
    }),
  );

  await assert.rejects(
    db.operationsFollowUp.create({
      data: {
        paymentId: foreignPayment.id,
        status: "OPEN",
        note: "No actor identity",
      },
    }),
  );

  // A pooled connection reused after a transaction must not retain its previous actor.
  for (let i = 0; i < 5; i++) {
    assert.deepEqual(await db.operationsFollowUp.findMany(), []);
  }

  await db.user.update({
    where: { id: sessions.get("PIONEER_AGENT")!.id },
    data: { supervisorId: null },
  });

  assert.equal(
    await asActor("OPERATIONS_COORDINATOR", (tx) => {
      return tx.operationsFollowUp.count({ where: { id: own.id } });
    }),
    0,
  );

  await db.user.update({
    where: { id: sessions.get("PIONEER_AGENT")!.id },
    data: { supervisorId: sessions.get("OPERATIONS_COORDINATOR")!.id },
  });
});
