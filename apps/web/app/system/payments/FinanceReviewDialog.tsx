"use client";

import { type Payment } from "@/lib/api";
import { X } from "@phosphor-icons/react";
import type { Dispatch, RefObject, SetStateAction } from "react";
import { REVIEW_ACTIONS, ReviewDecision } from "./payment-view";

type Props = {
  reviewStage: "RECORDS" | "MANAGER" | "FINANCE";
  financeDialog: RefObject<HTMLDialogElement | null>;
  setReviewPayment: Dispatch<SetStateAction<Payment | null>>;
  setReviewDecision: Dispatch<SetStateAction<ReviewDecision | null>>;
  setReviewError: Dispatch<SetStateAction<string | null>>;
  reviewSaving: boolean;
  reviewPayment: Payment | null;
  decide: () => Promise<void>;
  financeNoteInput: RefObject<HTMLTextAreaElement | null>;
  reviewNotes: Record<string, string>;
  setReviewNotes: Dispatch<SetStateAction<Record<string, string>>>;
  reviewDecision: ReviewDecision | null;
  reviewError: string | null;
};

export default function FinanceReviewDialog({
  reviewStage,
  financeDialog,
  setReviewPayment,
  setReviewDecision,
  setReviewError,
  reviewSaving,
  reviewPayment,
  decide,
  financeNoteInput,
  reviewNotes,
  setReviewNotes,
  reviewDecision,
  reviewError,
}: Props) {
  const title =
    reviewStage === "RECORDS"
      ? "Records completeness review"
      : reviewStage === "MANAGER"
        ? "Manager cross-check"
        : "Finance review";

  const actions =
    reviewStage === "FINANCE"
      ? REVIEW_ACTIONS
      : REVIEW_ACTIONS.filter((action) => {
          return action.value !== "rejected";
        }).map((action) => {
          return {
            ...action,
            label:
              action.value === "verified" ? "Approve" : "Return for correction",
          };
        });

  return (
    <dialog
      ref={financeDialog}
      className="finance-review-dialog"
      aria-labelledby="finance-review-title"
      onClose={() => {
        setReviewPayment(null);

        setReviewDecision(null);

        setReviewError(null);
      }}
      onCancel={(event) => {
        if (reviewSaving) {
          event.preventDefault();
        }
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !reviewSaving) {
          financeDialog.current?.close();
        }
      }}
    >
      {reviewPayment && (
        <form
          onSubmit={(event) => {
            event.preventDefault();

            void decide();
          }}
        >
          <header className="finance-review-heading">
            <div>
              <p>Payment decision</p>
              <h2 id="finance-review-title">{title}</h2>
            </div>
            <button
              type="button"
              onClick={() => {
                return financeDialog.current?.close();
              }}
              disabled={reviewSaving}
              aria-label={`Close ${title}`}
            >
              <X weight="bold" />
            </button>
          </header>
          <div className="finance-review-body">
            <dl className="finance-review-payment">
              <div>
                <dt>Client</dt>
                <dd>
                  {reviewPayment.client_name ?? String(reviewPayment.client)}
                </dd>
              </div>
              <div>
                <dt>Amount</dt>
                <dd>₱{reviewPayment.amount}</dd>
              </div>
              <div>
                <dt>Reference</dt>
                <dd>{reviewPayment.reference_no || "—"}</dd>
              </div>
              <div>
                <dt>Payment date</dt>
                <dd>{reviewPayment.payment_date}</dd>
              </div>
            </dl>
            <label
              className="finance-review-note"
              htmlFor="finance-review-note"
            >
              <span>{title} note</span>
              <textarea
                ref={financeNoteInput}
                id="finance-review-note"
                rows={6}
                maxLength={1000}
                disabled={reviewSaving}
                value={reviewNotes[String(reviewPayment.id)] ?? ""}
                onChange={(event) => {
                  setReviewError(null);

                  setReviewNotes((current) => {
                    return {
                      ...current,
                      [String(reviewPayment.id)]: event.target.value,
                    };
                  });
                }}
                placeholder="Describe how you checked the payment and why you chose this decision."
              />
              <small>
                Saved when you confirm ·{" "}
                {(reviewNotes[String(reviewPayment.id)] ?? "").length}/1000
                characters
              </small>
            </label>
            <fieldset className="finance-review-choices">
              <legend>Decision</legend>
              <div>
                {actions.map(({ value, label, Icon }) => {
                  return (
                    <button
                      key={value}
                      type="button"
                      className="finance-review-choice"
                      data-selected={reviewDecision === value}
                      onClick={() => {
                        return setReviewDecision(value);
                      }}
                      aria-pressed={reviewDecision === value}
                      disabled={
                        reviewSaving ||
                        (value === "verified" &&
                          (reviewStage === "RECORDS"
                            ? reviewPayment.workflow?.recordsApproved
                            : reviewStage === "MANAGER"
                              ? reviewPayment.workflow?.managerApproved
                              : false))
                      }
                    >
                      <Icon weight="fill" aria-hidden="true" /> {label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            {reviewError && (
              <p className="finance-review-error" role="alert">
                {reviewError}
              </p>
            )}
          </div>
          <footer className="finance-review-actions">
            <button
              type="button"
              onClick={() => {
                return financeDialog.current?.close();
              }}
              disabled={reviewSaving}
            >
              Close
            </button>
            <button type="submit" disabled={!reviewDecision || reviewSaving}>
              {reviewSaving
                ? "Saving…"
                : reviewDecision
                  ? `Confirm ${
                      actions.find(({ value }) => {
                        return value === reviewDecision;
                      })?.label
                    }`
                  : "Choose a decision"}
            </button>
          </footer>
        </form>
      )}
    </dialog>
  );
}
