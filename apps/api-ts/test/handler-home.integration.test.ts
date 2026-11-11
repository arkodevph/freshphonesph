import "reflect-metadata";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import { createApp } from "../src/app";
import { Database } from "../src/database";
import { hashPassword } from "../src/auth/password";
import type { Config } from "../src/config";

const url = process.env.TEST_DATABASE_URL;

if (!url || !new URL(url).pathname.endsWith("_test")) {
  throw new Error(
    "Handler home tests require a dedicated migrated _test database.",
  );
}

const origin = "http://localhost:3100";

const suffix = randomUUID().slice(0, 8);

const identities = new Map<string, { id: string; cookie: string }>();

let app: INestApplication,
  db: Database,
  base: string,
  batchId: string,
  foreignBatchId: string;

function request(identity: string, path: string) {
  return fetch(`${base}/api${path}`, {
    headers: { Origin: origin, Cookie: identities.get(identity)?.cookie ?? "" },
  });
}

before(async () => {
  app = await createApp({
    NODE_ENV: "test",
    PORT: 4100,
    HOST: "127.0.0.1",
    DATABASE_URL: url,
    WEB_ORIGIN: origin,
    JWT_SECRET: "synthetic-handler-home-secret-longer-than-32-characters",
    EMAIL_FROM: "test@example.test",
    CUSTOMER_REMINDER_DAYS_BEFORE: "",
    PRIVATE_STORAGE_PROVIDER: "local",
    PRIVATE_STORAGE_S3_REGION: "ap-southeast-1",
  } as Config);

  await app.listen(0, "127.0.0.1");

  base = await app.getUrl();

  db = app.get(Database);

  const password = "Synthetic-handler-home-password-123!";

  const passwordHash = await hashPassword(password);

  for (const key of ["handler", "other", "ceo"] as const) {
    const user = await db.user.create({
      data: {
        name: `Synthetic ${key}`,
        email: `handler-home-${key}-${suffix}@example.test`,
        role: key === "ceo" ? "CEO" : "BATCH_HANDLER",
        passwordHash,
      },
    });

    const login = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email, password }),
    });

    assert.equal(login.status, 200);

    identities.set(key, {
      id: user.id,
      cookie: login.headers
        .getSetCookie()
        .map((entry) => {
          return entry.split(";")[0];
        })
        .join("; "),
    });
  }

  for (const key of ["handler", "other"] as const) {
    const batch = await db.batch.create({
      data: {
        code: `HANDLER-HOME-${key}-${suffix}`,
        model: "Synthetic unit",
        handlerId: identities.get(key)!.id,
        startDate: new Date("2049-01-01"),
        endDate: new Date("2049-12-31"),
      },
    });

    if (key === "handler") {
      batchId = batch.id;
    } else {
      foreignBatchId = batch.id;
    }

    const client = await db.client.create({
      data: {
        batchId: batch.id,
        name: `Synthetic ${key} member`,
        email: `${key}-member-${suffix}@example.test`,
        phone: "Synthetic",
      },
    });

    const proof = await db.storedFile.create({
      data: {
        storageKey: randomUUID(),
        originalName: "synthetic-receipt.png",
        mimeType: "image/png",
        size: 8,
        uploadedById: identities.get(key)!.id,
      },
    });

    await db.payment.createMany({
      data: Array.from({ length: key === "handler" ? 22 : 1 }, (_, index) => {
        return {
          batchId: batch.id,
          clientId: client.id,
          amount: "10.00",
          paymentDate: new Date("2049-03-01"),
          method: "GCash",
          referenceNumber: `${key}-missing-${index}`,
          recordedById: identities.get(key)!.id,
        };
      }),
    });

    await db.payment.createMany({
      data: [
        {
          batchId: batch.id,
          clientId: client.id,
          amount: "15.00",
          paymentDate: new Date("2049-03-01"),
          method: "GCash",
          proofFileId: proof.id,
          recordedById: identities.get(key)!.id,
        },
        {
          batchId: batch.id,
          clientId: client.id,
          amount: "20.00",
          paymentDate: new Date("2049-03-01"),
          method: "GCash",
          status: "NEEDS_CLARIFICATION",
          recordedById: identities.get(key)!.id,
        },
      ],
    });

    await db.task.create({
      data: {
        title: `Synthetic ${key} task`,
        instructions: "Own assigned work only",
        assigneeId: identities.get(key)!.id,
        creatorId: identities.get("ceo")!.id,
        priority: "HIGH",
        deadline: new Date("2049-04-01"),
      },
    });
  }
});

