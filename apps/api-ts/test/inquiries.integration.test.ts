import "reflect-metadata";
import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import { roles, effectivePermissions, type Role } from "@freshphones/contracts";
import { createApp } from "../src/app";
import { Database } from "../src/database";
import { hashPassword } from "../src/auth/password";

const databaseUrl = process.env.TEST_DATABASE_URL;

if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith("_test")) {
  throw Error("Dedicated migrated TEST_DATABASE_URL ending in _test required.");
}

const origin = "http://localhost:3100",
  landing = "http://localhost:3101";

let app: INestApplication, db: Database, base: string, inquiryId: string;

const suffix = randomUUID();

const input = {
  submissionId: randomUUID(),
  name: "Synthetic inquiry customer",
  phone: "09123456789",
  email: "synthetic@example.test",
  deviceName: "iPhone 12 128GB",
  message: "Is this device available?",
  contactAcknowledged: true,
};

const cookies = new Map<Role, string>();

async function request(
  path: string,
  method = "GET",
  body?: unknown,
  role?: Role,
  source = origin,
) {
  return fetch(`${base}/api${path}`, {
    method,
    headers: {
      Origin: source,
      ...(role ? { Cookie: cookies.get(role)! } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

before(async () => {
  app = await createApp({
    NODE_ENV: "test",
    PORT: 4100,
    HOST: "127.0.0.1",
    DATABASE_URL: databaseUrl!,
    WEB_ORIGIN: origin,
    PUBLIC_SITE_ORIGIN: landing,
    JWT_SECRET: "synthetic-inquiry-test-secret-at-least-32-characters",
    EMAIL_FROM: "synthetic@example.test",
    CUSTOMER_REMINDER_DAYS_BEFORE: "",
    PRIVATE_STORAGE_PROVIDER: "local",
    PRIVATE_STORAGE_DIR: "/tmp/freshphones-inquiry-test-files",
    PRIVATE_STORAGE_S3_REGION: "ap-southeast-1",
  });

  await app.listen(0, "127.0.0.1");

  base = await app.getUrl();

  db = app.get(Database);

  const password = "Synthetic-inquiry-password-123!";

  const passwordHash = await hashPassword(password);

  await db.abuseBucket.deleteMany();

  const batch = await db.batch.create({
    data: {
      code: "INQ-" + suffix.slice(0, 8),
      model: "Test device",
      startDate: new Date("2050-01-01"),
      endDate: new Date("2050-12-31"),
    },
  });

  const client = await db.client.create({
    data: {
      batchId: batch.id,
      name: "Synthetic inquiry client",
      email: "",
      phone: "",
    },
  });

  for (const role of roles) {
    const user = await db.user.create({
      data: {
        name: `Inquiry ${role}`,
        email: `inquiry-${suffix}-${role.toLowerCase()}@example.test`,
        role,
        passwordHash,
        ...(role === "CUSTOMER" ? { clientId: client.id } : {}),
      },
    });

    const login = await request("/auth/login", "POST", {
      email: user.email,
      password,
    });

    assert.equal(login.status, 200);

    cookies.set(
      role,
      login.headers
        .getSetCookie()
        .map((v) => {
          return v.split(";")[0];
        })
        .join("; "),
    );
  }
});

after(async () => {
  if (app) {
    await app.close();
  }
});

test("public inquiry persists, returns only a reference, and retries do not duplicate", async () => {
  const r = await request("/inquiries", "POST", input, undefined, landing);

  assert.equal(r.status, 201);

  assert.equal(r.headers.get("access-control-allow-origin"), landing);

  const body = await r.json();

  assert.deepEqual(Object.keys(body), ["reference"]);

  inquiryId = body.reference;

  const record = await db.deviceInquiry.findUniqueOrThrow({
    where: { id: inquiryId },
  });

  assert.equal(record.deviceName, input.deviceName);

  assert.equal(record.name, input.name);

  assert.equal(record.status, "NEW");

  assert(record.contactAcknowledgedAt);

  const retry = await request("/inquiries", "POST", input, undefined, landing);

  assert.equal((await retry.json()).reference, inquiryId);

  assert.equal(
    await db.deviceInquiry.count({
      where: { submissionId: input.submissionId },
    }),
    1,
  );

  const changed = await request(
    "/inquiries",
    "POST",
    { ...input, name: "Different person" },
    undefined,
    landing,
  );

  assert.equal(changed.status, 409);
});

test("public input is validated and no anonymous inquiry reads or status changes are allowed", async () => {
  const invalid = await request("/inquiries", "POST", {
    ...input,
    submissionId: randomUUID(),
    contactAcknowledged: false,
    phone: "bad",
    status: "CLOSED",
  });

  assert.equal(invalid.status, 400);

  assert.equal((await request("/inquiries")).status, 401);

  assert.equal(
    (
      await request(`/inquiries/${inquiryId}`, "PATCH", {
        status: "CLOSED",
        version: 1,
      })
    ).status,
    401,
  );

  assert.equal(
    (
      await request(
        "/inquiries",
        "POST",
        { ...input, submissionId: randomUUID() },
        undefined,
        "https://untrusted.example",
      )
    ).status,
    403,
  );

  assert.equal(
    (await request("/clients", "POST", {}, "OWNER", landing)).status,
    403,
    "Landing origin can only submit inquiries",
  );
});

test("staff inbox enforces SUPPORT_MANAGE for every role and filters inquiries", async () => {
  for (const role of roles) {
    const allowed = effectivePermissions({ role }).includes("SUPPORT_MANAGE");

    const response = await request(
      "/inquiries?q=iPhone&status=NEW",
      "GET",
      undefined,
      role,
    );

    assert.equal(response.status, allowed ? 200 : 403, role);

    if (allowed) {
      const page = await response.json();

      assert(
        page.items.some((item: { id: string }) => {
          return item.id === inquiryId;
        }),
      );

      assert(!("submissionId" in page.items[0]));
    }
  }
});

test("staff updates are audited and reject stale concurrent changes", async () => {
  const change = await request(
    `/inquiries/${inquiryId}`,
    "PATCH",
    { status: "CONTACTED", version: 1 },
    "CS_TEAM",
  );

  assert.equal(change.status, 200);

  assert.equal((await change.json()).version, 2);

  const stale = await request(
    `/inquiries/${inquiryId}`,
    "PATCH",
    { status: "CLOSED", version: 1 },
    "CS_TEAM",
  );

  assert.equal(stale.status, 409);

  assert.equal(
    await db.auditEntry.count({
      where: {
        entity: "device_inquiry",
        recordId: inquiryId,
        action: "device_inquiry.updated",
      },
    }),
    1,
  );

  assert.equal(
    (
      await request(
        `/inquiries/${inquiryId}`,
        "PATCH",
        { status: "CLOSED", version: 2 },
        "FINANCE_OFFICER",
      )
    ).status,
    403,
  );
});

test("public submission is rate limited", async () => {
  let limited = false;

  for (let i = 0; i < 6; i++) {
    const r = await request("/inquiries", "POST", {
      ...input,
      submissionId: randomUUID(),
    });

    if (r.status === 429) {
      limited = true;

      assert(r.headers.get("Retry-After"));

      break;
    }
  }

  assert(limited, "Application policy limits repeated submissions");
});
