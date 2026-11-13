"use client";

import { useState } from "react";
import { HandlerAccountDocument } from "@/app/system/_role-designs/finance_officer/components/HandlerAccountDocument";
import type { Payment, Me } from "@/lib/api";
import { formatPeso } from "@/lib/currency";
import type { PaymentSortField } from "@freshphones/contracts";
import type { HandlerTableSort } from "@/lib/handler-table";
import HandlerDataTable, {
  HandlerTableText,
  HandlerRowActions,
  type HandlerTableColumn,
} from "@/app/system/_role-designs/finance_officer/components/handler-table/HandlerDataTable";
import { Eye, Paperclip, PencilSimple, FileText } from "@phosphor-icons/react";
import styles from "@/app/system/_role-designs/finance_officer/components/handler-table/handler-data-table.module.css";
import proofStyles from "@/app/system/_role-designs/finance_officer/app/system/payments/handler-payment-proof.module.css";

export default function HandlerPaymentTable({
  payments,
  loading,
  error,
  me,
  canRecord,
  focusedPayment,
  sort,
  onSort,
  onResetSort,
  onRetry,
  onDetails,
  onProof,
  onEdit,
  onAttachProof,
}: {
  payments: Payment[];
  loading: boolean;
  error: string | null;
  me: Me;
  canRecord: boolean;
  focusedPayment: string | null;
  sort: HandlerTableSort<PaymentSortField>;
  onSort: (key: PaymentSortField) => void;
  onResetSort: () => void;
  onRetry: () => void;
  onDetails: (payment: Payment) => void;
  onProof: (id: string | number) => Promise<void>;
  onEdit: (payment: Payment) => void;
  onAttachProof: (payment: Payment) => void;
}) {
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const columns: HandlerTableColumn<Payment, PaymentSortField>[] = [
    {
      id: "client",
      label: "Client",
      width: 240,
      pin: "primary",
      sortKey: "clientName",
      render: (p) => {
        return <HandlerTableText value={p.client_name || String(p.client)} />;
      },
    },
    {
      id: "id",
      label: "Payment",
      width: 136,
      pin: "secondary",
      render: (p) => {
        return <HandlerTableText value={String(p.id)} />;
      },
    },
    {
      id: "amount",
      label: "Credit / claim",
      width: 176,
      numeric: true,
      render: (p) => {
        return (
          <>
            {formatPeso(p.amount)}
            {Boolean(p.adjustments?.length) && (
              <span className={styles.original}>
                Adjusted · original{" "}
                {p.original_amount == null
                  ? "—"
                  : formatPeso(p.original_amount)}
              </span>
            )}
          </>
        );
      },
    },
    {
      id: "method",
      label: "Method",
      width: 112,
      render: (p) => {
        return <HandlerTableText value={p.method} />;
      },
    },
    {
      id: "proof",
      label: "Proof",
      width: 120,
      render: (p) => {
        return (
          <span
            className={proofStyles.badge}
            data-proof={p.proof_file ? "attached" : "missing"}
          >
            {p.proof_file ? "With proof" : "No proof"}
          </span>
        );
      },
    },
    {
      id: "reference",
      label: "Reference / receipt",
      width: 344,
      render: (p) => {
        return (
          <div className={styles.receipt}>
            {p.duplicate_reference && (
              <span className={styles.warning}>Duplicate?</span>
            )}
            <HandlerTableText
              value={[
                p.reference_no || "—",
                p.receipt_time && `Receipt time: ${p.receipt_time}`,
                p.receipt_name && `Receipt name: ${p.receipt_name}`,
                p.receipt_phone && `Receipt number: ${p.receipt_phone}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            />
          </div>
        );
      },
    },
    {
      id: "date",
      label: "Date",
      width: 128,
      sortKey: "paymentDate",
      render: (p) => {
        return <HandlerTableText value={p.payment_date} />;
      },
    },
    {
      id: "status",
      label: "Status",
      width: 248,
      render: (p) => {
        const stage =
          p.status !== "pending"
            ? ""
            : !p.workflow
              ? "Review status unavailable"
              : !p.workflow.recordsApproved
                ? "Awaiting Records"
                : !p.workflow.managerApproved
                  ? "Awaiting Manager"
                  : "Ready for Finance";

        return (
          <span className={styles.badge} data-status={p.status}>
            <HandlerTableText
              value={[
                p.status === "needs_clarification"
                  ? "Needs clarification"
                  : p.status[0].toUpperCase() + p.status.slice(1),
                stage,
              ]
                .filter(Boolean)
                .join(" · ")}
            />
          </span>
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
          <HandlerRowActions label={`payment ${String(p.id).slice(0, 8)}`}>
            <button
              type="button"
              onClick={() => {
                return onDetails(p);
              }}
            >
              <Eye aria-hidden="true" /> View details
            </button>
            {p.status === "verified" && (
              <button
                type="button"
                onClick={() => {
                  return setConfirmation(String(p.id));
                }}
              >
                <FileText aria-hidden="true" />
                Payment confirmation
              </button>
            )}
            {p.proof_file && (
              <button
                type="button"
                onClick={() => {
                  return void onProof(p.id);
                }}
              >
                <Paperclip aria-hidden="true" /> View proof
              </button>
            )}
            {canRecord &&
              ["pending", "needs_clarification"].includes(p.status) && (
                <>
                  {!p.proof_file && (
                    <button
                      type="button"
                      data-payment-proof-trigger={String(p.id)}
                      onClick={() => {
                        onAttachProof(p);
                      }}
                    >
                      <Paperclip aria-hidden="true" /> Attach proof
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      return onEdit(p);
                    }}
                  >
                    <PencilSimple aria-hidden="true" /> Edit claim
                  </button>
                </>
              )}
          </HandlerRowActions>
        );
      },
    },
  ];

  return (
    <>
      {confirmation && (
        <HandlerAccountDocument
          key={confirmation}
          target={{ kind: "confirmation", id: confirmation }}
          onClose={() => {
            return setConfirmation(null);
          }}
        />
      )}
      <HandlerDataTable
        key={me.id}
        id="payments"
        userId={String(me.id)}
        label="Payment records"
        caption="Assigned payment claims and credits. Client and Date sort all matching records. Proof shows whether a receipt is attached. Adjusted amounts retain their original values. Row actions open details, receipt proof or an eligible claim for editing."
        rows={payments}
        rowId={(p) => {
          return p.id;
        }}
        columns={columns}
        loading={loading}
        error={error}
        empty={
          focusedPayment
            ? "This payment is no longer available. Search or show all payments."
            : "No assigned payments match these filters."
        }
        sort={sort}
        onSort={onSort}
        onResetSort={onResetSort}
        onRetry={onRetry}
      />
    </>
  );
}
