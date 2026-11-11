import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { getHandlerPaymentReview } from "../lib/payment-review";
import { ApiError } from "../lib/ts-api";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

const paymentId = "10000000-0000-4000-8000-000000000001";

const id = "20000000-0000-4000-8000-000000000002";

const detail = {
  id,
  paymentId,
  stage: "RECORDS",
  decision: "RETURNED",
  notes: "Saved return note",
  currentStatus: "PENDING",
  currentVersion: 4,
  paymentVersion: 1,
};

test("review links load one authoritative scoped review and retain saved notes alongside current state", async () => {
  const signal = new AbortController().signal;

  globalThis.fetch = async (input, options) => {
    assert(
      new URL(String(input)).pathname.endsWith(`/staff/alerts/reviews/${id}`),
    );

    assert.equal(options?.signal, signal);

    assert.equal(options?.cache, "no-store");

    return Response.json(detail);
  };

  const value = await getHandlerPaymentReview(paymentId, id, signal);

  assert.equal(value.decision, "RETURNED");

  assert.equal(value.currentStatus, "PENDING");

  assert.equal(value.notes, detail.notes);
});

test("invalid review or payment IDs never initiate a request", async () => {
  globalThis.fetch = async () => {
    throw new Error("Unexpected request");
  };

  for (const [payment, review] of [
    [null, id],
    [paymentId, null],
    ["invalid", id],
    [paymentId, "invalid"],
  ]) {
    await assert.rejects(
      getHandlerPaymentReview(payment, review),
      /link is invalid/,
    );
  }
});

test("mismatched payment or review responses never expose an unrelated note", async () => {
  for (const extra of [{ id: paymentId }, { paymentId: id }]) {
    globalThis.fetch = async () => {
      return Response.json({ ...detail, ...extra });
    };

    await assert.rejects(
      getHandlerPaymentReview(paymentId, id),
      /different payment/,
    );
  }
});

test("revoked, unavailable and rate-limited reviews retain their server error and cancellation signal", async () => {
  for (const status of [403, 404, 429]) {
    globalThis.fetch = async () => {
      return Response.json(
        { message: "Review unavailable" },
        { status, headers: status === 429 ? { "Retry-After": "30" } : {} },
      );
    };

    await assert.rejects(
      getHandlerPaymentReview(paymentId, id),
      (caught: unknown) => {
        return (
          caught instanceof ApiError &&
          caught.status === status &&
          caught.message === "Review unavailable"
        );
      },
    );
  }

  globalThis.fetch = async (_input, options) => {
    options?.signal?.throwIfAborted();

    throw new Error("Expected an aborted request");
  };

  const controller = new AbortController();

  controller.abort();

  await assert.rejects(
    getHandlerPaymentReview(paymentId, id, controller.signal),
    { name: "AbortError" },
  );
});
