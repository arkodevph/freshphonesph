"use client";

import { useEffect, useState } from "react";
import { useSpringDialog } from "@/lib/useSpringDialog";
import ModalCloseButton from "@/app/system/_role-designs/finance_officer/components/ModalCloseButton";
import { type Payment } from "@/lib/api";
import PaymentTransactionSummary from "@/app/system/_role-designs/finance_officer/app/system/payments/PaymentTransactionSummary";
import { Paperclip, X } from "@phosphor-icons/react";
import type { Dispatch, RefObject, SetStateAction } from "react";
import { AdjustmentHistory } from "@/app/system/_role-designs/finance_officer/app/system/payments/PaymentAdjustmentDialog";
import { formatTimestamp } from "@/app/system/_role-designs/finance_officer/app/system/payments/payment-view";

type Props = {
  detailsDialog: RefObject<HTMLDialogElement | null>;
  setDetailsPayment: Dispatch<SetStateAction<Payment | null>>;
  detailsPayment: Payment | null;
  viewProof: (id: string | number) => Promise<void>;
  onAttachProof?: (payment: Payment) => void;
};

export default function PaymentDetailsDialog({
  detailsDialog,
  setDetailsPayment,
  detailsPayment,
  viewProof,
  onAttachProof,
}: Props) {
  const [closing, setClosing] = useState(false);

  useSpringDialog(
    detailsDialog,
    Boolean(detailsPayment) && !closing,
    finishClose,
  );

  useEffect(() => {
    setClosing(false);
  }, [detailsPayment?.id]);

  function finishClose() {
    if (!detailsDialog.current?.open) {
      setDetailsPayment(null);

      setClosing(false);
    }
  }

  function close() {
    setClosing(true);
  }

  return (
    <dialog
      data-workspace-modal
      data-modal-framed
      data-modal-size="wide"
      ref={detailsDialog}
      className="finance-review-dialog payment-details-dialog"
      aria-labelledby="payment-details-title"
      onClose={finishClose}
      onCancel={(event) => {
        event.preventDefault();

        close();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          close();
        }
      }}
    >
      {detailsPayment && (
        <div className="payment-details-shell">
          <header data-modal-header className="finance-review-heading">
            <div>
              <p>Payment record</p>
              <h2 id="payment-details-title">Transaction details</h2>
            </div>
            <ModalCloseButton
              onClick={() => {
                return close();
              }}
            />
          </header>
          <div className="payment-details-body">
            <PaymentTransactionSummary payment={detailsPayment} />
            {onAttachProof && (
              <section aria-label="Receipt proof">
                <h3>Receipt proof</h3>
                <p>
                  {detailsPayment.proof_file
                    ? "Receipt attached."
                    : "Receipt not attached."}
                </p>
                {!detailsPayment.proof_file &&
                  ["pending", "needs_clarification"].includes(
                    detailsPayment.status,
                  ) && (
                    <>
                      <p>Attach proof before approval can continue.</p>
                      <button
                        type="button"
                        data-payment-proof-trigger={String(detailsPayment.id)}
                        onClick={() => {
                          onAttachProof(detailsPayment);
                        }}
                      >
                        Attach proof
                      </button>
                    </>
                  )}
              </section>
            )}
            {detailsPayment.workflow && (
              <section aria-label="Operational review history">
                <h3>Operational review history</h3>
                <p>
                  Evidence revision {detailsPayment.workflow.evidenceVersion} ·
                  Records{" "}
                  {detailsPayment.workflow.recordsApproved
                    ? "approved"
                    : "pending"}{" "}
                  · Manager{" "}
                  {detailsPayment.workflow.managerApproved
                    ? "approved"
                    : "pending"}
                </p>
                {detailsPayment.workflow.history.map((review) => {
                  return (
                    <div key={review.id} className="mt-3">
                      <p>
                        {review.stage} · {review.decision} · revision{" "}
                        {review.evidenceVersion}
                      </p>
                      <p>
                        {review.reviewer.name} ·{" "}
                        {formatTimestamp(review.createdAt)}
                      </p>
                      <p>{review.notes}</p>
                    </div>
                  );
                })}
              </section>
            )}

            <AdjustmentHistory payment={detailsPayment} />
            <section aria-label="Finance review">
              <h3>Finance review</h3>
              <dl className="payment-details-grid">
                <div>
                  <dt>Reviewed by</dt>
                  <dd>
                    {detailsPayment.verifier_name ||
                      (detailsPayment.verified_by
                        ? "Finance staff"
                        : "Not reviewed yet")}
                  </dd>
                </div>
                <div>
                  <dt>Reviewed at</dt>
                  <dd>
                    {detailsPayment.status === "pending"
                      ? "—"
                      : formatTimestamp(
                          detailsPayment.verified_at ??
                            detailsPayment.updated_at,
                        )}
                  </dd>
                </div>
              </dl>
              <div className="payment-details-note">
                <strong>Review notes</strong>
                <p>
                  {detailsPayment.verification_notes ||
                    (detailsPayment.status !== "pending"
                      ? detailsPayment.notes
                      : null) ||
                    "No Finance review note yet."}
                </p>
              </div>
            </section>
            {(detailsPayment.receipt_time ||
              detailsPayment.receipt_name ||
              detailsPayment.receipt_phone) && (
              <section aria-label="Receipt details">
                <h3>Receipt details</h3>
                <dl className="payment-details-grid">
                  <div>
                    <dt>Time on receipt</dt>
                    <dd>{detailsPayment.receipt_time || "—"}</dd>
                  </div>
                  <div>
                    <dt>Name on receipt</dt>
                    <dd>{detailsPayment.receipt_name || "—"}</dd>
                  </div>
                  <div>
                    <dt>Number on receipt</dt>
                    <dd>{detailsPayment.receipt_phone || "—"}</dd>
                  </div>
                </dl>
              </section>
            )}
            <section aria-label="Record history">
              <h3>Record history</h3>
              <dl className="payment-details-grid">
                <div>
                  <dt>Payment ID</dt>
                  <dd className="payment-record-id">{detailsPayment.id}</dd>
                </div>
                <div>
                  <dt>Recorded by</dt>
                  <dd>{detailsPayment.recorded_by_name || "—"}</dd>
                </div>
                <div>
                  <dt>Recorded at</dt>
                  <dd>{formatTimestamp(detailsPayment.created_at)}</dd>
                </div>
                <div>
                  <dt>Last updated</dt>
                  <dd>{formatTimestamp(detailsPayment.updated_at)}</dd>
                </div>
              </dl>
              {detailsPayment.notes && (
                <div className="payment-details-note">
                  <strong>Recording note</strong>
                  <p>{detailsPayment.notes}</p>
                </div>
              )}
            </section>
          </div>
          <footer className="finance-review-actions">
            {detailsPayment.proof_file && (
              <button
                type="button"
                onClick={() => {
                  return viewProof(detailsPayment.id);
                }}
              >
                <Paperclip weight="bold" aria-hidden="true" /> View proof
              </button>
            )}
          </footer>
        </div>
      )}
    </dialog>
  );
}
