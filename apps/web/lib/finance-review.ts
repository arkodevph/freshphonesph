import { findDuplicatePayments, listPayments, type Payment } from "./api";
import { getSubmissionChecklist } from "./submission-checklists";
import { tsDownload } from "./ts-api";

export type FinanceDecision = "verified" | "rejected" | "needs_clarification";

export function canDecideFinance(payment: Payment, decision: FinanceDecision) {
  return (
    payment.status === "pending" &&
    Number.isInteger(payment.version) &&
    payment.workflow?.membershipOpen === true &&
    Boolean(payment.proof_file) &&
    payment.workflow.recordsApproved &&
    payment.workflow.managerApproved &&
    (decision !== "verified" || payment.workflow.submissionComplete === true)
  );
}

export const financeDecisionEffects: Record<FinanceDecision, string> = {
  verified:
    "Verify this claim and add its verified credit to the member’s balance. Confirm actual funds outside the app before verifying.",
  rejected:
    "Reject this claim. It will not add credit to the member’s balance.",
  needs_clarification:
    "Return this claim for clarification. It will not add credit; the payment must pass the required reviews again after correction.",
};

export async function getFinanceReviewEvidence(id: string | number) {
  const page = await listPayments({ id: String(id), page: "1" });

  const payment = page.results.find((row) => {
    return String(row.id) === String(id);
  });

  if (!payment) {
    throw new Error("This payment is no longer available.");
  }

  const searchable =
    payment.reference_no.replace(/[^a-z0-9]/gi, "").length >= 3;

  const [duplicates, checklist, proof] = await Promise.all([
    searchable
      ? findDuplicatePayments(payment.method, payment.reference_no, payment.id)
      : Promise.resolve([]),
    getSubmissionChecklist({
      batchId: String(payment.batch),
      from: payment.payment_date,
      to: payment.payment_date,
    }),
    payment.proof_file
      ? tsDownload(`/payments/${payment.id}/proof`)
      : Promise.resolve(null),
  ]);

  return { payment, duplicates, checklist, proof, searchable };
}

export type FinanceReviewEvidence = Awaited<
  ReturnType<typeof getFinanceReviewEvidence>
>;
