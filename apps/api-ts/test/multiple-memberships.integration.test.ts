import "reflect-metadata";
import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import type { Role } from "@freshphones/contracts";
import { createApp } from "../src/app";
import { Database } from "../src/database";
import { hashPassword } from "../src/auth/password";
import { notifyCustomer } from "../src/portal/notifications.service";
import { describe } from "../src/retention/manifest";

const url = process.env.TEST_DATABASE_URL;

if (!url || !new URL(url).pathname.endsWith("_test")) {
  throw new Error(
    "Dedicated migrated TEST_DATABASE_URL ending in _test required.",
  );
}

const origin = "http://localhost:3100";

const password = "Synthetic-multi-membership-password-123!";

const suffix = randomUUID();

const users = new Map<string, { id: string; cookie: string }>();

let app: INestApplication, db: Database, base: string;

let batchA: string, batchB: string, foreignBatch: string;

let clientA: string, clientB: string, stranger: string, memberId: string;

let paymentA: string, paymentB: string;

let requestId: string;

async function request(
  role: string | null,
  path: string,
  method = "GET",
  body?: unknown,
  membership?: string,
) {
  return fetch(`${base}/api${path}`, {
    method,
    headers: {
      Origin: origin,
      ...(role ? { Cookie: users.get(role)!.cookie } : {}),
      ...(membership ? { "X-Membership-Id": membership } : {}),
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

async function identity(
  key: string,
  role: Role,
  hash: string,
  extra: object = {},
) {
  const user = await db.user.create({
    data: {
      name: `Synthetic ${key}`,
      email: `memberships-${key.toLowerCase()}-${suffix}@example.test`,
      passwordHash: hash,
      role,
      ...extra,
    },
  });

  const login = await request(null, "/auth/login", "POST", {
    email: user.email,
    password,
  });

  assert.equal(login.status, 200, key + " login");

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

before(async () => {
  app = await createApp({
    NODE_ENV: "test",
    HOST: "127.0.0.1",
    PORT: 4100,
    DATABASE_URL: url!,
    WEB_ORIGIN: origin,
    JWT_SECRET: "synthetic-multiple-membership-secret-at-least-32-characters",
    LOCAL_DEMO_AUTH: false,
    EMAIL_FROM: "synthetic@example.test",
    CUSTOMER_REMINDER_DAYS_BEFORE: "",
    PRIVATE_STORAGE_PROVIDER: "local",
    PRIVATE_STORAGE_S3_REGION: "ap-southeast-1",
    ABUSE_LIMITS: {
      auth: [[1000, 60]],
      accountRead: [[10000, 60]],
      expensive: [[10000, 60]],
      accountWrite: [[10000, 60]],
    },
  });

  await app.listen(0, "127.0.0.1");

  base = await app.getUrl();

  db = app.get(Database);

  const hash = await hashPassword(password);

  for (const role of [
    "COO",
    "RECORDS",
    "FINANCE_OFFICER",
    "BATCH_MANAGER",
    "BATCH_HANDLER",
    "AGENT",
    "CEO",
  ] as const) {
    await identity(role, role, hash);
  }

  const agent = await db.agent.create({
    data: { name: "Synthetic membership Agent", code: `MULTI-${suffix}` },
  });

  await db.user.update({
    where: { id: users.get("AGENT")!.id },
    data: { agentProfileId: agent.id },
  });

  for (const label of ["A", "B", "FOREIGN"]) {
    const batch = await db.batch.create({
      data: {
        code: `MULTI-${label}-${suffix.slice(0, 8)}`,
        model: `Synthetic device ${label}`,
        startDate: new Date("2047-01-01"),
        endDate: new Date("2047-12-31"),
        contractPrice: label === "B" ? "6000" : "12000",
        installmentCount: 6,
        cadence: "MONTHLY",
        status: "PLANNED",
        ...(label !== "FOREIGN"
          ? {
              agentId: agent.id,
              managerId: users.get("BATCH_MANAGER")!.id,
              handlerId: users.get("BATCH_HANDLER")!.id,
            }
          : {}),
      },
    });

    if (label === "A") {
      batchA = batch.id;
    } else if (label === "B") {
      batchB = batch.id;
    } else {
      foreignBatch = batch.id;
    }
  }

  const member = await db.client.create({
    data: {
      name: "Synthetic returning member",
      email: "",
      phone: "09170001111",
      batchId: batchA,
    },
  });

  clientA = member.id;

  memberId = member.memberId;

  await db.scheduleItem.createMany({
    data: [1, 2, 3, 4, 5, 6].map((sequenceNo) => {
      return {
        clientId: clientA,
        sequenceNo,
        dueDate: new Date(`2047-${String(sequenceNo).padStart(2, "0")}-01`),
        expectedAmount: "2000",
      };
    }),
  });

  const other = await db.client.create({
    data: {
      name: "Synthetic private stranger",
      email: "",
      phone: "09179992222",
      batchId: foreignBatch,
    },
  });

  stranger = other.id;

  await identity("CUSTOMER", "CUSTOMER", hash, { clientId: clientA });

  await identity("STRANGER", "CUSTOMER", hash, { clientId: stranger });
});

after(async () => {
  await app?.close();
});

test("legacy inserts create a shared profile and primary account without resetting IDs", async () => {
  const profile = await db.member.findUniqueOrThrow({
    where: { id: memberId },
    include: { account: true },
  });

  assert.equal(profile.name, "Synthetic returning member");

  assert.equal(profile.account?.id, users.get("CUSTOMER")!.id);

  assert.equal(
    (await db.client.findUniqueOrThrow({ where: { id: clientA } })).batchId,
    batchA,
  );
});

test("Agent member lookup exposes only profiles from currently assigned batches", async () => {
  const response = await request("AGENT", "/enrollment/members?q=Synthetic");

  assert.equal(response.status, 200);

  const options = await response.json();

  assert.ok(
    options.some((item: { memberId: string }) => {
      return item.memberId === memberId;
    }),
  );

  assert.equal(
    options.some((item: { name: string }) => {
      return item.name.includes("stranger");
    }),
    false,
  );

  assert.equal(
    (await request("CEO", "/enrollment/members?q=Synthetic")).status,
    403,
  );

  assert.equal(
    (await request("CUSTOMER", "/enrollment/members?q=Synthetic")).status,
    403,
  );
});

test("existing-member submission waits for review and does not create a membership", async () => {
  const count = await db.client.count({ where: { memberId } });

  const response = await request("AGENT", "/enrollment/requests", "POST", {
    submissionId: randomUUID(),
    batchId: batchB,
    memberId,
    name: "Synthetic returning member",
    email: "",
    phone: "09170001111",
  });

  assert.equal(response.status, 201);

  requestId = (await response.json()).id;

  assert.equal(await db.client.count({ where: { memberId } }), count);
});

test("only an assigned reviewer can approve; approval creates independent schedule under the same profile", async () => {
  const decision = {
    version: 1,
    decision: "APPROVED",
    reason: "Synthetic approval for a separate batch plan",
  };

  assert.equal(
    (
      await request(
        "AGENT",
        `/enrollment/requests/${requestId}/review`,
        "POST",
        decision,
      )
    ).status,
    403,
  );

  const response = await request(
    "BATCH_MANAGER",
    `/enrollment/requests/${requestId}/review`,
    "POST",
    decision,
  );

  assert.equal(response.status, 201);

  clientB = (await response.json()).clientId;

  assert.notEqual(clientB, clientA);

  const membership = await db.client.findUniqueOrThrow({
    where: { id: clientB },
    include: { schedule: true },
  });

  assert.equal(membership.memberId, memberId);

  assert.equal(membership.batchId, batchB);

  assert.equal(membership.schedule.length, 6);

  assert.equal(membership.schedule[0].expectedAmount.toFixed(2), "1000.00");

  assert.equal(await db.member.count({ where: { id: memberId } }), 1);

  const repeat = await request(
    "BATCH_MANAGER",
    `/enrollment/requests/${requestId}/review`,
    "POST",
    decision,
  );

  assert.equal(repeat.status, 201);

  assert.equal((await repeat.json()).clientId, clientB);

  assert.equal(await db.client.count({ where: { memberId } }), 2);
});

test("duplicate membership and cross-scope identity linking are rejected", async () => {
  const applicant = {
    submissionId: randomUUID(),
    batchId: batchB,
    memberId,
    name: "Synthetic returning member",
    email: "",
    phone: "09170001111",
  };

  assert.equal(
    (await request("AGENT", "/enrollment/requests", "POST", applicant)).status,
    409,
  );

  const foreign = await db.client.findUniqueOrThrow({
    where: { id: stranger },
  });

  assert.equal(
    (
      await request("AGENT", "/enrollment/requests", "POST", {
        ...applicant,
        submissionId: randomUUID(),
        memberId: foreign.memberId,
        name: foreign.name,
        phone: foreign.phone,
      })
    ).status,
    404,
  );
});

test("one customer account lists both memberships while a stranger lists only their own", async () => {
  const own = await request("CUSTOMER", "/portal/memberships");

  assert.equal(own.status, 200);

  assert.deepEqual(
    (await own.json())
      .map((row: { id: string }) => {
        return row.id;
      })
      .sort(),
    [clientA, clientB].sort(),
  );

  const other = await request("STRANGER", "/portal/memberships");

  assert.deepEqual(
    (await other.json()).map((row: { id: string }) => {
      return row.id;
    }),
    [stranger],
  );
});

test("selection is per request; invalid/foreign selectors cannot replace identity or cross customer boundaries", async () => {
  assert.equal(
    (
      await request(
        "CUSTOMER",
        `/clients/${clientB}`,
        "GET",
        undefined,
        clientB,
      )
    ).status,
    200,
  );

  assert.equal(
    (
      await request(
        "CUSTOMER",
        `/clients/${clientA}`,
        "GET",
        undefined,
        clientB,
      )
    ).status,
    404,
  );

  assert.equal(
    (
      await request(
        "CUSTOMER",
        `/clients/${stranger}`,
        "GET",
        undefined,
        stranger,
      )
    ).status,
    404,
  );

  assert.equal(
    (
      await request(
        "CUSTOMER",
        "/portal/memberships",
        "GET",
        undefined,
        "bad-id",
      )
    ).status,
    400,
  );

  assert.equal(
    (await request("CUSTOMER", "/legal/status", "GET", undefined, stranger))
      .status,
    200,
  );

  assert.equal(
    (await request("CUSTOMER", "/auth/me", "GET", undefined, "bad-id")).status,
    200,
  );

  const primary = await request("CUSTOMER", "/auth/me");

  assert.equal((await primary.json()).clientId, clientA);

  assert.equal(
    (
      await db.user.findUniqueOrThrow({
        where: { id: users.get("CUSTOMER")!.id },
      })
    ).clientId,
    clientA,
  );
});

test("schedules and balances remain separate; customer selectors cannot grant financial writes", async () => {
  const first = await request("CUSTOMER", `/clients/${clientA}/balance`);

  const second = await request(
    "CUSTOMER",
    `/clients/${clientB}/balance`,
    "GET",
    undefined,
    clientB,
  );

  assert.equal(first.status, 200);

  assert.equal(second.status, 200);

  assert.equal((await first.json()).totalDue, "12000.00");

  assert.equal((await second.json()).totalDue, "6000.00");

  assert.equal(
    (
      await request(
        "CUSTOMER",
        "/payments",
        "POST",
        {
          clientId: clientB,
          amount: "100.00",
          paymentDate: "2047-01-01",
          method: "GCASH",
        },
        clientB,
      )
    ).status,
    403,
  );
});

test("payments and Finance-verified credit are isolated to their original membership", async () => {
  for (const [id, batch, amount] of [
    [clientA, batchA, "2000"],
    [clientB, batchB, "1000"],
  ]) {
    const payment = await db.payment.create({
      data: {
        clientId: id,
        batchId: batch,
        amount,
        method: "GCASH",
        paymentDate: new Date("2047-01-01"),
        status: "VERIFIED",
        recordedById: users.get("BATCH_HANDLER")!.id,
        verifierId: users.get("FINANCE_OFFICER")!.id,
        verifiedAt: new Date(),
      },
    });

    if (id === clientA) {
      paymentA = payment.id;
    } else {
      paymentB = payment.id;
    }
  }

  for (const [id, expected, paid] of [
    [clientA, paymentA, "2000.00"],
    [clientB, paymentB, "1000.00"],
  ]) {
    const response = await request(
      "CUSTOMER",
      "/payments",
      "GET",
      undefined,
      id,
    );

    assert.equal(response.status, 200);

    const data = await response.json();

    assert.deepEqual(
      data.items.map((row: { id: string }) => {
        return row.id;
      }),
      [expected],
    );

    const balance = await request(
      "CUSTOMER",
      `/clients/${id}/balance`,
      "GET",
      undefined,
      id,
    );

    assert.equal((await balance.json()).verifiedPaid, paid);
  }

  assert.equal(
    (
      await request(
        "CUSTOMER",
        `/payments/${paymentA}/confirmation`,
        "GET",
        undefined,
        clientB,
      )
    ).status,
    404,
  );

  assert.equal(
    (
      await request(
        "CUSTOMER",
        `/payments/${paymentB}/confirmation`,
        "GET",
        undefined,
        clientB,
      )
    ).status,
    200,
  );
});

test("secondary membership support creation and replies recheck current ownership inside the transaction", async () => {
  const response = await request(
    "CUSTOMER",
    "/portal/support",
    "POST",
    {
      category: "Account",
      description: "Synthetic question about my second batch membership",
    },
    clientB,
  );

  assert.equal(response.status, 201);

  const created = await response.json();

  assert.equal(created.client, clientB);

  assert.equal(
    (await request("CUSTOMER", `/portal/support/${created.id}`)).status,
    404,
  );

  assert.equal(
    (
      await request(
        "CUSTOMER",
        `/portal/support/${created.id}/replies`,
        "POST",
        { body: "Synthetic follow-up for batch B" },
        clientB,
      )
    ).status,
    201,
  );

  assert.equal(
    (
      await request(
        "STRANGER",
        `/portal/support/${created.id}`,
        "GET",
        undefined,
        clientB,
      )
    ).status,
    404,
  );
});

test("secondary documents are separately scoped and unauthorized downloads stay denied", async () => {
  assert.equal(
    (await request("CUSTOMER", "/portal/documents", "GET", undefined, clientB))
      .status,
    200,
  );

  assert.equal(
    (
      await request(
        "CUSTOMER",
        `/clients/${clientA}/documents`,
        "GET",
        undefined,
        clientB,
      )
    ).status,
    404,
  );

  const contents = "%PDF-1.4\nSynthetic membership B document\n%%EOF";

  const upload = new FormData();

  upload.set(
    "file",
    new Blob([contents], { type: "application/pdf" }),
    "synthetic-batch-b.pdf",
  );

  const created = await fetch(`${base}/api/portal/documents/SIGNED_AGREEMENT`, {
    method: "POST",
    body: upload,
    headers: {
      Origin: origin,
      Cookie: users.get("CUSTOMER")!.cookie,
      "X-Membership-Id": clientB,
    },
  });

  assert.equal(created.status, 201, await created.clone().text());

  const document = await created.json();

  assert.equal(
    (
      await db.customerDocument.findUniqueOrThrow({
        where: { id: document.id },
      })
    ).clientId,
    clientB,
  );

  assert.equal(
    (await request("CUSTOMER", `/documents/${document.id}/file`)).status,
    404,
  );

  const download = await request(
    "CUSTOMER",
    `/documents/${document.id}/file`,
    "GET",
    undefined,
    clientB,
  );

  assert.equal(download.status, 200);

  assert.equal(await download.text(), contents);
});

test("notifications reach the shared account and link/filter to the correct batch", async () => {
  await db.$transaction(async (tx) => {
    await notifyCustomer(
      tx,
      clientA,
      "release",
      "Synthetic A update",
      "Synthetic message A",
      "/portal/release",
    );

    await notifyCustomer(
      tx,
      clientB,
      "release",
      "Synthetic B update",
      "Synthetic message B",
      "/portal/release",
    );
  });

  const primary = await (
    await request("CUSTOMER", "/portal/notifications")
  ).json();

  const secondary = await (
    await request(
      "CUSTOMER",
      "/portal/notifications",
      "GET",
      undefined,
      clientB,
    )
  ).json();

  assert.equal(
    primary.some((item: { title: string }) => {
      return item.title === "Synthetic B update";
    }),
    false,
  );

  const notice = secondary.find((item: { title: string }) => {
    return item.title === "Synthetic B update";
  });

  assert.ok(notice);

  assert.ok(notice.targetPath.includes(`membership=${clientB}`));

  assert.equal(
    secondary.some((item: { title: string }) => {
      return item.title === "Synthetic A update";
    }),
    false,
  );
});

test("a member cannot receive a second portal account through a different membership", async () => {
  const response = await request("COO", "/accounts", "POST", {
    name: "Synthetic duplicate login",
    email: `duplicate-${suffix}@example.test`,
    password,
    role: "CUSTOMER",
    clientId: clientB,
  });

  assert.equal(response.status, 409);
});

test("database uniqueness protects concurrent duplicate enrollment and identity relinking", async () => {
  await assert.rejects(
    db.client.create({
      data: {
        memberId,
        name: "Duplicate",
        email: "",
        phone: "",
        batchId: batchB,
      },
    }),
  );

  await assert.rejects(
    db.client.update({
      where: { id: clientB },
      data: { memberId: randomUUID() },
    }),
  );

  assert.equal(await db.client.count({ where: { memberId } }), 2);
});

test("shared identity edits keep histories and version sibling memberships", async () => {
  const before = await db.client.findUniqueOrThrow({ where: { id: clientA } });

  const other = await db.client.findUniqueOrThrow({ where: { id: clientB } });

  const response = await request("RECORDS", `/clients/${clientA}`, "PATCH", {
    version: before.version,
    record: {
      name: "Synthetic returning member corrected",
      email: "",
      phone: before.phone,
      batchId: batchA,
      status: "ACTIVE",
      releaseStatus: "NOT_READY",
    },
  });

  assert.equal(response.status, 200, await response.text());

  const sibling = await db.client.findUniqueOrThrow({ where: { id: clientB } });

  assert.equal(sibling.name, "Synthetic returning member corrected");

  assert.equal(sibling.version, other.version + 1);

  assert.equal(
    await db.scheduleItem.count({ where: { clientId: clientB } }),
    6,
  );

  assert.equal(
    (await db.payment.findUniqueOrThrow({ where: { id: paymentB } })).clientId,
    clientB,
  );
});

test("a scoped Manager cannot edit shared identity in another Manager's batch", async () => {
  await db.batch.update({ where: { id: batchB }, data: { managerId: null } });

  try {
    const client = await db.client.findUniqueOrThrow({
      where: { id: clientA },
    });

    const response = await request(
      "BATCH_MANAGER",
      `/clients/${clientA}`,
      "PATCH",
      {
        version: client.version,
        record: {
          name: "Unauthorized shared rename",
          email: client.email,
          phone: client.phone,
          batchId: batchA,
          status: "ACTIVE",
          releaseStatus: "NOT_READY",
        },
      },
    );

    assert.equal(response.status, 403);

    assert.equal(
      (await request("BATCH_MANAGER", `/clients/${clientB}`)).status,
      404,
    );

    assert.equal(
      (await db.member.findUniqueOrThrow({ where: { id: memberId } })).name,
      client.name,
    );
  } finally {
    await db.batch.update({
      where: { id: batchB },
      data: { managerId: users.get("BATCH_MANAGER")!.id },
    });
  }
});

test("matching contact details never silently merge two existing people", async () => {
  const profile = await db.member.findUniqueOrThrow({
    where: { id: memberId },
  });

  const separate = await db.client.create({
    data: {
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      batchId: foreignBatch,
    },
  });

  assert.notEqual(separate.memberId, memberId);
});

test("concurrent approvals for one member and target batch create exactly one membership and schedule", async () => {
  const source = await db.batch.findUniqueOrThrow({ where: { id: batchA } });

  const target = await db.batch.create({
    data: {
      code: `MULTI-C-${suffix.slice(0, 8)}`,
      model: source.model,
      startDate: source.startDate,
      endDate: source.endDate,
      contractPrice: source.contractPrice,
      installmentCount: source.installmentCount,
      cadence: source.cadence,
      managerId: source.managerId,
      handlerId: source.handlerId,
      agentId: source.agentId,
    },
  });

  const profile = await db.member.findUniqueOrThrow({
    where: { id: memberId },
  });

  const requests = await Promise.all(
    [0, 1].map(async () => {
      const response = await request("AGENT", "/enrollment/requests", "POST", {
        submissionId: randomUUID(),
        batchId: target.id,
        memberId,
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
      });

      assert.equal(response.status, 201);

      return (await response.json()).id as string;
    }),
  );

  const decisions = await Promise.all(
    requests.map((id) => {
      return request(
        "BATCH_MANAGER",
        `/enrollment/requests/${id}/review`,
        "POST",
        {
          version: 1,
          decision: "APPROVED",
          reason: "Concurrent synthetic approval",
        },
      );
    }),
  );

  assert.deepEqual(
    decisions
      .map((response) => {
        return response.status;
      })
      .sort(),
    [201, 409],
  );

  assert.equal(
    await db.client.count({ where: { memberId, batchId: target.id } }),
    1,
  );

  assert.equal(
    await db.scheduleItem.count({
      where: { client: { memberId, batchId: target.id } },
    }),
    6,
  );
});

test("stream membership selection rejects foreign and malformed IDs before opening the stream", async () => {
  assert.equal(
    (await request("CUSTOMER", `/events?membership=${stranger}`)).status,
    404,
  );

  assert.equal(
    (await request("CUSTOMER", "/events?membership=invalid")).status,
    400,
  );
});

test("live stream reauthentication keeps the selected membership and filters another batch's record hints", async () => {
  const abort = new AbortController();

  const response = await fetch(`${base}/api/events?membership=${clientB}`, {
    headers: { Cookie: users.get("CUSTOMER")!.cookie, Origin: origin },
    signal: abort.signal,
  });

  assert.equal(response.status, 200);

  const reader = response.body!.getReader();

  const decoder = new TextDecoder();

  let received = "";

  try {
    while (!received.includes("event: ready")) {
      received += decoder.decode((await reader.read()).value);
    }

    await db.changeEvent.create({
      data: { entity: "client", recordId: clientA },
    });

    await db.changeEvent.create({
      data: { entity: "client", recordId: clientB },
    });

    const timeout = setTimeout(() => {
      return abort.abort();
    }, 8000);

    try {
      while (!received.includes(clientB)) {
        received += decoder.decode((await reader.read()).value);
      }

      assert.equal(received.includes(clientA), false);
    } finally {
      clearTimeout(timeout);
    }
  } finally {
    abort.abort();

    await reader.cancel().catch(() => {
      return undefined;
    });
  }
});

test("retention includes the shared profile in audit disposition and blocks erasing it through one membership", async () => {
  const result = await db.$transaction((tx) => {
    return describe(
      tx,
      { scope: "CUSTOMER", subjectId: clientB },
      users.get("COO")!.id,
    );
  });

  assert.ok(
    result.blockers.some((message) => {
      return message.includes("other batch memberships");
    }),
  );

  assert.ok(result.manifest.recordIds.includes(memberId));
});

test("existing legacy profiles without a phone can be reused; new enrollment still requires a contact number", async () => {
  const legacy = await db.client.create({
    data: {
      name: "Synthetic legacy no phone",
      email: "",
      phone: "",
      batchId: batchA,
    },
  });

  const applicant = {
    submissionId: randomUUID(),
    batchId: batchB,
    name: legacy.name,
    email: "",
    phone: "",
  };

  assert.equal(
    (await request("AGENT", "/enrollment/requests", "POST", applicant)).status,
    400,
  );

  const linked = await request("AGENT", "/enrollment/requests", "POST", {
    ...applicant,
    memberId: legacy.memberId,
  });

  assert.equal(linked.status, 201);
});
