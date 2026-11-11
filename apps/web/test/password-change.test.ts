import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
  changeOwnPassword,
  passwordChangeErrors,
} from "../lib/password-change";
import { ApiError } from "../lib/ts-api";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

const fields = {
  currentPassword: "Original-fixture-password",
  newPassword: "Updated-fixture-password",
  confirmPassword: "Updated-fixture-password",
};

test("password validation identifies missing, short, over-limit, repeated and mismatched fields before any request", async () => {
  globalThis.fetch = async () => {
    throw new Error("Unexpected password request");
  };

  for (const values of [
    { ...fields, currentPassword: "" },
    { ...fields, newPassword: "short", confirmPassword: "short" },
    {
      ...fields,
      newPassword: "x".repeat(129),
      confirmPassword: "x".repeat(129),
    },
    { ...fields, currentPassword: "x".repeat(129) },
    {
      ...fields,
      newPassword: fields.currentPassword,
      confirmPassword: fields.currentPassword,
    },
    { ...fields, confirmPassword: "different-password" },
    { ...fields, confirmPassword: "" },
  ]) {
    assert(Object.keys(passwordChangeErrors(values)).length > 0);

    await assert.rejects(
      changeOwnPassword(values),
      /Check the password fields/,
    );
  }

  assert.deepEqual(passwordChangeErrors(fields), {});
});

test("new-password boundaries and password spaces follow the server policy without trimming", async () => {
  for (const password of [
    "x".repeat(12),
    "x".repeat(128),
    "  Twelve-character phrase  ",
  ]) {
    assert.deepEqual(
      passwordChangeErrors({
        currentPassword: "old",
        newPassword: password,
        confirmPassword: password,
      }),
      {},
    );
  }

  const next = {
    currentPassword: " current password ",
    newPassword: " new password with spaces ",
    confirmPassword: " new password with spaces ",
  };

  globalThis.fetch = async (_input, options) => {
    assert.deepEqual(JSON.parse(String(options?.body)), {
      currentPassword: next.currentPassword,
      newPassword: next.newPassword,
    });

    return Response.json({ ok: true });
  };

  await changeOwnPassword(next);
});

test("password update sends only the two credential fields in an authenticated uncached POST", async () => {
  globalThis.fetch = async (input, options) => {
    const url = new URL(String(input));

    assert(url.pathname.endsWith("/auth/change-password"));

    assert.equal(url.search, "");

    assert.equal(options?.method, "POST");

    assert.equal(options?.credentials, "include");

    assert.equal(options?.cache, "no-store");

    assert.deepEqual(JSON.parse(String(options?.body)), {
      currentPassword: fields.currentPassword,
      newPassword: fields.newPassword,
    });

    return Response.json({ ok: true });
  };

  await changeOwnPassword(fields);
});

test("failed or unacknowledged updates cannot be reported as success and auth failures are not retried", async () => {
  for (const status of [400, 401, 403, 429, 500]) {
    let calls = 0;

    globalThis.fetch = async () => {
      calls++;

      return Response.json({ message: "Synthetic password error" }, { status });
    };

    await assert.rejects(changeOwnPassword(fields), (error: unknown) => {
      return error instanceof ApiError && error.status === status;
    });

    assert.equal(calls, 1);
  }

  for (const body of [{}, { ok: false }]) {
    globalThis.fetch = async () => {
      return Response.json(body);
    };

    await assert.rejects(
      changeOwnPassword(fields),
      /Could not confirm the password update/,
    );
  }
});
