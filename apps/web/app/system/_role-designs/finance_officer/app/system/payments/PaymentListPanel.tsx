"use client";

import Link from "next/link";
import type { AccountDocumentTarget } from "@/lib/account-documents";
import WorkspaceProgress from "@/app/system/_role-designs/finance_officer/components/WorkspaceProgress";
import DateInput from "@/app/system/_role-designs/finance_officer/components/DateInput";
import { isBatchHandler } from "@/lib/handler-workspace";
import { financeQueueLabels } from "@/lib/finance-workspace";
import type {
  FinancePaymentQueue,
  PaymentSortField,
} from "@freshphones/contracts";
import type { HandlerTableSort } from "@/lib/handler-table";
import FinancePaymentTable from "./FinancePaymentTable";
import type { Me } from "@/lib/api";
import { downloadPaymentsExport, type Payment } from "@/lib/api";
import { can } from "@/lib/useMe";
import { DownloadSimple, MagnifyingGlass } from "@phosphor-icons/react";
import type { Dispatch, SetStateAction } from "react";
import { inputCls } from "@/app/system/_role-designs/finance_officer/components/FormField";
import SplitButton from "@/app/system/_role-designs/finance_officer/components/SplitButton";
import {
  FILTERS,
  ReviewDecision,
} from "@/app/system/_role-designs/finance_officer/app/system/payments/payment-view";

type Props = {
  onDocument: (target: AccountDocumentTarget) => void;
  financeBatchScope: { batchId: string; membershipBatchId: string };
  financeReturnTo: string | null;
  clearFinanceBatchScope: () => void;
  financeQueue: FinancePaymentQueue | "all";
  setFinanceQueue: Dispatch<SetStateAction<FinancePaymentQueue | "all">>;
  hasListSnapshot: boolean;
  reviewStage: "RECORDS" | "MANAGER" | "FINANCE";
  focusedPayment: string | null;
  setFocusedPayment: Dispatch<SetStateAction<string | null>>;
  setFilter: Dispatch<SetStateAction<string>>;
  proofFilter: boolean;
  setProofFilter: Dispatch<SetStateAction<boolean>>;
  resetPaymentPage: () => void;
  paymentQuery: string;
  appliedPaymentQuery: string;
  paymentPage: number;
  load: (preserveError?: boolean) => Promise<void>;
  setAppliedPaymentQuery: Dispatch<SetStateAction<string>>;
  setPaymentQuery: Dispatch<SetStateAction<string>>;
  dateFrom: string;
  dateTo: string;
  setDateFrom: Dispatch<SetStateAction<string>>;
  setDateTo: Dispatch<SetStateAction<string>>;
  filter: string;
  me: Me | null;
  paymentExportFilters: {
    batchId?: string;
    dateTo?: string | undefined;
    dateFrom?: string | undefined;
    q?: string | undefined;
    status?: string | undefined;
  };
  setError: Dispatch<SetStateAction<string | null>>;
  loading: boolean;
  listError: string | null;
  sort: HandlerTableSort<PaymentSortField>;
  onSort: (key: PaymentSortField) => void;
  onResetSort: () => void;
  paymentCount: number;
  payments: Payment[];
  setDetailsPayment: Dispatch<SetStateAction<Payment | null>>;
  canVerify: boolean;
  setAdjustmentPayment: Dispatch<SetStateAction<Payment | null>>;
  viewProof: (id: string | number) => Promise<void>;
  openFinanceReview: (
    payment: Payment,
    decision?: ReviewDecision | null,
  ) => void;
  canRecord: boolean;
  edit: (payment: Payment) => void;
  attachReceipt: (payment: Payment) => void;
  changePaymentPage: (next: number) => void;
  paymentPageSize: number;
  paymentHasNext: boolean;
};

