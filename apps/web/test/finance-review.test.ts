import { after, test } from "node:test";
import assert from "node:assert/strict";
import {
  canDecideFinance,
  getFinanceReviewEvidence,
} from "../lib/finance-review";
import type { Payment } from "../lib/api";
import { ApiError } from "../lib/ts-api";
const fetchBefore = globalThis.fetch;

after(() => {
  globalThis.fetch = fetchBefore;
});

const ready = {
  id: "synthetic-payment",
  status: "pending",
  version: 7,
  proof_file: "synthetic-proof",
  workflow: {
    membershipOpen: true,
    recordsApproved: true,
    managerApproved: true,
    submissionComplete: true,
  },
} as Payment;

test("Finance decisions require current approvals, open membership, proof and a captured version; only verification requires complete submission evidence", () => {
  for (const decision of [
    "verified",
    "rejected",
    "needs_clarification",
  ] as const) {
    assert.equal(canDecideFinance(ready, decision), true);

    for (const payment of [
      { ...ready, status: "verified" },
      { ...ready, version: undefined },
      { ...ready, proof_file: null },
      ...["membershipOpen", "recordsApproved", "managerApproved"].map((key) => {
        return { ...ready, workflow: { ...ready.workflow, [key]: false } };
      }),
    ]) {
      assert.equal(canDecideFinance(payment as Payment, decision), false);
    }
  }

  const incomplete = {
    ...ready,
    workflow: { ...ready.workflow!, submissionComplete: false },
  };

  assert.equal(canDecideFinance(incomplete, "verified"), false);

  assert.equal(canDecideFinance(incomplete, "rejected"), true);

  assert.equal(canDecideFinance(incomplete, "needs_clarification"), true);
});

const raw = {
  id: ready.id,
  clientId: "member",
  batchId: "batch",
  amount: "1200.00",
  paymentDate: "2026-11-20",
  method: "GCash",
  referenceNumber: "REF-123",
  status: "PENDING",
  version: 7,
  client: { name: "Synthetic member", batch: { code: "BATCH-SYNTHETIC" } },
  recordedBy: { id: "recorder", name: "Synthetic recorder" },
  workflow: ready.workflow,
  proofFile: { id: "synthetic-proof" },
};

function respond(failure?: string) {
  globalThis.fetch = async (input, options) => {
    const url = new URL(String(input));

    assert.equal(options?.credentials, "include");

    assert.equal(options?.cache, "no-store");

    if (url.pathname === failure) {
      return Response.json(
        { message: "Synthetic evidence failure" },
        { status: 403 },
      );
    }

    if (url.pathname === "/api/payments") {
      assert.equal(url.searchParams.get("id"), ready.id);

      assert.equal(url.searchParams.has("financeQueue"), false);

      return Response.json({ items: [raw], total: 1, page: 1, pageSize: 20 });
    }

    if (url.pathname === "/api/payments/duplicates") {
      assert.equal(url.searchParams.get("excludeId"), ready.id);

      assert.equal(url.searchParams.get("referenceNumber"), "REF-123");

      return Response.json([]);
    }

    if (url.pathname === "/api/submission-checklists") {
      assert.equal(url.searchParams.get("batchId"), "batch");

      assert.equal(url.searchParams.get("from"), "2026-11-20");

      assert.equal(url.searchParams.get("to"), "2026-11-20");

      return Response.json({
        complete: true,
        requirements: [],
        payments: [],
        statements: [],
        members: [],
        canManage: false,
      });
    }

    assert.equal(url.pathname, `/api/payments/${ready.id}/proof`);

    return new Response("synthetic image bytes", {
      headers: { "content-type": "image/png" },
    });
  };
}

test("review context refreshes the exact claim and loads its scoped checklist, duplicate evidence and private proof", async () => {
  respond();

  const context = await getFinanceReviewEvidence(ready.id);

  assert.equal(context.payment.version, 7);

  assert.equal(context.payment.client_name, "Synthetic member");

  assert.equal(context.proof?.type, "image/png");

  assert.deepEqual(context.duplicates, []);
});

test("failed evidence reads remain failures instead of reporting an empty duplicate list or complete review", async () => {
  for (const path of [
    "/api/payments/duplicates",
    "/api/submission-checklists",
    `/api/payments/${ready.id}/proof`,
  ]) {
    respond(path);

    await assert.rejects(
      () => {
        return getFinanceReviewEvidence(ready.id);
      },
      (error) => {
        return error instanceof ApiError && error.status === 403;
      },
    );
  }
});

test("a missing exact payment cannot fall back to an unrelated row", async () => {
  globalThis.fetch = async () => {
    return Response.json({
      items: [{ ...raw, id: "another-payment" }],
      total: 1,
      page: 1,
      pageSize: 20,
    });
  };

  await assert.rejects(() => {
    return getFinanceReviewEvidence(ready.id);
  }, /no longer available/);
});