after(async () => {
  await app?.close();
});

test("missing-proof count covers every assigned pending claim, with stable paging", async () => {
  const first = await request(
    "handler",
    "/payments?status=PENDING&proof=missing",
  );

  assert.equal(first.status, 200);

  const page = await first.json();

  assert.equal(page.total, 22);

  assert.equal(page.items.length, 20);

  assert.ok(
    page.items.every(
      (item: { batchId: string; proofFile: unknown; status: string }) => {
        return (
          item.batchId === batchId &&
          item.proofFile === null &&
          item.status === "PENDING"
        );
      },
    ),
  );

  const next = await (
    await request("handler", "/payments?status=PENDING&proof=missing&page=2")
  ).json();

  assert.equal(next.total, 22);

  assert.equal(next.items.length, 2);

  assert.equal(
    new Set(
      [...page.items, ...next.items].map((item) => {
        return item.id;
      }),
    ).size,
    22,
  );

  const returned = await (
    await request("handler", "/payments?status=NEEDS_CLARIFICATION")
  ).json();

  assert.equal(returned.total, 1);
});

test("proof filters do not bypass batch scope, authentication or role grants", async () => {
  const foreign = await (
    await request(
      "handler",
      `/payments?proof=missing&batchId=${foreignBatchId}`,
    )
  ).json();

  assert.equal(foreign.total, 0);

  assert.equal(
    (await request("anonymous", "/payments?proof=missing")).status,
    401,
  );

  assert.equal((await request("ceo", "/payments?proof=missing")).status, 403);

  assert.equal((await request("handler", "/payments?proof=any")).status, 400);

  assert.equal((await request("handler", "/reports/dashboard")).status, 403);
});

test("home task reads contain only the Handler's own assignments", async () => {
  const response = await request("handler", "/tasks?status=TODO");

  assert.equal(response.status, 200);

  const page = await response.json();

  assert.equal(page.count, 1);

  assert.equal(page.results[0].assigneeId, identities.get("handler")!.id);

  assert.equal(page.results[0].title, "Synthetic handler task");
});

test("current reassignment removes previous Handler counts and makes them available to the new Handler", async () => {
  await db.batch.update({
    where: { id: batchId },
    data: { handlerId: identities.get("other")!.id, version: { increment: 1 } },
  });

  const previous = await (
    await request("handler", "/payments?status=PENDING&proof=missing")
  ).json();

  assert.equal(previous.total, 0);

  const current = await (
    await request("other", "/payments?status=PENDING&proof=missing")
  ).json();

  assert.equal(current.total, 23);

  const overview = await (await request("handler", "/overview")).json();

  assert.equal(overview.clients, 0);

  await db.batch.update({
    where: { id: batchId },
    data: {
      handlerId: identities.get("handler")!.id,
      version: { increment: 1 },
    },
  });
});

