"use client";

import type { Me } from "@/lib/api";
import { downloadPaymentsExport, type Payment } from "@/lib/api";
import { can } from "@/lib/useMe";
import {
  CheckCircle,
  DownloadSimple,
  Eye,
  MagnifyingGlass,
  Paperclip,
  PencilSimple,
  WarningCircle,
  XCircle,
} from "@phosphor-icons/react";
import type { Dispatch, SetStateAction } from "react";
import { inputCls } from "@/components/FormField";
import { FILTERS, ReviewDecision, STATUS_STYLES } from "./payment-view";

type Props = {
  focusedPayment: string | null;
  setFocusedPayment: Dispatch<SetStateAction<string | null>>;
  setFilter: Dispatch<SetStateAction<string>>;
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
    dateTo?: string | undefined;
    dateFrom?: string | undefined;
    q?: string | undefined;
    status?: string | undefined;
  };
  setError: Dispatch<SetStateAction<string | null>>;
  loading: boolean;
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
  changePaymentPage: (next: number) => void;
  paymentPageSize: number;
  paymentHasNext: boolean;
};

export default function PaymentListPanel({
  focusedPayment,
  setFocusedPayment,
  setFilter,
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
  paymentCount,
  payments,
  setDetailsPayment,
  canVerify,
  setAdjustmentPayment,
  viewProof,
  openFinanceReview,
  canRecord,
  edit,
  changePaymentPage,
  paymentPageSize,
  paymentHasNext,
}: Props) {
  return (
    <div className="glass rounded-3xl p-5">
      {focusedPayment && (
        <div className="mb-4 flex items-center gap-3 rounded-xl bg-violet-100 px-4 py-2 text-sm text-violet-700">
          Viewing the linked payment{" "}
          <button
            type="button"
            onClick={() => {
              setFocusedPayment(null);

              setFilter("");

              resetPaymentPage();

              window.history.replaceState(null, "", "/system/payments");
            }}
            className="font-700 underline"
          >
            Show all payments
          </button>
        </div>
      )}
      <form
        className="payment-list-search mb-3 grid gap-2 md:grid-cols-[minmax(15rem,1fr)_9rem_9rem_auto]"
        onSubmit={(event) => {
          event.preventDefault();

          const term = paymentQuery.trim();

          if (focusedPayment) {
            setFocusedPayment(null);

            window.history.replaceState(null, "", "/system/payments");
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
          <input
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
          <input
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
                onClick={() => {
                  setFocusedPayment(null);

                  window.history.replaceState(null, "", "/system/payments");

                  setFilter(f.value);

                  resetPaymentPage();
                }}
                className={`rounded-full px-3.5 py-1.5 text-sm font-700 transition-colors ${
                  filter === f.value
                    ? "bg-blue text-white"
                    : "bg-white/60 text-ink-soft hover:bg-white"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
        {can(me, "REPORT_VIEW") && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                return downloadPaymentsExport(
                  paymentExportFilters,
                  "csv",
                ).catch((e) => {
                  return setError(
                    e instanceof Error ? e.message : "Export failed.",
                  );
                });
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/60 px-3.5 py-1.5 text-sm font-700 text-blue-ink hover:bg-white"
            >
              <DownloadSimple weight="bold" className="h-4 w-4" /> CSV
            </button>
            <button
              onClick={() => {
                return downloadPaymentsExport(
                  paymentExportFilters,
                  "xlsx",
                ).catch((e) => {
                  return setError(
                    e instanceof Error ? e.message : "Export failed.",
                  );
                });
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/60 px-3.5 py-1.5 text-sm font-700 text-blue-ink hover:bg-white"
            >
              <DownloadSimple weight="bold" className="h-4 w-4" /> Excel
            </button>
          </div>
        )}
      </div>
      <p className="mb-3 text-xs text-ink-soft">
        {loading
          ? "Loading matching payments…"
          : `${paymentCount} matching payment${paymentCount === 1 ? "" : "s"}.`}
        {
          " CSV and XLSX exports use the same search, status, and date filters and omit client identity and payment references."
        }
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-ink-soft">
            <tr className="border-b border-white/60">
              <th className="px-2 py-2">#</th>
              <th className="px-2 py-2">Client</th>
              <th className="px-2 py-2">Credit / claim</th>
              <th className="px-2 py-2">Method</th>
              <th className="px-2 py-2">Ref</th>
              <th className="px-2 py-2">Date</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-2 py-6 text-center text-ink-soft">
                  Loading…
                </td>
              </tr>
            ) : payments.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-2 py-6 text-center text-ink-soft">
                  {focusedPayment
                    ? "This payment is no longer available. Refresh or show all payments."
                    : "No payments."}
                </td>
              </tr>
            ) : (
              payments.map((p) => {
                return (
                  <tr key={p.id} className="border-b border-white/40">
                    <td className="px-2 py-2.5 font-600 text-blue-ink">
                      {String(p.id).slice(0, 8)}
                    </td>
                    <td className="px-2 py-2.5">{p.client_name ?? p.client}</td>
                    <td className="px-2 py-2.5 font-700 text-blue-ink">
                      ₱{p.amount}
                      {Boolean(p.adjustments?.length) && (
                        <small className="block text-xs font-500">
                          Adjusted · original ₱{p.original_amount}
                        </small>
                      )}
                    </td>
                    <td className="px-2 py-2.5 capitalize">{p.method}</td>
                    <td className="px-2 py-2.5 text-ink-soft">
                      {p.reference_no || "—"}
                      {p.duplicate_reference && (
                        <span
                          className="ml-1 inline-flex items-center gap-1 text-amber-700"
                          title="Possible duplicate for this client"
                        >
                          <WarningCircle weight="fill" /> Duplicate?
                        </span>
                      )}
                      {(p.receipt_time ||
                        p.receipt_name ||
                        p.receipt_phone) && (
                        <div className="mt-1 text-xs leading-5 text-ink-soft">
                          {p.receipt_time && (
                            <div>Receipt time: {p.receipt_time}</div>
                          )}
                          {p.receipt_name && (
                            <div>Receipt name: {p.receipt_name}</div>
                          )}
                          {p.receipt_phone && (
                            <div>Receipt number: {p.receipt_phone}</div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-2.5 text-ink-soft">
                      {p.payment_date}
                    </td>
                    <td className="px-2 py-2.5">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-700 ${STATUS_STYLES[p.status]}`}
                      >
                        {p.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-right">
                      <div className="inline-flex max-w-[410px] flex-wrap items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            return setDetailsPayment(p);
                          }}
                          className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full bg-white/70 px-2.5 py-1 text-xs font-700 text-blue hover:bg-white"
                        >
                          <Eye weight="bold" className="h-3.5 w-3.5" /> View
                          details
                        </button>
                        {canVerify && p.status === "verified" && (
                          <button
                            type="button"
                            onClick={() => {
                              return setAdjustmentPayment(p);
                            }}
                            className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-700 text-violet-700"
                          >
                            Adjust credit
                          </button>
                        )}
                        {p.proof_file && (
                          <button
                            type="button"
                            onClick={() => {
                              return viewProof(p.id);
                            }}
                            className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full bg-white/70 px-2.5 py-1 text-xs font-700 text-blue hover:bg-white"
                          >
                            <Paperclip weight="bold" className="h-3.5 w-3.5" />{" "}
                            Proof
                          </button>
                        )}
                        {p.status === "pending" && canVerify ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                return openFinanceReview(p);
                              }}
                              className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full bg-violet-100 px-2.5 py-1 text-xs font-700 text-violet-700 hover:bg-violet-200"
                            >
                              <PencilSimple
                                weight="bold"
                                className="h-3.5 w-3.5"
                              />{" "}
                              Review note
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                return openFinanceReview(p, "verified");
                              }}
                              className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-700 text-emerald-700 hover:bg-emerald-200"
                            >
                              <CheckCircle
                                weight="fill"
                                className="h-3.5 w-3.5"
                              />{" "}
                              Verify
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                return openFinanceReview(p, "rejected");
                              }}
                              className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full bg-rose-100 px-2.5 py-1 text-xs font-700 text-rose-700 hover:bg-rose-200"
                            >
                              <XCircle weight="fill" className="h-3.5 w-3.5" />{" "}
                              Reject
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                return openFinanceReview(
                                  p,
                                  "needs_clarification",
                                );
                              }}
                              className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full bg-violet-100 px-2.5 py-1 text-xs font-700 text-violet-700 hover:bg-violet-200"
                            >
                              <WarningCircle
                                weight="fill"
                                className="h-3.5 w-3.5"
                              />{" "}
                              Clarify
                            </button>
                          </>
                        ) : (
                          !p.proof_file && (
                            <span className="text-xs text-ink-soft">—</span>
                          )
                        )}
                        {canRecord &&
                          ["pending", "needs_clarification"].includes(
                            p.status,
                          ) && (
                            <button
                              type="button"
                              onClick={() => {
                                return edit(p);
                              }}
                              className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full bg-white/70 px-2.5 py-1 text-xs font-700 text-blue hover:bg-white"
                            >
                              <PencilSimple
                                weight="bold"
                                className="h-3.5 w-3.5"
                              />{" "}
                              Edit
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <nav
        className="mt-4 flex items-center justify-between gap-3"
        aria-label="Payment pages"
      >
        <button
          type="button"
          disabled={loading || paymentPage === 1}
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
          disabled={loading || !paymentHasNext}
          onClick={() => {
            return changePaymentPage(paymentPage + 1);
          }}
          className="rounded-xl border border-white/70 bg-white/60 px-3 py-2 text-xs font-700 text-blue-ink disabled:opacity-40"
        >
          Next
        </button>
      </nav>
    </div>
  );
}
