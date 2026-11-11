import "reflect-metadata";
import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { INestApplication } from "@nestjs/common";
import {
  roles,
  rolePermissions,
  type Role,
  type User,
} from "@freshphones/contracts";
import { createApp } from "../src/app";
import { Database } from "../src/database";
import { Prisma } from "../src/generated/prisma/client";
import { paymentMatchSql } from "../src/gcash-history/payment-matches";
import type { Config } from "../src/config";
import { hashPassword } from "../src/auth/password";
import { safeUser } from "../src/auth/auth.service";
import { PrivateStorageService } from "../src/storage/private-storage.service";
import { GcashHistoryService } from "../src/gcash-history/gcash-history.service";
import { describe } from "../src/retention/manifest";

const databaseUrl = process.env.TEST_DATABASE_URL;

if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith("_test")) {
  throw new Error(
    "GCash history tests require a dedicated TEST_DATABASE_URL ending in _test.",
  );
}

const suffix = randomUUID().slice(0, 8);

const origin = "http://localhost:3100";

const password = "Synthetic-gcash-history-123!";

const apps: INestApplication[] = [];

const bases: string[] = [];

const people = new Map<string, { id: string; cookie: string; user: User }>();

let db: Database;

let directory: string;

let batchId: string;

let otherBatchId: string;

let historyId: string;

let firstSubmissionId: string;

let customerId: string;

const pdf = (label = "First") => {
  return Buffer.concat([
    readFileSync(join(__dirname, "fixtures/gcash/text.pdf")),
    Buffer.from(`\n% Synthetic ${label}\n`),
  ]);
};