test("batch numeric sorting covers all scoped records before pagination, with missing terms last", async () => {
  const prefix = `SORT-${suffix}`;

  const data = Array.from({ length: 22 }, (_, index) => {
    return {
      code: `${prefix}-${String(index + 1).padStart(2, "0")}`,
      model: `Synthetic unit ${index + 1}`,
      handlerId: identities.get("handler")!.id,
      startDate: new Date("2049-01-01"),
      endDate: new Date("2049-12-31"),
      contractPrice: String(index + 1),
      installmentCount: index + 1,
      cadence: "MONTHLY" as const,
    };
  });

  await db.batch.createMany({ data });

  await db.batch.createMany({
    data: [
      {
        code: `${prefix}-unset`,
        model: "Unset terms",
        handlerId: identities.get("handler")!.id,
        startDate: new Date("2049-01-01"),
        endDate: new Date("2049-12-31"),
      },
      {
        ...data[0],
        code: `${prefix}-foreign`,
        handlerId: identities.get("other")!.id,
        contractPrice: "0.10",
        installmentCount: 1,
      },
    ],
  });

  const read = async (sortBy: string, direction: string, page = 1) => {
    const response = await request(
      "handler",
      `/batches?q=${prefix}&sortBy=${sortBy}&sortDirection=${direction}&page=${page}`,
    );

    assert.equal(response.status, 200);

    return response.json();
  };

  const first = await read("contractPrice", "asc");

  const next = await read("contractPrice", "asc", 2);

  assert.equal(first.total, 23);

  assert.equal(first.items.length, 20);

  assert.deepEqual(
    first.items.map((item: { contractPrice: string }) => {
      return Number(item.contractPrice);
    }),
    Array.from({ length: 20 }, (_, i) => {
      return i + 1;
    }),
  );

  assert.deepEqual(
    next.items.map((item: { contractPrice: string | null }) => {
      return item.contractPrice;
    }),
    ["21.00", "22.00", null],
  );

  assert.equal(
    new Set(
      [...first.items, ...next.items].map((item) => {
        return item.id;
      }),
    ).size,
    23,
  );

  const descending = await read("contractPrice", "desc");

  assert.equal(descending.items[0].contractPrice, "22.00");

  assert.equal(
    (await read("contractPrice", "desc", 2)).items.at(-1).contractPrice,
    null,
  );

  assert.equal(
    (await read("installmentCount", "desc")).items[0].installmentCount,
    22,
  );

  assert.equal((await read("code", "asc")).items[0].code, `${prefix}-01`);

  assert.equal((await read("model", "asc")).items[0].model, "Synthetic unit 1");

  const foreign = await (
    await request(
      "other",
      `/batches?q=${prefix}&sortBy=contractPrice&sortDirection=asc`,
    )
  ).json();

  assert.equal(foreign.total, 1);

  assert.equal(foreign.items[0].contractPrice, "0.10");

  assert.equal(
    (await request("handler", "/batches?sortBy=handlerId")).status,
    400,
  );

  assert.equal(
    (await request("handler", "/batches?sortDirection=sideways")).status,
    400,
  );
});

