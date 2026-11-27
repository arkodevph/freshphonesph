import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiError } from "../lib/ts-api";
import {
  enrollmentHref,
  enrollmentLocation,
} from "../app/system/_role-designs/agent/app/system/enrollments/enrollment-location";
import {
  newEnrollmentAttempt,
  newApplicationCommand,
  sendEnrollmentAttempt,
  uncertainEnrollmentFailure,
} from "../app/system/_role-designs/agent/app/system/enrollments/submission-attempt";

test("Agent enrollment URLs preserve list context around exact selection and ignore scope overrides", () => {
  const application = "a6000000-0000-4000-8000-000000000003";

  const value = enrollmentLocation(
    new URLSearchParams(
      `view=applications&page=3&q=phone&status=RECEIVED&application=${application}&agentId=foreign`,
    ),
  );

  assert(value);

  const href = enrollmentHref(value, { application: undefined });

  assert.match(href, /page=3/);

  assert.match(href, /status=RECEIVED/);

  assert.match(href, /q=phone/);

  assert(!href.includes("application="));

  assert(!href.includes("agentId"));

  assert.equal(enrollmentLocation(new URLSearchParams("page=0")), null);

  assert.equal(
    enrollmentLocation(new URLSearchParams("view=requests&status=CLOSED")),
    null,
  );

  assert.equal(
    enrollmentLocation(new URLSearchParams("request=not-a-uuid")),
    null,
  );
});

test("frozen enrollment retries send identical payload and reference after a lost response", async () => {
  const original = globalThis.fetch;

  const sent: { body: string; key: string | null }[] = [];

  let count = 0;

  globalThis.fetch = async (_input, options) => {
    sent.push({
      body: String(options?.body),
      key: new Headers(options?.headers).get("Idempotency-Key"),
    });

    if (++count === 1) {
      throw new TypeError("Synthetic response lost after commit");
    }

    return Response.json({
      id: "a6000000-0000-4000-8000-000000000005",
      status: "PENDING",
      version: 1,
    });
  };

  try {
    const draft = {
      name: " Synthetic Member ",
      phone: "09123456789",
      email: "",
      batchId: "a6000000-0000-4000-8000-000000000002",
    };

    const attempt = newEnrollmentAttempt(draft);

    await assert.rejects(sendEnrollmentAttempt(attempt), /response lost/);

    draft.name = "Edited after loss";

    const receipt = await sendEnrollmentAttempt(attempt);

    assert.equal(receipt.status, "PENDING");

    assert.deepEqual(sent[0], sent[1]);

    assert.equal(JSON.parse(sent[1].body).name, "Synthetic Member");

    assert.equal(JSON.parse(sent[1].body).submissionId, sent[1].key);

    assert.notEqual(newEnrollmentAttempt(draft).id, attempt.id);
  } finally {
    globalThis.fetch = original;
  }
});

test("uncertain enrollment outcomes remain distinct from definitive validation failures", () => {
  for (const failure of [
    new TypeError("offline"),
    new ApiError("server", 503),
    new ApiError("timeout", 408),
    new ApiError("reference conflict", 409),
  ]) {
    assert.equal(uncertainEnrollmentFailure(failure), true);
  }

  for (const status of [400, 401, 403, 404, 422, 429]) {
    assert.equal(
      uncertainEnrollmentFailure(new ApiError("rejected", status)),
      false,
    );
  }
});

test("forward and close retries retain their original HTTP identity and version after response loss", async () => {
  const original = globalThis.fetch;

  const sent: { path: string; body: string; key: string | null }[] = [];

  globalThis.fetch = async (input, options) => {
    sent.push({
      path: String(input),
      body: String(options?.body),
      key: new Headers(options?.headers).get("Idempotency-Key"),
    });

    if (sent.length % 2 === 1) {
      throw new TypeError("Synthetic response lost after commit");
    }

    return Response.json({ status: "CLOSED" });
  };

  try {
    const id = "a6000000-0000-4000-8000-000000000003";

    const correction = {
      version: 7,
      name: "Original correction",
      phone: "09123456789",
      email: "",
      batchId: "a6000000-0000-4000-8000-000000000002",
    };

    const forward = newApplicationCommand(id, "forward", correction);

    await assert.rejects(forward(), /response lost/);

    correction.name = "Changed draft";

    await forward();

    assert.deepEqual(sent[0], sent[1]);

    assert.equal(JSON.parse(sent[1].body).name, "Original correction");

    const reason = { version: 8, reason: "Applicant withdrew" };

    const close = newApplicationCommand(id, "close", reason);

    await assert.rejects(close(), /response lost/);

    reason.reason = "Changed draft reason";

    await close();

    assert.deepEqual(sent[2], sent[3]);

    assert.equal(JSON.parse(sent[3].body).reason, "Applicant withdrew");

    assert.notEqual(sent[0].key, sent[2].key);
  } finally {
    globalThis.fetch = original;
  }
});
