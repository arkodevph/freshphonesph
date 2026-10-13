"use client";

import { type Payment } from "@/lib/api";
import { Paperclip, X } from "@phosphor-icons/react";
import type { Dispatch, RefObject, SetStateAction } from "react";
import { AdjustmentHistory } from "./PaymentAdjustmentDialog";
import { formatTimestamp, STATUS_STYLES } from "./payment-view";

type Props = {
  detailsDialog: RefObject<HTMLDialogElement | null>;
  setDetailsPayment: Dispatch<SetStateAction<Payment | null>>;
  detailsPayment: Payment | null;
  viewProof: (id: string | number) => Promise<void>;
};

export default function PaymentDetailsDialog({
  detailsDialog,
  setDetailsPayment,
  detailsPayment,
  viewProof,
}: Props) {
  return (
    <dialog
      ref={detailsDialog}
      className="finance-review-dialog payment-details-dialog"
      aria-labelledby="payment-details-title"
      onClose={() => {
        return setDetailsPayment(null);
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          detailsDialog.current?.close();
        }
      }}
    >
      {detailsPayment && (
        <div className="payment-details-shell">
          <header className="finance-review-heading">
            <div>
              <p>Payment record</p>
              <h2 id="payment-details-title">Transaction details</h2>
            </div>
            <button
              type="button"
              onClick={() => {
                return detailsDialog.current?.close();
              }}
              aria-label="Close transaction details"
            >
              <X weight="bold" />
            </button>
          </header>
          <div className="payment-details-body">
            <section aria-label="Transaction">
              <h3>Transaction</h3>
              <dl className="payment-details-grid">
                <div>
                  <dt>Status</dt>
                  <dd>
                    <span
                      className={`payment-details-status ${STATUS_STYLES[detailsPayment.status]}`}
                    >
                      {detailsPayment.status.replaceAll("_", " ")}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt>
                    {detailsPayment.status === "verified"
                      ? "Current credit"
                      : "Amount"}
                  </dt>
                  <dd>₱{detailsPayment.amount}</dd>
                </div>
                <div>
                  <dt>Client</dt>
                  <dd>
                    {detailsPayment.client_name ??
                      String(detailsPayment.client)}
                  </dd>
                </div>
                <div>
                  <dt>Batch</dt>
                  <dd>
                    {detailsPayment.batch_code ?? String(detailsPayment.batch)}
                  </dd>
                </div>
                <div>
                  <dt>Payment date</dt>
                  <dd>{detailsPayment.payment_date}</dd>
                </div>
                <div>
                  <dt>Method</dt>
                  <dd className="capitalize">{detailsPayment.method}</dd>
                </div>
                <div>
                  <dt>Reference number</dt>
                  <dd>{detailsPayment.reference_no || "—"}</dd>
                </div>
                <div>
                  <dt>Payment ID</dt>
                  <dd>{detailsPayment.id}</dd>
                </div>
              </dl>
            </section>
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
            <button
              type="button"
              onClick={() => {
                return detailsDialog.current?.close();
              }}
            >
              Close
            </button>
          </footer>
        </div>
      )}
    </dialog>
  );
}
