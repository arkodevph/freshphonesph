import type {
  WithdrawalCase,
  WithdrawalCreateInput,
  WithdrawalDecisionInput,
  WithdrawalEligibility,
  WithdrawalNoteInput,
  WithdrawalPage,
  WithdrawalPayoutInput,
  WithdrawalPolicyInput,
  WithdrawalQuery,
  WithdrawalRefundInput,
  WithdrawalReplacementInput,
  WithdrawalReplacementPreview,
  WithdrawalResubmitInput,
  WithdrawalStatus,
} from "@freshphones/contracts";
import { tsRequest } from "./ts-api";

export const withdrawalStatusLabels: Record<WithdrawalStatus, string> = {
  AWAITING_AGENT: "Awaiting Agent review",
  AWAITING_COO: "Awaiting COO review",
  CHANGES_REQUESTED: "More information needed",
  APPROVED: "Approved · awaiting replacement",
  REJECTED: "Not approved",
  CANCELLED: "Request cancelled",
  REPLACED: "Replacement joined",
};

export function withdrawalMoney(value: string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "Not decided";
  }

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(Number(value));
}

export function moneyInput(value: string) {
  const match = /^(0|[1-9]\d{0,9})(?:\.(\d{1,2}))?$/.exec(value.trim());

  if (!match) {
    throw new Error("Enter an amount with at most two decimal places.");
  }

  return `${match[1]}.${(match[2] ?? "").padEnd(2, "0")}`;
}

export function withdrawalRefundLabel(
  row: Pick<WithdrawalCase, "refundStatus" | "refundRemaining" | "refundPaid">,
) {
  if (row.refundStatus === "PENDING") {
    return "Refund decision pending";
  }

  if (row.refundStatus === "DECLINED") {
    return "Refund not approved";
  }

  if (row.refundRemaining === "0.00") {
    return "Approved refund recorded as paid";
  }

  return Number(row.refundPaid) > 0
    ? "Refund partly paid"
    : "Refund approved · payment pending";
}

export function listWithdrawals(query: Partial<WithdrawalQuery> = {}) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  }

  return tsRequest<WithdrawalPage>(`/withdrawals?${params}`);
}

export const withdrawalEligibility = () => {
  return tsRequest<WithdrawalEligibility[]>("/withdrawals/eligibility");
};

export const getWithdrawal = (id: string) => {
  return tsRequest<WithdrawalCase>(`/withdrawals/${encodeURIComponent(id)}`);
};

export const submitWithdrawal = (input: WithdrawalCreateInput) => {
  return tsRequest<WithdrawalCase>("/withdrawals", {
    method: "POST",
    body: JSON.stringify(input),
  });
};

function action<T>(id: string, name: string, input: unknown) {
  return tsRequest<T>(`/withdrawals/${encodeURIComponent(id)}/${name}`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export const resubmitWithdrawal = (
  id: string,
  input: WithdrawalResubmitInput,
) => {
  return action<WithdrawalCase>(id, "resubmit", input);
};

export const cancelWithdrawal = (id: string, input: WithdrawalNoteInput) => {
  return action<WithdrawalCase>(id, "cancel", input);
};

export const forwardWithdrawal = (id: string, input: WithdrawalNoteInput) => {
  return action<WithdrawalCase>(id, "forward", input);
};

export const decideWithdrawal = (
  id: string,
  input: WithdrawalDecisionInput,
) => {
  return action<WithdrawalCase>(id, "decision", input);
};

export const decideWithdrawalRefund = (
  id: string,
  input: WithdrawalRefundInput,
) => {
  return action<WithdrawalCase>(id, "refund", input);
};

export const saveWithdrawalPolicy = (
  id: string,
  input: WithdrawalPolicyInput,
) => {
  return action<WithdrawalCase>(id, "policy", input);
};

export const getReplacementPreview = (id: string) => {
  return tsRequest<WithdrawalReplacementPreview>(
    `/withdrawals/${encodeURIComponent(id)}/replacement-preview`,
  );
};

export const proposeWithdrawalReplacement = (
  id: string,
  input: WithdrawalReplacementInput,
) => {
  return action<WithdrawalCase>(id, "replacement-request", input);
};

export const recordWithdrawalPayout = (
  id: string,
  input: WithdrawalPayoutInput,
) => {
  return action<WithdrawalCase>(id, "payout", input);
};

export interface WithdrawalMemberChoice {
  memberId: string;
  name: string;
  email: string;
  phone: string;
  batch: { code: string };
}

export const findWithdrawalReplacementMembers = (q: string) => {
  return tsRequest<WithdrawalMemberChoice[]>(
    `/enrollment/members?q=${encodeURIComponent(q.trim())}`,
  );
};
