import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { getStaffAccountDocument } from "../lib/account-documents";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

const id = "10000000-0000-4000-8000-000000000001";

const clientId = "20000000-0000-4000-8000-000000000002";

const batchId = "30000000-0000-4000-8000-000000000003";

const client = {
  id: clientId,
  name: "Assigned membership",
  batch: { id: batchId, code: "ASSIGNED" },
};

const confirmation = {
  documentType: "PAYMENT_CONFIRMATION",
  officialTaxInvoice: false,
  notice: "Not an official BIR sales invoice.",
  generatedAt: "2026-11-10T00:00:00Z",
  payment: {
    id,
    clientId,
    batchId,
    status: "VERIFIED",
    amount: "50.00",
    effectiveAmount: "45.00",
  },
};

test("confirmation loads the payment's authoritative membership and preserves adjusted credit", async () => {
  const paths: string[] = [];

  const signal = new AbortController().signal;

  globalThis.fetch = async (input, options) => {
    const path = new URL(String(input)).pathname;

    paths.push(path);

    assert.equal(options?.signal, signal);

    assert.equal(options?.cache, "no-store");

    return Response.json(
      path.endsWith("/confirmation") ? confirmation : client,
    );
  };

  const result = await getStaffAccountDocument(
    { kind: "confirmation", id },
    signal,
  );

  assert.deepEqual(paths, [
    `/api/payments/${id}/confirmation`,
    `/api/clients/${clientId}`,
  ]);

  assert.equal(result.client.id, clientId);

  assert("payment" in result.record);

  assert.equal(result.record.payment.effectiveAmount, "45.00");
});

test("invalid IDs and unverified or mismatched confirmations never produce an export snapshot", async () => {
  let calls = 0;

  globalThis.fetch = async () => {
    calls++;

    return Response.json(confirmation);
  };

  await assert.rejects(
    getStaffAccountDocument({ kind: "statement", id: "../other" }),
    /Invalid document reference/,
  );

  assert.equal(calls, 0);

  for (const changes of [{ status: "PENDING" }, { id: clientId }]) {
    calls = 0;

    globalThis.fetch = async () => {
      calls++;

      return Response.json({
        ...confirmation,
        payment: { ...confirmation.payment, ...changes },
      });
    };

    await assert.rejects(
      getStaffAccountDocument({ kind: "confirmation", id }),
      /unavailable/,
    );

    assert.equal(calls, 1);
  }

  globalThis.fetch = async (input) => {
    return Response.json(
      String(input).endsWith("/confirmation")
        ? confirmation
        : { ...client, batch: { id: "wrong" } },
    );
  };

  await assert.rejects(
    getStaffAccountDocument({ kind: "confirmation", id }),
    /member or batch changed/,
  );
});

test("statements bind to the requested member, retain the operational notice and surface scoped/rate-limit failures", async () => {
  const statement = {
    documentType: "STATEMENT_OF_ACCOUNT",
    officialTaxInvoice: false,
    notice:
      "Operational account statement only. This is not an official BIR sales invoice.",
    balance: { clientId },
    verifiedPayments: [],
  };

  globalThis.fetch = async (input) => {
    return Response.json(
      String(input).endsWith("/statement") ? statement : client,
    );
  };

  const result = await getStaffAccountDocument({
    kind: "statement",
    id: clientId,
  });

  assert.equal(result.record.notice, statement.notice);

  globalThis.fetch = async () => {
    return Response.json({ ...statement, balance: { clientId: id } });
  };

  await assert.rejects(
    getStaffAccountDocument({ kind: "statement", id: clientId }),
    /unavailable/,
  );

  globalThis.fetch = async () => {
    return Response.json({ message: "Client not found." }, { status: 404 });
  };

  await assert.rejects(
    getStaffAccountDocument({ kind: "statement", id: clientId }),
    /Client not found/,
  );

  globalThis.fetch = async () => {
    return Response.json(
      { message: "Please wait before generating another document." },
      { status: 429, headers: { "Retry-After": "30" } },
    );
  };

  await assert.rejects(
    getStaffAccountDocument({ kind: "statement", id: clientId }),
    (e) => {
      assert.equal((e as { retryAfterSeconds: number }).retryAfterSeconds, 30);

      return true;
    },
  );
});
