import "reflect-metadata";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import { roles, type Role } from "@freshphones/contracts";
import { createApp } from "../src/app";
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
        code: `CHAIN-${suffix}`,
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

test("Handler can record without proof as a pending claim without changing credit", async () => {
  const beforeResponse = await request(
    "BATCH_HANDLER",
    `/clients/${clientId}/balance`,
  );

  assert.equal(beforeResponse.status, 200);

  const beforeBalance = await beforeResponse.json();

  const response = await request("BATCH_HANDLER", "/payments", {
    clientId,
    amount: "15.00",
    method: "GCash",
    paymentDate: "2049-03-01",
    referenceNumber: `without-proof-${suffix}`,
  });

  assert.equal(response.status, 201);

  const recorded = await row((await response.json()).id);

  assert.equal(recorded.status, "PENDING");

  assert.equal(recorded.proofFileId, null);

  assert.equal(recorded.recordedById, sessions.get("BATCH_HANDLER")!.id);

  const afterResponse = await request(
    "BATCH_HANDLER",
    `/clients/${clientId}/balance`,
  );

  assert.equal(afterResponse.status, 200);

  const afterBalance = await afterResponse.json();

  assert.equal(afterBalance.verifiedPaid, beforeBalance.verifiedPaid);

  assert.equal(afterBalance.remainingBalance, beforeBalance.remainingBalance);

  assert.equal((await review(recorded.id, "RECORDS", "RECORDS")).status, 409);
});

test("Finance cannot skip either approval for any decision; only verification changes credit", async () => {
  const p = await payment();

  for (const decision of ["VERIFIED", "REJECTED", "NEEDS_CLARIFICATION"]) {
    assert.equal((await finance(p.id, undefined, decision)).status, 409);
  }

  assert.equal((await review(p.id, "BATCH_MANAGER", "MANAGER")).status, 409);

  assert.equal((await review(p.id, "RECORDS", "RECORDS")).status, 200);

  assert.equal((await finance(p.id)).status, 409);

  const before = await (
    await request("FINANCE_OFFICER", `/clients/${clientId}/balance`)
  ).json();

  assert.equal(before.verifiedPaid, "0.00");

  assert.equal((await review(p.id, "BATCH_MANAGER", "MANAGER")).status, 200);

  const response = await finance(p.id);

  assert.equal(response.status, 200);

  const after = await (
    await request("FINANCE_OFFICER", `/clients/${clientId}/balance`)
  ).json();

  assert.equal(after.verifiedPaid, "10.00");

  assert.equal((await row(p.id)).version, 4);

  assert.equal(await db.auditEntry.count({ where: { recordId: p.id } }), 3);
});

test("review endpoint role matrix denies all other roles and stage substitution", async () => {
  for (const role of roles) {
    const p = await payment();

    assert.equal(
      (await review(p.id, role, "RECORDS")).status,
      role === "RECORDS" ? 200 : 403,
      role,
    );
  }

  const p = await payment();

  assert.equal((await review(p.id, "RECORDS", "MANAGER")).status, 403);

  assert.equal((await review(p.id, "BATCH_MANAGER", "RECORDS")).status, 403);

  assert.equal((await review(p.id, "OTHER_MANAGER", "MANAGER")).status, 404);
});

test("receipt evidence is required and returns require a note", async () => {
  const p = await payment(false);

  assert.equal((await review(p.id, "RECORDS", "RECORDS")).status, 409);

  assert.equal(
    (
      await request("RECORDS", `/payments/${p.id}/operational-review`, {
        stage: "RECORDS",
        decision: "RETURNED",
        version: 1,
        notes: " ",
      })
    ).status,
    400,
  );

  assert.equal(
    (await review(p.id, "RECORDS", "RECORDS", "RETURNED")).status,
    200,
  );

  assert.equal((await row(p.id)).status, "NEEDS_CLARIFICATION");
});