test("member and payment sorts preserve scope, filters and full-dataset pagination", async () => {
  const prefix = `HANDLER-LISTS-${suffix}`;

  const batches = await Promise.all(
    ["C", "A", "B"].map((code) => {
      return db.batch.create({
        data: {
          code: `${prefix}-${code}`,
          model: "Synthetic table sort fixture",
          handlerId: identities.get("handler")!.id,
          startDate: new Date("2049-01-01"),
          endDate: new Date("2049-12-31"),
        },
      });
    }),
  );

  const clients = [];

  const payments = [];

  for (let index = 0; index < 23; index++) {
    const client = await db.client.create({
      data: {
        batchId: batches[index % 3].id,
        name: `${prefix}-member-${String(22 - index).padStart(2, "0")}`,
        email: `table-member-${index}-${suffix}@example.test`,
        phone: "Synthetic",
      },
    });

    clients.push(client);

    payments.push(
      await db.payment.create({
        data: {
          batchId: client.batchId,
          clientId: client.id,
          recordedById: identities.get("handler")!.id,
          amount: "10.00",
          paymentDate: new Date(
            `2049-04-${String(index + 1).padStart(2, "0")}`,
          ),
          method: "GCash",
          status: index === 0 ? "VERIFIED" : "PENDING",
          ...(index === 0
            ? {
                verifierId: identities.get("ceo")!.id,
                verifiedAt: new Date("2049-04-01"),
              }
            : {}),
        },
      }),
    );
  }

  await db.paymentAdjustment.create({
    data: {
      paymentId: payments[0].id,
      actorId: identities.get("ceo")!.id,
      requestId: randomUUID(),
      sequence: 1,
      paymentVersion: 1,
      amount: "-3.00",
      beforeAmount: "10.00",
      afterAmount: "7.00",
      reason: "Synthetic isolated read fixture",
    },
  });

  const foreign = await db.client.create({
    data: {
      batchId: foreignBatchId,
      name: `${prefix}-foreign`,
      email: `table-foreign-${suffix}@example.test`,
      phone: "Synthetic",
    },
  });

  await db.payment.create({
    data: {
      batchId: foreignBatchId,
      clientId: foreign.id,
      recordedById: identities.get("other")!.id,
      amount: "99.00",
      paymentDate: new Date("2049-04-01"),
      method: "GCash",
    },
  });

  async function get(path: string, identity = "handler") {
    const response = await request(identity, path);

    assert.equal(response.status, 200);

    return response.json();
  }

  const q = encodeURIComponent(prefix);

  const first = await get(`/clients?q=${q}&sortBy=name&sortDirection=asc`);

  const second = await get(
    `/clients?q=${q}&sortBy=name&sortDirection=asc&page=2`,
  );

  assert.equal(first.total, 23);

  assert.equal(first.items.length, 20);

  assert.equal(second.items.length, 3);

  const all = [...first.items, ...second.items];

  assert.equal(
    new Set(
      all.map((item) => {
        return item.id;
      }),
    ).size,
    23,
  );

  assert.deepEqual(
    all.map((item) => {
      return item.name;
    }),
    clients
      .map((item) => {
        return item.name;
      })
      .sort(),
  );

  assert(
    !all.some((item) => {
      return item.id === foreign.id;
    }),
  );

  const descending = await get(
    `/clients?q=${q}&sortBy=name&sortDirection=desc`,
  );

  assert.equal(descending.items[0].name, clients[0].name);

  const batchFirst = await get(
    `/clients?q=${q}&sortBy=batchCode&sortDirection=asc`,
  );

  const batchSecond = await get(
    `/clients?q=${q}&sortBy=batchCode&sortDirection=asc&page=2`,
  );

  const codes = [...batchFirst.items, ...batchSecond.items].map((item) => {
    return item.batch.code;
  });

  assert.deepEqual(codes, [...codes].sort());

  const filtered = await get(
    `/clients?q=${q}&batchId=${batches[1].id}&sortBy=name&sortDirection=asc`,
  );

  assert.equal(filtered.total, 8);

  assert(
    filtered.items.every((item: { batchId: string }) => {
      return item.batchId === batches[1].id;
    }),
  );

  const dateFirst = await get(
    `/payments?q=${q}&sortBy=paymentDate&sortDirection=asc`,
  );

  const dateSecond = await get(
    `/payments?q=${q}&sortBy=paymentDate&sortDirection=asc&page=2`,
  );

  assert.equal(dateFirst.total, 23);

  assert.equal(dateFirst.items.length, 20);

  assert.equal(dateSecond.items.length, 3);

  assert.deepEqual(
    [...dateFirst.items, ...dateSecond.items].map((item) => {
      return item.id;
    }),
    payments.map((item) => {
      return item.id;
    }),
  );

  assert.equal(dateFirst.items[0].amount, "10.00");

  assert.equal(dateFirst.items[0].effectiveAmount, "7.00");

  const dateDescending = await get(
    `/payments?q=${q}&sortBy=paymentDate&sortDirection=desc`,
  );

  assert.equal(dateDescending.items[0].id, payments.at(-1)!.id);

  const byClient = await get(
    `/payments?q=${q}&sortBy=clientName&sortDirection=asc`,
  );

  assert.equal(byClient.items[0].client.name, clients.at(-1)!.name);

  const pending = await get(
    `/payments?q=${q}&status=PENDING&proof=missing&sortBy=paymentDate&sortDirection=asc`,
  );

  assert.equal(pending.total, 22);

  assert(
    pending.items.every((item: { status: string }) => {
      return item.status === "PENDING";
    }),
  );

  const otherClients = await get(
    `/clients?q=${q}&sortBy=name&sortDirection=asc`,
    "other",
  );

  const otherPayments = await get(
    `/payments?q=${q}&sortBy=clientName&sortDirection=asc`,
    "other",
  );

  assert.equal(otherClients.total, 1);

  assert.equal(otherPayments.total, 1);

  for (const path of [
    "/clients?sortBy=amount",
    "/clients?sortDirection=sideways",
    "/payments?sortBy=amount",
    "/payments?sortDirection=sideways",
  ]) {
    assert.equal((await request("handler", path)).status, 400);
  }
});

