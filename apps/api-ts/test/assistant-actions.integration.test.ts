import "reflect-metadata";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import { createApp } from "../src/app";
import { Database } from "../src/database";
import { AuthService } from "../src/auth/auth.service";
import { hashPassword } from "../src/auth/password";
import { AssistantToolsService } from "../src/assistant/tools.service";
import type { Config } from "../src/config";
import type { AuthRequest } from "../src/auth/access";
import type { AssistantAction } from "@freshphones/contracts";

const url = process.env.TEST_DATABASE_URL;

if (!url || !new URL(url).pathname.endsWith("_test")) {
  throw new Error(
    "A dedicated local test database ending in _test is required.",
  );
}

let app: INestApplication;

let db: Database;

let tools: AssistantToolsService;

let actor: AuthRequest;

let otherSession: AuthRequest;

let base: string;

const origin = "http://localhost:3100";

const suffix = randomUUID();

const createdJobIds: string[] = [];

const actionIds: string[] = [];

before(async () => {
  app = await createApp({
    NODE_ENV: "test",
    PORT: 4100,
    HOST: "127.0.0.1",
    DATABASE_URL: url,
    WEB_ORIGIN: origin,
    JWT_SECRET: "assistant-test-secret-at-least-thirty-two-characters",
    LOCAL_DEMO_AUTH: false,
    EMAIL_FROM: "synthetic@example.test",
    CUSTOMER_REMINDER_DAYS_BEFORE: "",
    PRIVATE_STORAGE_PROVIDER: "local",
    PRIVATE_STORAGE_S3_REGION: "ap-southeast-1",
    ABUSE_LIMITS: {
      expensive: [[1000, 60]],
      read: [[1000, 60]],
      write: [[1000, 60]],
    },
  } as Config);

  await app.listen(0, "127.0.0.1");

  base = await app.getUrl();

  db = app.get(Database);

  tools = app.get(AssistantToolsService);

  const password = "Synthetic-assistant-actions-123!";

  const user = await db.user.create({
    data: {
      name: "Synthetic assistant CEO",
      email: `assistant-${suffix}@example.test`,
      role: "CEO",
      passwordHash: await hashPassword(password),
    },
  });

  const login = async () => {
    const response = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email, password }),
    });

    assert.equal(response.status, 200);

    const cookie = response.headers
      .getSetCookie()
      .map((value) => {
        return value.split(";")[0];
      })
      .join("; ");

    const auth = await app.get(AuthService).authenticate(cookie);

    return {
      user: auth.user,
      sessionId: auth.sessionId,
      headers: { cookie },
      socket: { localPort: Number(new URL(base).port) },
    } as AuthRequest;
  };

  actor = await login();

  otherSession = await login();
});

after(async () => {
  // Keep audit evidence; test fixtures carry a unique synthetic label.
  await app?.close();
});

const propose = async (body: unknown) => {
  const action = await tools.propose(actor, "jobs.create", { body });

  actionIds.push(action.id);

  return action;
};