export default function PaymentListPanel({
  onDocument,
  financeBatchScope,
  financeReturnTo,
  clearFinanceBatchScope,
  financeQueue,
  setFinanceQueue,
  hasListSnapshot,
  reviewStage,
  focusedPayment,
  setFocusedPayment,
  setFilter,
  proofFilter,
  setProofFilter,
  resetPaymentPage,
  paymentQuery,
  appliedPaymentQuery,
  paymentPage,
  load,
  setAppliedPaymentQuery,
  setPaymentQuery,
  dateFrom,
  dateTo,
  setDateFrom,
  setDateTo,
  filter,
  me,
  paymentExportFilters,
  setError,
  loading,
  listError,
  sort,
  onSort,
  onResetSort,
  paymentCount,
  payments,
  setDetailsPayment,
  canVerify,
  setAdjustmentPayment,
  viewProof,
  openFinanceReview,
  canRecord,
  edit,
  attachReceipt,
  changePaymentPage,
  paymentPageSize,
  paymentHasNext,
}: Props) {
  const canReview = canVerify && !listError && !loading;

  return (
    <div className="glass min-w-0 rounded-3xl p-5">
      {financeReturnTo && (
        <p className="mb-4">
          <Link className="underline" href={financeReturnTo}>
            {financeReturnTo.startsWith("/system/reports")
              ? "Back to report"
              : "Back to GCash statement"}
          </Link>
        </p>
      )}
      {(financeBatchScope.batchId || financeBatchScope.membershipBatchId) && (
        <div
          className="mb-4 flex flex-wrap items-center gap-3 text-sm"
          role="status"
        >
          <span>
            {financeBatchScope.membershipBatchId
              ? "Filtered by current membership batch."
              : "Filtered by recorded payment batch."}
          </span>
          <button
            type="button"
            className="min-h-11 underline"
            onClick={clearFinanceBatchScope}
          >
            Clear batch filter
          </button>
        </div>
      )}
      <label className="mb-4 grid max-w-md gap-1 text-sm">
        Payment queue
        <select
          value={financeQueue}
          onChange={(event) => {
            setFinanceQueue(event.target.value as FinancePaymentQueue | "all");

            setFocusedPayment(null);

            setFilter("");

            setProofFilter(false);

            resetPaymentPage();
          }}
        >
          {Object.entries(financeQueueLabels).map(([value, label]) => {
            return (
              <option key={value} value={value}>
                {label}
              </option>
            );
          })}
        </select>
      </label>
      {proofFilter && (
        <div
          className="mb-4 flex flex-wrap items-center gap-3 rounded-xl bg-violet-100 px-4 py-2 text-sm text-violet-700"
          role="status"
        >
          Showing recorded claims without receipt proof
          <button
            type="button"
            className="min-h-11 font-700 underline"
            onClick={() => {
              setProofFilter(false);

              resetPaymentPage();
            }}
          >
            Clear proof filter
          </button>
        </div>
      )}
      {focusedPayment && (
        <div className="mb-4 flex items-center gap-3 rounded-xl bg-violet-100 px-4 py-2 text-sm text-violet-700">
          Viewing the linked payment{" "}
          <button
            type="button"
            onClick={() => {
              setFocusedPayment(null);

              setFilter("");

              setFinanceQueue("all");

              resetPaymentPage();
            }}
            className="font-700 underline"
          >
            Show all payments
          </button>
        </div>
      )}
      <form
        className="payment-list-search mb-3 grid gap-2 xl:grid-cols-[minmax(0,1fr)_9rem_9rem_auto]"
        onSubmit={(event) => {
          event.preventDefault();

          const term = paymentQuery.trim();

          if (focusedPayment) {
            setFocusedPayment(null);
          }

          resetPaymentPage();

          if (term === appliedPaymentQuery && paymentPage === 1) {
            void load();
          } else {
            setAppliedPaymentQuery(term);
          }
        }}
      >
        <label>
          <span className="mb-1 block text-xs font-600 text-ink-soft">
            Find a payment
          </span>
          <span className="client-picker-control block">
            <MagnifyingGlass weight="bold" aria-hidden="true" />
            <input
              value={paymentQuery}
              maxLength={100}
              onChange={(event) => {
                return setPaymentQuery(event.target.value);
              }}
              className={`${inputCls} client-picker-input`}
              placeholder="Client, batch, or reference…"
            />
          </span>
        </label>
        <label>
          <span className="mb-1 block text-xs font-600 text-ink-soft">
            From
          </span>
          <DateInput
            type="date"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={(event) => {
              setDateFrom(event.target.value);

              resetPaymentPage();
            }}
            className={inputCls}
          />
        </label>
        <label>
          <span className="mb-1 block text-xs font-600 text-ink-soft">To</span>
          <DateInput
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(event) => {
              setDateTo(event.target.value);

              resetPaymentPage();
            }}
            className={inputCls}
          />
        </label>
        <button
          type="submit"
          className="balance-check-button self-end rounded-2xl px-4 py-2 text-sm font-700"
        >
          Search
        </button>
      </form>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {FILTERS.map((f) => {
            return (
              <button
                key={f.value}
                aria-pressed={financeQueue === "all" && filter === f.value}
                onClick={() => {
                  setFocusedPayment(null);

                  setFinanceQueue("all");

                  setFilter(f.value);

                  resetPaymentPage();
                }}
                className={`rounded-full px-3.5 py-1.5 text-sm font-700 transition-colors ${
                  financeQueue === "all" && filter === f.value
                    ? "bg-blue text-white"
                    : "bg-white/60 text-ink-soft hover:bg-white"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
        {can(me, "REPORT_VIEW") &&
          !proofFilter &&
          financeQueue === "all" &&
          !focusedPayment &&
          !financeBatchScope.membershipBatchId && (
            <SplitButton
              label="Export CSV"
              icon={<DownloadSimple aria-hidden="true" />}
              disabled={loading || Boolean(listError) || !hasListSnapshot}
              onAction={() => {
                void downloadPaymentsExport(paymentExportFilters, "csv").catch(
                  (e) => {
                    setError(e instanceof Error ? e.message : "Export failed.");
                  },
                );
              }}
              menuLabel="Payment export options"
              actions={[
                {
                  label: "Export Excel (.xlsx)",
                  icon: <DownloadSimple aria-hidden="true" />,
                  onAction: () => {
                    void downloadPaymentsExport(
                      paymentExportFilters,
                      "xlsx",
                    ).catch((e) => {
                      setError(
                        e instanceof Error ? e.message : "Export failed.",
                      );
                    });
                  },
                },
              ]}
            />
          )}
      </div>
      <p className="mb-3 text-xs text-ink-soft" role="status">
        {loading
          ? "Loading matching payments…"
          : listError && !hasListSnapshot
            ? "Payment count unavailable."
            : `${listError ? "Last loaded: " : ""}${paymentCount} matching payment${paymentCount === 1 ? "" : "s"}.`}
        {financeQueue === "all" &&
        !focusedPayment &&
        !financeBatchScope.membershipBatchId
          ? " CSV and XLSX exports use the same search, status and payment-date filters and omit client identity and payment references."
          : financeBatchScope.membershipBatchId
            ? " Export this membership scope from the Collections report."
            : focusedPayment
              ? " Open a document from this row, or use Reports for period exports."
              : " Choose All payments for history and report exports."}
      </p>
      {listError && (
        <div
          className="mb-4 rounded-xl border border-rose-300 p-4 text-sm"
          role="alert"
        >
          <p>{listError}</p>
          <p>
            {hasListSnapshot
              ? "Showing the last successfully loaded records. Refresh before making a financial decision."
              : "Payments could not be loaded. This is not an empty queue."}
          </p>
          <button
            type="button"
            className="mt-2 min-h-11 underline"
            onClick={() => {
              return void load();
            }}
            disabled={loading}
          >
            Try again
          </button>
        </div>
      )}

      {(!listError || hasListSnapshot || loading) && (
        <>
          {me && (
            <FinancePaymentTable
              payments={payments}
              loading={loading}
              me={me}
              sort={sort}
              onSort={onSort}
              onResetSort={onResetSort}
              onRetry={() => {
                void load();
              }}
              onDocument={onDocument}
              onDetails={setDetailsPayment}
              onReview={openFinanceReview}
              onAdjustment={setAdjustmentPayment}
              canReview={canReview}
            />
          )}
          <nav
            className="mt-4 flex items-center justify-between gap-3"
            aria-label="Payment pages"
          >
            <button
              type="button"
              disabled={loading || Boolean(listError) || paymentPage === 1}
              onClick={() => {
                return changePaymentPage(Math.max(1, paymentPage - 1));
              }}
              className="rounded-xl border border-white/70 bg-white/60 px-3 py-2 text-xs font-700 text-blue-ink disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-xs text-ink-soft">
              Page {paymentPage} of{" "}
              {Math.max(1, Math.ceil(paymentCount / paymentPageSize))}
            </span>
            <button
              type="button"
              disabled={loading || Boolean(listError) || !paymentHasNext}
              onClick={() => {
                return changePaymentPage(paymentPage + 1);
              }}
              className="rounded-xl border border-white/70 bg-white/60 px-3 py-2 text-xs font-700 text-blue-ink disabled:opacity-40"
            >
              Next
            </button>
          </nav>
        </>
      )}
    </div>
  );
}
