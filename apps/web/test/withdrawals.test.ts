import { after, test } from "node:test";
import assert from "node:assert/strict";
import {
  moneyInput,
  withdrawalMoney,
  withdrawalRefundLabel,
  withdrawalStatusLabels,
  submitWithdrawal,
  proposeWithdrawalReplacement,
  recordWithdrawalPayout,
} from "../lib/withdrawals";
import { canOpenWorkspace } from "../lib/workspace-access";
import { portalMembershipDetails } from "../lib/portal-membership";
import { membershipMilestones } from "../lib/portal-membership-calendar";
import { installmentState, scheduleDueNow } from "../lib/portal-schedule";

const priorFetch = globalThis.fetch;

after(() => {
  globalThis.fetch = priorFetch;
});

test("refund labels distinguish unknown amount, approval and recorded partial or full payment", () => {
  assert.equal(withdrawalMoney(null), "Not decided");

  assert.match(withdrawalMoney("0.00"), /0\.00/);

  assert.equal(
    withdrawalRefundLabel({
      refundStatus: "PENDING",
      refundPaid: "0.00",
      refundRemaining: null,
    }),
    "Refund decision pending",
  );

  assert.equal(
    withdrawalRefundLabel({
      refundStatus: "APPROVED",
      refundPaid: "0.00",
      refundRemaining: "15.00",
    }),
    "Refund approved · payment pending",
  );

  assert.equal(
    withdrawalRefundLabel({
      refundStatus: "APPROVED",
      refundPaid: "5.00",
      refundRemaining: "10.00",
    }),
    "Refund partly paid",
  );

  assert.equal(
    withdrawalRefundLabel({
      refundStatus: "APPROVED",
      refundPaid: "15.00",
      refundRemaining: "0.00",
    }),
    "Approved refund recorded as paid",
  );

  assert.match(withdrawalStatusLabels.APPROVED, /awaiting replacement/);
});

test("money inputs reject rounding, exponent notation and negative records", () => {
  for (const value of ["-1", "1.001", "1e3", "NaN", "1,000", ""]) {
    assert.throws(() => {
      moneyInput(value);
    });
  }

  assert.equal(moneyInput(" 15.5 "), "15.50");

  assert.equal(moneyInput("15"), "15.00");
});

test("withdrawal API preserves membership and replay identifiers and returns enrollment id separately", async () => {
  const calls: { url: string; body: Record<string, unknown> }[] = [];

  const response = {
    id: "withdrawal-id",
    replacementEnrollmentId: "enrollment-id",
    version: 4,
  };

  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), body: JSON.parse(String(init?.body)) });

    return Response.json(response);
  };

  const create = {
    submissionId: "submission-id",
    clientId: "membership-id",
    reason: "Reason for withdrawal",
  };

  await submitWithdrawal(create);

  const proposal = await proposeWithdrawalReplacement("withdrawal-id", {
    version: 3,
    submissionId: "replacement-replay-id",
    name: "Synthetic member",
    email: "",
    phone: "09123456789",
  });

  await recordWithdrawalPayout("withdrawal-id", {
    version: 4,
    requestId: "payout-replay-id",
    amount: "5.00",
    paymentDate: "2026-10-30",
    method: "GCash",
    reference: "EXT-REF-1",
    note: "Already paid externally",
  });

  assert.deepEqual(calls[0].body, create);

  assert.match(
    calls[1].url,
    /\/withdrawals\/withdrawal-id\/replacement-request$/,
  );

  assert.equal(calls[1].body.submissionId, "replacement-replay-id");

  assert.equal(proposal.id, "withdrawal-id");

  assert.equal(proposal.replacementEnrollmentId, "enrollment-id");

  assert.equal(calls[2].body.amount, "5.00");

  assert.equal(calls[2].body.requestId, "payout-replay-id");
});

test("withdrawal staff navigation excludes CEO, handler and customer roles", () => {
  for (const role of ["CEO", "BATCH_HANDLER", "CUSTOMER"]) {
    assert.equal(canOpenWorkspace(role, "/system/withdrawals"), false);
  }

  for (const role of ["COO", "AGENT", "BATCH_MANAGER", "FINANCE_OFFICER"]) {
    assert.equal(canOpenWorkspace(role, "/system/withdrawals"), true);
  }
});

test("replacement schedule uses the membership's agreed dates rather than shared batch dates", () => {
  const client: Parameters<typeof portalMembershipDetails>[0] = {
    status: "ACTIVE",
    joinedAt: "2026-10-30T00:00:00Z",
    batch: {
      id: "batch",
      code: "A-1",
      model: "Phone",
      startDate: "2026-01-01",
      endDate: "2026-05-31",
    },
    membershipPlan: {
      startDate: "2028-02-01",
      endDate: "2028-04-30",
      contractPrice: "240.00",
      installmentCount: 3,
      cadence: "MONTHLY",
      firstDueDate: "2028-02-29",
      monthEnd: true,
    },
  };

  const details = portalMembershipDetails(client);

  assert.equal(details.batch_start_date, "2028-02-01");

  assert.equal(details.batch_end_date, "2028-04-30");

  assert.deepEqual(
    membershipMilestones(details).map((item) => {
      return item.label;
    }),
    ["Joined", "Plan start", "Planned plan end"],
  );

  const historical = portalMembershipDetails({
    ...client,
    replacementCompletedAt: "2026-10-31T00:00:00Z",
    membershipPlan: null,
  });

  assert.equal(historical.status, "replacement joined");

  assert.equal(historical.batch_start_date, client.batch.startDate);
});

test("released obligations are handed over rather than falsely labeled as paid or overdue", () => {
  const released = {
    sequence_no: 1,
    due_date: "2026-01-01",
    expected_amount: "0.00",
    original_expected_amount: "25.00",
    released_amount: "25.00",
    paid_applied: "0.00",
    status: "paid",
  };

  assert.deepEqual(installmentState(released, "2026-10-30"), {
    remaining: 0,
    payment: "Handed over",
    timing: "Replacement joined",
    isDue: false,
  });

  const partial = {
    ...released,
    expected_amount: "20.00",
    released_amount: "5.00",
    paid_applied: "20.00",
  };

  assert.equal(
    installmentState(partial, "2026-10-30").payment,
    "Settled after handover",
  );

  assert.equal(scheduleDueNow([released, partial], "2026-10-30"), 0);
});
