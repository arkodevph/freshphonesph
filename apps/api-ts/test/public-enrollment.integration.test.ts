import "reflect-metadata";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import {
  defaultEnrollmentFormDefinition,
  type EnrollmentFormConfig,
  type EnrollmentFormDefinition,
  type PublishedEnrollmentForm,
  type PublicEnrollmentApplication,
  type Role,
  type RetentionPreview,
  type RetentionRequest,
} from "@freshphones/contracts";
import { createApp } from "../src/app";
import { Database } from "../src/database";
import { hashPassword } from "../src/auth/password";

const databaseUrl = process.env.TEST_DATABASE_URL;

if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith("_test")) {
  throw new Error("Use a dedicated migrated _test database.");
}

const origin = "http://localhost:3100";

const publicOrigin = "http://localhost:3101";

const password = "Synthetic-public-enrollment-password-123!";

const suffix = randomUUID().slice(0, 8);

const old = new Date("2020-01-01T00:00:00Z");

const identities = new Map<string, { id: string; cookie: string }>();

const choiceId = randomUUID(),
  optionOne = randomUUID(),
  optionTwo = randomUUID();

let app: INestApplication, db: Database, base: string;

let published: PublishedEnrollmentForm, config: EnrollmentFormConfig;

let firstApplication: string, forwardedApplication: string, requestId: string;

let batchOne: string, batchTwo: string, missingManagerBatch: string;

