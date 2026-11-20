import { after, test } from "node:test";
import assert from "node:assert/strict";
import {
  enrollPersonnel,
  getPersonnelOnboarding,
  getPersonnelOnboardingHistory,
  getPersonnelOnboardingOptions,
  rejectPersonnelOnboarding,
} from "../lib/api";
import { ApiError } from "../lib/ts-api";

const original = globalThis.fetch;

after(() => {
  globalThis.fetch = original;
});

test("personnel reads send encoded filters and preserve private session/cache boundaries", async () => {
  const paths: string[] = [];

  globalThis.fetch = async (input, options) => {
    const url = new URL(String(input));

    paths.push(url.pathname);
    assert.equal(options?.credentials, "include");
    assert.equal(options?.cache, "no-store");

    if (url.search) {
      assert.equal(url.searchParams.get("q"), "Synthetic & trained");
      assert.equal(url.searchParams.get("page"), "2");
      assert.equal(url.searchParams.get("status"), "PENDING");
    }

    return Response.json({ items: [], total: 0 });
  };

  await getPersonnelOnboarding({
    page: 2,
    q: "Synthetic & trained",
    status: "PENDING",
  });
  await getPersonnelOnboardingOptions();
  await getPersonnelOnboardingHistory("synthetic/id");

  assert.deepEqual(paths, [
    "/api/personnel/onboarding",
    "/api/personnel/onboarding/options",
    "/api/personnel/onboarding/synthetic%2Fid/history",
  ]);
});

test("COO decisions retain their version and retry key and propagate denied/stale decisions", async () => {
  const calls: { url: string; options?: RequestInit }[] = [];

  globalThis.fetch = async (input, options) => {
    calls.push({ url: String(input), options });

    return Response.json({ id: "synthetic" });
  };

  await enrollPersonnel(
    "synthetic",
    { version: 3, password: "Synthetic-password-only-123!" },
    "synthetic-enrollment-key",
  );
  await rejectPersonnelOnboarding(
    "synthetic",
    { version: 3, reason: "Repeat training" },
    "synthetic-rejection-key",
  );

  assert.equal(
    new Headers(calls[0].options?.headers).get("Idempotency-Key"),
    "synthetic-enrollment-key",
  );
  assert.equal(JSON.parse(String(calls[0].options?.body)).version, 3);
  assert.deepEqual(JSON.parse(String(calls[1].options?.body)), {
    version: 3,
    reason: "Repeat training",
  });

  for (const status of [403, 409]) {
    globalThis.fetch = async () =>
      Response.json({ message: "Enrollment changed." }, { status });

    await assert.rejects(
      enrollPersonnel(
        "synthetic",
        { version: 3, password: "Synthetic-password-only-123!" },
        "synthetic-enrollment-key",
      ),
      (error: unknown) => error instanceof ApiError && error.status === status,
    );
  }
});
