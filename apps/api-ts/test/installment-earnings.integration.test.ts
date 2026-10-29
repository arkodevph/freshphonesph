import "reflect-metadata";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import {
  roles,
  rolePermissions,
  reportKindsFor,
  type Role,
  type InstallmentEarningsReport,
} from "@freshphones/contracts";
import { createApp } from "../src/app";
import { Database } from "../src/database";
import { hashPassword } from "../src/auth/password";
import type { Config } from "../src/config";

const databaseUrl = process.env.TEST_DATABASE_URL;

if (
  !databaseUrl ||
  !["localhost", "127.0.0.1", "[::1]"].includes(
    new URL(databaseUrl).hostname,
  ) ||
  !new URL(databaseUrl).pathname.endsWith("_test")
) {
  throw new Error(
    "Installment earnings integration requires an isolated local TEST_DATABASE_URL ending in _test.",
  );
}

const origin = "http://localhost:3100";

const suffix = randomUUID().slice(0, 8);

let app: INestApplication;

let db: Database;

let base: string;

let batchId: string;

let emptyBatchId: string;

const memberIds: string[] = [];

const cookies = new Map<Role, string>();

function request(role: Role | null, path: string) {
  return fetch(`${base}/api${path}`, {
    headers: { Origin: origin, Cookie: role ? cookies.get(role)! : "" },
  });
}

async function report(
  query: Record<string, string | number> = {},
): Promise<InstallmentEarningsReport> {
  const params = new URLSearchParams(
    Object.entries({ year: 2024, batchId, ...query }).map(([key, value]) => {
      return [key, String(value)];
    }),
  );

  const response = await request(
    "CEO",
    `/reports/installment-earnings?${params}`,
  );

  assert.equal(response.status, 200, await response.clone().text());

  return response.json();
}