async function api(
  path: string,
  role?: string,
  method = "GET",
  body?: unknown,
  site = origin,
) {
  return fetch(`${base}/api${path}`, {
    method,
    headers: {
      Origin: site,
      ...(role && identities.has(role)
        ? { Cookie: identities.get(role)!.cookie }
        : {}),
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

async function ok<T>(response: Response): Promise<T> {
  const body = await response.json();

  assert.ok(response.ok, `${response.status}: ${JSON.stringify(body)}`);

  return body as T;
}

function definition(): EnrollmentFormDefinition {
  const result = structuredClone(defaultEnrollmentFormDefinition);

  result.questions.push({
    id: choiceId,
    type: "single_choice",
    label: "Preferred contact time",
    help: "Synthetic required question",
    required: true,
    options: [
      { id: optionOne, label: "Morning" },
      { id: optionTwo, label: "Afternoon" },
    ],
  });

  return result;
}

function payload(extra: object = {}) {
  return {
    submissionId: randomUUID(),
    revisionId: published.revisionId,
    name: "María Peña — synthetic",
    phone: "+639170000111",
    email: `public-${suffix}@example.test`,
    contactAcknowledged: true,
    answers: {
      [choiceId]: optionOne,
      [defaultEnrollmentFormDefinition.questions[1]!.id]:
        "Original private answer",
    },
    ...extra,
  };
}

async function submit(extra: object = {}) {
  return ok<{ reference: string }>(
    await api(
      "/public/enrollment-applications",
      undefined,
      "POST",
      payload(extra),
      publicOrigin,
    ),
  );
}

async function detail(id: string, role = "agent1") {
  return ok<PublicEnrollmentApplication>(
    await api(`/enrollment/applications/${id}`, role),
  );
}

async function save(
  def: EnrollmentFormDefinition,
  agent: string | null = identities.get("agent1")!.id,
  role = "records",
) {
  config = await ok<EnrollmentFormConfig>(
    await api("/enrollment/form", role, "PATCH", {
      version: config.version,
      definition: def,
      receivingAgentId: agent,
    }),
  );

  return config;
}

async function publish(role = "records") {
  config = await ok<EnrollmentFormConfig>(
    await api("/enrollment/form/publish", role, "POST", {
      version: config.version,
    }),
  );

  published = await ok<PublishedEnrollmentForm>(
    await api(
      "/public/enrollment-form",
      undefined,
      "GET",
      undefined,
      publicOrigin,
    ),
  );

  return published;
}

async function forward(
  id: string,
  batchId = batchOne,
  role = "agent1",
  extra: object = {},
) {
  const record = await detail(id, role);

  return api(`/enrollment/applications/${id}/forward`, role, "POST", {
    version: record.version,
    batchId,
    ...record.contact,
    ...extra,
  });
}

async function identity(
  key: string,
  role: Role,
  hash: string,
  extra: object = {},
) {
  const row = await db.user.create({
    data: {
      name: `Synthetic enrollment ${key}`,
      email: `public-form-${key}-${suffix}@example.test`,
      role,
      passwordHash: hash,
      ...extra,
    },
  });

  const login = await api("/auth/login", undefined, "POST", {
    email: row.email,
    password,
  });

  assert.equal(login.status, 200, await login.clone().text());

  identities.set(key, {
    id: row.id,
    cookie: login.headers
      .getSetCookie()
      .map((value) => {
        return value.split(";")[0];
      })
      .join("; "),
  });

  return row;
}

before(async () => {
  app = await createApp({
    NODE_ENV: "test",
    HOST: "127.0.0.1",
    PORT: 4100,
    DATABASE_URL: databaseUrl!,
    WEB_ORIGIN: origin,
    PUBLIC_SITE_ORIGIN: publicOrigin,
    JWT_SECRET: "synthetic-public-enrollment-secret-at-least-32-characters",
    LOCAL_DEMO_AUTH: false,
    EMAIL_FROM: "synthetic@example.test",
    CUSTOMER_REMINDER_DAYS_BEFORE: "",
    PRIVATE_STORAGE_PROVIDER: "local",
    PRIVATE_STORAGE_S3_REGION: "ap-southeast-1",
    ABUSE_LIMITS: {
      auth: [[10000, 60]],
      application: [[10000, 60]],
      accountRead: [[100000, 60]],
      accountWrite: [[10000, 60]],
      expensive: [[10000, 60]],
    },
  });

  await app.listen(0, "127.0.0.1");

  base = await app.getUrl();

  db = app.get(Database);

  const hash = await hashPassword(password);

  await identity("admin", "SYSTEM_ADMIN", hash);

  await identity("coo", "COO", hash);

  await identity("records", "RECORDS", hash);

  await identity("manager1", "BATCH_MANAGER", hash);

  await identity("manager2", "BATCH_MANAGER", hash);

  await identity("ceo", "CEO", hash);

  await identity("finance", "FINANCE_OFFICER", hash);

  await identity("csr", "CSR", hash);

  const profiles = [];

  for (const key of ["agent1", "agent2"]) {
    const agent = await db.agent.create({
      data: { name: `Synthetic ${key}`, code: `FORM-${key}-${suffix}` },
    });

    profiles.push(agent);

    await identity(key, "AGENT", hash, { agentProfileId: agent.id });
  }

  const batches = [];

  for (let i = 0; i < 3; i++) {
    batches.push(
      await db.batch.create({
        data: {
          code: `FORM-BATCH-${i}-${suffix}`,
          model: "Synthetic enrollment device",
          status: "PLANNED",
          startDate: new Date("2026-11-01"),
          endDate: new Date("2027-12-31"),
          contractPrice: "800.00",
          installmentCount: 8,
          cadence: "MONTHLY",
          managerId: i === 2 ? null : identities.get(`manager${i + 1}`)!.id,
          agentId: profiles[i === 1 ? 1 : 0]!.id,
        },
      }),
    );
  }

  [batchOne, batchTwo, missingManagerBatch] = batches.map((batch) => {
    return batch.id;
  });
});

after(async () => {
  await app?.close();
});

test("only COO/Records manage drafts, and saving is separate from public publication", async () => {
  assert.equal(
    (
      await api(
        "/public/enrollment-form",
        undefined,
        "GET",
        undefined,
        publicOrigin,
      )
    ).status,
    404,
  );

  config = await ok<EnrollmentFormConfig>(
    await api("/enrollment/form", "records"),
  );

  assert.equal(config.published, null);

  await save(definition(), null);

  assert.equal(
    (
      await api(
        "/public/enrollment-form",
        undefined,
        "GET",
        undefined,
        publicOrigin,
      )
    ).status,
    404,
  );

  const missing = await api("/enrollment/form/publish", "records", "POST", {
    version: config.version,
  });

  assert.ok([400, 409].includes(missing.status));

  for (const role of ["agent1", "manager1", "ceo", "finance", "csr"]) {
    assert.equal((await api("/enrollment/form", role)).status, 403, role);

    assert.equal(
      (
        await api("/enrollment/form", role, "PATCH", {
          version: config.version,
          definition: definition(),
          receivingAgentId: identities.get("agent1")!.id,
        })
      ).status,
      403,
      role,
    );
  }

  assert.equal((await api("/enrollment/form")).status, 401);

  assert.equal((await api("/enrollment/form", "coo")).status, 200);

  await save(definition());

  await publish();
});

test("published output is minimal and separate landing origin can submit without exposing routing", async () => {
  assert.deepEqual(
    Object.keys(published).sort(),
    ["definition", "revisionId", "revisionNumber"].sort(),
  );

  assert.doesNotMatch(
    JSON.stringify(published),
    /receivingAgent|passwordHash|agentCode/,
  );

  const response = await api(
    "/public/enrollment-applications",
    undefined,
    "POST",
    payload(),
    publicOrigin,
  );

  const receipt = await ok<{ reference: string }>(response);

  firstApplication = receipt.reference;

  assert.deepEqual(Object.keys(receipt), ["reference"]);

  const record = await detail(firstApplication);

  assert.equal(record.status, "RECEIVED");

  assert.equal(record.assignedAgent.id, identities.get("agent1")!.id);

  assert.equal(record.contact.name, "María Peña — synthetic");

  assert.equal(record.answers[choiceId], optionOne);

  assert.equal(record.enrollmentRequest, null);
});

test("landing-origin writes are restricted to the exact public route", async () => {
  assert.equal(
    (
      await api(
        "/enrollment/form/publish",
        "records",
        "POST",
        { version: config.version },
        publicOrigin,
      )
    ).status,
    403,
  );

  assert.equal(
    (
      await api(
        "/public/enrollment-applications",
        undefined,
        "POST",
        payload(),
        "https://unrelated.example.test",
      )
    ).status,
    403,
  );
});

test("public validation enforces required answers, core contact and no private field injection", async () => {
  for (const change of [
    { answers: {} },
    { answers: { [choiceId]: randomUUID() } },
    { answers: { [choiceId]: [optionOne] } },
    { name: "" },
    { phone: "" },
    { contactAcknowledged: false },
    { assignedAgentId: identities.get("agent2")!.id },
    { memberId: randomUUID() },
    { batchId: batchOne },
    { answers: { [choiceId]: optionOne, [randomUUID()]: "unknown" } },
  ]) {
    assert.equal(
      (
        await api(
          "/public/enrollment-applications",
          undefined,
          "POST",
          payload(change),
          publicOrigin,
        )
      ).status,
      400,
    );
  }
});

test("public submissions do not create member/accounts/schedules or reserve capacity", async () => {
  const before = {
    clients: await db.client.count(),
    members: await db.member.count(),
    users: await db.user.count(),
    schedules: await db.scheduleItem.count(),
    payments: await db.payment.count(),
  };

  await submit({ email: "" });

  assert.deepEqual(
    {
      clients: await db.client.count(),
      members: await db.member.count(),
      users: await db.user.count(),
      schedules: await db.scheduleItem.count(),
      payments: await db.payment.count(),
    },
    before,
  );
});

test("public network retries return one reference and reject changed-payload reuse", async () => {
  const body = payload();

  const responses = await Promise.all([
    api(
      "/public/enrollment-applications",
      undefined,
      "POST",
      body,
      publicOrigin,
    ),
    api(
      "/public/enrollment-applications",
      undefined,
      "POST",
      body,
      publicOrigin,
    ),
  ]);

  const [a, b] = await Promise.all(
    responses.map((response) => {
      return ok<{ reference: string }>(response);
    }),
  );

  assert.equal(a!.reference, b!.reference);

  assert.equal(
    await db.publicEnrollmentApplication.count({
      where: { submissionId: body.submissionId },
    }),
    1,
  );

  assert.equal(
    (
      await api(
        "/public/enrollment-applications",
        undefined,
        "POST",
        { ...body, name: "Changed identity" },
        publicOrigin,
      )
    ).status,
    409,
  );
});

test("assigned Agent and COO can read intake; other Agents, unpublished reviewers and Records cannot", async () => {
  assert.equal(
    (await api(`/enrollment/applications/${firstApplication}`, "coo")).status,
    200,
  );

  assert.equal(
    (await api(`/enrollment/applications/${firstApplication}`, "agent2"))
      .status,
    404,
  );

  assert.equal(
    (await api(`/enrollment/applications/${firstApplication}`, "manager1"))
      .status,
    404,
  );

  for (const role of ["records", "ceo", "finance", "csr"]) {
    assert.equal(
      (await api(`/enrollment/applications/${firstApplication}`, role)).status,
      403,
      role,
    );
  }

  const queue = await ok<{ items: PublicEnrollmentApplication[] }>(
    await api("/enrollment/applications", "agent2"),
  );

  assert.equal(
    queue.items.some((item) => {
      return item.id === firstApplication;
    }),
    false,
  );

  assert.equal(
    (await api(`/enrollment/applications/${firstApplication}`)).status,
    401,
  );
});

test("draft edits leave live content intact; publish creates immutable history and rejects stale submissions", async () => {
  const previous = published;

  const priorRow = await db.enrollmentFormRevision.findUniqueOrThrow({
    where: { id: previous.revisionId },
  });

  const draft = definition();

  draft.questions = draft.questions.filter((question) => {
    return question.id !== defaultEnrollmentFormDefinition.questions[1]!.id;
  });

  draft.questions.find((question) => {
    return question.id === choiceId;
  })!.label = "Changed contact preference";

  await save(draft);

  const live = await ok<PublishedEnrollmentForm>(
    await api("/public/enrollment-form"),
  );

  assert.deepEqual(live, previous);

  const staleVersion = config.version;

  await save(draft);

  assert.equal(
    (
      await api("/enrollment/form", "records", "PATCH", {
        version: staleVersion,
        definition: draft,
        receivingAgentId: identities.get("agent1")!.id,
      })
    ).status,
    409,
  );

  await publish();

  assert.notEqual(published.revisionId, previous.revisionId);

  assert.deepEqual(
    await db.enrollmentFormRevision.findUniqueOrThrow({
      where: { id: previous.revisionId },
    }),
    priorRow,
  );

  const stale = await api(
    "/public/enrollment-applications",
    undefined,
    "POST",
    payload({ revisionId: previous.revisionId }),
    publicOrigin,
  );

  assert.equal(stale.status, 409);

  assert.equal((await stale.json()).code, "FORM_VERSION_CHANGED");

  const history = await detail(firstApplication);

  assert.ok(
    history.revision.definition.questions.some((question) => {
      return question.label === "Preferred contact time";
    }),
  );

  assert.equal(
    history.answers[defaultEnrollmentFormDefinition.questions[1]!.id],
    "Original private answer",
  );

  await assert.rejects(
    db.enrollmentFormRevision.update({
      where: { id: previous.revisionId },
      data: { definition: definition() },
    }),
  );

  await assert.rejects(
    db.enrollmentFormRevision.delete({ where: { id: previous.revisionId } }),
  );
});

test("public intake fails closed when the receiving Agent is inactive", async () => {
  await db.user.update({
    where: { id: identities.get("agent1")!.id },
    data: { active: false },
  });

  const get = await api("/public/enrollment-form");

  assert.ok([404, 409, 503].includes(get.status));

  const post = await api(
    "/public/enrollment-applications",
    undefined,
    "POST",
    payload({ answers: { [choiceId]: optionOne } }),
    publicOrigin,
  );

  assert.ok([404, 409, 503].includes(post.status));

  await db.user.update({
    where: { id: identities.get("agent1")!.id },
    data: { active: true },
  });

  const account = await db.user.findUniqueOrThrow({
    where: { id: identities.get("agent1")!.id },
  });

  const login = await api("/auth/login", undefined, "POST", {
    email: account.email,
    password,
  });

  assert.equal(login.status, 200);

  identities.set("agent1", {
    id: account.id,
    cookie: login.headers
      .getSetCookie()
      .map((value) => {
        return value.split(";")[0];
      })
      .join("; "),
  });
});

test("only COO can reassign received intake; previous Agent immediately loses visibility", async () => {
  const receipt = await submit({ answers: { [choiceId]: optionTwo } });

  const row = await detail(receipt.reference);

  assert.equal(
    (
      await api(`/enrollment/applications/${row.id}/assign`, "agent1", "POST", {
        version: row.version,
        agentId: identities.get("agent2")!.id,
      })
    ).status,
    403,
  );

  await ok(
    await api(`/enrollment/applications/${row.id}/assign`, "coo", "POST", {
      version: row.version,
      agentId: identities.get("agent2")!.id,
    }),
  );

  assert.equal(
    (await api(`/enrollment/applications/${row.id}`, "agent1")).status,
    404,
  );

  assert.equal(
    (await detail(row.id, "agent2")).assignedAgent.id,
    identities.get("agent2")!.id,
  );
});

test("COO cannot bypass Agent first review; Agent can forward only to an assigned open batch", async () => {
  const receipt = await submit({ answers: { [choiceId]: optionOne } });

  forwardedApplication = receipt.reference;

  const record = await detail(forwardedApplication);

  assert.equal(
    (
      await api(
        `/enrollment/applications/${record.id}/forward`,
        "coo",
        "POST",
        { version: record.version, batchId: batchOne, ...record.contact },
      )
    ).status,
    403,
  );

  assert.equal((await forward(record.id, batchTwo)).status, 404);
});

test("forwarding is atomic/idempotent and leaves membership/seat creation for Manager approval", async () => {
  const before = await db.client.count({ where: { batchId: batchOne } });

  const row = await detail(forwardedApplication);

  const body = {
    version: row.version,
    batchId: batchOne,
    ...row.contact,
    name: "Reviewed synthetic identity",
  };

  const responses = await Promise.all([
    api(`/enrollment/applications/${row.id}/forward`, "agent1", "POST", body),
    api(`/enrollment/applications/${row.id}/forward`, "agent1", "POST", body),
  ]);

  for (const response of responses) {
    assert.ok(
      [200, 201].includes(response.status),
      await response.clone().text(),
    );
  }

  const converted = await detail(row.id);

  assert.equal(converted.status, "FORWARDED");

  assert.ok(converted.enrollmentRequest);

  requestId = converted.enrollmentRequest!.id;

  assert.equal(
    await db.enrollmentRequest.count({ where: { id: requestId } }),
    1,
  );

  assert.equal(await db.client.count({ where: { batchId: batchOne } }), before);

  assert.equal(converted.contact.name, "María Peña — synthetic");

  const request = await db.enrollmentRequest.findUniqueOrThrow({
    where: { id: requestId },
  });

  assert.equal(
    (request.applicant as { name: string }).name,
    "Reviewed synthetic identity",
  );

  assert.equal(request.submittedById, identities.get("agent1")!.id);
});

test("only the assigned Manager sees original application during final enrollment review", async () => {
  const visible = await detail(forwardedApplication, "manager1");

  assert.equal(visible.enrollmentRequest?.id, requestId);

  assert.equal(
    (await api(`/enrollment/applications/${forwardedApplication}`, "manager2"))
      .status,
    404,
  );

  const queue = await ok<{
    items: { id: string; publicApplicationId?: string }[];
  }>(await api("/enrollment/requests", "manager1"));

  assert.equal(
    queue.items.find((row) => {
      return row.id === requestId;
    })?.publicApplicationId,
    forwardedApplication,
  );
});

test("existing assigned Manager approval creates the genuine membership and issued plan once", async () => {
  const request = await db.enrollmentRequest.findUniqueOrThrow({
    where: { id: requestId },
  });

  const before = await db.client.count({ where: { batchId: batchOne } });

  await ok(
    await api(`/enrollment/requests/${requestId}/review`, "manager1", "POST", {
      version: request.version,
      decision: "APPROVED",
      reason: "Synthetic reviewed public application",
    }),
  );

  const after = await db.enrollmentRequest.findUniqueOrThrow({
    where: { id: requestId },
  });

  assert.ok(after.clientId);

  assert.equal(after.status, "APPROVED");

  assert.equal(
    await db.client.count({ where: { batchId: batchOne } }),
    before + 1,
  );

  assert.equal(
    await db.scheduleItem.count({ where: { clientId: after.clientId! } }),
    8,
  );

  assert.equal(
    (await detail(forwardedApplication)).enrollmentRequest?.status,
    "APPROVED",
  );

  assert.equal(
    (await db.batch.findUniqueOrThrow({ where: { id: batchOne } })).status,
    "PLANNED",
  );
});

test("received intake can be closed once with optimistic checks and cannot then be forwarded", async () => {
  const receipt = await submit({ answers: { [choiceId]: optionOne } });

  const row = await detail(receipt.reference);

  await ok(
    await api(`/enrollment/applications/${row.id}/close`, "agent1", "POST", {
      version: row.version,
      reason: "Synthetic applicant withdrew interest",
    }),
  );

  assert.equal((await detail(row.id)).status, "CLOSED");

  assert.equal((await forward(row.id)).status, 409);

  assert.equal(
    (
      await api(`/enrollment/applications/${row.id}/close`, "agent1", "POST", {
        version: row.version,
        reason: "Different stale reason",
      })
    ).status,
    409,
  );
});

test("public intake sends a private in-app notice to the assigned Agent without leaking contact data", async () => {
  const notices = await db.staffNotification.findMany({
    where: {
      recipientId: identities.get("agent1")!.id,
      link: { contains: firstApplication },
    },
  });

  assert.ok(notices.length >= 1);

  assert.doesNotMatch(
    JSON.stringify(notices),
    /María|Original private answer|public-.*@example/,
  );
});

test("new retention category is inactive until policy approval and blocks in-flight or converted intake", async () => {
  assert.equal(
    await db.retentionPolicy.count({ where: { scope: "PUBLIC_ENROLLMENT" } }),
    0,
  );

  const first = await ok<RetentionPreview>(
    await api("/retention/preview", "admin", "POST", {
      scope: "PUBLIC_ENROLLMENT",
      subjectId: firstApplication,
    }),
  );

  assert.ok(
    first.blockers.some((item) => {
      return /policy/i.test(item);
    }),
  );

  assert.ok(
    first.blockers.some((item) => {
      return /close|review|final/i.test(item);
    }),
  );

  const converted = await ok<RetentionPreview>(
    await api("/retention/preview", "admin", "POST", {
      scope: "PUBLIC_ENROLLMENT",
      subjectId: forwardedApplication,
    }),
  );

  assert.ok(
    converted.blockers.some((item) => {
      return /linked|converted|enrollment/i.test(item);
    }),
  );

  const after = await db.enrollmentRequest.findUniqueOrThrow({
    where: { id: requestId },
  });

  assert.equal(after.status, "APPROVED");
});

test("approved retention erases only old closed unconverted intake and cannot resurrect it", async () => {
  const row = await db.publicEnrollmentApplication.create({
    data: {
      submissionId: randomUUID(),
      revisionId: published.revisionId,
      name: "María Peña — synthetic",
      email: `old-${suffix}@example.test`,
      phone: "+639170000111",
      answers: { [choiceId]: optionTwo },
      assignedAgentId: identities.get("agent1")!.id,
      status: "CLOSED",
      closeReason: "Private closure reason",
      createdAt: old,
      updatedAt: old,
    },
  });

  const revisionBefore = await db.enrollmentFormRevision.findUniqueOrThrow({
    where: { id: published.revisionId },
  });

  const scheduleBefore = await db.scheduleItem.count();

  const policy = await ok<{ id: string }>(
    await api("/retention/policies", "admin", "POST", {
      scope: "PUBLIC_ENROLLMENT",
      days: 1,
      basis: "Synthetic approved test policy only",
      backupInstructions: "Reconcile restored synthetic backups before access",
      externalCopyInstructions: "Record external copy disposition in test case",
    }),
  );

  await ok(
    await api(`/retention/policies/${policy.id}/approve`, "admin", "POST", {
      approvalReference: "Synthetic policy approval",
    }),
  );

  const preview = await ok<RetentionPreview>(
    await api("/retention/preview", "admin", "POST", {
      scope: "PUBLIC_ENROLLMENT",
      subjectId: row.id,
    }),
  );

  assert.deepEqual(preview.blockers, []);

  let request = await ok<RetentionRequest>(
    await api("/retention/requests", "admin", "POST", {
      scope: "PUBLIC_ENROLLMENT",
      subjectId: row.id,
      previewHash: preview.previewHash,
      reason: "Synthetic erasure request",
    }),
  );

  request = await ok<RetentionRequest>(
    await api(`/retention/requests/${request.id}/decision`, "admin", "POST", {
      version: request.version,
      approved: true,
      reason: "Synthetic reviewed erasure approval",
    }),
  );

  await ok(
    await api(`/retention/requests/${request.id}/execute`, "admin", "POST", {
      version: request.version,
      confirmation: row.id,
    }),
  );

  const erased = await db.publicEnrollmentApplication.findUniqueOrThrow({
    where: { id: row.id },
  });

  assert.ok(erased.retentionErasedAt);

  assert.equal(erased.email, "");

  assert.equal(erased.phone, "");

  assert.deepEqual(erased.answers, {});

  assert.equal(erased.closeReason, "");

  assert.equal(
    (await api(`/enrollment/applications/${row.id}`, "admin")).status,
    404,
  );

  assert.deepEqual(
    await db.enrollmentFormRevision.findUniqueOrThrow({
      where: { id: published.revisionId },
    }),
    revisionBefore,
  );

  assert.equal(await db.scheduleItem.count(), scheduleBefore);

  await assert.rejects(
    db.publicEnrollmentApplication.update({
      where: { id: row.id },
      data: { name: "Resurrected private identity" },
    }),
  );

  const audit = await db.auditEntry.findMany({ where: { recordId: row.id } });

  assert.doesNotMatch(
    JSON.stringify(audit),
    /María|Original private answer|Private closure reason/,
  );
});

test("intake holds and the approved-erasure gate prevent premature scrubbing", async () => {
  const row = await db.publicEnrollmentApplication.create({
    data: {
      submissionId: randomUUID(),
      revisionId: published.revisionId,
      name: "Synthetic held applicant",
      email: "held@example.test",
      phone: "09170000000",
      answers: { [choiceId]: optionOne },
      assignedAgentId: identities.get("agent1")!.id,
      status: "CLOSED",
      closeReason: "Synthetic closed application",
      createdAt: old,
      updatedAt: old,
    },
  });

  await assert.rejects(
    db.publicEnrollmentApplication.update({
      where: { id: row.id },
      data: {
        name: "Erased enrollment applicant",
        email: "",
        phone: "",
        answers: {},
        closeReason: "",
        retentionErasedAt: new Date(),
      },
    }),
  );

  const hold = await ok<{ id: string }>(
    await api("/retention/holds", "admin", "POST", {
      scope: "PUBLIC_ENROLLMENT",
      subjectId: row.id,
      reason: "Synthetic evidence hold",
    }),
  );

  const preview = await ok<RetentionPreview>(
    await api("/retention/preview", "admin", "POST", {
      scope: "PUBLIC_ENROLLMENT",
      subjectId: row.id,
    }),
  );

  assert.ok(
    preview.blockers.some((item) => {
      return /hold/i.test(item);
    }),
  );

  assert.equal(
    (
      await api("/retention/requests", "admin", "POST", {
        scope: "PUBLIC_ENROLLMENT",
        subjectId: row.id,
        previewHash: preview.previewHash,
        reason: "Synthetic blocked erasure",
      })
    ).status,
    409,
  );

  await ok(
    await api(`/retention/holds/${hold.id}/release`, "admin", "POST", {
      reason: "Synthetic hold released",
    }),
  );

  const available = await ok<RetentionPreview>(
    await api("/retention/preview", "admin", "POST", {
      scope: "PUBLIC_ENROLLMENT",
      subjectId: row.id,
    }),
  );

  assert.deepEqual(available.blockers, []);

  assert.equal(
    (
      await db.publicEnrollmentApplication.findUniqueOrThrow({
        where: { id: row.id },
      })
    ).name,
    "Synthetic held applicant",
  );
});

test("Agent can link an existing member with a blank saved phone without changing original intake", async () => {
  const member = await db.member.create({
    data: { name: "Synthetic legacy member", email: "", phone: "" },
  });

  await db.client.create({
    data: {
      memberId: member.id,
      batchId: batchOne,
      name: member.name,
      email: member.email,
      phone: member.phone,
    },
  });

  const target = await db.batch.create({
    data: {
      code: `FORM-LINKED-${suffix}`,
      model: "Synthetic linked device",
      status: "PLANNED",
      startDate: new Date("2026-11-01"),
      endDate: new Date("2027-12-31"),
      contractPrice: "800.00",
      installmentCount: 8,
      cadence: "MONTHLY",
      managerId: identities.get("manager1")!.id,
      agentId: (
        await db.user.findUniqueOrThrow({
          where: { id: identities.get("agent1")!.id },
        })
      ).agentProfileId,
    },
  });

  const receipt = await submit({ answers: { [choiceId]: optionOne } });

  const row = await detail(receipt.reference);

  const forwarded = await ok<{ id: string; version: number }>(
    await api(`/enrollment/applications/${row.id}/forward`, "agent1", "POST", {
      version: row.version,
      batchId: target.id,
      memberId: member.id,
      name: member.name,
      email: "",
      phone: "",
    }),
  );

  await ok(
    await api(
      `/enrollment/requests/${forwarded.id}/review`,
      "manager1",
      "POST",
      {
        version: forwarded.version,
        decision: "APPROVED",
        reason: "Synthetic legacy member review",
      },
    ),
  );

  const approved = await db.enrollmentRequest.findUniqueOrThrow({
    where: { id: forwarded.id },
  });

  const client = await db.client.findUniqueOrThrow({
    where: { id: approved.clientId! },
  });

  assert.equal(client.memberId, member.id);

  assert.equal(client.phone, "");

  assert.equal((await detail(row.id)).contact.phone, "+639170000111");

  assert.equal(await db.member.count({ where: { id: member.id } }), 1);
});
