"use client";

import { type ClientRecord, type PaymentStatus } from "@/lib/api";
import type { PaymentDuplicateMatch } from "@freshphones/contracts";
import { CheckCircle, WarningCircle, XCircle } from "@phosphor-icons/react";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import {
  financePaymentQueues,
  paymentSortFields,
  type PaymentSortField,
  type FinancePaymentQueue,
} from "@freshphones/contracts";
import { isFinanceId, safeFinanceReturn } from "@/lib/finance-navigation";
import type { FinancePaymentLocation } from "@/lib/finance-workspace";

export const FILTERS: { label: string; value: string }[] = [
  { label: "All", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Verified", value: "verified" },
  { label: "Rejected", value: "rejected" },
  { label: "Needs clarification", value: "needs_clarification" },
];

export const STATUS_STYLES: Record<PaymentStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  verified: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
  needs_clarification: "bg-violet-100 text-violet-700",
};

export type ReviewDecision = Exclude<PaymentStatus, "pending">;

export const REVIEW_ACTIONS: {
  value: ReviewDecision;
  label: string;
  Icon: typeof CheckCircle;
}[] = [
  { value: "verified", label: "Verify", Icon: CheckCircle },
  { value: "rejected", label: "Reject", Icon: XCircle },
  {
    value: "needs_clarification",
    label: "Request clarification",
    Icon: WarningCircle,
  },
];

export const formatTimestamp = (value?: string | null) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-PH", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Manila",
      }).format(date);
};

export type ClientChoice = Pick<
  ClientRecord,
  "id" | "batch" | "batch_number" | "full_name" | "unit_model"
>;

export const duplicateKey = (
  method: string,
  reference: string,
  client: string,
  matches: PaymentDuplicateMatch[],
) => {
  return `${method.toLowerCase()}:${reference.replace(/[^a-z0-9]/gi, "").toUpperCase()}:${client}:${matches
    .map((match) => {
      return match.id;
    })
    .sort()
    .join(",")}`;
};

export function PaymentLocationSync({
  onLocation,
}: {
  onLocation: (
    payment: string | null,
    status: string,
    missingProof: boolean,
    financeLocation?: FinancePaymentLocation,
  ) => void;
}) {
  const params = useSearchParams();

  const rawPayment = params.get("payment");

  const rawStatus = params.get("status");

  const rawProof = params.get("proof");

  const rawQueue = params.get("queue");

  const rawQuery = params.get("q") ?? "";

  const rawFrom = params.get("dateFrom") ?? "";

  const rawTo = params.get("dateTo") ?? "";

  const rawPage = params.get("page");

  const rawBatch = params.get("batchId");

  const rawMembershipBatch = params.get("membershipBatchId");

  const rawReturn = params.get("returnTo");

  const rawSort = params.get("sortBy");

  const rawDirection = params.get("sortDirection");

  useEffect(() => {
    const payment =
      rawPayment &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        rawPayment,
      )
        ? rawPayment
        : null;

    const status = FILTERS.some((item) => {
      return item.value === rawStatus;
    })
      ? rawStatus!
      : "";

    const queue = financePaymentQueues.includes(rawQueue as FinancePaymentQueue)
      ? (rawQueue as FinancePaymentQueue)
      : rawQueue === "all" || status || rawProof === "missing"
        ? "all"
        : "ready";

    const page =
      rawPage &&
      /^\d+$/.test(rawPage) &&
      Number(rawPage) >= 1 &&
      Number(rawPage) <= 100000
        ? Number(rawPage)
        : 1;

    onLocation(payment, status, !payment && rawProof === "missing", {
      queue,
      batchId: rawBatch ?? undefined,
      membershipBatchId: rawMembershipBatch ?? undefined,
      returnTo: safeFinanceReturn(rawReturn) ?? undefined,
      q: rawQuery,
      dateFrom: rawFrom,
      dateTo: rawTo,
      page,
      sort: {
        key: paymentSortFields.includes(rawSort as PaymentSortField)
          ? (rawSort as PaymentSortField)
          : "createdAt",
        direction: rawDirection === "asc" ? "asc" : "desc",
      },
    });
  }, [
    rawPayment,
    rawStatus,
    rawProof,
    rawQueue,
    rawQuery,
    rawFrom,
    rawTo,
    rawPage,
    rawBatch,
    rawMembershipBatch,
    rawReturn,
    rawSort,
    rawDirection,
    onLocation,
  ]);

  return null;
}

export function Row({
  k,
  v,
  strong,
}: {
  k: string;
  v: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-ink-soft">{k}</dt>
      <dd className={strong ? "font-700 text-blue-ink" : "text-ink"}>{v}</dd>
    </div>
  );
}