before(async () => {
  app = await createApp({
    NODE_ENV: "test",
    PORT: 4100,
    HOST: "127.0.0.1",
    DATABASE_URL: databaseUrl,
    WEB_ORIGIN: origin,
    JWT_SECRET: "earnings-test-only-secret-at-least-32-characters",
    LOCAL_DEMO_AUTH: false,
    EMAIL_FROM: "synthetic@example.test",
    CUSTOMER_REMINDER_DAYS_BEFORE: "",
    PRIVATE_STORAGE_PROVIDER: "local",
    PRIVATE_STORAGE_S3_REGION: "ap-southeast-1",
    ABUSE_LIMITS: { expensive: [[10000, 60]], read: [[10000, 60]] },
  } as Config);

  await app.listen(0, "127.0.0.1");

  base = await app.getUrl();

  db = app.get(Database);

  await db.abuseBucket.deleteMany();

  const password = "Synthetic-installment-earnings-123!";

  const passwordHash = await hashPassword(password);

  for (const [index, code] of ["A", "EMPTY"].entries()) {
    const batch = await db.batch.create({
      data: {
        code: `EARN-${suffix}-${code}`,
        model: "Test model",
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
      },
    });

    if (index === 0) {
      batchId = batch.id;
    } else {
      emptyBatchId = batch.id;
    }
  }

  for (let index = 0; index < 25; index++) {
    const member = await db.client.create({
      data: {
        batchId,
        name:
          index === 0
            ? "=SYNTHETIC_FORMULA"
            : `Synthetic member ${String(index).padStart(2, "0")}`,
        email: "private-earnings@example.test",
        phone: "private-earnings-phone",
      },
    });

    memberIds.push(member.id);
  }

  const dates = [
    ["2024-01-15", "100.01"],
    ["2024-01-16", "200.02"],
    ["2024-01-31", "0.03"],
    ["2024-02-01", "300.04"],
    ["2024-02-28", "400.05"],
    ["2024-02-29", "600.07"],
    ["2024-03-01", "500.06"],
  ];

  for (const [index, [date, amount]] of dates.entries()) {
    await db.scheduleItem.create({
      data: {
        clientId: memberIds[0],
        sequenceNo: index + 1,
        dueDate: new Date(date),
        expectedAmount: amount,
      },
    });
  }

  await db.scheduleItem.create({
    data: {
      clientId: memberIds[1],
      sequenceNo: 1,
      dueDate: new Date("2024-01-01"),
      expectedAmount: "50.00",
    },
  });

  await db.scheduleItem.create({
    data: {
      clientId: memberIds[2],
      sequenceNo: 1,
      dueDate: new Date("2024-12-31"),
      expectedAmount: "8.08",
    },
  });

  for (const role of roles) {
    const user = await db.user.create({
      data: {
        name: `Synthetic ${role}`,
        email: `earnings-${role.toLowerCase()}-${suffix}@example.test`,
        role,
        passwordHash,
        ...(role === "CUSTOMER" ? { clientId: memberIds[0] } : {}),
      },
    });

    const response = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email, password }),
    });

    assert.equal(response.status, 200, role);

    cookies.set(
      role,
      response.headers
        .getSetCookie()
        .map((cookie) => {
          return cookie.split(";")[0];
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

test("all earnings reads and exports require REPORT_VIEW for every role, including CEO", async () => {
  for (const path of [
    "/reports/installment-earnings?year=2024",
    "/reports/installment-earnings/export?year=2024&format=csv",
    "/reports/installment-earnings/export?year=2024&format=xlsx",
  ]) {
    assert.equal((await request(null, path)).status, 401);

    for (const role of roles) {
      assert.equal(
        (await request(role, path)).status,
        reportKindsFor({ role }).includes("COLLECTIONS") ? 200 : 403,
        `${role} ${path}`,
      );
    }
  }
});

test("due-date boundaries, exact centavos and both bi-monthly options reconcile to monthly totals", async () => {
  const january = await report();

  assert.deepEqual(january.totals, {
    scheduledAmount: "350.06",
    installments: 4,
    members: 25,
    membersWithoutSchedule: 22,
    batches: 1,
  });

  assert.equal(january.dateFrom, "2024-01-01");

  assert.equal(january.dateTo, "2024-01-31");

  const first = await report({ frequency: "TWICE_MONTHLY", period: 1 });

  const second = await report({ frequency: "TWICE_MONTHLY", period: 2 });

  assert.equal(first.totals.scheduledAmount, "150.01");

  assert.equal(first.totals.installments, 2);

  assert.equal(second.totals.scheduledAmount, "200.05");

  assert.equal(second.dateFrom, "2024-01-16");

  const february = await report({ period: 2 });

  assert.equal(february.totals.scheduledAmount, "1300.16");

  const februarySecondHalf = await report({
    frequency: "TWICE_MONTHLY",
    period: 4,
  });

  assert.equal(februarySecondHalf.totals.scheduledAmount, "1000.12");

  assert.equal(februarySecondHalf.dateTo, "2024-02-29");

  const pair = await report({ frequency: "EVERY_TWO_MONTHS", period: 1 });

  assert.equal(pair.totals.scheduledAmount, "1650.22");

  assert.equal(pair.totals.installments, 7);

  const next = await report({ frequency: "EVERY_TWO_MONTHS", period: 2 });

  assert.equal(next.totals.scheduledAmount, "500.06");

  assert.equal((await report({ year: 2025 })).totals.scheduledAmount, "0.00");
});

test("payments and verification state do not change scheduled earnings", async () => {
  const before = await report();

  const finance = await db.user.findFirstOrThrow({
    where: {
      role: "FINANCE_OFFICER",
      email: { endsWith: `${suffix}@example.test` },
    },
  });

  for (const status of [
    "PENDING",
    "VERIFIED",
    "REJECTED",
    "NEEDS_CLARIFICATION",
  ] as const) {
    await db.payment.create({
      data: {
        clientId: memberIds[0],
        batchId,
        amount: "999999.99",
        status,
        paymentDate: new Date("2024-01-15"),
        method: "Synthetic cash",
        recordedById: finance.id,
        ...(status === "VERIFIED"
          ? {
              verifierId: finance.id,
              verifiedAt: new Date("2024-01-15T12:00:00Z"),
            }
          : {}),
      },
    });
  }

  assert.deepEqual((await report()).totals, before.totals);
});

test("every member remains visible, pages retain full totals and member amounts reconcile to their batch", async () => {
  const batches = await report();

  const first = await report({ groupBy: "members" });

  const second = await report({ groupBy: "members", page: 2 });

  assert.equal(first.total, 25);

  assert.equal(first.items.length, 20);

  assert.equal(second.items.length, 5);

  assert.deepEqual(first.totals, batches.totals);

  assert.deepEqual(second.totals, first.totals);

  const members = [...first.items, ...second.items];

  assert.equal(
    new Set(
      members.map((item) => {
        return item.id;
      }),
    ).size,
    25,
  );

  assert.equal(
    members.find((item) => {
      return item.id === memberIds[0];
    })!.scheduledAmount,
    "300.06",
  );

  assert.equal(
    members.find((item) => {
      return item.id === memberIds[2];
    })!.membersWithoutSchedule,
    0,
  );

  assert.equal(
    members.find((item) => {
      return item.id === memberIds[3];
    })!.membersWithoutSchedule,
    1,
  );

  const totalCents = members.reduce((sum, item) => {
    return sum + BigInt(item.scheduledAmount.replace(".", ""));
  }, 0n);

  assert.equal(totalCents, 35006n);

  assert.equal((await report({ page: 100 })).items.length, 0);

  assert.equal((await report({ page: 100 })).totals.scheduledAmount, "350.06");

  const empty = await report({ batchId: emptyBatchId });

  assert.equal(empty.items.length, 1);

  assert.equal(empty.totals.scheduledAmount, "0.00");

  assert.equal((await report({ batchId: randomUUID() })).total, 0);

  const exposed = JSON.stringify(first);

  assert.equal(exposed.includes("private-earnings"), false);
});

test("CSV and XLSX contain all pages in the same period and scope, and formula names remain text", async () => {
  for (const format of ["csv", "xlsx"]) {
    const response = await request(
      "CEO",
      `/reports/installment-earnings/export?year=2024&batchId=${batchId}&groupBy=members&page=2&format=${format}`,
    );

    assert.equal(response.status, 200);

    const bytes = Buffer.from(await response.arrayBuffer());

    const text = bytes.toString();

    assert.ok(text.includes("350.06"));

    assert.ok(text.includes("300.06"));

    for (let index = 1; index < 25; index++) {
      assert.ok(
        text.includes(`Synthetic member ${String(index).padStart(2, "0")}`),
      );
    }

    assert.equal(text.includes("private-earnings"), false);

    if (format === "csv") {
      assert.ok(text.includes("'=SYNTHETIC_FORMULA"));
    } else {
      assert.equal(bytes.subarray(0, 2).toString(), "PK");

      assert.ok(text.includes('t="inlineStr"'));
    }
  }
});

test("invalid frequencies, periods, years, batch IDs and unexpected fields are rejected", async () => {
  for (const params of [
    "year=0",
    "year=10000",
    "year=2024&frequency=MONTHLY&period=13",
    "year=2024&frequency=EVERY_TWO_MONTHS&period=7",
    "year=2024&batchId=bad",
    "year=2024&status=VERIFIED",
    "year=2024&groupBy=contacts",
  ]) {
    assert.equal(
      (await request("CEO", `/reports/installment-earnings?${params}`)).status,
      400,
      params,
    );
  }
});
