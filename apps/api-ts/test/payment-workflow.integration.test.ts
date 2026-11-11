import "reflect-metadata";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import {
  roles,
  type EvidenceRequirementInput,
  type SubmissionChecklist,
  type Role,
} from "@freshphones/contracts";
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

  for (const role of [...roles, "OTHER_MANAGER", "OTHER_RECORDS"]) {
    const user = await db.user.create({
      data: {
        name: `Workflow ${role}`,
        email: `${role.toLowerCase()}-${suffix}@example.test`,
        passwordHash,
        role:
          role === "OTHER_MANAGER"
            ? "BATCH_MANAGER"
            : role === "OTHER_RECORDS"
              ? "RECORDS"
              : (role as Role),
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

async function submissionFixture() {
  const batch = await db.batch.create({
    data: {
      code: `CHECKLIST-${randomUUID()}`,
      model: "Synthetic checklist device",
      startDate: new Date("2050-01-01"),
      endDate: new Date("2050-12-31"),
      managerId: sessions.get("BATCH_MANAGER")!.id,
      handlerId: sessions.get("BATCH_HANDLER")!.id,
    },
  });

  const client = await db.client.create({
    data: { batchId: batch.id, name: "Checklist member", email: "", phone: "" },
  });

  return { batchId: batch.id, clientId: client.id };
}

type SubmissionFixture = Awaited<ReturnType<typeof submissionFixture>>;

async function submissionPayment(fixture: SubmissionFixture, withProof = true) {
  const file = withProof
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
      ...fixture,
      amount: "10.00",
      method: "GCash",
      paymentDate: new Date("2050-03-04"),
      proofFileId: file?.id,
      recordedById: sessions.get("BATCH_HANDLER")!.id,
    },
  });
}

function expectedReceipt(fixture: SubmissionFixture): EvidenceRequirementInput {
  return {
    ...fixture,
    kind: "RECEIPT",
    description: "Additional receipt reported by Handler",
    periodStart: "2050-03-01",
    periodEnd: "2050-03-31",
    paymentId: null,
    historyId: null,
    cancelled: false,
    reason: "Handler reported another received payment awaiting evidence.",
  };
}

function saveExpected(
  record: EvidenceRequirementInput,
  id = randomUUID(),
  version = 0,
  role = "RECORDS",
) {
  return request(role, `/submission-checklists/${id}`, { version, record });
}

async function checklist(
  fixture: SubmissionFixture,
): Promise<SubmissionChecklist> {
  const response = await request(
    "RECORDS",
    `/submission-checklists?batchId=${fixture.batchId}&from=2050-03-01&to=2050-03-31`,
  );

  assert.equal(response.status, 200, await response.clone().text());

  return response.json();
}

test("company checklist scopes every role and rejects guessed batches and cross-member evidence", async () => {
  const fixture = await submissionFixture();

  const input = expectedReceipt(fixture);

  for (const role of roles) {
    const response = await saveExpected(input, randomUUID(), 0, role);

    if (["RECORDS", "COO"].includes(role)) {
      assert.equal(response.status, 200, role);
    } else {
      assert.ok([403, 404].includes(response.status), role);
    }
  }

  for (const role of [
    "CUSTOMER",
    "CEO",
    "OTHER_MANAGER",
    "OPERATIONS_COORDINATOR",
  ]) {
    const response = await request(
      role,
      `/submission-checklists?batchId=${fixture.batchId}&from=2050-03-01&to=2050-03-31`,
    );

    assert.ok([403, 404].includes(response.status), role);
  }

  const other = await submissionFixture();

  assert.equal(
    (await saveExpected({ ...input, clientId: other.clientId })).status,
    400,
  );

  const payment = await submissionPayment(other);

  assert.equal(
    (await saveExpected({ ...input, paymentId: payment.id })).status,
    400,
  );

  assert.equal(
    (
      await request(
        "RECORDS",
        `/submission-checklists?batchId=${fixture.batchId}&from=2050-04-01&to=2050-03-01`,
      )
    ).status,
    400,
  );
});

test("declared missing receipts block Manager approval and recheck Finance after prior approval", async () => {
  const fixture = await submissionFixture();

  const reviewed = await submissionPayment(fixture);

  await approve(reviewed.id);

  const waiting = await submissionPayment(fixture);

  assert.equal((await review(waiting.id, "RECORDS", "RECORDS")).status, 200);

  const record = expectedReceipt(fixture);

  const created = await saveExpected(record);

  assert.equal(created.status, 200);

  const saved = await created.json();

  assert.equal(
    (await review(waiting.id, "BATCH_MANAGER", "MANAGER")).status,
    409,
  );

  assert.equal((await finance(reviewed.id)).status, 409);

  const alerts = await (
    await request("FINANCE_OFFICER", "/staff/finance-alerts")
  ).json();

  assert.equal(JSON.stringify(alerts).includes(reviewed.id), false);

  const received = await submissionPayment(fixture);

  assert.equal(
    (
      await saveExpected(
        {
          ...record,
          paymentId: received.id,
          reason: "Received the exact missing receipt.",
        },
        saved.id,
        saved.version,
      )
    ).status,
    200,
  );

  assert.equal((await checklist(fixture)).complete, true);

  assert.equal(
    (await review(waiting.id, "BATCH_MANAGER", "MANAGER")).status,
    200,
  );

  assert.equal((await finance(reviewed.id)).status, 200);
});

test("unpaid installments are not missing receipts, while an unresolved recorded claim blocks its declared period", async () => {
  const fixture = await submissionFixture();

  await db.scheduleItem.create({
    data: {
      clientId: fixture.clientId,
      sequenceNo: 1,
      dueDate: new Date("2050-03-04"),
      expectedAmount: "100.00",
    },
  });

  assert.equal((await checklist(fixture)).payments.length, 0);

  assert.equal((await checklist(fixture)).complete, true);

  const target = await submissionPayment(fixture);

  await approve(target.id);

  const additional = await submissionPayment(fixture, false);

  const record = expectedReceipt(fixture);

  const declared = await saveExpected({ ...record, paymentId: additional.id });

  assert.equal(declared.status, 200);

  assert.equal((await checklist(fixture)).complete, false);

  assert.equal((await finance(target.id)).status, 409);

  const file = await db.storedFile.create({
    data: {
      storageKey: randomUUID(),
      originalName: "late-receipt.png",
      mimeType: "image/png",
      size: 8,
      uploadedById: sessions.get("BATCH_HANDLER")!.id,
    },
  });

  await db.payment.update({
    where: { id: additional.id },
    data: { proofFileId: file.id },
  });

  assert.equal((await finance(target.id)).status, 200);
});

test("required statements use current independent Records review and block after archival or reviewer revocation", async () => {
  const fixture = await submissionFixture();

  const payment = await submissionPayment(fixture);

  assert.equal(
    (await review(payment.id, "OTHER_RECORDS", "RECORDS")).status,
    200,
  );

  assert.equal(
    (await review(payment.id, "BATCH_MANAGER", "MANAGER")).status,
    200,
  );

  const record: EvidenceRequirementInput = {
    ...expectedReceipt(fixture),
    kind: "STATEMENT",
    clientId: null,
    description: "March GCash statement for the assigned Handler account",
  };

  const created = await saveExpected(record);

  const saved = await created.json();

  assert.equal(created.status, 200);

  assert.equal((await finance(payment.id)).status, 409);

  const file = await db.storedFile.create({
    data: {
      storageKey: randomUUID(),
      originalName: "statement.pdf",
      mimeType: "application/pdf",
      size: 8,
      uploadedById: sessions.get("BATCH_HANDLER")!.id,
    },
  });

  const history = await db.gcashHistory.create({
    data: {
      batchId: fixture.batchId,
      periodStart: new Date(record.periodStart),
      periodEnd: new Date(record.periodEnd),
      submissions: {
        create: {
          revision: 1,
          fileId: file.id,
          uploadedById: sessions.get("BATCH_HANDLER")!.id,
        },
      },
    },
  });

  assert.equal(
    (
      await saveExpected(
        { ...record, historyId: history.id },
        saved.id,
        saved.version,
      )
    ).status,
    200,
  );

  assert.equal((await checklist(fixture)).complete, false);

  assert.equal(
    (
      await request("RECORDS", `/gcash-history/${history.id}/review`, {
        version: 1,
        status: "REVIEWED",
        note: "Account owner, period and transaction evidence checked.",
      })
    ).status,
    200,
  );

  assert.equal((await checklist(fixture)).complete, true);

  await db.user.update({
    where: { id: sessions.get("RECORDS")!.id },
    data: { active: false },
  });

  assert.equal((await finance(payment.id)).status, 409);

  assert.equal(
    (
      await request("OTHER_RECORDS", `/gcash-history/${history.id}/review`, {
        version: 2,
        status: "REVIEWED",
        note: "Renewed independent review after the prior reviewer lost access.",
      })
    ).status,
    200,
  );

  const renewed = await request(
    "FINANCE_OFFICER",
    `/payments?id=${payment.id}`,
  );

  assert.equal(
    (await renewed.json()).items[0].workflow.submissionComplete,
    true,
  );

  await db.user.update({
    where: { id: sessions.get("RECORDS")!.id },
    data: { active: true },
  });

  await db.gcashHistory.update({
    where: { id: history.id },
    data: { archivedAt: new Date() },
  });

  assert.equal((await finance(payment.id)).status, 409);
});

test("expectation writes are versioned, audited and cannot be cancelled without a reason", async () => {
  // Previous lifecycle test intentionally revoked the Records session; COO can still manage expectations.
  const fixture = await submissionFixture();

  const record = expectedReceipt(fixture);

  const id = randomUUID();

  assert.equal((await saveExpected(record, id, 0, "COO")).status, 200);

  const results = await Promise.all(
    ["First correction", "Second correction"].map((reason) => {
      return saveExpected({ ...record, cancelled: true, reason }, id, 1, "COO");
    }),
  );

  assert.deepEqual(
    results
      .map((result) => {
        return result.status;
      })
      .sort(),
    [200, 409],
  );

  assert.equal(
    (
      await saveExpected(
        { ...record, cancelled: true, reason: "" },
        id,
        2,
        "COO",
      )
    ).status,
    400,
  );

  assert.equal(
    await db.auditEntry.count({
      where: { entity: "evidence_requirement", recordId: id },
    }),
    2,
  );

  const payment = await submissionPayment(fixture);

  assert.equal(
    (await review(payment.id, "BATCH_MANAGER", "MANAGER")).status,
    409,
    "Cancellation cannot replace Records review",
  );
});
