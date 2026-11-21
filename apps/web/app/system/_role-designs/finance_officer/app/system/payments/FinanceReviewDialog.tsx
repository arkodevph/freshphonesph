"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import ModalCloseButton from "@/app/system/_role-designs/finance_officer/components/ModalCloseButton";
import type { Payment } from "@/lib/api";
import { canDecideFinance, financeDecisionEffects } from "@/lib/finance-review";
import { financePaymentStage } from "@/lib/finance-workspace";
import { REVIEW_ACTIONS, type ReviewDecision } from "./payment-view";
import { useFinanceReviewEvidence } from "./useFinanceReviewEvidence";
import ReviewEvidence from "./FinanceReviewEvidence";
import styles from "./finance-review.module.css";

type Props = {
  reviewAllowed: boolean;
  closeReview: () => void;
  finishReview: () => void;
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
  denyReview: () => void;
  reviewConflict: boolean;
  reloadReview: (payment: Payment) => void;
};

export default function FinanceReviewDialog(props: Props) {
  const {
    reviewPayment,
    reviewSaving,
    reviewDecision,
    reviewError,
    reviewNotes,
    financeDialog,
    reviewConflict,
  } = props;

  const evidence = useFinanceReviewEvidence(
    reviewPayment?.id,
    reviewPayment?.version,
  );

  const heading = useRef<HTMLHeadingElement>(null);

  const returnFocus = useRef<{
    label: string;
    element: HTMLElement | null;
  } | null>(null);

  useLayoutEffect(() => {
    if (reviewPayment) {
      const label = `Actions for payment ${String(reviewPayment.id).slice(0, 8)}`;

      returnFocus.current = {
        label,
        element: document.querySelector<HTMLElement>(
          `button[aria-label=${JSON.stringify(label)}]`,
        ),
      };
    } else if (returnFocus.current) {
      const saved = returnFocus.current;

      returnFocus.current = null;

      const target = saved.element?.isConnected
        ? saved.element
        : document.querySelector<HTMLElement>(
            `button[aria-label=${JSON.stringify(saved.label)}]`,
          );

      (
        target ??
        document.querySelector<HTMLElement>(
          '[aria-label="Finance payments, scroll for more columns"]',
        )
      )?.focus();
    }
  }, [reviewPayment?.id]);

  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    setConfirmed(false);
  }, [
    reviewPayment?.id,
    reviewPayment?.version,
    reviewDecision,
    reviewNotes,
    evidence.data,
    reviewError,
  ]);

  useEffect(() => {
    if (reviewPayment) {
      heading.current?.focus();
    }
  }, [reviewPayment?.id]);

  useEffect(() => {
    if (evidence.denied) {
      props.denyReview();
    }
  }, [evidence.denied]);

  const current = evidence.data?.payment;

  const changed = Boolean(
    current &&
    (current.version !== reviewPayment?.version ||
      current.workflow?.evidenceVersion !==
        reviewPayment?.workflow?.evidenceVersion),
  );

  const blocked =
    !props.reviewAllowed ||
    evidence.loading ||
    !current ||
    changed ||
    reviewConflict ||
    reviewSaving;

  const canConfirm = Boolean(
    current &&
    reviewDecision &&
    canDecideFinance(current, reviewDecision) &&
    !blocked,
  );

  const note = reviewPayment
    ? (reviewNotes[String(reviewPayment.id)] ?? "")
    : "";

  return (
    <dialog
      data-workspace-modal
      data-modal-framed
      data-modal-size="media"
      ref={financeDialog}
      className={styles.dialog}
      aria-labelledby="finance-review-title"
      onClose={props.finishReview}
      onCancel={(event) => {
        event.preventDefault();

        props.closeReview();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !reviewSaving) {
          props.closeReview();
        }
      }}
    >
      {reviewPayment && (
        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault();

            if (canConfirm && confirmed) {
              void props.decide();
            }
          }}
        >
          <header
            data-modal-header
            className={`finance-review-heading ${styles.heading}`}
          >
            <div>
              <h2 id="finance-review-title" ref={heading} tabIndex={-1}>
                Finance payment review
              </h2>
              <p>Inspect the evidence before recording a financial decision.</p>
            </div>
            <ModalCloseButton
              onClick={props.closeReview}
              disabled={reviewSaving}
            />
          </header>
          <div className={styles.body}>
            {evidence.loading && (
              <p role="status">Loading current payment and review evidence…</p>
            )}
            {evidence.error && (
              <div role="alert" className={styles.error}>
                <p>{evidence.error}</p>
                <p>
                  Review evidence is unavailable. Decisions are blocked until it
                  loads.
                </p>
                <button type="button" onClick={evidence.refresh}>
                  Retry review evidence
                </button>
              </div>
            )}
            {evidence.data && (
              <>
                <ReviewEvidence
                  data={evidence.data}
                  proofUrl={evidence.proofUrl}
                />
                <aside
                  className={styles.decision}
                  aria-label="Finance decision"
                >
                  <h3>Record your decision</h3>
                  <p>{financePaymentStage(current!)}</p>
                  {(changed || reviewConflict) && (
                    <div className={styles.error} role="alert">
                      <p>
                        This payment or its review conditions changed. Your note
                        is retained. Reload and inspect the evidence before
                        choosing a new decision.
                      </p>
                      <button
                        type="button"
                        disabled={reviewSaving || evidence.loading}
                        onClick={() => {
                          evidence.reload((fresh) => {
                            props.reloadReview(fresh.payment);
                          });
                        }}
                      >
                        Reload for review
                      </button>
                    </div>
                  )}
                  <button
                    type="button"
                    className={styles.refresh}
                    disabled={reviewSaving || evidence.loading}
                    onClick={evidence.refresh}
                  >
                    Refresh evidence
                  </button>
                  <div className={styles.note}>
                    <label htmlFor="finance-review-note">
                      Finance review note
                    </label>
                    <textarea
                      id="finance-review-note"
                      aria-describedby="finance-review-note-help"
                      ref={props.financeNoteInput}
                      rows={5}
                      minLength={2}
                      maxLength={1000}
                      required
                      disabled={reviewSaving}
                      value={note}
                      onChange={(event) => {
                        props.setReviewError(null);

                        props.setReviewNotes((previous) => {
                          return {
                            ...previous,
                            [String(reviewPayment.id)]: event.target.value,
                          };
                        });
                      }}
                      placeholder="Explain what you checked and why you chose this decision."
                    />
                    <span
                      id="finance-review-note-help"
                      className={styles.muted}
                    >
                      {note.length}/1000 characters · draft retained in this
                      session
                    </span>
                  </div>
                  <fieldset disabled={blocked} className={styles.choices}>
                    <legend>Decision</legend>
                    {REVIEW_ACTIONS.map(({ value, label, Icon }) => {
                      return (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={reviewDecision === value}
                          disabled={
                            blocked || !canDecideFinance(current!, value)
                          }
                          onClick={() => {
                            return props.setReviewDecision(value);
                          }}
                        >
                          <Icon aria-hidden="true" />
                          {label}
                        </button>
                      );
                    })}
                  </fieldset>
                  {reviewDecision && (
                    <div className={styles.effect}>
                      <p>{financeDecisionEffects[reviewDecision]}</p>
                      <label className={styles.confirmation}>
                        <input
                          type="checkbox"
                          checked={confirmed}
                          disabled={!canConfirm}
                          onChange={(event) => {
                            return setConfirmed(event.target.checked);
                          }}
                        />
                        I have checked the evidence and confirm this decision.
                      </label>
                    </div>
                  )}
                  {!canDecideFinance(current!, "verified") &&
                    current?.status === "pending" && (
                      <p className={styles.muted}>
                        Verification requires an open membership, receipt proof,
                        current Records and assigned Manager approvals, and
                        complete required submission evidence.
                      </p>
                    )}
                  {reviewError && (
                    <p key={reviewError} role="alert" className={styles.error}>
                      {reviewError}
                    </p>
                  )}
                  <button
                    className={styles.submit}
                    type="submit"
                    disabled={
                      !canConfirm || !confirmed || note.trim().length < 2
                    }
                  >
                    {reviewSaving
                      ? "Saving decision…"
                      : reviewDecision
                        ? `Confirm ${
                            REVIEW_ACTIONS.find((action) => {
                              return action.value === reviewDecision;
                            })?.label
                          }`
                        : "Choose a decision"}
                  </button>
                </aside>
              </>
            )}
          </div>
          <footer className={styles.footer}>
            <span>
              Payments are checked and paid externally. Only verified credit
              changes the balance.
            </span>
            <button
              type="button"
              disabled={reviewSaving}
              onClick={props.closeReview}
            >
              Close review
            </button>
          </footer>
        </form>
      )}
    </dialog>
  );
}
