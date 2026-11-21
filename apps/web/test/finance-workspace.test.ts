import { after, test } from "node:test";
import assert from "node:assert/strict";
import {
  getFinanceOverview,
  financePaymentStage,
} from "../lib/finance-workspace";
import { listPayments } from "../lib/api";
import { ApiError } from "../lib/ts-api";

const original = globalThis.fetch;

after(() => {
  globalThis.fetch = original;
});

test("Finance overview reads retain the chosen period and private session/cache settings", async () => {
  globalThis.fetch = async (input, options) => {
    const url = new URL(String(input));

    assert.equal(url.pathname, "/api/finance/overview");

    assert.equal(url.searchParams.get("period"), "last_month");

    assert.equal(options?.credentials, "include");

    assert.equal(options?.cache, "no-store");

    return Response.json({ collections: { amount: "12.34" } });
  };

  assert.equal(
    (await getFinanceOverview("last_month")).collections.amount,
    "12.34",
  );
});

test("payment adapter preserves Finance queue, paging and encoded search while normalizing status", async () => {
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));

    assert.equal(url.searchParams.get("financeQueue"), "waiting_evidence");

    assert.equal(url.searchParams.get("q"), "Member & batch %");

    assert.equal(url.searchParams.get("status"), "PENDING");

    assert.equal(url.searchParams.get("page"), "2");

    return Response.json({ items: [], total: 21, page: 2, pageSize: 20 });
  };

  const result = await listPayments({
    financeQueue: "waiting_evidence",
    q: "Member & batch %",
    status: "pending",
    page: "2",
  });

  assert.equal(result.count, 21);
});

test("denied Finance reads remain errors instead of becoming a zero-count overview", async () => {
  globalThis.fetch = async () => {
    return Response.json(
      { message: "Finance workspace access required." },
      { status: 403 },
    );
  };

  await assert.rejects(
    () => {
      return getFinanceOverview("this_month");
    },
    (error) => {
      return error instanceof ApiError && error.status === 403;
    },
  );
});

test("Finance row labels follow blocking priority and never call a handed-over membership ready", () => {
  const record = {
    status: "pending",
    proof_file: "synthetic-proof",
    workflow: {
      recordsApproved: true,
      managerApproved: true,
      submissionComplete: true,
      membershipOpen: true,
    },
  } as import("../lib/api").Payment;

  assert.equal(financePaymentStage(record), "Ready for Finance");

  assert.equal(
    financePaymentStage({
      ...record,
      workflow: { ...record.workflow!, membershipOpen: false },
    }),
    "Read-only membership",
  );

  assert.equal(
    financePaymentStage({
      ...record,
      workflow: {
        ...record.workflow!,
        recordsApproved: false,
        submissionComplete: false,
      },
    }),
    "Waiting for Records / proof",
  );

  assert.equal(
    financePaymentStage({
      ...record,
      workflow: { ...record.workflow!, submissionComplete: false },
    }),
    "Waiting for submission evidence",
  );

  assert.equal(
    financePaymentStage({
      ...record,
      workflow: { ...record.workflow!, membershipOpen: undefined },
    }),
    "Review status unavailable",
  );
});
