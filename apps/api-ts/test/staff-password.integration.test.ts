import "reflect-metadata";
import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHmac } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import { roles, type Role } from "@freshphones/contracts";
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

const original = "Synthetic-original-password-123!";

const updated = "Synthetic-updated-password-456!";

let app: INestApplication,
  enforced: INestApplication,
  db: Database,
  base: string,
  enforcedBase: string,
  hash: string;

class Browser {
  cookies = new Map<string, string>();
  async call(
    path: string,
    body?: unknown,
    target = base,
    requestOrigin = origin,
  ) {
    const response = await fetch(`${target}/api${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        Origin: requestOrigin,
        Cookie: [...this.cookies]
          .map(([key, value]) => {
            return `${key}=${value}`;
          })
          .join("; "),
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });

    for (const cookie of response.headers.getSetCookie()) {
      const [pair] = cookie.split(";");

      const index = pair.indexOf("=");

      this.cookies.set(pair.slice(0, index), pair.slice(index + 1));
    }

    return response;
  }
  async login(email: string, password = original, target = base) {
    const response = await this.call(
      "/auth/login",
      { email, password },
      target,
    );

    assert.equal(response.status, 200);

    return response.json();
  }
}

async function person(role: Role = "BATCH_HANDLER") {
  return db.user.create({
    data: {
      name: "Synthetic staff password account",
      email: `staff-password-${randomUUID()}@example.test`,
      passwordHash: hash,
      role,
    },
  });
}

function totp(uri: string) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

  const bits = [...new URL(uri).searchParams.get("secret")!]
    .map((c) => {
      return alphabet.indexOf(c).toString(2).padStart(5, "0");
    })
    .join("");

  const secret = Buffer.from(
    (bits.match(/.{8}/g) ?? []).map((value) => {
      return parseInt(value, 2);
    }),
  );

  const counter = Buffer.alloc(8);

  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));

  const digest = createHmac("sha1", secret).update(counter).digest();

  const offset = digest[19] & 15;

  return String((digest.readUInt32BE(offset) & 0x7fffffff) % 1000000).padStart(
    6,
    "0",
  );
}

before(async () => {
  const config: Parameters<typeof createApp>[0] = {
    NODE_ENV: "test" as const,
    PORT: 4100,
    HOST: "127.0.0.1",
    DATABASE_URL: url!,
    WEB_ORIGIN: origin,
    BETTER_AUTH_SECRET: "synthetic-staff-password-secret-longer-than-32",
    EMAIL_FROM: "synthetic@example.test",
    CUSTOMER_REMINDER_DAYS_BEFORE: "",
    LOCAL_DEMO_AUTH: false,
    PRIVATE_STORAGE_PROVIDER: "local" as const,
    PRIVATE_STORAGE_S3_REGION: "ap-southeast-1",
    ABUSE_LIMITS: {
      auth: [[10000, 60]],
      accountRead: [[100000, 60]],
      accountWrite: [[100000, 60]],
    },
  };

  app = await createApp(config);

  enforced = await createApp({ ...config, AUTH_REQUIRE_STAFF_MFA: "true" });

  await app.listen(0, "127.0.0.1");

  await enforced.listen(0, "127.0.0.1");

  base = await app.getUrl();

  enforcedBase = await enforced.getUrl();

  db = app.get(Database);

  hash = await hashPassword(original);
});

after(async () => {
  await enforced?.close();

  await app?.close();
});

test("every staff role can open its own security flow; wrong current passwords leave credentials and sessions intact", async () => {
  for (const role of roles.filter((value) => {
    return value !== "CUSTOMER";
  })) {
    const user = await person(role);

    const first = new Browser(),
      other = new Browser();

    await first.login(user.email);

    await other.login(user.email);

    assert.equal((await first.call("/auth/security")).status, 200, role);

    assert.equal(
      (
        await first.call("/auth/change-password", {
          currentPassword: "incorrect",
          newPassword: updated,
        })
      ).status,
      400,
      role,
    );

    assert.equal((await first.call("/auth/me")).status, 200);

    assert.equal((await other.call("/auth/me")).status, 200);

    assert.equal(
      (await db.user.findUniqueOrThrow({ where: { id: user.id } }))
        .passwordHash,
      hash,
    );
  }
});

test("password requests enforce server length, identity ownership, different-new-password and trusted Origin", async () => {
  const user = await person();

  const browser = new Browser();

  await browser.login(user.email);

  for (const record of [
    { currentPassword: original, newPassword: "short" },
    { currentPassword: original, newPassword: "x".repeat(129) },
    { currentPassword: "", newPassword: updated },
    { currentPassword: "x".repeat(129), newPassword: updated },
    { currentPassword: original, newPassword: original },
    { currentPassword: original, newPassword: updated, userId: randomUUID() },
    {
      currentPassword: original,
      newPassword: updated,
      confirmPassword: updated,
    },
  ]) {
    assert.equal(
      (await browser.call("/auth/change-password", record)).status,
      400,
    );
  }

  assert.equal(
    (
      await browser.call(
        "/auth/change-password",
        { currentPassword: original, newPassword: updated },
        base,
        "https://untrusted.example",
      )
    ).status,
    403,
  );

  assert.equal(
    (await db.user.findUniqueOrThrow({ where: { id: user.id } })).passwordHash,
    hash,
  );
});

test("staff password change rotates the current cookie, revokes every other session and permits only the new credential", async () => {
  const user = await person();

  const current = new Browser(),
    other = new Browser();

  await current.login(user.email);

  await other.login(user.email);

  const oldCookie = [...current.cookies.entries()];

  const response = await current.call("/auth/change-password", {
    currentPassword: original,
    newPassword: updated,
  });

  assert.equal(response.status, 200);

  assert.deepEqual(await response.json(), { ok: true });

  assert.notDeepEqual([...current.cookies.entries()], oldCookie);

  assert.equal((await current.call("/auth/me")).status, 200);

  assert.equal((await other.call("/auth/me")).status, 401);

  const stale = new Browser();

  stale.cookies = new Map(oldCookie);

  assert.equal((await stale.call("/auth/me")).status, 401);

  const sessions = await (await current.call("/auth/security")).json();

  assert.equal(sessions.sessions.length, 1);

  assert.equal(sessions.sessions[0].current, true);

  assert.equal(
    (
      await new Browser().call("/auth/login", {
        email: user.email,
        password: original,
      })
    ).status,
    401,
  );

  await new Browser().login(user.email, updated);

  const entries = await db.auditEntry.findMany({
    where: { actorId: user.id, action: "password.changed" },
  });

  assert.equal(entries.length, 1);

  const audit = JSON.stringify(entries);

  assert(!audit.includes(original));

  assert(!audit.includes(updated));

  assert.equal(entries[0].recordId, user.id);
});

test("password change does not bypass mandatory staff MFA before enrollment", async () => {
  const user = await person();

  const browser = new Browser();

  await browser.login(user.email, original, enforcedBase);

  assert.equal(
    (await browser.call("/clients", undefined, enforcedBase)).status,
    412,
  );

  assert.equal(
    (
      await browser.call(
        "/auth/change-password",
        { currentPassword: original, newPassword: updated },
        enforcedBase,
      )
    ).status,
    200,
  );

  const state = await (
    await browser.call("/auth/security", undefined, enforcedBase)
  ).json();

  assert.equal(state.required, true);

  assert.equal(state.enabled, false);

  assert.equal(
    (await browser.call("/clients", undefined, enforcedBase)).status,
    412,
  );
});

test("enabled MFA and the verified current session survive a password change; a new sign-in still needs its second factor", async () => {
  const user = await person();

  const browser = new Browser();

  await browser.login(user.email, original, enforcedBase);

  const response = await browser.call(
    "/auth/mfa/enable",
    { password: original },
    enforcedBase,
  );

  assert.equal(response.status, 200);

  const enrollment = await response.json();

  assert.equal(
    (
      await browser.call(
        "/auth/mfa/verify",
        { code: totp(enrollment.totpURI) },
        enforcedBase,
      )
    ).status,
    200,
  );

  assert.equal(
    (await browser.call("/clients", undefined, enforcedBase)).status,
    200,
  );

  assert.equal(
    (
      await browser.call(
        "/auth/change-password",
        { currentPassword: original, newPassword: updated },
        enforcedBase,
      )
    ).status,
    200,
  );

  assert.equal(
    (await browser.call("/clients", undefined, enforcedBase)).status,
    200,
  );

  const state = await (
    await browser.call("/auth/security", undefined, enforcedBase)
  ).json();

  assert.equal(state.enabled, true);

  assert.equal(state.required, true);

  const fresh = new Browser();

  assert.deepEqual(await fresh.login(user.email, updated, enforcedBase), {
    twoFactorRedirect: true,
  });

  assert.equal(
    (await fresh.call("/auth/me", undefined, enforcedBase)).status,
    401,
  );
});

test("anonymous and revoked sessions cannot change a password and failed attempts retain the rate limit", async () => {
  assert.equal(
    (
      await new Browser().call("/auth/change-password", {
        currentPassword: original,
        newPassword: updated,
      })
    ).status,
    401,
  );

  const user = await person();

  const browser = new Browser();

  await browser.login(user.email);

  for (let i = 0; i < 10; i++) {
    assert.equal(
      (
        await browser.call("/auth/change-password", {
          currentPassword: "incorrect",
          newPassword: updated,
        })
      ).status,
      400,
    );
  }

  assert.equal(
    (
      await browser.call("/auth/change-password", {
        currentPassword: original,
        newPassword: updated,
      })
    ).status,
    429,
  );

  assert.equal(
    (await db.user.findUniqueOrThrow({ where: { id: user.id } })).passwordHash,
    hash,
  );

  await db.authSession.deleteMany({ where: { userId: user.id } });

  assert.equal(
    (
      await browser.call("/auth/change-password", {
        currentPassword: original,
        newPassword: updated,
      })
    ).status,
    401,
  );
});
