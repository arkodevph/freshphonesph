"use client";

import type { Me, Payment } from "@/lib/api";
import type { AccountDocumentTarget } from "@/lib/account-documents";
import type { PaymentSortField } from "@freshphones/contracts";
import type { HandlerTableSort } from "@/lib/handler-table";
import { financePaymentStage } from "@/lib/finance-workspace";
import { formatPeso } from "@/lib/currency";
import FinanceDataTable, {
  HandlerTableText as TableText,
  HandlerRowActions as RowActions,
  type HandlerTableColumn,
} from "@/app/system/_role-designs/finance_officer/components/handler-table/HandlerDataTable";
import styles from "@/app/system/_role-designs/finance_officer/components/handler-table/handler-data-table.module.css";

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
      label: "Member",
      width: 240,
      pin: "primary",
      sortKey: "clientName",
      render: (p) => {
        return <TableText value={p.client_name || String(p.client)} />;
      },
    },
    {
      id: "batch",
      label: "Member batch",
      width: 170,
      pin: "secondary",
      render: (p) => {
        return <TableText value={p.batch_code || String(p.batch)} />;
      },
    },
    {
      id: "amount",
      label: "Credit / claim",
      width: 190,
      numeric: true,
      render: (p) => {
        return (
          <>
            {formatPeso(p.amount)}
            {Boolean(p.adjustments?.length) && (
              <span className={styles.original}>
                Adjusted · original {formatPeso(p.original_amount ?? p.amount)}
              </span>
            )}
          </>
        );
      },
    },
    {
      id: "method",
      label: "Method",
      width: 110,
      render: (p) => {
        return <TableText value={p.method} />;
      },
    },
    {
      id: "reference",
      label: "Reference",
      width: 270,
      render: (p) => {
        return (
          <div className={styles.receipt}>
            {p.duplicate_reference && (
              <span className={styles.warning}>Duplicate?</span>
            )}
            <TableText value={p.reference_no} />
          </div>
        );
      },
    },
    {
      id: "proof",
      label: "Proof",
      width: 120,
      render: (p) => {
        return (
          <span className={styles.badge}>
            {p.proof_file ? "Attached" : "Missing"}
          </span>
        );
      },
    },
    {
      id: "date",
      label: "Payment date",
      width: 148,
      sortKey: "paymentDate",
      render: (p) => {
        return <TableText value={p.payment_date} />;
      },
    },
    {
      id: "stage",
      label: "Review stage",
      width: 290,
      render: (p) => {
        return (
          <span className={styles.badge} data-status={p.status}>
            <TableText value={financePaymentStage(p)} />
          </span>
        );
      },
    },
    {
      id: "recorded",
      label: "Recorded",
      width: 148,
      sortKey: "createdAt",
      render: (p) => {
        return (
          <TableText
            value={
              p.created_at
                ? new Date(p.created_at).toLocaleDateString("en-PH", {
                    timeZone: "Asia/Manila",
                  })
                : null
            }
          />
        );
      },
    },
    {
      id: "actions",
      label: "Actions",
      width: 56,
      actions: true,
      render: (p) => {
        return (
          <RowActions label={`payment ${String(p.id).slice(0, 8)}`}>
            <button
              type="button"
              onClick={() => {
                return onDocument({ kind: "statement", id: String(p.client) });
              }}
            >
              Statement of Account
            </button>
            {p.status === "verified" && (
              <button
                type="button"
                onClick={() => {
                  return onDocument({ kind: "confirmation", id: String(p.id) });
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
        );
      },
    },
  ];

  return (
    <FinanceDataTable
      id="finance-payments"
      userId={String(me.id)}
      label="Finance payments"
      caption="Payment claims and effective verified credit. Member, payment date and recorded headers sort all matching records. Amounts include adjustments and are not sortable."
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
  );
}
