import type {
  FinanceOverview,
  FinanceOverviewPeriod,
  FinancePaymentQueue,
} from "@freshphones/contracts";
import { tsRequest } from "./ts-api";
import type { Payment } from "./api";

export function financePaymentStage(payment: Payment) {
  if (payment.workflow?.membershipOpen === false) {
    return "Read-only membership";
  }

  if (payment.status === "needs_clarification") {
    return "Needs clarification";
  }

  if (payment.status !== "pending") {
    return payment.status === "verified" ? "Finance verified" : "Rejected";
  }

  if (!payment.workflow) {
    return "Review status unavailable";
  }

  if (!payment.proof_file || !payment.workflow.recordsApproved) {
    return "Waiting for Records / proof";
  }

  if (!payment.workflow.managerApproved) {
    return "Waiting for assigned Manager";
  }

  if (payment.workflow.submissionComplete === false) {
    return "Waiting for submission evidence";
  }

  return payment.workflow.membershipOpen === true &&
    payment.workflow.submissionComplete === true
    ? "Ready for Finance"
    : "Review status unavailable";
}

export const financeQueueLabels: Record<FinancePaymentQueue | "all", string> = {
  ready: "Ready for Finance",
  waiting: "Waiting upstream",
  waiting_records: "Waiting for Records / proof",
  waiting_manager: "Waiting for assigned Manager",
  waiting_evidence: "Waiting for submission evidence",
  membership_closed: "Read-only memberships",
  clarification: "Needs clarification",
  all: "All payments",
};

export type FinancePaymentLocation = {
  queue: FinancePaymentQueue | "all";
  q: string;
  dateFrom: string;
  dateTo: string;
  page: number;
  batchId?: string;
  membershipBatchId?: string;
  returnTo?: string;
  sort?: import("./handler-table").HandlerTableSort<
    import("@freshphones/contracts").PaymentSortField
  >;
};

export function getFinanceOverview(period: FinanceOverviewPeriod) {
  return tsRequest<FinanceOverview>(`/finance/overview?period=${period}`);
}
