import assert from "node:assert/strict";
import { test } from "node:test";
import type { Payment } from "../lib/api";
import {
  handlerPaymentStage,
  handlerReturnNote,
  isBatchHandler,
} from "../lib/handler-workspace";

test("Handler home routing covers the current and legacy role, without matching other staff", () => {
  for (const role of ["batch_handler", "CORE_HANDLER", "BATCH_HANDLER"]) {
    assert.equal(isBatchHandler(role), true);
  }

  for (const role of [
    "batch_manager",
    "customer",
    "coo",
    "ceo",
    null,
    undefined,
  ]) {
    assert.equal(isBatchHandler(role), false);
  }
});

test("claim stages distinguish missing evidence, review handoffs and missing workflow data", () => {
  const payment = { status: "pending", proof_file: null } as Payment;

  assert.equal(handlerPaymentStage(payment), "Attach receipt proof");

  payment.proof_file = "proof";

  assert.equal(handlerPaymentStage(payment), "Review status unavailable");

  payment.workflow = {
    recordsApproved: false,
    managerApproved: false,
    evidenceVersion: 1,
    managerId: null,
    history: [],
  };

  assert.equal(handlerPaymentStage(payment), "Awaiting Records");

  payment.workflow.recordsApproved = true;

  assert.equal(handlerPaymentStage(payment), "Awaiting Manager");

  payment.workflow.managerApproved = true;

  assert.equal(handlerPaymentStage(payment), "Ready for Finance");

  payment.status = "needs_clarification";

  assert.equal(handlerPaymentStage(payment), "Needs your correction");
});

test("returned claims prefer the Finance clarification note, with operational-return fallback", () => {
  const payment = {
    verification_notes: "Finance needs a legible reference.",
    workflow: {
      history: [
        { decision: "RETURNED", notes: "Records needs the complete receipt." },
      ],
    },
  } as Payment;

  assert.equal(
    handlerReturnNote(payment),
    "Finance needs a legible reference.",
  );

  payment.verification_notes = null;

  assert.equal(
    handlerReturnNote(payment),
    "Records needs the complete receipt.",
  );
});