function request(
  who: string | null,
  path: string,
  method = "GET",
  body?: unknown,
  server = 0,
) {
  return fetch(`${bases[server]}/api${path}`, {
    method,
    headers: {
      Origin: origin,
      Cookie: who ? people.get(who)!.cookie : "",
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

function upload(
  who: string,
  input: Record<string, unknown> = {},
  bytes = pdf(),
  mime = "application/pdf",
  server = 0,
) {
  const form = new FormData();

  for (const [key, value] of Object.entries({
    batchId,
    periodStart: "2026-10-01",
    periodEnd: "2026-10-15",
    expectedVersion: 0,
    note: "Complete synthetic history",
    ...input,
  })) {
    form.set(key, String(value));
  }

  form.set("file", new Blob([bytes], { type: mime }), "gcash-history.pdf");

  return fetch(`${bases[server]}/api/gcash-history`, {
    method: "POST",
    headers: { Origin: origin, Cookie: people.get(who)!.cookie },
    body: form,
  });
}

before(async () => {
  directory = await mkdtemp(join(tmpdir(), "freshphones-gcash-test-"));

  const config = {
    NODE_ENV: "test",
    HOST: "127.0.0.1",
    PORT: 4100,
    DATABASE_URL: databaseUrl,
    WEB_ORIGIN: origin,
    JWT_SECRET: "gcash-history-test-secret-at-least-32-characters",
    LOCAL_DEMO_AUTH: false,
    EMAIL_FROM: "synthetic@example.test",
    CUSTOMER_REMINDER_DAYS_BEFORE: "",
    PRIVATE_STORAGE_PROVIDER: "local",
    PRIVATE_STORAGE_DIR: directory,
    PRIVATE_STORAGE_S3_REGION: "ap-southeast-1",
    ABUSE_LIMITS: {
      upload: [[1000, 60]],
      auth: [[1000, 60]],
      accountRead: [[5000, 60]],
      accountWrite: [[1000, 60]],
    },
  } as Config;

  for (let index = 0; index < 2; index++) {
    const app = await createApp(config);

    await app.listen(0, "127.0.0.1");

    apps.push(app);

    bases.push(await app.getUrl());
  }

  db = apps[0].get(Database);

  // This suite owns its dedicated test database; clear counters from earlier synthetic runs.
  await db.loginAttempt.deleteMany();

  const customerBatch = await db.batch.create({
    data: {
      code: `GC-FIXTURE-${suffix}`,
      model: "Fixture phone",
      startDate: new Date("2026-10-01"),
      endDate: new Date("2027-04-01"),
    },
  });

  const customer = await db.client.create({
    data: {
      name: "Synthetic GCash member",
      email: "",
      phone: "",
      batchId: customerBatch.id,
    },
  });

  customerId = customer.id;

  const passwordHash = await hashPassword(password);

  for (const key of [...roles, "OTHER_HANDLER"] as const) {
    const role: Role = key === "OTHER_HANDLER" ? "BATCH_HANDLER" : key;

    const user = await db.user.create({
      data: {
        role,
        name: `Synthetic ${key}`,
        email: `gcash-${key.toLowerCase()}-${suffix}@example.test`,
        passwordHash,
        ...(role === "CUSTOMER" ? { clientId: customerId } : {}),
      },
    });

    const response = await fetch(`${bases[0]}/api/auth/login`, {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email, password }),
    });

    assert.equal(response.status, 200);

    people.set(key, {
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

  const batch = await db.batch.create({
    data: {
      code: `GC-${suffix}`,
      model: "Synthetic phone",
      handlerId: people.get("BATCH_HANDLER")!.id,
      startDate: new Date("2026-10-01"),
      endDate: new Date("2027-04-01"),
    },
  });

  batchId = batch.id;

  await db.client.update({ where: { id: customerId }, data: { batchId } });

  await db.scheduleItem.create({
    data: {
      clientId: customerId,
      sequenceNo: 1,
      dueDate: new Date("2026-10-15"),
      expectedAmount: "100.00",
    },
  });

  await db.payment.create({
    data: {
      clientId: customerId,
      batchId,
      amount: "50.00",
      paymentDate: new Date("2026-10-10"),
      method: "gcash",
      recordedById: people.get("FINANCE_OFFICER")!.id,
    },
  });

  await db.payment.create({
    data: {
      clientId: customerId,
      batchId,
      amount: "30.00",
      paymentDate: new Date("2026-10-09"),
      method: "gcash",
      status: "VERIFIED",
      recordedById: people.get("FINANCE_OFFICER")!.id,
      verifierId: people.get("FINANCE_OFFICER")!.id,
      verifiedAt: new Date(),
    },
  });

  otherBatchId = (
    await db.batch.create({
      data: {
        code: `OTHER-GC-${suffix}`,
        model: "Other phone",
        handlerId: people.get("OTHER_HANDLER")!.id,
        startDate: batch.startDate,
        endDate: batch.endDate,
      },
    })
  ).id;
});

after(async () => {
  for (const app of apps) {
    await app.close();
  }

  if (directory) {
    await rm(directory, { recursive: true, force: true });
  }
});

test("every role has the intended read/upload/review boundary, including anonymous and CEO denial", async () => {
  assert.equal((await request(null, "/gcash-history")).status, 401);

  for (const role of roles) {
    const permissions = rolePermissions[role];

    assert.equal(
      (await request(role, "/gcash-history")).status,
      permissions.includes("GCASH_HISTORY_READ") ? 200 : 403,
      role,
    );

    if (!permissions.includes("GCASH_HISTORY_UPLOAD")) {
      assert.equal((await upload(role)).status, 403, `${role} upload`);
    }

    if (!permissions.includes("GCASH_HISTORY_REVIEW")) {
      assert.equal(
        (
          await request(role, `/gcash-history/${randomUUID()}/review`, "POST", {
            version: 1,
            status: "REVIEWED",
            note: "Synthetic review",
          })
        ).status,
        403,
        `${role} review`,
      );
    }
  }
});

test("assigned Handler submits a private batch/date PDF with one audit and change event", async () => {
  const response = await upload("BATCH_HANDLER");

  assert.equal(response.status, 201, await response.clone().text());

  const row = await response.json();

  historyId = row.id;

  firstSubmissionId = row.current.id;

  assert.equal(row.status, "SUBMITTED");

  assert.equal(row.version, 1);

  assert.equal(row.revision, 1);

  assert.equal(row.batch.id, batchId);

  assert.equal(row.periodStart, "2026-10-01");

  assert.doesNotMatch(
    JSON.stringify(row),
    /storageKey|uploadedById|passwordHash|example\.test/,
  );

  assert.equal(
    await db.auditEntry.count({
      where: { recordId: row.id, action: "gcash_history.submitted" },
    }),
    1,
  );

  assert.equal(
    await db.changeEvent.count({
      where: { recordId: row.id, entity: "gcash-history" },
    }),
    1,
  );

  const file = await request(
    "BATCH_HANDLER",
    `/gcash-history/submissions/${firstSubmissionId}/file`,
  );

  assert.equal(file.status, 200);

  assert.equal(file.headers.get("content-type"), "application/pdf");

  assert.equal(file.headers.get("cache-control"), "private, no-store");

  assert.match(file.headers.get("content-disposition")!, /^attachment;/);

  assert.deepEqual(Buffer.from(await file.arrayBuffer()), pdf());
});

test("unassigned batches, thread IDs, revisions and PDFs stay hidden from another Handler", async () => {
  for (const route of [
    `/gcash-history/${historyId}`,
    `/gcash-history/${historyId}/submissions`,
    `/gcash-history/submissions/${firstSubmissionId}/file`,
  ]) {
    assert.equal((await request("OTHER_HANDLER", route)).status, 404, route);
  }

  assert.equal((await upload("OTHER_HANDLER")).status, 404);

  const rows = await (
    await request("OTHER_HANDLER", `/gcash-history?batchId=${batchId}`)
  ).json();

  assert.equal(rows.total, 0);

  assert.equal(
    (
      await request(
        "CEO",
        `/gcash-history/submissions/${firstSubmissionId}/file`,
      )
    ).status,
    403,
  );
});

test("invalid dates, unknown fields, non-PDF, empty, truncated and oversized uploads create no records or files", async () => {
  const files = await readdir(directory);

  const count = await db.storedFile.count();

  for (const input of [
    { periodEnd: "2026-09-01" },
    { expectedVersion: -1 },
    { batchId: "invalid" },
  ]) {
    assert.equal((await upload("BATCH_HANDLER", input)).status, 400);
  }

  for (const [bytes, mime] of [
    [Buffer.alloc(0), "application/pdf"],
    [Buffer.from("not a PDF"), "application/pdf"],
    [Buffer.from("%PDF-1.4 truncated"), "application/pdf"],
    [pdf(), "image/png"],
  ] as const) {
    assert.equal(
      (await upload("BATCH_HANDLER", { periodEnd: "2026-10-16" }, bytes, mime))
        .status,
      400,
    );
  }

  assert.equal(
    (await upload("BATCH_HANDLER", {}, Buffer.alloc(10 * 1024 * 1024 + 1)))
      .status,
    413,
  );

  assert.equal(
    (await upload("BATCH_HANDLER", { extra: "unexpected" })).status,
    400,
  );

  assert.equal(await db.storedFile.count(), count);

  assert.deepEqual(await readdir(directory), files);
});

test("duplicate and stale uploads do not replace the PDF and clean their private objects", async () => {
  const files = await readdir(directory);

  const count = await db.storedFile.count();

  assert.equal((await upload("BATCH_HANDLER")).status, 409);

  assert.equal(
    (await upload("BATCH_HANDLER", { expectedVersion: 1 }, pdf("Duplicate")))
      .status,
    409,
  );

  assert.equal(await db.storedFile.count(), count);

  assert.deepEqual(await readdir(directory), files);

  assert.equal(
    (await db.gcashHistory.findUniqueOrThrow({ where: { id: historyId } }))
      .version,
    1,
  );
});

test("Records clarification and corrected resubmission preserve every file and review without changing payments", async () => {
  const beforeBalance = await (
    await request("FINANCE_OFFICER", `/clients/${customerId}/balance`)
  ).json();

  assert.equal(beforeBalance.remainingBalance, "70.00");

  assert.equal(beforeBalance.pendingAmount, "50.00");

  const beforePayments = JSON.stringify(await db.payment.findMany());

  const beforeSchedules = JSON.stringify(await db.scheduleItem.findMany());

  assert.equal(
    (
      await request("RECORDS", `/gcash-history/${historyId}/review`, "POST", {
        version: 1,
        status: "NEEDS_CLARIFICATION",
        note: "",
      })
    ).status,
    400,
  );

  const reviewed = await request(
    "RECORDS",
    `/gcash-history/${historyId}/review`,
    "POST",
    {
      version: 1,
      status: "NEEDS_CLARIFICATION",
      note: "Include the missing final page.",
    },
  );

  assert.equal(reviewed.status, 200);

  assert.equal((await reviewed.json()).status, "NEEDS_CLARIFICATION");

  assert.equal(
    (await upload("BATCH_HANDLER", { expectedVersion: 1 })).status,
    409,
  );

  const corrected = await upload(
    "BATCH_HANDLER",
    { expectedVersion: 2, note: "Full export with final page" },
    pdf("Corrected"),
  );

  assert.equal(corrected.status, 201);

  const second = await corrected.json();

  assert.equal(second.version, 3);

  assert.equal(second.revision, 2);

  assert.equal(second.status, "SUBMITTED");

  assert.equal(second.current.reviewNote, "");

  const history = await (
    await request("RECORDS", `/gcash-history/${historyId}/submissions`)
  ).json();

  assert.equal(history.total, 2);

  assert.equal(history.items[1].reviewNote, "Include the missing final page.");

  assert.equal(history.items[1].status, "NEEDS_CLARIFICATION");

  assert.deepEqual(
    Buffer.from(
      await (
        await request(
          "FINANCE_OFFICER",
          `/gcash-history/submissions/${firstSubmissionId}/file`,
        )
      ).arrayBuffer(),
    ),
    pdf(),
  );

  assert.equal(
    (
      await request("RECORDS", `/gcash-history/${historyId}/review`, "POST", {
        version: 3,
        status: "REVIEWED",
        note: "Full history and date range reviewed.",
      })
    ).status,
    200,
  );

  assert.deepEqual(
    await (
      await request("FINANCE_OFFICER", `/clients/${customerId}/balance`)
    ).json(),
    beforeBalance,
  );

  assert.equal(JSON.stringify(await db.payment.findMany()), beforePayments);

  assert.equal(
    JSON.stringify(await db.scheduleItem.findMany()),
    beforeSchedules,
  );

  assert.equal(
    (
      await request("RECORDS", `/gcash-history/${historyId}/review`, "POST", {
        version: 3,
        status: "REVIEWED",
        note: "Stale retry",
      })
    ).status,
    409,
  );
});

test("concurrent review across two API instances records exactly one decision", async () => {
  const created = await (
    await upload("BATCH_HANDLER", { periodEnd: "2026-10-17" })
  ).json();

  const responses = await Promise.all(
    [0, 1].map((server) => {
      return request(
        "RECORDS",
        `/gcash-history/${created.id}/review`,
        "POST",
        {
          version: 1,
          status: "REVIEWED",
          note: "Complete synthetic export reviewed",
        },
        server,
      );
    }),
  );

  assert.deepEqual(
    responses
      .map((response) => {
        return response.status;
      })
      .sort(),
    [200, 409],
  );

  assert.equal(
    await db.auditEntry.count({
      where: { recordId: created.id, action: "gcash_history.reviewed" },
    }),
    1,
  );
});

test("reviewers cannot review their own upload, and file retention does not erase review evidence implicitly", async () => {
  const created = await (
    await upload("SYSTEM_ADMIN", { periodEnd: "2026-10-18" })
  ).json();

  assert.equal(
    (
      await request(
        "SYSTEM_ADMIN",
        `/gcash-history/${created.id}/review`,
        "POST",
        {
          version: 1,
          status: "REVIEWED",
          note: "Self-review",
        },
      )
    ).status,
    403,
  );

  const stored = await db.gcashHistorySubmission.findUniqueOrThrow({
    where: { id: created.current.id },
  });

  const preview = await db.$transaction((tx) => {
    return describe(
      tx,
      { scope: "PRIVATE_FILE", subjectId: stored.fileId },
      people.get("SYSTEM_ADMIN")!.id,
    );
  });

  assert.ok(
    preview.blockers.some((message) => {
      return message.includes("GCash history review");
    }),
  );

  const employee = await db.$transaction((tx) => {
    return describe(
      tx,
      { scope: "EMPLOYEE", subjectId: people.get("SYSTEM_ADMIN")!.id },
      people.get("RECORDS")!.id,
    );
  });

  assert.ok(
    employee.blockers.some((message) => {
      return message.includes("Authored GCash history");
    }),
  );
});

test("batch reassignment immediately revokes old Handler access to histories and historical PDFs", async () => {
  await db.batch.update({
    where: { id: batchId },
    data: { handlerId: people.get("OTHER_HANDLER")!.id },
  });

  try {
    assert.equal(
      (await request("BATCH_HANDLER", `/gcash-history/${historyId}`)).status,
      404,
    );

    assert.equal(
      (
        await request(
          "BATCH_HANDLER",
          `/gcash-history/submissions/${firstSubmissionId}/file`,
        )
      ).status,
      404,
    );

    assert.equal(
      (await request("OTHER_HANDLER", `/gcash-history/${historyId}`)).status,
      200,
    );

    assert.equal(
      (
        await request(
          "OTHER_HANDLER",
          `/gcash-history/submissions/${firstSubmissionId}/file`,
        )
      ).status,
      200,
    );
  } finally {
    await db.batch.update({
      where: { id: batchId },
      data: { handlerId: people.get("BATCH_HANDLER")!.id },
    });
  }
});

test("permission and assignment changes during file saving are rechecked and the object is removed", async () => {
  const storage = apps[0].get(PrivateStorageService);

  const original = storage.saveDocument.bind(storage);

  const before = await readdir(directory);

  storage.saveDocument = async (...args) => {
    const key = await original(...args);

    await db.batch.update({
      where: { id: batchId },
      data: { handlerId: people.get("OTHER_HANDLER")!.id },
    });

    return key;
  };

  try {
    assert.equal(
      (await upload("BATCH_HANDLER", { periodEnd: "2026-10-19" })).status,
      404,
    );
  } finally {
    storage.saveDocument = original;

    await db.batch.update({
      where: { id: batchId },
      data: { handlerId: people.get("BATCH_HANDLER")!.id },
    });
  }

  assert.deepEqual(await readdir(directory), before);

  const user = people.get("RECORDS")!;

  await db.user.update({ where: { id: user.id }, data: { role: "COO" } });

  try {
    await assert.rejects(
      apps[0].get(GcashHistoryService).review(user.user, historyId, {
        version: 4,
        status: "REVIEWED",
        note: "Revoked reviewer",
      }),
      /access has changed/,
    );
  } finally {
    await db.user.update({ where: { id: user.id }, data: { role: "RECORDS" } });

    const login = await fetch(`${bases[0]}/api/auth/login`, {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.user.email, password }),
    });

    assert.equal(login.status, 200);

    user.cookie = login.headers
      .getSetCookie()
      .map((value) => {
        return value.split(";")[0];
      })
      .join("; ");
  }
});

test("audit failure rolls back upload/review and cleans up uploaded private files", async () => {
  const created = await (
    await upload("BATCH_HANDLER", { periodEnd: "2026-10-20" })
  ).json();

  const files = await readdir(directory);

  const count = await db.storedFile.count();

  await db.$executeRawUnsafe(
    `ALTER TABLE "AuditEntry" ADD CONSTRAINT "gcash_test_failure" CHECK (action NOT LIKE 'gcash_history.%') NOT VALID`,
  );

  try {
    assert.equal(
      (await upload("BATCH_HANDLER", { periodEnd: "2026-10-21" })).status,
      500,
    );

    assert.equal(
      (
        await request(
          "RECORDS",
          `/gcash-history/${created.id}/review`,
          "POST",
          { version: 1, status: "REVIEWED", note: "Synthetic failure" },
        )
      ).status,
      500,
    );
  } finally {
    await db.$executeRawUnsafe(
      `ALTER TABLE "AuditEntry" DROP CONSTRAINT "gcash_test_failure"`,
    );
  }

  assert.deepEqual(await readdir(directory), files);

  assert.equal(await db.storedFile.count(), count);

  assert.equal(
    (await db.gcashHistory.findUniqueOrThrow({ where: { id: created.id } }))
      .status,
    "SUBMITTED",
  );
});

test("status/search filters and bounded pagination include all matching histories without leaking private fields", async () => {
  const filtered = await (
    await request("RECORDS", `/gcash-history?status=REVIEWED&q=GC-${suffix}`)
  ).json();

  assert.equal(filtered.total, 2);

  assert.equal(
    filtered.items.every((item: { status: string }) => {
      return item.status === "REVIEWED";
    }),
    true,
  );

  assert.equal(
    (
      await (
        await request("BATCH_HANDLER", `/gcash-history?batchId=${otherBatchId}`)
      ).json()
    ).total,
    0,
  );

  for (const query of [
    "page=0",
    "page=100001",
    "status=APPROVED",
    "unknown=yes",
    "batchId=invalid",
  ]) {
    assert.equal(
      (await request("RECORDS", `/gcash-history?${query}`)).status,
      400,
    );
  }

  assert.doesNotMatch(
    JSON.stringify(filtered),
    /storageKey|passwordHash|email|fileId/,
  );
});

test("live PDF queue changes cross API instances and stay invisible to another Handler", async () => {
  const streams: {
    controller: AbortController;
    text: string;
    pump: Promise<void>;
  }[] = [];

  try {
    for (const [who, server] of [
      ["BATCH_HANDLER", 0],
      ["OTHER_HANDLER", 0],
      ["RECORDS", 1],
    ] as const) {
      const controller = new AbortController();

      const response = await fetch(`${bases[server]}/api/events`, {
        headers: { Origin: origin, Cookie: people.get(who)!.cookie },
        signal: controller.signal,
      });

      assert.equal(response.status, 200);

      const reader = response.body!.getReader();

      const state = { controller, text: "", pump: Promise.resolve() };

      state.pump = (async () => {
        try {
          while (true) {
            const result = await reader.read();

            if (result.done) {
              break;
            }

            state.text += new TextDecoder().decode(result.value);
          }
        } catch {
          /* Closing the stream cancels its pending read. */
        }
      })();

      streams.push(state);
    }

    const created = await (
      await upload("BATCH_HANDLER", { periodEnd: "2026-10-22" })
    ).json();

    for (
      let attempt = 0;
      attempt < 50 &&
      !(
        streams[0].text.includes(created.id) &&
        streams[2].text.includes(created.id)
      );
      attempt++
    ) {
      await new Promise((resolve) => {
        setTimeout(resolve, 100);
      });
    }

    assert.ok(streams[0].text.includes(created.id));

    assert.ok(streams[2].text.includes(created.id));

    await new Promise((resolve) => {
      setTimeout(resolve, 1100);
    });

    assert.equal(streams[1].text.includes(created.id), false);
  } finally {
    for (const stream of streams) {
      stream.controller.abort();

      await stream.pump;
    }
  }
});

test("queue pagination reads more than twenty submissions without duplicates or truncating totals", async () => {
  const storage = apps[0].get(PrivateStorageService);

  for (let day = 1; day <= 25; day++) {
    const bytes = pdf(`Pagination ${day}`);

    const storageKey = await storage.saveDocument({
      buffer: bytes,
      size: bytes.length,
      mimetype: "application/pdf",
      originalname: "pagination-history.pdf",
    });

    const date = new Date(`2040-01-${String(day).padStart(2, "0")}`);

    await db.gcashHistory.create({
      data: {
        batchId,
        periodStart: date,
        periodEnd: date,
        submissions: {
          create: {
            revision: 1,
            uploadedBy: { connect: { id: people.get("BATCH_HANDLER")!.id } },
            file: {
              create: {
                storageKey,
                originalName: "pagination-history.pdf",
                size: bytes.length,
                mimeType: "application/pdf",
                uploadedById: people.get("BATCH_HANDLER")!.id,
              },
            },
          },
        },
      },
    });
  }

  const first = await (
    await request("BATCH_HANDLER", "/gcash-history?status=SUBMITTED&page=1")
  ).json();

  const second = await (
    await request("BATCH_HANDLER", "/gcash-history?status=SUBMITTED&page=2")
  ).json();

  const total = await db.gcashHistory.count({
    where: { batchId, status: "SUBMITTED" },
  });

  assert.equal(first.total, total);

  assert.equal(second.total, total);

  assert.equal(first.items.length, 20);

  assert.equal(first.items.length + second.items.length, total);

  assert.equal(
    new Set(
      [...first.items, ...second.items].map((item: { id: string }) => {
        return item.id;
      }),
    ).size,
    total,
  );
});

let encryptedHistory: { id: string; current: { id: string }; version: number };

const fixture = (name: string) => {
  return readFileSync(join(__dirname, "fixtures/gcash", name));
};

test("encrypted uploads require the correct transient password and rejected attempts leave no files or records", async () => {
  const beforeFiles = await readdir(directory);

  const beforeRows = await db.gcashHistorySubmission.count();

  for (const password of [undefined, "wrong-synthetic-password"]) {
    const response = await upload(
      "BATCH_HANDLER",
      { periodEnd: "2026-10-23", ...(password ? { password } : {}) },
      fixture("encrypted.pdf"),
    );

    assert.equal(response.status, 400);

    assert.match((await response.json()).message, /password/i);
  }

  assert.equal(await db.gcashHistorySubmission.count(), beforeRows);

  assert.deepEqual(await readdir(directory), beforeFiles);

  const response = await upload(
    "BATCH_HANDLER",
    { periodEnd: "2026-10-23", password: "synthetic-test-only" },
    fixture("encrypted.pdf"),
  );

  assert.equal(response.status, 201);

  encryptedHistory = await response.json();

  const reading = await request(
    "RECORDS",
    `/gcash-history/submissions/${encryptedHistory.current.id}/reading`,
  );

  assert.equal(reading.status, 200);

  assert.match(reading.headers.get("cache-control")!, /private, no-store/);

  const result = await reading.json();

  assert.equal(result.method, "TEXT");

  assert.equal(result.status, "PARSED");

  assert.equal(result.transactionCount, 3);

  assert.equal(result.items[0].reference, "0000000000001");

  assert.match(result.items[1].description, /Additional synthetic description/);

  assert.deepEqual(result.checks, {
    debitTotalMatches: true,
    creditTotalMatches: true,
    runningBalancesMatch: true,
    closingBalanceMatches: true,
  });

  const stored = await db.gcashPdfReading.findUniqueOrThrow({
    where: { submissionId: encryptedHistory.current.id },
  });

  const audits = await db.auditEntry.findMany({
    where: { recordId: encryptedHistory.id },
  });

  assert.doesNotMatch(
    JSON.stringify([encryptedHistory, stored.data, audits]),
    /synthetic-test-only|password/i,
  );

  const downloaded = await request(
    "BATCH_HANDLER",
    `/gcash-history/submissions/${encryptedHistory.current.id}/file`,
  );

  assert.deepEqual(
    Buffer.from(await downloaded.arrayBuffer()),
    fixture("encrypted.pdf"),
  );
});

test("extracted rows follow current read permissions and assignment scope for every role", async () => {
  const path = `/gcash-history/submissions/${encryptedHistory.current.id}/reading`;

  assert.equal((await request(null, path)).status, 401);

  for (const role of roles) {
    const expected =
      role === "CORE_HANDLER"
        ? 404
        : rolePermissions[role].includes("GCASH_HISTORY_READ")
          ? 200
          : 403;

    assert.equal((await request(role, path)).status, expected, role);
  }

  assert.equal((await request("OTHER_HANDLER", path)).status, 404);

  for (const query of ["page=0", "page=1&unexpected=yes"]) {
    assert.equal((await request("RECORDS", `${path}?${query}`)).status, 400);
  }

  const before = await db.batch.findUniqueOrThrow({ where: { id: batchId } });

  await db.batch.update({
    where: { id: batchId },
    data: { handlerId: people.get("OTHER_HANDLER")!.id },
  });

  try {
    assert.equal((await request("BATCH_HANDLER", path)).status, 404);
  } finally {
    await db.batch.update({
      where: { id: batchId },
      data: { handlerId: before.handlerId },
    });
  }
});

test("scanned PDFs use actual Tesseract and keep the extraction flagged for human review", async () => {
  const response = await upload(
    "BATCH_HANDLER",
    { periodEnd: "2026-10-24" },
    fixture("scanned.pdf"),
  );

  assert.equal(response.status, 201);

  const result = await response.json();

  const reading = await (
    await request(
      "RECORDS",
      `/gcash-history/submissions/${result.current.id}/reading`,
    )
  ).json();

  assert.equal(reading.method, "OCR");

  assert.equal(reading.transactionCount, 3);

  assert.equal(reading.status, "PARTIAL");

  assert.ok(
    reading.warnings.some((value: string) => {
      return value.includes("OCR");
    }),
  );
});

test("unrecognized layouts retain the original PDF with an explicit manual-review warning", async () => {
  const response = await upload(
    "BATCH_HANDLER",
    { periodEnd: "2026-10-25" },
    fixture("blank.pdf"),
  );

  assert.equal(response.status, 201);

  const result = await response.json();

  const reading = await (
    await request(
      "RECORDS",
      `/gcash-history/submissions/${result.current.id}/reading`,
    )
  ).json();

  assert.equal(reading.status, "UNSUPPORTED");

  assert.equal(reading.transactionCount, 0);

  assert.ok(reading.warnings.length > 0);
});

test("page-limit and corrupt-PDF errors do not create evidence or files", async () => {
  const before = await db.gcashHistorySubmission.count();

  const beforeFiles = await readdir(directory);

  for (const bytes of [
    fixture("too-many-pages.pdf"),
    Buffer.from("%PDF-1.7\ncorrupt\n%%EOF"),
  ]) {
    assert.equal(
      (await upload("BATCH_HANDLER", { periodEnd: "2026-10-26" }, bytes))
        .status,
      400,
    );
  }

  assert.equal(await db.gcashHistorySubmission.count(), before);

  assert.deepEqual(await readdir(directory), beforeFiles);
});

test("corrected submissions retain their own extracted table and leave the earlier encrypted revision intact", async () => {
  const response = await request(
    "RECORDS",
    `/gcash-history/${encryptedHistory.id}/review`,
    "POST",
    {
      version: 1,
      status: "NEEDS_CLARIFICATION",
      note: "Synthetic correction test",
    },
  );

  assert.equal(response.status, 200);

  const corrected = await upload(
    "BATCH_HANDLER",
    { periodEnd: "2026-10-23", expectedVersion: 2 },
    pdf("Corrected reading"),
  );

  assert.equal(corrected.status, 201);

  const next = await corrected.json();

  assert.notEqual(next.current.id, encryptedHistory.current.id);

  for (const submission of [encryptedHistory.current.id, next.current.id]) {
    const read = await request(
      "RECORDS",
      `/gcash-history/submissions/${submission}/reading`,
    );

    assert.equal(read.status, 200);

    assert.equal((await read.json()).transactionCount, 3);
  }

  const rows = await (
    await request(
      "RECORDS",
      `/gcash-history/${encryptedHistory.id}/submissions`,
    )
  ).json();

  assert.equal(rows.items.length, 2);

  assert.ok(
    rows.items.every((item: { reading: unknown }) => {
      return item.reading;
    }),
  );
});

test("transaction pagination returns all rows without expanding queue payloads", async () => {
  const stored = await db.gcashPdfReading.findUniqueOrThrow({
    where: { submissionId: encryptedHistory.current.id },
  });

  const data = stored.data as unknown as {
    rows: object[];
    transactionCount: number;
  };

  const rows = Array.from({ length: 31 }, (_, index) => {
    return { ...data.rows[0], reference: String(index + 1).padStart(13, "0") };
  });

  await db.gcashPdfReading.update({
    where: { submissionId: stored.submissionId },
    data: {
      data: JSON.parse(
        JSON.stringify({ ...data, rows, transactionCount: rows.length }),
      ),
    },
  });

  const first = await (
    await request(
      "RECORDS",
      `/gcash-history/submissions/${stored.submissionId}/reading?page=1`,
    )
  ).json();

  const second = await (
    await request(
      "RECORDS",
      `/gcash-history/submissions/${stored.submissionId}/reading?page=2`,
    )
  ).json();

  assert.equal(first.total, 31);

  assert.equal(first.items.length, 25);

  assert.equal(second.items.length, 6);

  assert.equal(
    new Set(
      [...first.items, ...second.items].map((row) => {
        return row.reference;
      }),
    ).size,
    31,
  );

  const queue = await (await request("RECORDS", "/gcash-history")).json();

  assert.doesNotMatch(
    JSON.stringify(queue),
    /calculatedDebit|openingBalance|rows|0000000000001/,
  );
});

test("selected coverage mismatch is flagged and PDF reading never changes payment or schedule rows", async () => {
  const before = [await db.payment.count(), await db.scheduleItem.count()];

  const response = await upload("BATCH_HANDLER", {
    periodStart: "2027-01-01",
    periodEnd: "2027-01-31",
  });

  assert.equal(response.status, 201);

  const saved = await response.json();

  const reading = await (
    await request(
      "RECORDS",
      `/gcash-history/submissions/${saved.current.id}/reading`,
    )
  ).json();

  assert.equal(reading.status, "PARTIAL");

  assert.ok(
    reading.warnings.some((warning: string) => {
      return warning.includes("covered period");
    }),
  );

  assert.deepEqual(
    [await db.payment.count(), await db.scheduleItem.count()],
    before,
  );
});

async function workspaceFixture(day: number) {
  const response = await upload("BATCH_HANDLER", {
    periodStart: "2031-01-01",
    periodEnd: `2031-01-${String(day).padStart(2, "0")}`,
  });

  assert.equal(response.status, 201);

  const history = await response.json();

  const reading = await (
    await request(
      "RECORDS",
      `/gcash-history/submissions/${history.current.id}/reading`,
    )
  ).json();

  const { page: _, warnings: __, ...row } = reading.items[0];

  return {
    history,
    reading,
    input: {
      version: history.version,
      correctionVersion: 0,
      rowIndex: 0,
      reason: "Compared with synthetic PDF",
      row: {
        ...row,
        date: "2026-10-01",
        time: "09:00",
        description: "Synthetic manually corrected description",
      },
    },
  };
}

test("manual correction preserves source bytes/extraction and prior review, reopens review and leaves financial rows unchanged", async () => {
  const { history, input } = await workspaceFixture(1);

  const before = await db.gcashPdfReading.findUniqueOrThrow({
    where: { submissionId: history.current.id },
  });

  const bytes = Buffer.from(
    await (
      await request(
        "RECORDS",
        `/gcash-history/submissions/${history.current.id}/file`,
      )
    ).arrayBuffer(),
  );

  const financial = JSON.stringify([
    await db.payment.findMany(),
    await db.scheduleItem.findMany(),
  ]);

  assert.equal(
    (
      await request("RECORDS", `/gcash-history/${history.id}/review`, "POST", {
        version: 1,
        status: "REVIEWED",
        note: "Earlier review preserved",
      })
    ).status,
    200,
  );

  const response = await request(
    "RECORDS",
    `/gcash-history/submissions/${history.current.id}/corrections`,
    "POST",
    { ...input, version: 2 },
  );

  assert.equal(response.status, 200, await response.clone().text());

  const saved = await response.json();

  assert.equal(saved.status, "SUBMITTED");

  assert.equal(saved.version, 3);

  assert.equal(saved.current.reviewedAt, null);

  const stored = await db.gcashPdfReading.findUniqueOrThrow({
    where: { submissionId: history.current.id },
  });

  assert.deepEqual(stored.data, before.data);

  assert.equal(stored.correctionVersion, 1);

  const original = await (
    await request(
      "RECORDS",
      `/gcash-history/submissions/${history.current.id}/reading?source=original`,
    )
  ).json();

  assert.equal(
    original.items[0].description,
    (before.data as { rows: { description: string }[] }).rows[0].description,
  );

  assert.equal(original.editable, false);

  const log = await (
    await request(
      "RECORDS",
      `/gcash-history/submissions/${history.current.id}/corrections`,
    )
  ).json();

  assert.equal(log.total, 1);

  assert.equal(log.items[0].editor.id, people.get("RECORDS")!.id);

  assert.equal(log.items[0].before.description, original.items[0].description);

  assert.equal(log.items[0].after.description, input.row.description);

  const audit = await db.auditEntry.findFirstOrThrow({
    where: {
      recordId: history.id,
      action: "gcash_history.transaction_corrected",
    },
  });

  assert.equal(
    (audit.before as { current: { reviewNote: string } }).current.reviewNote,
    "Earlier review preserved",
  );

  const activityResponse = await request(
    "RECORDS",
    `/gcash-history/${history.id}/activity`,
  );

  assert.equal(
    activityResponse.headers.get("cache-control"),
    "private, no-store",
  );

  const activity = await activityResponse.json();

  assert.ok(
    activity.items.some((item: { previousReview: { note: string } | null }) => {
      return item.previousReview?.note === "Earlier review preserved";
    }),
  );

  assert.doesNotMatch(
    JSON.stringify(activity),
    /storageKey|password|correctedData/,
  );

  assert.equal(
    (await request("OTHER_HANDLER", `/gcash-history/${history.id}/activity`))
      .status,
    404,
  );

  assert.equal(
    (await request("CEO", `/gcash-history/${history.id}/activity`)).status,
    403,
  );

  assert.deepEqual(
    Buffer.from(
      await (
        await request(
          "RECORDS",
          `/gcash-history/submissions/${history.current.id}/file`,
        )
      ).arrayBuffer(),
    ),
    bytes,
  );

  assert.equal(
    JSON.stringify([
      await db.payment.findMany(),
      await db.scheduleItem.findMany(),
    ]),
    financial,
  );
});

test("correction and archive mutations enforce the existing role matrix and private correction reads follow assignment", async () => {
  const { history, input } = await workspaceFixture(2);

  for (const role of roles) {
    if (rolePermissions[role].includes("GCASH_HISTORY_REVIEW")) {
      continue;
    }

    assert.equal(
      (
        await request(
          role,
          `/gcash-history/submissions/${history.current.id}/corrections`,
          "POST",
          input,
        )
      ).status,
      403,
      role,
    );

    assert.equal(
      (
        await request(role, `/gcash-history/${history.id}/archive`, "POST", {
          version: 1,
          reason: "Synthetic archive",
          archived: true,
        })
      ).status,
      403,
      role,
    );
  }

  assert.equal(
    (
      await request(
        "OTHER_HANDLER",
        `/gcash-history/submissions/${history.current.id}/corrections`,
      )
    ).status,
    404,
  );

  assert.equal(
    (
      await request(
        "CEO",
        `/gcash-history/submissions/${history.current.id}/corrections`,
      )
    ).status,
    403,
  );

  assert.equal(
    (
      await request(
        null,
        `/gcash-history/submissions/${history.current.id}/corrections`,
      )
    ).status,
    401,
  );

  const handler = people.get("BATCH_HANDLER")!;

  await db.batch.update({
    where: { id: batchId },
    data: { handlerId: people.get("OTHER_HANDLER")!.id },
  });

  try {
    assert.equal(
      (
        await request(
          "BATCH_HANDLER",
          `/gcash-history/submissions/${history.current.id}/corrections`,
        )
      ).status,
      404,
    );
  } finally {
    await db.batch.update({
      where: { id: batchId },
      data: { handlerId: handler.id },
    });
  }

  assert.equal(
    (
      await request(
        "SYSTEM_ADMIN",
        `/gcash-history/submissions/${history.current.id}/corrections`,
        "POST",
        input,
      )
    ).status,
    200,
  );
});

test("invalid corrections and empty archive reasons do not mutate evidence", async () => {
  const { history, input } = await workspaceFixture(3);

  for (const body of [
    { ...input, reason: " " },
    { ...input, row: { ...input.row, debit: "-1.00" } },
    { ...input, row: { ...input.row, verified: true } },
  ]) {
    assert.equal(
      (
        await request(
          "RECORDS",
          `/gcash-history/submissions/${history.current.id}/corrections`,
          "POST",
          body,
        )
      ).status,
      400,
    );
  }

  assert.equal(
    (
      await request("RECORDS", `/gcash-history/${history.id}/archive`, "POST", {
        version: 1,
        reason: " ",
        archived: true,
      })
    ).status,
    400,
  );

  assert.equal(
    (
      await request(
        "RECORDS",
        `/gcash-history/submissions/${history.current.id}/corrections`,
        "POST",
        { ...input, rowIndex: 999 },
      )
    ).status,
    400,
  );

  assert.equal(
    await db.gcashReadingCorrection.count({
      where: { submissionId: history.current.id },
    }),
    0,
  );

  assert.equal(
    (await db.gcashHistory.findUniqueOrThrow({ where: { id: history.id } }))
      .version,
    1,
  );
});

test("simultaneous corrections across API instances commit exactly once and reject stale review versions", async () => {
  const { history, input } = await workspaceFixture(4);

  const responses = await Promise.all(
    [0, 1].map((server) => {
      return request(
        "RECORDS",
        `/gcash-history/submissions/${history.current.id}/corrections`,
        "POST",
        input,
        server,
      );
    }),
  );

  assert.deepEqual(
    responses
      .map((response) => {
        return response.status;
      })
      .sort(),
    [200, 409],
  );

  assert.equal(
    await db.gcashReadingCorrection.count({
      where: { submissionId: history.current.id },
    }),
    1,
  );

  assert.equal(
    (
      await request("RECORDS", `/gcash-history/${history.id}/review`, "POST", {
        version: 1,
        status: "REVIEWED",
        note: "Stale review",
      })
    ).status,
    409,
  );

  const reading = await (
    await request(
      "RECORDS",
      `/gcash-history/submissions/${history.current.id}/reading`,
    )
  ).json();

  assert.equal(reading.correctionVersion, 1);

  assert.equal(reading.historyVersion, 2);
});

test("archive and restore preserve reviews, reserve duplicate keys, retain readable PDFs and block edits/uploads while archived", async () => {
  const { history, input } = await workspaceFixture(5);

  await request("RECORDS", `/gcash-history/${history.id}/review`, "POST", {
    version: 1,
    status: "REVIEWED",
    note: "Retained review",
  });

  const response = await request(
    "RECORDS",
    `/gcash-history/${history.id}/archive`,
    "POST",
    { version: 2, reason: "Synthetic duplicate period", archived: true },
  );

  assert.equal(response.status, 200);

  const archived = await response.json();

  assert.ok(archived.archivedAt);

  assert.equal(archived.archivedBy.id, people.get("RECORDS")!.id);

  const queue = await (
    await request("RECORDS", `/gcash-history?q=GC-${suffix}`)
  ).json();

  assert.ok(
    queue.items.every((item: { id: string }) => {
      return item.id !== history.id;
    }),
  );

  const archive = await (
    await request("RECORDS", `/gcash-history?archived=archived&q=GC-${suffix}`)
  ).json();

  assert.ok(
    archive.items.some((item: { id: string }) => {
      return item.id === history.id;
    }),
  );

  assert.equal(
    (
      await request(
        "BATCH_HANDLER",
        `/gcash-history/submissions/${history.current.id}/file`,
      )
    ).status,
    200,
  );

  assert.equal(
    (
      await request(
        "RECORDS",
        `/gcash-history/submissions/${history.current.id}/corrections`,
        "POST",
        { ...input, version: 3 },
      )
    ).status,
    409,
  );

  assert.equal(
    (
      await request("RECORDS", `/gcash-history/${history.id}/review`, "POST", {
        version: 3,
        status: "REVIEWED",
        note: "Blocked",
      })
    ).status,
    409,
  );

  assert.equal(
    (
      await upload("BATCH_HANDLER", {
        periodStart: "2031-01-01",
        periodEnd: "2031-01-05",
        expectedVersion: 3,
      })
    ).status,
    409,
  );

  assert.equal(
    (
      await request("RECORDS", `/gcash-history/${history.id}/archive`, "POST", {
        version: 2,
        reason: "Stale restore",
        archived: false,
      })
    ).status,
    409,
  );

  const restored = await (
    await request("RECORDS", `/gcash-history/${history.id}/archive`, "POST", {
      version: 3,
      reason: "Restore evidence",
      archived: false,
    })
  ).json();

  assert.equal(restored.archivedAt, null);

  assert.equal(restored.status, "REVIEWED");

  assert.equal(restored.current.reviewNote, "Retained review");

  assert.equal(restored.version, 4);
});

test("historical revisions stay read-only, while their corrections and original extraction remain available", async () => {
  const { history, input } = await workspaceFixture(6);

  await request(
    "RECORDS",
    `/gcash-history/submissions/${history.current.id}/corrections`,
    "POST",
    input,
  );

  await request("RECORDS", `/gcash-history/${history.id}/review`, "POST", {
    version: 2,
    status: "NEEDS_CLARIFICATION",
    note: "Replacement requested",
  });

  const replacement = await upload("BATCH_HANDLER", {
    periodStart: "2031-01-01",
    periodEnd: "2031-01-06",
    expectedVersion: 3,
  });

  assert.equal(replacement.status, 201);

  const reading = await (
    await request(
      "RECORDS",
      `/gcash-history/submissions/${history.current.id}/reading`,
    )
  ).json();

  assert.equal(reading.editable, false);

  assert.equal(reading.correctionVersion, 1);

  assert.equal(
    (
      await request(
        "RECORDS",
        `/gcash-history/submissions/${history.current.id}/corrections`,
        "POST",
        { ...input, version: 4, correctionVersion: 1 },
      )
    ).status,
    409,
  );

  const log = await request(
    "FINANCE_OFFICER",
    `/gcash-history/submissions/${history.current.id}/corrections`,
  );

  assert.equal(log.headers.get("cache-control"), "private, no-store");

  assert.equal((await log.json()).total, 1);
});

test("audit failure rolls back corrections, status and archival atomically", async () => {
  const { history, input } = await workspaceFixture(7);

  await db.$executeRawUnsafe(
    `ALTER TABLE "AuditEntry" ADD CONSTRAINT "gcash_workspace_failure" CHECK (action NOT LIKE 'gcash_history.%') NOT VALID`,
  );

  try {
    assert.equal(
      (
        await request(
          "RECORDS",
          `/gcash-history/submissions/${history.current.id}/corrections`,
          "POST",
          input,
        )
      ).status,
      500,
    );

    assert.equal(
      (
        await request(
          "RECORDS",
          `/gcash-history/${history.id}/archive`,
          "POST",
          { version: 1, reason: "Will fail", archived: true },
        )
      ).status,
      500,
    );
  } finally {
    await db.$executeRawUnsafe(
      `ALTER TABLE "AuditEntry" DROP CONSTRAINT "gcash_workspace_failure"`,
    );
  }

  assert.equal(
    await db.gcashReadingCorrection.count({
      where: { submissionId: history.current.id },
    }),
    0,
  );

  const stored = await db.gcashHistory.findUniqueOrThrow({
    where: { id: history.id },
  });

  assert.equal(stored.version, 1);

  assert.equal(stored.archivedAt, null);
});

test("correction authors remain protected from generic employee retention after review metadata resets", async () => {
  const { history, input } = await workspaceFixture(8);

  const editor = await db.user.create({
    data: {
      name: "Synthetic correction author",
      email: `gcash-editor-${suffix}@example.test`,
      role: "RECORDS",
      passwordHash: "unused-synthetic-account",
    },
  });

  await apps[0]
    .get(GcashHistoryService)
    .correct(safeUser(editor), history.current.id, input);

  const manifest = await db.$transaction((tx) => {
    return describe(
      tx,
      { scope: "EMPLOYEE", subjectId: editor.id },
      people.get("SYSTEM_ADMIN")!.id,
    );
  });

  assert.ok(
    manifest.blockers.some((message) => {
      return message.includes("Authored GCash history");
    }),
  );

  await db.user.update({ where: { id: editor.id }, data: { role: "COO" } });

  await assert.rejects(
    apps[0]
      .get(GcashHistoryService)
      .correct(safeUser(editor), history.current.id, {
        ...input,
        version: 2,
        correctionVersion: 1,
      }),
    /access has changed/,
  );
});

test("payment match suggestions enforce exact scoped evidence, duplicates, pages and corrected versions without changing money", async () => {
  const batch = await db.batch.create({
    data: {
      code: `MATCH-${suffix}`,
      model: "Synthetic",
      handlerId: people.get("BATCH_HANDLER")!.id,
      startDate: new Date("2050-10-01"),
      endDate: new Date("2051-10-01"),
    },
  });

  const client = await db.client.create({
    data: {
      batchId: batch.id,
      name: "Synthetic match member",
      email: "",
      phone: "",
    },
  });

  const baseRow = {
    page: 1,
    date: "2050-10-01",
    time: "23:59",
    description: "Synthetic incoming",
    reference: "EXACT",
    debit: null,
    credit: "0.20",
    balance: null,
    warnings: [],
  };

  const rows = Array.from({ length: 27 }, () => {
    return { ...baseRow, reference: "", credit: "0.00" };
  });

  const references = [
    "EXACT",
    "DUP-ROWS",
    "AMOUNT",
    "DATE",
    "DUP-PAY",
    "",
    "FOREIGN",
    "BANK",
    "REJECTED",
    "CENTAVO",
    "exact",
  ];

  references.forEach((reference, index) => {
    rows[index] = { ...baseRow, reference };
  });

  rows[9].credit = "0.30";

  rows[11] = { ...baseRow, reference: "DUP-REJECTED" };

  rows[26] = { ...rows[1], page: 2 };

  const reading = {
    version: 1,
    status: "PARTIAL",
    method: "TEXT",
    pages: 2,
    transactionCount: rows.length,
    rows,
    openingBalance: null,
    closingBalance: null,
    totalDebit: null,
    totalCredit: null,
    calculatedDebit: "0.00",
    calculatedCredit: "2.10",
    checks: {
      debitTotalMatches: null,
      creditTotalMatches: null,
      runningBalancesMatch: null,
      closingBalanceMatches: null,
    },
    warnings: [],
  };

  const file = await db.storedFile.create({
    data: {
      storageKey: randomUUID(),
      originalName: "synthetic-matches.pdf",
      mimeType: "application/pdf",
      size: 8,
      uploadedById: people.get("BATCH_HANDLER")!.id,
    },
  });

  const history = await db.gcashHistory.create({
    data: {
      batchId: batch.id,
      periodStart: new Date("2050-10-01"),
      periodEnd: new Date("2050-10-31"),
      submissions: {
        create: {
          revision: 1,
          uploadedById: people.get("BATCH_HANDLER")!.id,
          fileId: file.id,
          reading: { create: { data: reading } },
        },
      },
    },
    include: { submissions: true },
  });

  const submissionId = history.submissions[0].id;

  const makePayment = (
    referenceNumber: string | null,
    amount = "0.20",
    paymentDate = "2050-10-01",
    extra = {},
  ) => {
    return db.payment.create({
      data: {
        clientId: client.id,
        batchId: batch.id,
        amount,
        paymentDate: new Date(paymentDate),
        method: "GCash",
        referenceNumber,
        recordedById: people.get("BATCH_HANDLER")!.id,
        ...extra,
      },
    });
  };

  const exact = await makePayment("EXACT");

  await makePayment("DUP-ROWS");

  await makePayment("AMOUNT", "0.21");

  await makePayment("DATE", "0.20", "2050-10-02");

  await makePayment("DUP-PAY");

  await makePayment("DUP-PAY", "0.20", "2040-01-01");

  await makePayment("BANK", "0.20", "2050-10-01", { method: "bank" });

  await makePayment("REJECTED", "0.20", "2050-10-01", { status: "REJECTED" });

  await makePayment("CENTAVO", "0.31");

  await makePayment("DUP-REJECTED");

  await makePayment("DUP-REJECTED", "0.20", "2050-10-01", {
    status: "REJECTED",
  });

  await makePayment(null);

  const foreign = await makePayment("FOREIGN", "0.20", "2050-10-01", {
    batchId: otherBatchId,
  });

  await db.payment.createMany({
    data: Array.from({ length: 2500 }, (_, index) => {
      return {
        clientId: client.id,
        batchId: batch.id,
        amount: "1.00",
        paymentDate: new Date("2040-01-01"),
        method: "GCash",
        referenceNumber: `BACKLOG-${index}`,
        recordedById: people.get("BATCH_HANDLER")!.id,
      };
    }),
  });

  const plans = await db.$queryRaw<
    { "QUERY PLAN": Array<{ "Execution Time": number }> }[]
  >(
    Prisma.sql`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${paymentMatchSql(batch.id, rows)}`,
  );

  console.info({
    feature: "gcash-payment-matches",
    backlog: 2500,
    executionMs: plans[0]["QUERY PLAN"][0]["Execution Time"],
  });

  const before = await db.payment.findMany({
    where: { batchId: batch.id },
    orderBy: { id: "asc" },
  });

  const path = `/gcash-history/submissions/${submissionId}/reading`;

  const response = await request("RECORDS", path);

  assert.equal(response.status, 200);

  const result = await response.json();

  assert.equal(result.total, 27);

  assert.equal(result.paymentMatches.length, 25);

  assert.deepEqual(
    result.paymentMatches.slice(0, 11).map((match: { status: string }) => {
      return match.status;
    }),
    [
      "SUGGESTED",
      "AMBIGUOUS",
      "UNMATCHED",
      "UNMATCHED",
      "AMBIGUOUS",
      "MISSING_REFERENCE",
      "UNMATCHED",
      "UNMATCHED",
      "UNMATCHED",
      "UNMATCHED",
      "UNMATCHED",
    ],
  );

  assert.equal(result.paymentMatches[0].paymentId, exact.id);

  assert.equal(result.paymentMatches[11].status, "AMBIGUOUS");

  assert.equal(result.unmatchedPayments, 4);

  assert(!JSON.stringify(result).includes(foreign.id));

  const page2 = await (
    await request("FINANCE_OFFICER", `${path}?page=2`)
  ).json();

  assert.equal(page2.paymentMatches[1].rowIndex, 26);

  assert.equal(page2.paymentMatches[1].status, "AMBIGUOUS");

  assert.equal((await request("OTHER_HANDLER", path)).status, 404);

  assert.equal((await request(null, path)).status, 401);

  for (const role of roles) {
    const permitted =
      rolePermissions[role].includes("GCASH_HISTORY_READ") &&
      rolePermissions[role].includes("PAYMENT_READ");

    const response = await request(role, path);

    assert.equal(
      response.status,
      permitted ? (role === "CORE_HANDLER" ? 404 : 200) : 403,
      role,
    );
  }

  const corrected = structuredClone(reading);

  corrected.rows[0].credit = "0.21";

  await db.gcashPdfReading.update({
    where: { submissionId },
    data: { correctedData: corrected, correctionVersion: 1 },
  });

  const current = await (await request("RECORDS", path)).json();

  const original = await (
    await request("RECORDS", `${path}?source=original`)
  ).json();

  assert.equal(current.paymentMatches[0].status, "UNMATCHED");

  assert.equal(current.correctionVersion, 1);

  assert.equal(original.paymentMatches[0].status, "SUGGESTED");

  assert.deepEqual(
    await db.payment.findMany({
      where: { batchId: batch.id },
      orderBy: { id: "asc" },
    }),
    before,
  );

  await db.batch.update({
    where: { id: batch.id },
    data: { handlerId: people.get("OTHER_HANDLER")!.id },
  });

  assert.equal((await request("BATCH_HANDLER", path)).status, 404);

  assert.equal((await request("OTHER_HANDLER", path)).status, 200);

  assert.equal((await request("RECORDS", `${path}?page=0`)).status, 400);
});
