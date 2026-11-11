"use client";

import { X } from "@phosphor-icons/react";
import { usePaymentReview } from "./usePaymentReview";
import { paymentReviewStatusLabels } from "@/lib/payment-review";

const time = (value: string) => {
  return (
    new Intl.DateTimeFormat("en-PH", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Manila",
    }).format(new Date(value)) + " PHT"
  );
};

export function PaymentReviewDetails({ enabled }: { enabled: boolean }) {
  const { dialog, review, error, loading, load, close } =
    usePaymentReview(enabled);

  return (
    <dialog
      ref={dialog}
      className="finance-review-dialog payment-details-dialog"
      aria-labelledby="payment-review-title"
      onClose={close}
      onKeyDown={(event) => {
        if (event.key !== "Tab") {
          return;
        }

        const controls = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not([disabled]), a[href], [tabindex="0"]',
          ),
        );

        const first = controls[0];

        const last = controls.at(-1);

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();

          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();

          first?.focus();
        }
      }}
    >
      <div className="payment-details-shell">
        <header className="finance-review-heading">
          <div>
            <p>Saved operational decision</p>
            <h2 id="payment-review-title">Payment review update</h2>
          </div>
          <button
            type="button"
            onClick={() => {
              dialog.current?.close();
            }}
            aria-label="Close payment review"
          >
            <X weight="bold" />
          </button>
        </header>
        <div className="payment-details-body">
          {error ? (
            <p className="finance-review-error" role="alert">
              {error}{" "}
              <button
                type="button"
                onClick={() => {
                  void load();
                }}
                disabled={loading}
              >
                Retry payment review
              </button>
            </p>
          ) : !review || loading ? (
            <p role="status">Loading the current payment and saved review…</p>
          ) : (
            <>
              <section aria-label="Saved review decision">
                <h3>
                  {review.stage === "RECORDS" ? "Records" : "Manager"} ·{" "}
                  {review.decision === "RETURNED"
                    ? "Returned for correction"
                    : "Approved evidence"}
                </h3>
                <dl className="payment-details-grid">
                  <div>
                    <dt>Customer</dt>
                    <dd>{review.clientName}</dd>
                  </div>
                  <div>
                    <dt>Batch</dt>
                    <dd>{review.batchCode}</dd>
                  </div>
                  <div>
                    <dt>Reviewed by</dt>
                    <dd>{review.reviewerName}</dd>
                  </div>
                  <div>
                    <dt>Reviewed at</dt>
                    <dd>{time(review.occurredAt)}</dd>
                  </div>
                </dl>
                <div className="payment-details-note">
                  <h4>Reviewer note</h4>
                  <p
                    style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
                  >
                    {review.notes}
                  </p>
                </div>
              </section>
              <section aria-label="Current payment status">
                <h3>Current payment status</h3>
                <p>{paymentReviewStatusLabels[review.currentStatus]}</p>
                <p className="mt-2">
                  The decision above records a past review. The payment may have
                  been corrected or reviewed again since then.
                </p>
                <p className="mt-2">
                  Finance verification determines the credit applied to the
                  member’s balance.
                </p>
                <dl className="payment-details-grid mt-3">
                  <div>
                    <dt>Payment reference</dt>
                    <dd>{review.paymentId}</dd>
                  </div>
                </dl>
              </section>
            </>
          )}
        </div>
        <footer className="finance-review-actions">
          <button
            type="button"
            className="btn-outline btn-sm"
            onClick={() => {
              dialog.current?.close();
            }}
          >
            Back to payment
          </button>
        </footer>
      </div>
    </dialog>
  );
}
