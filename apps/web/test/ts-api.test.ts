import { after, test } from "node:test";
import assert from "node:assert/strict";
import { tsRequest, ApiError, toBatch, toPage } from "../lib/ts-api";

const originalFetch = globalThis.fetch;
after(() => { globalThis.fetch = originalFetch; });
const json = (body: unknown, status = 200) => Response.json(body, { status });

test("concurrent expired requests share one cookie refresh and retry the original reads", async () => {
  let fresh = false;
  let rotations = 0;
  const attempts = new Map<string, number>();
  globalThis.fetch = async (input, options) => {
    const path = new URL(String(input)).pathname;
    assert.equal(options?.credentials, "include");
    assert.equal(new Headers(options?.headers).has("Authorization"), false);
    if (path.endsWith("/auth/me")) return json({}, fresh ? 200 : 401);
    if (path.endsWith("/auth/refresh")) {
      rotations++;
      await new Promise((resolve) => setTimeout(resolve, 10));
      fresh = true;
      return json({});
    }
    attempts.set(path, (attempts.get(path) ?? 0) + 1);
    return json({ path }, fresh ? 200 : 401);
  };
  const results = await Promise.all([tsRequest("/batches"), tsRequest("/clients")]);
  assert.equal(rotations, 1);
  assert.deepEqual(results, [{ path: "/api/batches" }, { path: "/api/clients" }]);
  assert.deepEqual([...attempts.values()], [2, 2]);
});

test("failed refresh stops retries, while login failures do not rotate another session", async () => {
  const paths: string[] = [];
  globalThis.fetch = async (input) => {
    paths.push(new URL(String(input)).pathname);
    return json({ message: "Invalid credentials" }, 401);
  };
  await assert.rejects(tsRequest("/auth/login", { method: "POST", body: "{}" }), (error: unknown) =>
    error instanceof ApiError && error.status === 401);
  assert.deepEqual(paths, ["/api/auth/login"]);
  paths.length = 0;
  await assert.rejects(tsRequest("/clients"), /session expired/);
  assert.deepEqual(paths, ["/api/clients", "/api/auth/me", "/api/auth/refresh"]);
});

test("permission and validation errors reach the form without refreshing or retrying a write", async () => {
  for (const status of [400, 403, 409, 500]) {
    let requests = 0;
    globalThis.fetch = async () => { requests++; return json({ message: "Review this record" }, status); };
    await assert.rejects(tsRequest("/batches", { method: "POST", body: "{}" }), (error: unknown) =>
      error instanceof ApiError && error.status === status && error.message === "Review this record");
    assert.equal(requests, 1);
  }
});

test("the existing UI contract preserves UUIDs, missing plan terms and next-page information", () => {
  const batch = toBatch({ id: "fd9c9a83-c948-4c80-80d7-03f73a9e3ba9", code: "LEGACY",
    model: "Phone", status: "PLANNED", startDate: "2026-09-01", endDate: "2027-03-01",
    contractPrice: null, installmentCount: null, cadence: null, version: 1,
    createdAt: "2026-09-01T00:00:00Z", updatedAt: "2026-09-01T00:00:00Z", _count: { clients: 0 } });
  assert.equal(batch.id, "fd9c9a83-c948-4c80-80d7-03f73a9e3ba9");
  assert.equal(batch.contract_price, null);
  assert.equal(batch.status, "forming");
  assert.equal(toPage({ items: [batch], total: 21, page: 1, pageSize: 20 }, (item) => item).next, "2");
});
