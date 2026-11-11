import type { Payment } from "./api";

export function isBatchHandler(role?: string | null) {
  return ["batch_handler", "core_handler"].includes(role?.toLowerCase() ?? "");
}

export const handlerNavigationLabels: Record<string, string> = {
  "/system": "Home",
  "/system/records": "My batches",
  "/system/clients": "Members & schedules",
  "/system/payments": "Payments",
  "/system/gcash-history": "GCash history",
  "/system/tasks": "My tasks",
};

export function handlerPaymentStage(payment: Payment) {
  if (payment.status === "needs_clarification") {
    return "Needs your correction";
  }

  if (payment.status !== "pending") {
    return payment.status === "verified" ? "Finance verified" : "Rejected";
  }

  if (!payment.proof_file) {
    return "Attach receipt proof";
  }

  if (!payment.workflow) {
    return "Review status unavailable";
  }

  return payment.workflow.managerApproved
    ? "Ready for Finance"
    : payment.workflow.recordsApproved
      ? "Awaiting Manager"
      : "Awaiting Records";
}

export function handlerReturnNote(payment: Payment) {
  const review = payment.workflow?.history.find((entry) => {
    return entry.decision === "RETURNED";
  });

  return (
    payment.verification_notes ||
    review?.notes ||
    "Open the claim to review its notes and evidence."
  );
}
