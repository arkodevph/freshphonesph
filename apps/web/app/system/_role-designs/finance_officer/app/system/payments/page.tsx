"use client";

import { isBatchHandler } from "@/lib/handler-workspace";
import {
  HandlerReceiptDialogs,
  PaymentReceiptNotice,
} from "@/app/system/_role-designs/finance_officer/app/system/payments/HandlerReceiptDialogs";
import { usePaymentsWorkspace } from "@/app/system/payments/usePaymentsWorkspace";
import SubmissionChecklist from "@/app/system/_role-designs/finance_officer/app/system/payments/SubmissionChecklist";
import { CheckCircle, Wallet, WarningCircle, X } from "@phosphor-icons/react";
import styles from "./finance-payments.module.css";
import WorkspaceDetails from "@/app/system/_role-designs/finance_officer/components/WorkspaceDetails";
import { Suspense, useState } from "react";
import type { AccountDocumentTarget } from "@/lib/account-documents";
import { HandlerAccountDocument as FinanceAccountDocument } from "@/app/system/_role-designs/finance_officer/components/HandlerAccountDocument";
import { PaymentReviewDetails } from "@/app/system/_role-designs/finance_officer/components/PaymentReviewDetails";
import { PaymentResultDetails } from "@/app/system/_role-designs/finance_officer/components/PaymentResultDetails";
import { ClientPicker } from "@/app/system/_role-designs/finance_officer/app/system/payments/ClientPicker";
import FinanceReviewDialog from "@/app/system/_role-designs/finance_officer/app/system/payments/FinanceReviewDialog";
import PaymentAdjustmentDialog from "@/app/system/_role-designs/finance_officer/app/system/payments/PaymentAdjustmentDialog";
import PaymentDetailsDialog from "@/app/system/_role-designs/finance_officer/app/system/payments/PaymentDetailsDialog";
import PaymentListPanel from "@/app/system/_role-designs/finance_officer/app/system/payments/PaymentListPanel";
import ReceiptViewerDialog from "@/app/system/_role-designs/finance_officer/app/system/payments/ReceiptViewerDialog";
import RecordPaymentForm from "@/app/system/_role-designs/finance_officer/app/system/payments/RecordPaymentForm";
import {
  PaymentLocationSync,
  Row,
} from "@/app/system/_role-designs/finance_officer/app/system/payments/payment-view";

export default function PaymentsPage() {
  const [documentTarget, setDocumentTarget] =
    useState<AccountDocumentTarget | null>(null);

  const {
    recordPaymentFormProps,
    receiptViewerDialogProps,
    financeReviewDialogProps,
    paymentDetailsDialogProps,
    paymentListPanelProps,
    me,
    receiptFlow,
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
  } = usePaymentsWorkspace({ financeQueues: true });

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
      {documentTarget && canRead && (
        <FinanceAccountDocument
          key={`${documentTarget.kind}:${documentTarget.id}`}
          target={documentTarget}
          onClose={() => {
            return setDocumentTarget(null);
          }}
        />
      )}
      <Suspense fallback={null}>
        <PaymentLocationSync onLocation={openLocation} />
      </Suspense>
      <Suspense fallback={null}>
        <PaymentResultDetails enabled={canRead && canRecord} />
        <PaymentReviewDetails enabled={canRead && isBatchHandler(me?.role)} />
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
      <HandlerReceiptDialogs flow={receiptFlow} />
      {isBatchHandler(me?.role) && <PaymentReceiptNotice flow={receiptFlow} />}
      <PaymentListPanel
        {...paymentListPanelProps}
        onDocument={setDocumentTarget}
      />

      <div className={styles.supportTools}>
        <div>
          <SubmissionChecklist enabled={Boolean(me && canRead)} />
        </div>
        <div className={canRecord ? "grid gap-4" : undefined}>
          {/* Record form */}
          {canRecord && <RecordPaymentForm {...recordPaymentFormProps} />}

          {/* Balance lookup */}
          <WorkspaceDetails className="glass rounded-3xl p-5">
            <summary>Balance lookup</summary>
            <div className="mt-4">
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
              <button
                type="button"
                className="mt-3 min-h-11 underline"
                disabled={!balanceClient}
                onClick={() => {
                  return setDocumentTarget({
                    kind: "statement",
                    id: balanceClient,
                  });
                }}
              >
                Statement of Account for selected member
              </button>
              {balance && (
                <dl className="mt-4 space-y-1.5 text-sm">
                  <Row k="Total due" v={`₱${balance.total_due}`} />
                  <Row
                    k="Verified paid"
                    v={`₱${balance.verified_paid}`}
                    strong
                  />
                  <Row
                    k="Remaining"
                    v={`₱${balance.remaining_balance}`}
                    strong
                  />
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
          </WorkspaceDetails>
        </div>
      </div>

      <ReceiptViewerDialog {...receiptViewerDialogProps} />

      <FinanceReviewDialog {...financeReviewDialogProps} />

      <PaymentDetailsDialog {...paymentDetailsDialogProps} />

      <p className="mt-3 text-center text-xs text-ink-soft">
        Payments are made externally. Only Finance-verified credit updates the
        member’s balance.
      </p>
    </>
  );
}
