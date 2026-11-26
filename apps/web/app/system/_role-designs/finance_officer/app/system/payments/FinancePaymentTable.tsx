"use client";

import type { Me, Payment } from "@/lib/api";
import type { AccountDocumentTarget } from "@/lib/account-documents";
import type { PaymentSortField } from "@freshphones/contracts";
import type { HandlerTableSort } from "@/lib/handler-table";
import { financePaymentStage } from "@/lib/finance-workspace";
import { formatPeso } from "@/lib/currency";
import { CheckCircle, WarningCircle } from "@phosphor-icons/react";
import FinanceDataTable, {
  HandlerTableText as TableText,
  HandlerRowActions as RowActions,
  type HandlerTableColumn,
} from "@/app/system/_role-designs/finance_officer/components/handler-table/HandlerDataTable";
import layout from "./finance-payments.module.css";

const stageTones: Record<string, string> = {
  "Finance verified": "success",
  Rejected: "danger",
  "Needs clarification": "warning",
  "Waiting for Records / proof": "warning",
  "Waiting for assigned Manager": "warning",
  "Waiting for submission evidence": "warning",
  "Ready for Finance": "info",
};

export default function FinancePaymentTable({
  payments,
  loading,
  me,
  sort,
  onSort,
  onResetSort,
  onRetry,
  onDetails,
  onReview,
  onAdjustment,
  canReview,
  onDocument,
}: {
  payments: Payment[];
  loading: boolean;
  me: Me;
  sort: HandlerTableSort<PaymentSortField>;
  onSort: (key: PaymentSortField) => void;
  onResetSort: () => void;
  onRetry: () => void;
  onDetails: (payment: Payment) => void;
  onReview: (payment: Payment) => void;
  onAdjustment: (payment: Payment) => void;
  canReview: boolean;
  onDocument: (target: AccountDocumentTarget) => void;
}) {
  const columns: HandlerTableColumn<Payment, PaymentSortField>[] = [
    {
      id: "client",
      label: "Member / batch",
      width: 220,
      pin: "primary",
      sortKey: "clientName",
      render: (p) => (
        <div className={layout.stacked}>
          <TableText value={p.client_name || String(p.client)} />
          <small>
            <TableText value={p.batch_code || String(p.batch)} />
          </small>
        </div>
      ),
    },
    {
      id: "amount",
      label: "Credit / claim",
      width: 125,
      numeric: true,
      render: (p) => (
        <div className={layout.stacked}>
          {formatPeso(p.amount)}
          {Boolean(p.adjustments?.length) && (
            <small>
              Adjusted · original {formatPeso(p.original_amount ?? p.amount)}
            </small>
          )}
        </div>
      ),
    },
    {
      id: "reference",
      label: "Reference / proof",
      width: 190,
      render: (p) => (
        <div className={layout.stacked}>
          {p.duplicate_reference && (
            <span className={layout.signal} data-tone="warning">
              <WarningCircle aria-hidden="true" />
              Duplicate?
            </span>
          )}
          <TableText value={p.reference_no} />
          <small className={layout.proofLine}>
            <span>{p.method} ·</span>
            <span
              className={layout.signal}
              data-tone={p.proof_file ? "success" : "danger"}
            >
              {p.proof_file ? (
                <CheckCircle aria-hidden="true" />
              ) : (
                <WarningCircle aria-hidden="true" />
              )}
              {p.proof_file ? "Proof attached" : "Proof missing"}
            </span>
          </small>
        </div>
      ),
    },
    {
      id: "stage",
      label: "Review stage",
      width: 190,
      render: (p) => (
        <span
          className={`${layout.signal} ${layout.stage}`}
          data-tone={stageTones[financePaymentStage(p)] ?? "neutral"}
        >
          <span className={layout.signalDot} aria-hidden="true" />
          <TableText value={financePaymentStage(p)} />
        </span>
      ),
    },
    {
      id: "date",
      label: "Payment date",
      width: 125,
      sortKey: "paymentDate",
      render: (p) => <TableText value={p.payment_date} />,
    },
    {
      id: "actions",
      label: "Actions",
      width: 140,
      render: (p) => {
        return (
          <div className={layout.rowActions}>
            <button
              type="button"
              className={layout.reviewAction}
              data-finance-review-trigger
              aria-label={`${financePaymentStage(p) === "Ready for Finance" ? "Review" : "Open"} payment ${String(p.id).slice(0, 8)}`}
              onClick={() => onReview(p)}
              disabled={!canReview}
            >
              {financePaymentStage(p) === "Ready for Finance"
                ? "Review"
                : "Open"}
            </button>
            <RowActions label={`payment ${String(p.id).slice(0, 8)}`}>
              <button
                type="button"
                onClick={() => {
                  return onDocument({
                    kind: "statement",
                    id: String(p.client),
                  });
                }}
              >
                Statement of Account
              </button>
              {p.status === "verified" && (
                <button
                  type="button"
                  onClick={() => {
                    return onDocument({
                      kind: "confirmation",
                      id: String(p.id),
                    });
                  }}
                >
                  Payment Confirmation
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  return onDetails(p);
                }}
              >
                View transaction
              </button>
              <button
                type="button"
                onClick={() => {
                  return onReview(p);
                }}
              >
                Open review workspace
              </button>
              {canReview &&
                p.status === "verified" &&
                p.workflow?.membershipOpen === true && (
                  <button
                    type="button"
                    onClick={() => {
                      return onAdjustment(p);
                    }}
                  >
                    Adjust verified credit
                  </button>
                )}
            </RowActions>
          </div>
        );
      },
    },
  ];

  return (
    <div className={layout.tablePanel}>
      <FinanceDataTable
        id="finance-payments"
        userId={String(me.id)}
        label="Finance payments"
        caption="Payment claims and effective verified credit. Member and payment date headers sort all matching records. Recorded timestamps remain in transaction details. Amounts include adjustments and are not sortable."
        rows={payments}
        rowId={(p) => {
          return p.id;
        }}
        columns={columns}
        loading={loading}
        empty="No matching payments. Change the queue or filters to continue."
        sort={sort}
        onSort={onSort}
        onResetSort={onResetSort}
        onRetry={onRetry}
      />
    </div>
  );
}