const decision = (
  action: AssistantAction,
  cookie = actor.headers.cookie,
  body: unknown = { decision: "confirm" },
) => {
  return fetch(`${base}/api/assistant/actions/${action.id}/decision`, {
    method: "POST",
    headers: {
      Origin: origin,
      Cookie: cookie!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
};

test("API tools read actual authorized data and expose schemas without accepting arbitrary URLs", async () => {
  const result = await tools.read(actor, "reports.installment_earnings", {
    query: { year: 2026, frequency: "MONTHLY", period: 11 },
  });

  assert.deepEqual(actor.user.permissions, ["REPORT_VIEW"]);

  assert.equal(
    (
      await fetch(`${base}/api/recruitment/jobs`, {
        headers: { Cookie: actor.headers.cookie!, "X-Fresh-AI-Call": "forged" },
      })
    ).status,
    403,
  );

  assert.ok(result.totals);

  assert.equal(result.dateFrom, "2026-11-01");

  const response = await fetch(`${base}/api/assistant/capabilities`, {
    headers: { Cookie: actor.headers.cookie! },
  });

  assert.equal(response.status, 200);

  const catalog = await response.json();

  assert.ok(
    catalog.operations.some((operation: { name: string }) => {
      return operation.name === "jobs.create";
    }),
  );

  await assert.rejects(tools.read(actor, "http://example.test", {}));

  await assert.rejects(tools.read(actor, "jobs.create", {}));
});

test("propose makes no change; confirmation uses the same API, audits once, and cannot replay", async () => {
  const title = `Synthetic assistant job ${suffix}`;

  const action = await propose({ title, isOpen: false });

  assert.equal(await db.jobOpening.count({ where: { title } }), 0);

  const [first, replay] = await Promise.all([
    decision(action),
    decision(action),
  ]);

  assert.deepEqual([first.status, replay.status].sort(), [201, 409]);

  const successful = await (first.status === 201 ? first : replay).json();

  assert.equal(successful.status, "succeeded");

  assert.equal(await db.jobOpening.count({ where: { title } }), 1);

  const job = await db.jobOpening.findFirstOrThrow({ where: { title } });

  createdJobIds.push(job.id);

  assert.equal(
    await db.auditEntry.count({
      where: { recordId: action.id, action: "ASSISTANT_CONFIRMED" },
    }),
    1,
  );

  assert.equal(
    await db.auditEntry.count({
      where: { recordId: action.id, action: "ASSISTANT_SUCCEEDED" },
    }),
    1,
  );
});

test("another session, expired proposals, cancellation and client-supplied payload replacement cannot execute", async () => {
  const title = `Synthetic untouched ${suffix}`;

  const action = await propose({ title, isOpen: false });

  assert.equal(
    (await decision(action, otherSession.headers.cookie)).status,
    404,
  );

  assert.equal(
    (
      await decision(action, actor.headers.cookie, {
        decision: "confirm",
        input: { title: "tampered" },
      })
    ).status,
    400,
  );

  assert.equal(
    (await decision(action, actor.headers.cookie, { decision: "cancel" }))
      .status,
    201,
  );

  assert.equal((await decision(action)).status, 409);

  const expired = await propose({ title: title + " expired", isOpen: false });

  await db.assistantAction.update({
    where: { id: expired.id },
    data: { expiresAt: new Date(0) },
  });

  assert.equal((await decision(expired)).status, 409);

  assert.equal(
    await db.jobOpening.count({ where: { title: { startsWith: title } } }),
    0,
  );
});

test("edit checks the record version and successful confirmed changes use the underlying service", async () => {
  const job = await db.jobOpening.findUniqueOrThrow({
    where: { id: createdJobIds[0] },
  });

  const action = await tools.propose(actor, "jobs.update", {
    id: job.id,
    body: {
      version: job.version,
      record: {
        title: job.title + " edited",
        description: job.description,
        location: job.location,
        employmentType: job.employmentType,
        isOpen: false,
      },
    },
  });

  assert.equal((await decision(action)).status, 201);

  assert.equal(
    (await db.jobOpening.findUniqueOrThrow({ where: { id: job.id } })).title,
    job.title + " edited",
  );

  const stale = await tools.propose(actor, "jobs.update", {
    id: job.id,
    body: {
      version: job.version,
      record: { title: "stale edit rejected", isOpen: false },
    },
  });

  const result = await (await decision(stale)).json();

  assert.equal(result.status, "failed");

  assert.match(result.message, /changed|version|refresh/i);
});

test("confirmed removal deletes only the selected catalog photo and keeps the listing", async () => {
  const item = await db.catalogItem.create({
    data: {
      code: `AI-${randomUUID().slice(0, 8)}`,
      name: "Synthetic photo removal",
      condition: "PRE_OWNED",
      imageAsset: "iphone-11",
    },
  });

  const action = await tools.propose(actor, "catalog.remove_image", {
    id: item.id,
    body: { version: item.version },
  });

  assert.equal(
    (await db.catalogItem.findUniqueOrThrow({ where: { id: item.id } }))
      .imageAsset,
    "iphone-11",
  );

  const result = await (await decision(action)).json();

  assert.equal(result.status, "succeeded");

  const current = await db.catalogItem.findUniqueOrThrow({
    where: { id: item.id },
  });

  assert.equal(current.imageAsset, null);

  assert.equal(current.version, item.version + 1);

  assert.equal(
    (
      await fetch(`${base}/api/catalog/items`, {
        headers: { Cookie: actor.headers.cookie! },
      })
    ).status,
    403,
  );
});

import { issueAssistantCall } from "../src/assistant/access";
test("delegation tokens bind exact path and body, are consumed once, and cannot widen normal portal access", async () => {
  const body = { title: "Synthetic bound request", isOpen: false };

  const token = issueAssistantCall(
    actor.user.id,
    actor.headers.cookie!,
    "POST",
    "/api/recruitment/jobs",
    body,
    ["RECRUITMENT_MANAGE"],
  );

  const call = (payload: unknown) => {
    return fetch(`${base}/api/recruitment/jobs`, {
      method: "POST",
      headers: {
        Origin: origin,
        Cookie: actor.headers.cookie!,
        "Content-Type": "application/json",
        "X-Fresh-AI-Call": token,
      },
      body: JSON.stringify(payload),
    });
  };

  assert.equal((await call({ ...body, title: "Tampered title" })).status, 403);

  assert.equal((await call(body)).status, 403);

  const me = await (
    await fetch(`${base}/api/auth/me`, {
      headers: { Cookie: actor.headers.cookie! },
    })
  ).json();

  assert.deepEqual(me.permissions, ["REPORT_VIEW"]);
});

test("partial job edits preserve fields, await confirmation and reject a stale proposal", async () => {
  const job = await db.jobOpening.create({
    data: {
      title: `Synthetic partial edit ${suffix}`,
      description: "Preserve this description",
      location: "Manila",
      employmentType: "Full time",
      isOpen: false,
    },
  });

  createdJobIds.push(job.id);

  const action = await tools.proposeEdit(actor, "jobs.update", {
    id: job.id,
    changes: { title: `Updated partial edit ${suffix}` },
  });

  assert.equal(
    (await db.jobOpening.findUniqueOrThrow({ where: { id: job.id } })).title,
    job.title,
  );

  const response = await decision(action);

  assert.equal(response.status, 201);

  assert.equal((await response.json()).status, "succeeded");

  const edited = await db.jobOpening.findUniqueOrThrow({
    where: { id: job.id },
  });

  assert.equal(edited.title, `Updated partial edit ${suffix}`);

  assert.equal(edited.description, job.description);

  assert.equal(edited.location, job.location);

  assert.equal(edited.employmentType, job.employmentType);

  assert.equal(edited.isOpen, false);

  const stale = await tools.proposeEdit(actor, "jobs.update", {
    id: job.id,
    changes: { location: "Cebu" },
  });

  await db.jobOpening.update({
    where: { id: job.id },
    data: { description: "Concurrent edit", version: { increment: 1 } },
  });

  const rejected = await decision(stale);

  assert.equal((await rejected.json()).status, "failed");

  const retained = await db.jobOpening.findUniqueOrThrow({
    where: { id: job.id },
  });

  assert.equal(retained.description, "Concurrent edit");

  assert.equal(retained.location, job.location);
});

test("old deletion proposals cannot be confirmed after removal from chat tools", async () => {
  for (const operation of ["retention.decision", "retention.execute"]) {
    const action = await db.assistantAction.create({
      data: {
        actorId: actor.user.id,
        sessionHash: createHash("sha256").update(actor.sessionId).digest("hex"),
        operation,
        input: {},
        expiresAt: new Date(Date.now() + 60_000),
      },
    });

    const response = await decision({ id: action.id } as AssistantAction);

    assert.equal(response.status, 403);

    assert.equal(
      (await db.assistantAction.findUniqueOrThrow({ where: { id: action.id } }))
        .status,
      "pending",
    );
  }
});

test("live assistant reads catalog availability and counts only the selected batch", async () => {
  const label = `AI retrieval ${randomUUID().slice(0, 8)}`;

  const listing = await db.catalogItem.create({
    data: {
      code: `AI-${randomUUID().slice(0, 8)}`,
      name: label,
      condition: "PRE_OWNED",
      availability: "AVAILABLE",
      published: true,
    },
  });

  const catalog = await tools.read(actor, "catalog.list", {
    query: { q: label },
  });

  assert.equal(catalog.total, 1);

  assert.equal(catalog.items[0].id, listing.id);

  assert.equal(catalog.items[0].availability, "Available");

  const batch = await db.batch.create({
    data: {
      code: `AI-${randomUUID().slice(0, 8)}`,
      model: label,
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
    },
  });

  const other = await db.batch.create({
    data: {
      code: `AI-${randomUUID().slice(0, 8)}`,
      model: label,
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
    },
  });

  for (const batchId of [batch.id, batch.id, other.id]) {
    const email = `${randomUUID()}@example.test`;

    const member = await db.member.create({
      data: { name: label, email, phone: "09000000000" },
    });

    await db.client.create({
      data: {
        name: label,
        email,
        phone: "09000000000",
        batchId,
        memberId: member.id,
      },
    });
  }

  const found = await tools.read(actor, "records.batches", {
    query: { q: batch.code },
  });

  assert.equal(found.items[0].id, batch.id);

  const members = await tools.read(actor, "records.clients", {
    query: { batchId: batch.id },
  });

  assert.equal(members.total, 2);

  const count = await tools.read(actor, "records.batch_memberships", {
    query: { batchId: batch.id },
  });

  assert.equal(count.total, 2);

  assert.equal(count.statuses, "all");

  assert.equal(count.items, undefined);

  assert.ok(
    members.items.every((item: { batchId: string }) => {
      return item.batchId === batch.id;
    }),
  );

  await assert.rejects(
    tools.read(actor, "reports.collections", { query: { batch: batch.id } }),
  );
});

test("revoked role and anonymous requests fail before execution; protected financial/security operations stay unavailable", async () => {
  assert.equal((await fetch(`${base}/api/assistant/capabilities`)).status, 401);

  assert.throws(() => {
    return tools.operation(actor.user, "payments.verify");
  });

  assert.throws(() => {
    return tools.operation(actor.user, "accounts.update");
  });

  const action = await propose({
    title: `Synthetic revoked ${suffix}`,
    isOpen: false,
  });

  await db.user.update({
    where: { id: actor.user.id },
    data: { role: "FINANCE_OFFICER" },
  });

  assert.equal((await decision(action)).status, 401);

  assert.equal(
    (await db.assistantAction.findUniqueOrThrow({ where: { id: action.id } }))
      .status,
    "pending",
  );

  await db.user.update({ where: { id: actor.user.id }, data: { role: "CEO" } });
});
