import { after, before, test } from "node:test";
import assert from "node:assert/strict";

const originalFetch = globalThis.fetch;

const originalUrl = process.env.NEXT_PUBLIC_API_URL;

before(() => {
  delete process.env.NEXT_PUBLIC_API_URL;
});

after(() => {
  globalThis.fetch = originalFetch;

  if (originalUrl === undefined) {
    delete process.env.NEXT_PUBLIC_API_URL;
  } else {
    process.env.NEXT_PUBLIC_API_URL = originalUrl;
  }
});

test("the web app defaults to the NestJS API without a backend selection setting", async () => {
  const { API_URL } = await import("../lib/backend");

  assert.equal(API_URL, "http://localhost:4100");
});

test("default login and identity requests use cookie sessions", async () => {
  const requests: {
    path: string;
    credentials?: RequestCredentials;
    body: unknown;
  }[] = [];

  globalThis.fetch = async (input, options) => {
    requests.push({
      path: new URL(String(input)).pathname,
      credentials: options?.credentials,
      body:
        typeof options?.body === "string"
          ? JSON.parse(options.body)
          : undefined,
    });

    return Response.json({
      id: "owner-id",
      name: "Demo Owner",
      email: "owner@demo.freshphones.test",
      role: "SYSTEM_ADMIN",
      clientId: null,
      permissions: ["ACCOUNT_MANAGE"],
    });
  };

  const { login, fetchMe } = await import("../lib/api");

  assert.equal(
    await login("owner@demo.freshphones.test", "test-password"),
    undefined,
  );

  const me = await fetchMe();

  assert.equal(me.account_type, "employee");

  assert.equal(me.role, "system_admin");

  assert.deepEqual(requests, [
    {
      path: "/api/auth/login",
      credentials: "include",
      body: { email: "owner@demo.freshphones.test", password: "test-password" },
    },
    { path: "/api/auth/me", credentials: "include", body: undefined },
  ]);
});

test("simultaneous identity reads share a request without caching later session checks", async () => {
  let calls = 0;

  globalThis.fetch = async () => {
    calls++;

    await new Promise((resolve) => {
      return setTimeout(resolve, 10);
    });

    return Response.json({
      id: "owner-id",
      name: "Demo Owner",
      role: "SYSTEM_ADMIN",
      permissions: [],
    });
  };

  const { fetchMe } = await import("../lib/api");

  await Promise.all([fetchMe(), fetchMe(), fetchMe(), fetchMe()]);

  assert.equal(calls, 1);

  await fetchMe();

  assert.equal(calls, 2);
});
