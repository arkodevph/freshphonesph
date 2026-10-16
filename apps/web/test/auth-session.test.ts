import assert from "node:assert/strict";
import { test } from "node:test";
import { logoutSession } from "../lib/auth";
import { ApiError } from "../lib/ts-api";

test("logout uses the session cookie even when browser storage is unavailable", async () => {
  const originalFetch = globalThis.fetch;

  const storage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");

  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() {
      throw new Error("Browser storage is blocked");
    },
  });

  try {
    globalThis.fetch = async (input, init) => {
      assert.equal(new URL(String(input)).pathname, "/api/auth/logout");

      assert.equal(init?.method, "POST");

      assert.equal(init?.credentials, "include");

      return new Response(null, { status: 204 });
    };

    await logoutSession();

    globalThis.fetch = async () => {
      return Response.json({ message: "Logout unavailable" }, { status: 503 });
    };

    await assert.rejects(logoutSession, (error: unknown) => {
      return error instanceof ApiError && error.status === 503;
    });
  } finally {
    globalThis.fetch = originalFetch;

    if (storage) {
      Object.defineProperty(globalThis, "localStorage", storage);
    } else {
      Reflect.deleteProperty(globalThis, "localStorage");
    }
  }
});
