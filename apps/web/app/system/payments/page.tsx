"use client";

import { usePaymentsWorkspace } from "./usePaymentsWorkspace";
import {
  CheckCircle,
  Receipt,
  Wallet,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { Suspense } from "react";
import { PaymentResultDetails } from "@/components/PaymentResultDetails";
import { ClientPicker } from "./ClientPicker";
import FinanceReviewDialog from "./FinanceReviewDialog";
import PaymentAdjustmentDialog from "./PaymentAdjustmentDialog";
import PaymentDetailsDialog from "./PaymentDetailsDialog";
import PaymentListPanel from "./PaymentListPanel";
import ReceiptViewerDialog from "./ReceiptViewerDialog";
import RecordPaymentForm from "./RecordPaymentForm";
import { PaymentLocationSync, Row } from "./payment-view";

export default function PaymentsPage() {
  const {
    recordPaymentFormProps,
    receiptViewerDialogProps,
    financeReviewDialogProps,
    paymentDetailsDialogProps,
    paymentListPanelProps,
    me,
    canRead,
    openLocation,
    canRecord,
    canVerify,
    adjustmentPayment,
    setAdjustmentPayment,
    load,
    setDetailsPayment,
    setBalance,
    setPayments,
    flash,
    error,
    notice,
    setError,
    setNotice,
    balanceClientChoice,
    setBalanceClientChoice,
    setBalanceClient,
    lookupBalance,
    balanceClient,
    balance,
  } = usePaymentsWorkspace();

  if (me && !canRead) {
    return (
      <section className="glass rounded-3xl p-10 text-center">
        <h1 className="font-display text-xl font-700 text-blue-ink">
          No access
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          Your role doesn&apos;t have access to Payments &amp; Finance.
        </p>
      </section>
    );
  }

  return (
    <>
      <Suspense fallback={null}>
        <PaymentLocationSync onLocation={openLocation} />
      </Suspense>
      <Suspense fallback={null}>
        <PaymentResultDetails enabled={canRead && canRecord} />
      </Suspense>
      {canVerify && adjustmentPayment && (
        <PaymentAdjustmentDialog
          key={String(adjustmentPayment.id)}
          payment={adjustmentPayment}
          onClose={() => {
            return setAdjustmentPayment(null);
          }}
          onRefresh={() => {
            setAdjustmentPayment(null);

            void load();
          }}
          onSuccess={(updated) => {
            setAdjustmentPayment(null);

            setDetailsPayment(null);

            setBalance(null);

            setPayments((rows) => {
              return rows.map((row) => {
                return row.id === updated.id ? updated : row;
              });
            });

            flash(
              "Finance adjustment saved. The original payment is preserved.",
            );

            void load();
          }}
        />
      )}
      <header className="glass mb-4 flex items-center gap-3 rounded-3xl px-5 py-3.5">
        <span className="grid h-10 w-10 place-items-center rounded-2xl chrome">
          <Receipt weight="fill" className="h-5 w-5 text-blue" />
        </span>
        <div>
          <h1 className="font-display text-lg font-700 tracking-tight text-blue-ink">
            Payments &amp; Finance
          </h1>
          <p className="text-xs text-ink-soft">
            Record external payments · Finance verifies · only verified moves
            the balance
          </p>
        </div>
      </header>

      {(error || notice) && (
        <div className="payment-toast-region">
          <div
            key={error ?? notice}
            className={`payment-toast ${error ? "is-error" : "is-success"}`}
            role={error ? "alert" : "status"}
          >
            <span className="payment-toast-icon" aria-hidden="true">
              {error ? (
                <WarningCircle weight="fill" />
              ) : (
                <CheckCircle weight="fill" />
              )}
            </span>
            <div className="payment-toast-copy">
              <strong>{error ? "Action needed" : "Updated"}</strong>
              <p>{error ?? notice}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                return error ? setError(null) : setNotice(null);
              }}
              aria-label="Dismiss message"
              className="payment-toast-close"
            >
              <X weight="bold" />
            </button>
          </div>
        </div>
      )}

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        {/* Record form */}
        {canRecord && <RecordPaymentForm {...recordPaymentFormProps} />}

        {/* Balance lookup */}
        <div className="glass rounded-3xl p-5">
          <h2 className="mb-3 flex items-center gap-2 font-display font-700 text-blue-ink">
            <Wallet weight="fill" className="h-4 w-4" /> Balance lookup
          </h2>
          <div className="flex gap-2">
            <ClientPicker
              label="Balance client"
              selected={balanceClientChoice}
              onSelect={(client) => {
                setBalanceClientChoice(client);

                setBalanceClient(client ? String(client.id) : "");

                setBalance(null);
              }}
            />
            <button
              onClick={lookupBalance}
              disabled={!balanceClient}
              className="balance-check-button shrink-0 rounded-2xl px-4 py-2 text-sm font-700 disabled:opacity-50"
            >
              Check
            </button>
          </div>
          {balance && (
            <dl className="mt-4 space-y-1.5 text-sm">
              <Row k="Total due" v={`₱${balance.total_due}`} />
              <Row k="Verified paid" v={`₱${balance.verified_paid}`} strong />
              <Row k="Remaining" v={`₱${balance.remaining_balance}`} strong />
              {balance.pending_amount && (
                <Row
                  k="Awaiting verification"
                  v={`₱${balance.pending_amount}`}
                />
              )}
              {balance.overpaid && balance.overpaid !== "0.00" && (
                <Row k="Overpayment" v={`₱${balance.overpaid}`} strong />
              )}
            </dl>
          )}
        </div>
      </div>

      <ReceiptViewerDialog {...receiptViewerDialogProps} />

      <FinanceReviewDialog {...financeReviewDialogProps} />

      <PaymentDetailsDialog {...paymentDetailsDialogProps} />

      {/* List */}
      <PaymentListPanel {...paymentListPanelProps} />

      <p className="mt-3 text-center text-xs text-ink-soft">
        Verify is Finance-only — a non-Finance account gets a 403 (enforced
        server-side).
      </p>
    </>
  );
}