test("stale and concurrent reviews allow one winner", async () => {
  const p = await payment();

  const responses = await Promise.all([
    review(p.id, "RECORDS", "RECORDS", "APPROVED", 1),
    review(p.id, "RECORDS", "RECORDS", "APPROVED", 1),
  ]);

  assert.deepEqual(
    responses
      .map((r) => {
        return r.status;
      })
      .sort(),
    [200, 409],
  );

  assert.equal(
    (await review(p.id, "BATCH_MANAGER", "MANAGER", "APPROVED", 1)).status,
    409,
  );

  assert.equal(
    await db.paymentOperationalReview.count({ where: { paymentId: p.id } }),
    1,
  );
});

test("corrections invalidate both approvals while retaining review history", async () => {
  const p = await payment();

  await approve(p.id);

  assert.equal((await correct(p.id)).status, 200);

  assert.equal((await finance(p.id)).status, 409);

  assert.equal((await review(p.id, "BATCH_MANAGER", "MANAGER")).status, 409);

  await approve(p.id);

  assert.equal(
    await db.paymentOperationalReview.count({ where: { paymentId: p.id } }),
    4,
  );

  assert.equal((await finance(p.id)).status, 200);

  assert.equal((await correct(p.id)).status, 409);
});

test("Manager return needs Handler correction and renewed Records review", async () => {
  const p = await payment();

  await review(p.id, "RECORDS", "RECORDS");

  assert.equal(
    (await review(p.id, "BATCH_MANAGER", "MANAGER", "RETURNED")).status,
    200,
  );

  assert.equal((await finance(p.id)).status, 409);

  assert.equal((await review(p.id, "RECORDS", "RECORDS")).status, 409);

  assert.equal((await correct(p.id)).status, 200);

  await approve(p.id);

  assert.equal((await finance(p.id)).status, 200);
});

test("replacement proof invalidates approvals and preserves the original file", async () => {
  const p = await payment();

  await approve(p.id);

  const form = new FormData();

  form.set(
    "proof",
    new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], {
      type: "image/png",
    }),
    "replacement.png",
  );

  const response = await fetch(`${base}/api/payments/${p.id}/proof`, {
    method: "POST",
    headers: { Origin: origin, Cookie: sessions.get("BATCH_HANDLER")!.cookie },
    body: form,
  });

  assert.equal(response.status, 201);

  assert.notEqual((await row(p.id)).proofFileId, p.proofFileId);

  assert.ok(await db.storedFile.findUnique({ where: { id: p.proofFileId! } }));

  assert.equal((await finance(p.id)).status, 409);
});

test("reassigned Manager and revoked Records reviewer invalidate approvals", async () => {
  const p = await payment();

  await approve(p.id);

  await db.batch.update({
    where: { id: batchId },
    data: { managerId: sessions.get("OTHER_MANAGER")!.id },
  });

  assert.equal((await finance(p.id)).status, 409);

  await db.batch.update({
    where: { id: batchId },
    data: { managerId: sessions.get("BATCH_MANAGER")!.id },
  });

  await db.user.update({
    where: { id: sessions.get("RECORDS")!.id },
    data: { active: false },
  });

  assert.equal((await finance(p.id)).status, 409);

  await db.user.update({
    where: { id: sessions.get("RECORDS")!.id },
    data: { active: true },
  });
});

test("approved reviewers can return evidence before Finance; history cannot be rewritten", async () => {
  // Restoring a revoked account does not restore its old sessions; use a fresh reviewer.
  const original = sessions.get("RECORDS")!;

  const p = await payment();

  const account = await db.user.findUniqueOrThrow({
    where: { id: original.id },
  });

  const login = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: account.email,
      password: "Payment-workflow-password-123!",
    }),
  });

  assert.equal(login.status, 200);

  sessions.set("RECORDS", {
    id: original.id,
    cookie: login.headers
      .getSetCookie()
      .map((c) => {
        return c.split(";")[0];
      })
      .join("; "),
  });

  await approve(p.id);

  assert.equal(
    (await review(p.id, "RECORDS", "RECORDS", "RETURNED")).status,
    200,
  );

  assert.equal((await finance(p.id)).status, 409);

  const entry = await db.paymentOperationalReview.findFirstOrThrow({
    where: { paymentId: p.id },
  });

  await assert.rejects(
    db.paymentOperationalReview.update({
      where: { id: entry.id },
      data: { notes: "Rewrite" },
    }),
  );

  await assert.rejects(
    db.paymentOperationalReview.delete({ where: { id: entry.id } }),
  );
});
