"use client";

import {
  CheckCircle,
  FilePdf,
  SpinnerGap,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import styles from "./feedback.module.css";

export type GcashFeedbackMessage = {
  id: number;
  kind: "info" | "progress" | "success" | "error";
  title: string;
  message: string;
};

export function GcashFeedback({
  feedback,
  dismiss,
}: {
  feedback: GcashFeedbackMessage | null;
  dismiss: () => void;
}) {
  if (!feedback) {
    return null;
  }

  const error = feedback.kind === "error";

  const Icon = error
    ? WarningCircle
    : feedback.kind === "success"
      ? CheckCircle
      : feedback.kind === "progress"
        ? SpinnerGap
        : FilePdf;

  return (
    <div className="payment-toast-region">
      <div
        key={feedback.id}
        className={`payment-toast ${error ? "is-error" : feedback.kind === "success" ? "is-success" : styles.neutral}`}
        role={error ? "alert" : "status"}
        aria-atomic="true"
        data-gcash-feedback={feedback.kind}
      >
        <span
          className={`payment-toast-icon ${feedback.kind === "progress" ? styles.spinner : ""}`}
          aria-hidden="true"
        >
          <Icon weight={feedback.kind === "progress" ? "bold" : "fill"} />
        </span>
        <div className="payment-toast-copy">
          <strong>{feedback.title}</strong>
          <p>{feedback.message}</p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss message"
          className="payment-toast-close"
        >
          <X weight="bold" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