test("Handler documents enforce current assignment, verified eligibility and operational values", async () => {
  const batch = await db.batch.create({
    data: {
      code: `HANDLER-DOCS-${suffix}`,
      model: "Synthetic document unit",
      handlerId: identities.get("handler")!.id,
      startDate: new Date("2049-01-01"),
      endDate: new Date("2049-12-31"),
    },
  });

  const client = await db.client.create({
    data: {
      batchId: batch.id,
      name: "Synthetic document member",
      email: `docs-${suffix}@example.test`,
      phone: "Synthetic",
    },
  });

  const empty = await db.client.create({
    data: {
      batchId: batch.id,
      name: "Synthetic document member without schedule",
      email: `empty-docs-${suffix}@example.test`,
      phone: "Synthetic",
    },
  });

  await db.scheduleItem.createMany({
    data: [1, 2].map((sequenceNo) => {
      return {
        clientId: client.id,
        sequenceNo,
        dueDate: new Date(`2049-0${sequenceNo}-01`),
        expectedAmount: "50.00",
      };
    }),
  });

  const rows = [];

  for (const status of [
    "VERIFIED",
    "PENDING",
    "REJECTED",
    "NEEDS_CLARIFICATION",
  ] as const) {
    rows.push(
      await db.payment.create({
        data: {
          batchId: batch.id,
          clientId: client.id,
          amount: "50.00",
          method: "GCash",
          paymentDate: new Date("2049-01-01"),
          recordedById: identities.get("handler")!.id,
          status,
          ...(status === "VERIFIED"
            ? {
                verifierId: identities.get("ceo")!.id,
                verifiedAt: new Date("2049-01-02"),
              }
            : {}),
        },
      }),
    );
  }

  const verified = rows[0];

  await db.paymentAdjustment.create({
    data: {
      paymentId: verified.id,
      actorId: identities.get("ceo")!.id,
      requestId: randomUUID(),
      sequence: 1,
      paymentVersion: 1,
      amount: "-5.00",
      beforeAmount: "50.00",
      afterAmount: "45.00",
      reason: "Synthetic isolated adjustment evidence",
    },
  });

  const statementResponse = await request(
    "handler",
    `/clients/${client.id}/statement`,
  );

  assert.equal(statementResponse.status, 200);

  const statement = await statementResponse.json();

  assert.equal(statement.documentType, "STATEMENT_OF_ACCOUNT");

  assert.equal(statement.officialTaxInvoice, false);

  assert.match(statement.notice, /not an official BIR sales invoice/i);

  assert.equal(statement.balance.totalDue, "100.00");

  assert.equal(statement.balance.verifiedPaid, "45.00");

  assert.equal(statement.balance.remainingBalance, "55.00");

  assert.deepEqual(
    statement.verifiedPayments.map((item: { id: string }) => {
      return item.id;
    }),
    [verified.id],
  );

  assert.equal(statement.verifiedPayments[0].amount, "50.00");

  assert.equal(statement.verifiedPayments[0].effectiveAmount, "45.00");

  assert.equal(
    statement.verifiedPayments[0].adjustments[0].afterAmount,
    "45.00",
  );

  const confirmationResponse = await request(
    "handler",
    `/payments/${verified.id}/confirmation`,
  );

  assert.equal(confirmationResponse.status, 200);

  const confirmation = await confirmationResponse.json();

  assert.equal(confirmation.officialTaxInvoice, false);

  assert.match(confirmation.notice, /not an official BIR sales invoice/i);

  assert.equal(confirmation.payment.clientId, client.id);

  assert.equal(confirmation.payment.batchId, batch.id);

  assert.equal(confirmation.payment.effectiveAmount, "45.00");

  for (const payment of rows.slice(1)) {
    assert.equal(
      (await request("handler", `/payments/${payment.id}/confirmation`)).status,
      404,
    );
  }

  const emptyStatement = await (
    await request("handler", `/clients/${empty.id}/statement`)
  ).json();

  assert.equal(emptyStatement.balance.totalDue, "0.00");

  assert.deepEqual(emptyStatement.verifiedPayments, []);

  for (const path of [
    `/clients/${client.id}/statement`,
    `/payments/${verified.id}/confirmation`,
  ]) {
    assert.equal((await request("other", path)).status, 404);

    assert.equal((await request("ceo", path)).status, 403);

    assert.equal((await request("anonymous", path)).status, 401);
  }

  await db.batch.update({
    where: { id: batch.id },
    data: { handlerId: identities.get("other")!.id },
  });

  for (const path of [
    `/clients/${client.id}`,
    `/clients/${client.id}/statement`,
    `/payments/${verified.id}/confirmation`,
  ]) {
    assert.equal((await request("handler", path)).status, 404);

    assert.equal((await request("other", path)).status, 200);
  }

  assert.equal(await db.payment.count({ where: { batchId: batch.id } }), 4);

  assert.equal(
    await db.paymentAdjustment.count({ where: { paymentId: verified.id } }),
    1,
  );
});
