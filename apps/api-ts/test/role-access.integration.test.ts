import "reflect-metadata";
import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import { roles, reportKindsFor, type Role } from "@freshphones/contracts";
import { createApp } from "../src/app";
import { Database } from "../src/database";
import { hashPassword } from "../src/auth/password";

const url = process.env.TEST_DATABASE_URL;

if (!url || !new URL(url).pathname.endsWith("_test")) {
  throw new Error(
    "Dedicated migrated TEST_DATABASE_URL ending in _test required.",
  );
}

const origin = "http://localhost:3100";

const password = "Synthetic-role-access-test-123!";

const suffix = randomUUID();

const reference = "ROLE-DUPLICATE-" + suffix;

let app: INestApplication, db: Database, base: string;

const identities = new Map<string, { id: string; cookie: string }>();

let batchA: string,
  batchB: string,
  clientA: string,
  clientB: string,
  agentProfileA: string;

async function request(
  role: string | null,
  path: string,
  method = "GET",
  body?: unknown,
) {
  return fetch(`${base}/api${path}`, {
    method,
    headers: {
      Origin: origin,
      ...(role ? { Cookie: identities.get(role)!.cookie } : {}),
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

async function createIdentity(
  key: string,
  role: Role,
  passwordHash: string,
  extra: object = {},
) {
  const user = await db.user.create({
    data: {
      name: `Synthetic ${key}`,
      email: `role-${key.toLowerCase()}-${suffix}@example.test`,
      role,
      passwordHash,
      ...extra,
    },
  });

  const response = await request(null, "/auth/login", "POST", {
    email: user.email,
    password,
  });

  assert.equal(response.status, 200, key + " login");

  identities.set(key, {
    id: user.id,
    cookie: response.headers
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
    JWT_SECRET: "synthetic-role-access-secret-at-least-32-characters",
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

  await db.abuseBucket.deleteMany();

  const passwordHash = await hashPassword(password);

  for (const role of roles.filter((value) => {
    return value !== "CUSTOMER";
  })) {
    await createIdentity(role, role, passwordHash);
  }

  for (const role of [
    "BATCH_MANAGER",
    "BATCH_HANDLER",
    "OPERATIONS_COORDINATOR",
    "PIONEER_AGENT",
    "AGENT",
  ] as const) {
    await createIdentity(role + "_B", role, passwordHash);
  }

  for (const postfix of ["", "_B"]) {
    await db.user.update({
      where: { id: identities.get("PIONEER_AGENT" + postfix)!.id },
      data: {
        supervisorId: identities.get("OPERATIONS_COORDINATOR" + postfix)!.id,
      },
    });

    const profile = await db.agent.create({
      data: {
        name: "Synthetic Agent " + postfix,
        code: "ROLE-" + suffix.slice(0, 8) + (postfix || "-A"),
      },
    });

    await db.user.update({
      where: { id: identities.get("AGENT" + postfix)!.id },
      data: {
        supervisorId: identities.get("PIONEER_AGENT" + postfix)!.id,
        agentProfileId: profile.id,
      },
    });

    const batch = await db.batch.create({
      data: {
        code: "ROLE-" + suffix.slice(0, 8) + (postfix || "-A"),
        model: "Synthetic device",
        startDate: new Date("2045-01-01"),
        endDate: new Date("2045-12-31"),
        contractPrice: "12000",
        installmentCount: 12,
        cadence: "MONTHLY",
        managerId: identities.get("BATCH_MANAGER" + postfix)!.id,
        handlerId: identities.get("BATCH_HANDLER" + postfix)!.id,
        agentId: profile.id,
      },
    });

    const client = await db.client.create({
      data: {
        name: "Synthetic member " + postfix,
        email: "",
        phone: "",
        batchId: batch.id,
      },
    });

    await db.payment.create({
      data: {
        clientId: client.id,
        batchId: batch.id,
        amount: "1000",
        method: "GCASH",
        referenceNumber: reference,
        paymentDate: new Date("2045-01-01"),
        recordedById: identities.get("BATCH_HANDLER" + postfix)!.id,
      },
    });

    if (!postfix) {
      batchA = batch.id;

      clientA = client.id;

      agentProfileA = profile.id;
    } else {
      batchB = batch.id;

      clientB = client.id;
    }
  }

  await createIdentity("CUSTOMER", "CUSTOMER", passwordHash, {
    clientId: clientA,
  });

  for (const kind of ["PAYMENTS", "TASKS", "SUPPORT"]) {
    await db.reportSnapshot.create({
      data: {
        kind,
        periodStart: new Date("2045-01-01"),
        periodEnd: new Date("2045-01-31"),
        payload: {},
        createdById: identities.get("COO")!.id,
      },
    });
  }
});

after(async () => {
  if (app) {
    await app.close();
  }
});

test("every role has an explicit API access matrix; no operational role inherits CEO or technical powers", async () => {
  const matrix: [string, string[]][] = [
    ["/accounts", ["SYSTEM_ADMIN", "COO"]],
    [
      "/batches",
      [
        "SYSTEM_ADMIN",
        "COO",
        "BATCH_MANAGER",
        "GENERAL_MANAGER",
        "RECORDS",
        "FINANCE_OFFICER",
        "BATCH_HANDLER",
        "CORE_HANDLER",
      ],
    ],
    [
      "/payments",
      [
        "SYSTEM_ADMIN",
        "COO",
        "BATCH_MANAGER",
        "GENERAL_MANAGER",
        "RECORDS",
        "FINANCE_OFFICER",
        "BATCH_HANDLER",
        "CORE_HANDLER",
        "CUSTOMER",
      ],
    ],
    [
      "/staff/directory",
      [
        "SYSTEM_ADMIN",
        "COO",
        "HR_PAYROLL",
        "KPI_OFFICER",
        "OPERATIONS_COORDINATOR",
        "PIONEER_AGENT",
      ],
    ],
    [
      "/agent-network",
      [
        "SYSTEM_ADMIN",
        "COO",
        "OPERATIONS_COORDINATOR",
        "PIONEER_AGENT",
        "AGENT",
      ],
    ],
    [
      "/reports/payments",
      ["SYSTEM_ADMIN", "CEO", "COO", "FINANCE_OFFICER", "ANALYTICS"],
    ],
    [
      "/reports/tasks",
      ["SYSTEM_ADMIN", "CEO", "COO", "KPI_OFFICER", "ANALYTICS"],
    ],
    [
      "/reports/support",
      ["SYSTEM_ADMIN", "CEO", "COO", "CSR", "CS_HEAD", "CS_TEAM", "ANALYTICS"],
    ],
  ];

  for (const [path, permitted] of matrix) {
    for (const role of roles) {
      const response = await request(role, path);

      assert.equal(
        response.status,
        permitted.includes(role) ? 200 : 403,
        `${role} ${path}: ${await response.text()}`,
      );
    }
  }
});

test("COO assigns business roles while administrator access, self-escalation and inactive grants stay protected", async () => {
  const listing = await (await request("COO", "/accounts")).json();

  assert.equal(
    listing.items.some((row: { role: string }) => {
      return row.role === "SYSTEM_ADMIN";
    }),
    false,
  );

  assert.equal(
    (await request("COO", `/accounts/${identities.get("SYSTEM_ADMIN")!.id}`))
      .status,
    404,
  );

  assert.equal(
    (
      await request("COO", "/accounts", "POST", {
        name: "Synthetic forbidden administrator",
        email: `no-admin-${suffix}@example.test`,
        role: "SYSTEM_ADMIN",
        password,
      })
    ).status,
    403,
  );

  const coo = await db.user.findUniqueOrThrow({
    where: { id: identities.get("COO")!.id },
  });

  assert.equal(
    (
      await request("COO", `/accounts/${coo.id}`, "PATCH", {
        version: coo.version,
        role: "FINANCE_OFFICER",
      })
    ).status,
    400,
  );

  assert.equal(
    (
      await request("COO", `/accounts/${coo.id}`, "PATCH", {
        version: coo.version,
        hrConfidentialAccess: true,
        hrAccessReason: "Synthetic self grant",
      })
    ).status,
    400,
  );

  const newAccount = await request("COO", "/accounts", "POST", {
    name: "Synthetic access reassignment",
    email: `new-role-${suffix}@example.test`,
    role: "AGENT",
    password,
  });

  assert.equal(newAccount.status, 201);

  const person = await newAccount.json();

  const changed = await request("COO", `/accounts/${person.id}`, "PATCH", {
    version: person.version,
    role: "KPI_OFFICER",
  });

  assert.equal(changed.status, 200);

  assert.equal((await changed.json()).role, "KPI_OFFICER");

  assert.equal(
    (
      await request("HR_PAYROLL", `/accounts/${person.id}`, "PATCH", {
        version: person.version,
        role: "COO",
      })
    ).status,
    403,
  );
});

test("assigned batch and payment scopes apply to lists, direct reads, balances, history and duplicate evidence", async () => {
  const managerBatches = await (
    await request("BATCH_MANAGER", "/batches")
  ).json();

  assert.deepEqual(
    managerBatches.items.map((row: { id: string }) => {
      return row.id;
    }),
    [batchA],
  );

  const payments = await (await request("BATCH_HANDLER", "/payments")).json();

  assert.equal(payments.items.length, 1);

  assert.equal(payments.items[0].batchId, batchA);

  assert.equal(payments.items[0].duplicateReference, false);

  for (const role of ["BATCH_MANAGER", "BATCH_HANDLER"]) {
    for (const path of [
      `/batches/${batchB}`,
      `/clients/${clientB}`,
      `/clients/${clientB}/schedule`,
      `/clients/${clientB}/balance`,
      `/clients/${clientB}/release-updates`,
    ]) {
      assert.equal((await request(role, path)).status, 404, role + path);
    }
  }

  assert.equal(
    (await request("BATCH_MANAGER", `/batches/${batchB}/history`)).status,
    404,
  );

  const duplicates = await (
    await request(
      "BATCH_HANDLER",
      `/payments/duplicates?method=GCASH&referenceNumber=${reference}`,
    )
  ).json();

  assert.equal(duplicates.length, 1);

  assert.equal(duplicates[0].clientId, clientA);

  const globalMatches = await (
    await request(
      "FINANCE_OFFICER",
      `/payments/duplicates?method=GCASH&referenceNumber=${reference}`,
    )
  ).json();

  assert.equal(globalMatches.length, 2);

  const outside = await request("BATCH_HANDLER", "/payments", "POST", {
    clientId: clientB,
    amount: "100",
    paymentDate: "2045-01-02",
    method: "GCASH",
  });

  assert.equal(outside.status, 404);

  for (const role of ["COO", "RECORDS", "BATCH_MANAGER", "FINANCE_OFFICER"]) {
    assert.equal(
      (await request(role, "/payments", "POST", {})).status,
      403,
      role + " cannot record Handler claims",
    );
  }

  const before = await db.batch.findUniqueOrThrow({ where: { id: batchA } });

  assert.equal(
    (await request("BATCH_MANAGER", "/batches", "POST", {})).status,
    403,
  );

  assert.equal(
    (
      await request(
        "BATCH_MANAGER",
        `/batches/${batchA}/assignments`,
        "PATCH",
        {
          version: before.version,
          managerId: identities.get("BATCH_MANAGER_B")!.id,
          handlerId: before.handlerId,
          agentId: before.agentId,
        },
      )
    ).status,
    403,
  );
});

test("Agent, Pioneer and Coordinator network reads follow current assignments and omit financial/private HR data", async () => {
  for (const role of ["AGENT", "PIONEER_AGENT", "OPERATIONS_COORDINATOR"]) {
    const response = await request(role, "/agent-network");

    assert.equal(response.status, 200);

    const data = await response.json();

    assert.deepEqual(
      data.agents.map((row: { id: string }) => {
        return row.id;
      }),
      [identities.get("AGENT")!.id],
    );

    assert.deepEqual(
      data.batches.map((row: { id: string }) => {
        return row.id;
      }),
      [batchA],
    );

    const text = JSON.stringify(data);

    assert.equal(text.includes("passwordHash"), false);

    assert.equal(text.includes("contractPrice"), false);

    assert.equal(text.includes("@example.test"), false);
  }

  const directory = await (
    await request("KPI_OFFICER", "/staff/directory")
  ).json();

  assert.equal(
    directory.some((row: { role: string }) => {
      return ["SYSTEM_ADMIN", "CEO", "CUSTOMER"].includes(row.role);
    }),
    false,
  );

  for (const row of directory) {
    assert.equal("email" in row, false);

    assert.equal("hrConfidentialAccess" in row, false);
  }

  assert.equal((await request("KPI_OFFICER", "/hr-actions")).status, 403);
});

test("enrollment requires an authorized review, scopes approvers and creates one member across retries", async () => {
  const count = await db.client.count();

  const body = {
    submissionId: randomUUID(),
    batchId: batchA,
    name: "Synthetic requested member",
    email: "",
    phone: "09123456789",
  };

  const submitted = await request(
    "AGENT",
    "/enrollment/requests",
    "POST",
    body,
  );

  assert.equal(submitted.status, 201);

  const pending = await submitted.json();

  assert.equal(pending.status, "PENDING");

  assert.equal(await db.client.count(), count);

  assert.equal((await request("AGENT", "/clients", "POST", {})).status, 403);

  assert.equal(
    (
      await request(
        "AGENT",
        `/enrollment/requests/${pending.id}/review`,
        "POST",
        { version: 1, decision: "APPROVED", reason: "Synthetic approval" },
      )
    ).status,
    403,
  );

  assert.equal(
    (
      await request(
        "BATCH_MANAGER_B",
        `/enrollment/requests/${pending.id}/review`,
        "POST",
        { version: 1, decision: "APPROVED", reason: "Synthetic approval" },
      )
    ).status,
    404,
  );

  assert.equal(
    (
      await request(
        "RECORDS",
        `/enrollment/requests/${pending.id}/review`,
        "POST",
        { version: 1, decision: "APPROVED", reason: "Synthetic approval" },
      )
    ).status,
    403,
  );

  assert.equal(
    (
      await request(
        "BATCH_MANAGER",
        `/enrollment/requests/${pending.id}/review`,
        "POST",
        { version: 99, decision: "APPROVED", reason: "Synthetic approval" },
      )
    ).status,
    409,
  );

  const decision = {
    version: 1,
    decision: "APPROVED",
    reason: "Synthetic enrollment requirements checked",
  };

  const approved = await request(
    "BATCH_MANAGER",
    `/enrollment/requests/${pending.id}/review`,
    "POST",
    decision,
  );

  assert.equal(approved.status, 201);

  const result = await approved.json();

  assert.ok(result.clientId);

  assert.equal(await db.client.count(), count + 1);

  const retry = await request(
    "BATCH_MANAGER",
    `/enrollment/requests/${pending.id}/review`,
    "POST",
    decision,
  );

  assert.equal(retry.status, 201);

  assert.equal((await retry.json()).clientId, result.clientId);

  assert.equal(await db.client.count(), count + 1);

  const customer = await db.client.findUniqueOrThrow({
    where: { id: result.clientId },
  });

  assert.equal(customer.batchId, batchA);

  assert.equal(
    await db.scheduleItem.count({ where: { clientId: customer.id } }),
    12,
  );

  assert.equal(
    (
      await request("AGENT_B", "/enrollment/requests", "POST", {
        ...body,
        submissionId: randomUUID(),
      })
    ).status,
    404,
  );

  const hidden = await (
    await request("AGENT_B", "/enrollment/requests")
  ).json();

  assert.equal(
    hidden.items.some((row: { id: string }) => {
      return row.id === pending.id;
    }),
    false,
  );

  const same = await request("AGENT", "/enrollment/requests", "POST", body);

  assert.equal((await same.json()).id, pending.id);

  const audit = await db.auditEntry.count({
    where: { action: "enrollment.reviewed", recordId: pending.id },
  });

  assert.equal(audit, 1);
});

test("COO reviews enrollment while team task assignment cannot cross the current hierarchy", async () => {
  const body = {
    submissionId: randomUUID(),
    batchId: batchA,
    name: "Synthetic declined member",
    email: "",
    phone: "09123456780",
  };

  const pending = await (
    await request("AGENT", "/enrollment/requests", "POST", body)
  ).json();

  const count = await db.client.count();

  assert.equal(
    (
      await request(
        "COO",
        `/enrollment/requests/${pending.id}/review`,
        "POST",
        {
          version: 1,
          decision: "REJECTED",
          reason: "Synthetic incomplete requirements",
        },
      )
    ).status,
    201,
  );

  assert.equal(await db.client.count(), count);

  const task = {
    title: "Synthetic coaching follow-up",
    instructions: "Synthetic task instructions",
    priority: "MEDIUM",
    deadline: "2046-01-01T00:00:00Z",
  };

  assert.equal(
    (
      await request("PIONEER_AGENT", "/tasks", "POST", {
        ...task,
        assigneeId: identities.get("AGENT_B")!.id,
      })
    ).status,
    400,
  );

  const created = await request("PIONEER_AGENT", "/tasks", "POST", {
    ...task,
    assigneeId: identities.get("AGENT")!.id,
  });

  assert.equal(created.status, 201);

  const item = await created.json();

  assert.equal(
    (await request("PIONEER_AGENT_B", `/tasks/${item.id}`)).status,
    404,
  );

  const legacy = await (await request("PIONEER_AGENT_B", "/work/tasks")).json();

  assert.equal(JSON.stringify(legacy).includes(item.id), false);

  const staff = await (await request("PIONEER_AGENT", "/work/staff")).json();

  assert.equal(
    staff.some((row: { id: string }) => {
      return row.id === identities.get("AGENT_B")!.id;
    }),
    false,
  );
});

test("report history and exports remain confined to each role's report families", async () => {
  for (const [role, expected] of [
    ["KPI_OFFICER", "TASKS"],
    ["CSR", "SUPPORT"],
    ["FINANCE_OFFICER", "PAYMENTS"],
  ]) {
    const history = await (await request(role, "/reports/snapshots")).json();

    assert.ok(history.items.length);

    assert.equal(
      history.items.every((row: { kind: string }) => {
        return reportKindsFor({ role: role as Role }).includes(row.kind);
      }),
      true,
    );
  }

  assert.equal(
    (await request("CSR", "/reports/export?kind=payments&format=csv")).status,
    403,
  );

  assert.equal(
    (
      await request("KPI_OFFICER", "/reports/snapshots", "POST", {
        kind: "PAYMENTS",
        periodStart: "2045-01-01",
        periodEnd: "2045-01-31",
      })
    ).status,
    403,
  );

  const financial = await db.reportSnapshot.findFirstOrThrow({
    where: { kind: "PAYMENTS" },
  });

  assert.equal(
    (
      await request(
        "CSR",
        `/reports/snapshots/${financial.id}/analysis`,
        "POST",
        {
          body: "Synthetic unsupported financial analysis by customer service.",
        },
      )
    ).status,
    404,
  );
});

test("Handler claims stay pending until Finance verifies, and customer document reads retain exact ownership", async () => {
  const claim = await request("BATCH_HANDLER", "/payments", "POST", {
    clientId: clientA,
    amount: "25.00",
    paymentDate: "2045-01-02",
    method: "GCASH",
    referenceNumber: "ROLE-POSITIVE-" + suffix,
  });

  assert.equal(claim.status, 201);

  const payment = await claim.json();

  assert.equal(payment.status, "PENDING");

  assert.equal(
    (
      await request("BATCH_HANDLER", `/payments/${payment.id}/verify`, "POST", {
        version: 1,
        decision: "VERIFIED",
        notes: "Synthetic Finance review",
      })
    ).status,
    403,
  );

  for (const path of [
    `/clients/${clientB}/requirements`,
    `/clients/${clientB}/documents`,
    `/clients/${clientB}/balance`,
    `/clients/${clientB}/schedule`,
  ]) {
    assert.equal((await request("CUSTOMER", path)).status, 404, path);
  }

  assert.equal(
    (await request("CUSTOMER", `/clients/${clientA}/requirements`)).status,
    200,
  );
});

test("COO grants confidential access to another eligible employee with audit, without granting HR role administration", async () => {
  const hr = await db.user.findUniqueOrThrow({
    where: { id: identities.get("HR_PAYROLL")!.id },
  });

  const grant = await request("COO", `/accounts/${hr.id}`, "PATCH", {
    version: hr.version,
    hrConfidentialAccess: true,
    hrAccessReason: "Synthetic HR confidentiality approval",
  });

  assert.equal(grant.status, 200);

  assert.equal((await grant.json()).hrConfidentialAccess, true);

  assert.equal(
    await db.auditEntry.count({
      where: {
        actorId: identities.get("COO")!.id,
        recordId: hr.id,
        action: "account.hr_access_granted",
      },
    }),
    1,
  );

  assert.equal((await request("HR_PAYROLL", "/auth/me")).status, 401);
});

test("current batch reassignment immediately hides Handler payment alerts, reads and mark-all changes", async () => {
  const actor = identities.get("BATCH_HANDLER")!;

  const payment = await db.payment.findFirstOrThrow({
    where: { clientId: clientA },
  });

  const alert = await db.paymentResultAlert.create({
    data: {
      userId: actor.id,
      paymentId: payment.id,
      paymentVersion: 2,
      decision: "REJECTED",
      amount: payment.amount,
      clientName: "Synthetic member",
      batchCode: "Synthetic batch",
      verifierName: "Synthetic Finance",
      notes: "Synthetic result",
    },
  });

  assert.equal(
    (await request("BATCH_HANDLER", `/staff/alerts/results/${alert.id}`))
      .status,
    200,
  );

  await db.batch.update({
    where: { id: batchA },
    data: { handlerId: identities.get("BATCH_HANDLER_B")!.id },
  });

  assert.equal(
    (await request("BATCH_HANDLER", `/payments/${payment.id}/proof`)).status,
    404,
  );

  assert.equal(
    (await request("BATCH_HANDLER", `/staff/alerts/results/${alert.id}`))
      .status,
    404,
  );

  assert.equal(
    (
      await request("BATCH_HANDLER", `/staff/alerts/${alert.id}/read`, "POST", {
        entity: "payment-result",
      })
    ).status,
    404,
  );

  const feed = await (
    await request("BATCH_HANDLER", "/staff/alerts?scope=results")
  ).json();

  assert.equal(
    feed.items.some((row: { id: string }) => {
      return row.id === alert.id;
    }),
    false,
  );

  assert.equal(
    (
      await request("BATCH_HANDLER", "/staff/alerts/read-all", "POST", {
        scope: "results",
      })
    ).status,
    200,
  );

  assert.equal(
    (await db.paymentResultAlert.findUniqueOrThrow({ where: { id: alert.id } }))
      .readAt,
    null,
  );
});

test("KPI alternate queues redact task evidence and exclude technical administration", async () => {
  const common = {
    creatorId: identities.get("COO")!.id,
    deadline: new Date("1900-01-01"),
    submittedAt: new Date("1900-01-02"),
    status: "SUBMITTED" as const,
    lateFlag: true,
    report: "SENSITIVE-CROSS-STAFF-EVIDENCE",
    instructions: "SENSITIVE-CROSS-STAFF-INSTRUCTIONS",
  };

  const technical = await db.task.create({
    data: {
      ...common,
      title: "Restricted technical administration task",
      assigneeId: identities.get("SYSTEM_ADMIN")!.id,
    },
  });

  const business = await db.task.create({
    data: {
      ...common,
      title: "Business performance review",
      assigneeId: identities.get("AGENT")!.id,
    },
  });

  for (const path of [
    "/tasks",
    "/kpi/queue",
    "/work/tasks",
    "/work/kpi/queue",
  ]) {
    const response = await request("KPI_OFFICER", path);

    assert.equal(response.status, 200, path);

    const data = await response.json();

    const serialized = JSON.stringify(data);

    assert.equal(serialized.includes(technical.id), false, path);

    assert.equal(serialized.includes("SENSITIVE-CROSS-STAFF"), false, path);

    assert.equal(serialized.includes(business.id), true, path);
  }

  for (const path of ["/kpi/reviews", "/work/kpi/reviews"]) {
    assert.equal(
      (
        await request("KPI_OFFICER", path, "POST", {
          taskId: technical.id,
          ...(path.startsWith("/work/") ? {} : { version: technical.version }),
          evaluation: "Synthetic forbidden technical review",
          recommendation: "",
          decision: "NOTED",
        })
      ).status,
      404,
      path,
    );
  }
});
