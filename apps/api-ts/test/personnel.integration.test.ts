import "reflect-metadata";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import {
  roles,
  personnelSubmissionSchema,
  type PersonnelSubmission,
} from "@freshphones/contracts";
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

const password = "Synthetic-personnel-password-123!";

const suffix = randomUUID().slice(0, 8);

let app: INestApplication, db: Database, base: string;

const people = new Map<string, { id: string; email: string; cookie: string }>();

async function request(
  key: string | null,
  path: string,
  body?: unknown,
  idempotencyKey?: string,
) {
  return fetch(`${base}/api${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Origin: origin,
      ...(key ? { Cookie: people.get(key)!.cookie } : {}),
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

function submission(
  extra: Partial<PersonnelSubmission> = {},
): PersonnelSubmission {
  return {
    submissionId: randomUUID(),
    name: "Synthetic trained handler",
    email: `personnel-${randomUUID()}@example.test`,
    role: "BATCH_HANDLER",
    supervisorId: people.get("BATCH_MANAGER")!.id,
    orientationCompletedAt: "2026-01-01T09:00:00.000Z",
    trainingCompletedAt: "2026-01-02T09:00:00.000Z",
    confirmedBy: "Synthetic trainer",
    evidenceNote: "External training completion confirmed by HR.",
    ...extra,
  };
}

async function submit(input = submission()) {
  const response = await request("HR_PAYROLL", "/personnel/onboarding", input);

  assert.equal(response.status, 201, await response.clone().text());

  return response.json();
}

before(async () => {
  app = await createApp({
    NODE_ENV: "test",
    HOST: "127.0.0.1",
    PORT: 4100,
    DATABASE_URL: url!,
    WEB_ORIGIN: origin,
    JWT_SECRET: "synthetic-personnel-secret-at-least-32-characters",
    LOCAL_DEMO_AUTH: false,
    EMAIL_FROM: "synthetic@example.test",
    CUSTOMER_REMINDER_DAYS_BEFORE: "",
    PRIVATE_STORAGE_PROVIDER: "local",
    PRIVATE_STORAGE_S3_REGION: "ap-southeast-1",
    ABUSE_LIMITS: {
      auth: [[10000, 60]],
      accountRead: [[100000, 60]],
      accountWrite: [[100000, 60]],
      expensive: [[100000, 60]],
    },
  });

  await app.listen(0, "127.0.0.1");

  base = await app.getUrl();

  db = app.get(Database);

  await db.loginAttempt.deleteMany();

  const passwordHash = await hashPassword(password);

  const batch = await db.batch.create({
    data: {
      code: `PERSONNEL-${suffix}`,
      model: "Synthetic device",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
    },
  });

  const client = await db.client.create({
    data: {
      name: "Synthetic personnel privacy customer",
      email: "",
      phone: "",
      batchId: batch.id,
    },
  });

  for (const role of roles) {
    const person = await db.user.create({
      data: {
        name: `Synthetic ${role}`,
        email: `personnel-${role.toLowerCase()}-${suffix}@example.test`,
        role,
        ...(role === "CUSTOMER" ? { clientId: client.id } : {}),
        passwordHash,
        hrConfidentialAccess: role === "HR_PAYROLL" || role === "COO",
      },
    });

    const login = await request(null, "/auth/login", {
      email: person.email,
      password,
    });

    assert.equal(login.status, 200, `${role} login`);

    people.set(role, {
      id: person.id,
      email: person.email,
      cookie: login.headers
        .getSetCookie()
        .map((value) => {
          return value.split(";")[0];
        })
        .join("; "),
    });
  }
});

after(async () => {
  await app?.close();
});

test("contracts constrain evidence, roles and unknown privilege fields", () => {
  const input = submission();

  assert.equal(personnelSubmissionSchema.safeParse(input).success, true);

  for (const role of [
    "CEO",
    "COO",
    "SYSTEM_ADMIN",
    "OWNER",
    "CUSTOMER",
    "ANALYTICS",
  ]) {
    assert.equal(
      personnelSubmissionSchema.safeParse({ ...input, role }).success,
      false,
    );
  }

  for (const extra of [
    { hrConfidentialAccess: true },
    { active: true },
    { transcript: "private chat" },
    { password },
  ]) {
    assert.equal(
      personnelSubmissionSchema.safeParse({ ...input, ...extra }).success,
      false,
    );
  }

  assert.equal(
    personnelSubmissionSchema.safeParse({
      ...input,
      trainingCompletedAt: "2026-02-30",
    }).success,
    false,
  );
});

test("HR submits immutable evidence; COO creates the correctly assigned account and it can sign in", async () => {
  const input = submission();

  const row = await submit(input);

  assert.equal(row.status, "PENDING");

  assert.equal(row.account, null);

  assert.equal(await db.user.count({ where: { email: input.email } }), 0);

  const replay = await submit(input);

  assert.equal(replay.id, row.id);

  assert.equal(
    await db.auditEntry.count({
      where: { recordId: row.id, action: "personnel.training_submitted" },
    }),
    1,
  );

  assert.equal(
    (
      await request("HR_PAYROLL", `/personnel/onboarding/${row.id}/enroll`, {
        version: 1,
        password,
      })
    ).status,
    403,
  );

  assert.equal(
    (
      await request("HR_PAYROLL", "/accounts", {
        name: input.name,
        email: input.email,
        role: input.role,
        password,
      })
    ).status,
    403,
  );

  const key = randomUUID();

  const enrollment = await request(
    "COO",
    `/personnel/onboarding/${row.id}/enroll`,
    { version: 1, password },
    key,
  );

  assert.equal(enrollment.status, 201, await enrollment.clone().text());

  const enrolled = await enrollment.json();

  assert.equal(enrolled.status, "ENROLLED");

  assert.equal(enrolled.decidedBy.id, people.get("COO")!.id);

  assert.equal(enrolled.account.role, "BATCH_HANDLER");

  const account = await db.user.findUniqueOrThrow({
    where: { id: enrolled.account.id },
  });

  assert.equal(account.supervisorId, input.supervisorId);

  assert.equal(account.hrConfidentialAccess, false);

  const login = await request(null, "/auth/login", {
    email: input.email,
    password,
  });

  assert.equal(login.status, 200, await login.clone().text());

  const retry = await request(
    "COO",
    `/personnel/onboarding/${row.id}/enroll`,
    { version: 1, password },
    key,
  );

  assert.equal(retry.status, 201);

  assert.equal((await retry.json()).account.id, account.id);

  assert.equal(
    (
      await request("COO", `/personnel/onboarding/${row.id}/enroll`, {
        version: 1,
        password,
      })
    ).status,
    409,
  );

  const history = await (
    await request("HR_PAYROLL", `/personnel/onboarding/${row.id}/history`)
  ).json();

  assert.deepEqual(
    history.map((item: { action: string }) => {
      return item.action;
    }),
    ["personnel.training_submitted", "personnel.enrolled"],
  );

  assert.equal(JSON.stringify(history).includes("password"), false);

  assert.equal(JSON.stringify(enrolled).includes(account.passwordHash), false);
});

test("anonymous and every unrelated stored role cannot read onboarding, options or history or submit", async () => {
  const row = await submit();

  for (const key of [
    null,
    ...roles.filter((role) => {
      return !["HR_PAYROLL", "COO", "SYSTEM_ADMIN"].includes(role);
    }),
  ]) {
    for (const path of [
      "/personnel/onboarding",
      "/personnel/onboarding/options",
      `/personnel/onboarding/${row.id}/history`,
    ]) {
      const response = await request(key, path);

      assert.ok(
        [401, 403].includes(response.status),
        `${key} ${path}: ${response.status}`,
      );
    }

    assert.ok(
      [401, 403].includes(
        (await request(key, "/personnel/onboarding", submission())).status,
      ),
    );
  }

  assert.equal(
    (await request("COO", "/personnel/onboarding", submission())).status,
    403,
  );

  assert.equal(
    (
      await request("SYSTEM_ADMIN", `/personnel/onboarding/${row.id}/enroll`, {
        version: 1,
        password,
      })
    ).status,
    403,
  );
});

test("reused IDs, duplicate pending emails, incomplete/future evidence and invalid supervisors are rejected", async () => {
  const input = submission();

  await submit(input);

  for (const extra of [
    { name: "Changed person" },
    { evidenceNote: "Changed evidence" },
  ]) {
    assert.equal(
      (
        await request("HR_PAYROLL", "/personnel/onboarding", {
          ...input,
          ...extra,
        })
      ).status,
      409,
    );
  }

  assert.equal(
    (
      await request("HR_PAYROLL", "/personnel/onboarding", {
        ...input,
        submissionId: randomUUID(),
        email: input.email.toUpperCase(),
      })
    ).status,
    409,
  );

  for (const extra of [
    { orientationCompletedAt: "2099-01-01T00:00:00Z" },
    { trainingCompletedAt: "2099-01-01T00:00:00Z" },
    { confirmedBy: "" },
    { evidenceNote: "" },
    { supervisorId: people.get("CSR")!.id },
    { role: "SYSTEM_ADMIN" },
  ]) {
    assert.equal(
      (
        await request("HR_PAYROLL", "/personnel/onboarding", {
          ...submission(),
          ...extra,
        })
      ).status,
      400,
    );
  }
});

test("concurrent submission and decision cannot duplicate evidence or create two accounts", async () => {
  const input = submission();

  const submitted = await Promise.all([
    request("HR_PAYROLL", "/personnel/onboarding", input),
    request("HR_PAYROLL", "/personnel/onboarding", input),
  ]);

  const rows = await Promise.all(
    submitted.map((response) => {
      return response.json();
    }),
  );

  assert.equal(rows[0].id, rows[1].id);

  const responses = await Promise.all([
    request("COO", `/personnel/onboarding/${rows[0].id}/enroll`, {
      version: 1,
      password,
    }),
    request("COO", `/personnel/onboarding/${rows[0].id}/reject`, {
      version: 1,
      reason: "Needs another review",
    }),
  ]);

  assert.deepEqual(
    responses
      .map((response) => {
        return response.status;
      })
      .sort(),
    [201, 409],
  );

  assert.equal(
    await db.personnelOnboarding.count({ where: { email: input.email } }),
    1,
  );

  assert.ok((await db.user.count({ where: { email: input.email } })) <= 1);

  assert.equal(
    await db.auditEntry.count({
      where: {
        recordId: rows[0].id,
        action: { in: ["personnel.enrolled", "personnel.enrollment_rejected"] },
      },
    }),
    1,
  );
});

test("rejection preserves dated evidence and permits a corrected new submission", async () => {
  const input = submission();

  const row = await submit(input);

  assert.equal(
    (
      await request("COO", `/personnel/onboarding/${row.id}/reject`, {
        version: 2,
        reason: "Wrong version",
      })
    ).status,
    409,
  );

  assert.equal(
    (
      await request("COO", `/personnel/onboarding/${row.id}/reject`, {
        version: 1,
        reason: "",
      })
    ).status,
    400,
  );

  const response = await request(
    "COO",
    `/personnel/onboarding/${row.id}/reject`,
    { version: 1, reason: "Confirm the trainer before resubmitting" },
  );

  const rejected = await response.json();

  assert.equal(response.status, 201);

  assert.equal(rejected.status, "REJECTED");

  assert.equal(rejected.account, null);

  assert.equal(
    (
      await request("COO", `/personnel/onboarding/${row.id}/enroll`, {
        version: 2,
        password,
      })
    ).status,
    409,
  );

  const corrected = await submit({
    ...input,
    submissionId: randomUUID(),
    confirmedBy: "Confirmed synthetic trainer",
  });

  assert.notEqual(corrected.id, row.id);

  assert.equal(await db.user.count({ where: { email: input.email } }), 0);
});

test("enrollment rechecks changed supervisor, duplicate account and Agent-profile eligibility", async () => {
  const row = await submit();

  const supervisorId = people.get("BATCH_MANAGER")!.id;

  await db.user.update({
    where: { id: supervisorId },
    data: { active: false },
  });

  assert.equal(
    (
      await request("COO", `/personnel/onboarding/${row.id}/enroll`, {
        version: 1,
        password,
      })
    ).status,
    400,
  );

  await db.user.update({ where: { id: supervisorId }, data: { active: true } });

  assert.equal(
    (
      await request("COO", `/personnel/onboarding/${row.id}/enroll`, {
        version: 1,
        password,
        agentProfileId: randomUUID(),
      })
    ).status,
    400,
  );

  const agent = await submit(
    submission({
      role: "AGENT",
      supervisorId: people.get("PIONEER_AGENT")!.id,
    }),
  );

  assert.equal(
    (
      await request("COO", `/personnel/onboarding/${agent.id}/enroll`, {
        version: 1,
        password,
      })
    ).status,
    400,
  );

  assert.equal(
    (
      await request("COO", `/personnel/onboarding/${agent.id}/enroll`, {
        version: 1,
        password,
        agentProfileId: randomUUID(),
      })
    ).status,
    409,
  );

  const profile = await db.agent.create({
    data: { name: "Synthetic trained agent", code: `PERSONNEL-${suffix}` },
  });

  const response = await request(
    "COO",
    `/personnel/onboarding/${agent.id}/enroll`,
    { version: 1, password, agentProfileId: profile.id },
  );

  assert.equal(response.status, 201, await response.clone().text());

  assert.equal(
    (
      await db.user.findUniqueOrThrow({
        where: { id: (await response.json()).account.id },
      })
    ).agentProfileId,
    profile.id,
  );
});

test("an account created after submission blocks enrollment without changing the training record", async () => {
  const input = submission();

  const row = await submit(input);

  const source = await db.user.findUniqueOrThrow({
    where: { id: people.get("HR_PAYROLL")!.id },
  });

  await db.user.create({
    data: {
      name: input.name,
      email: input.email,
      role: "CSR",
      passwordHash: source.passwordHash,
    },
  });

  const response = await request(
    "COO",
    `/personnel/onboarding/${row.id}/enroll`,
    { version: 1, password },
  );

  assert.equal(response.status, 409);

  assert.equal(await db.user.count({ where: { email: input.email } }), 1);

  assert.equal(
    (await db.personnelOnboarding.findUniqueOrThrow({ where: { id: row.id } }))
      .status,
    "PENDING",
  );
});

test("a former HR submitter cannot approve their own request after becoming COO", async () => {
  const source = await db.user.findUniqueOrThrow({
    where: { id: people.get("HR_PAYROLL")!.id },
  });

  const person = await db.user.create({
    data: {
      name: "Synthetic promoted HR",
      email: `promoted-${suffix}@example.test`,
      role: "HR_PAYROLL",
      hrConfidentialAccess: true,
      passwordHash: source.passwordHash,
    },
  });

  const signIn = async () => {
    const response = await request(null, "/auth/login", {
      email: person.email,
      password,
    });

    assert.equal(response.status, 200);

    people.set("FORMER_HR", {
      id: person.id,
      email: person.email,
      cookie: response.headers
        .getSetCookie()
        .map((value) => {
          return value.split(";")[0];
        })
        .join("; "),
    });
  };

  await signIn();

  const response = await request(
    "FORMER_HR",
    "/personnel/onboarding",
    submission(),
  );

  assert.equal(response.status, 201);

  const row = await response.json();

  await db.user.update({ where: { id: person.id }, data: { role: "COO" } });

  await signIn();

  assert.equal(
    (
      await request("FORMER_HR", `/personnel/onboarding/${row.id}/enroll`, {
        version: 1,
        password,
      })
    ).status,
    403,
  );

  assert.equal(
    (await db.personnelOnboarding.findUniqueOrThrow({ where: { id: row.id } }))
      .status,
    "PENDING",
  );
});

test("directory searches and pages on the server and keeps sensitive evidence out of general staff directory", async () => {
  const name = `Synthetic searchable ${suffix}`;

  await submit(submission({ name }));

  const result = await (
    await request(
      "HR_PAYROLL",
      `/personnel/onboarding?q=${encodeURIComponent(name)}&status=PENDING`,
    )
  ).json();

  assert.equal(result.total, 1);

  assert.equal(result.items.length, 1);

  assert.equal(
    (
      await (
        await request(
          "HR_PAYROLL",
          `/personnel/onboarding?q=${encodeURIComponent(name)}&page=2`,
        )
      ).json()
    ).items.length,
    0,
  );

  const directory = await (
    await request("KPI_OFFICER", "/staff/directory")
  ).json();

  assert.equal(JSON.stringify(directory).includes("evidenceNote"), false);

  assert.equal(
    JSON.stringify(directory).includes("orientationCompletedAt"),
    false,
  );
});

test("confidential grant revocation and account deactivation close existing sessions", async () => {
  const input = submission();

  await db.user.update({
    where: { id: people.get("HR_PAYROLL")!.id },
    data: { hrConfidentialAccess: false },
  });

  assert.equal(
    (await request("HR_PAYROLL", "/personnel/onboarding", input)).status,
    401,
  );

  assert.equal(
    (await request("HR_PAYROLL", "/personnel/onboarding")).status,
    401,
  );

  await db.user.update({
    where: { id: people.get("HR_PAYROLL")!.id },
    data: { hrConfidentialAccess: false, active: false },
  });

  assert.ok(
    [401, 403].includes(
      (await request("HR_PAYROLL", "/personnel/onboarding")).status,
    ),
  );
});
