"use client";

import type { GcashHistory } from "@freshphones/contracts";
import { SubmissionActions } from "./SubmissionActions";
import styles from "./workspace.module.css";

export function SubmissionCard({
  row,
  canReview,
  canUpload,
  busy,
  open,
  history,
  correct,
  changed,
  archive,
}: {
  row: GcashHistory;
  canReview: boolean;
  canUpload: boolean;
  busy: boolean;
  open: () => void;
  history: () => void;
  correct: () => void;
  changed: (row: GcashHistory) => void;
  archive: () => void;
}) {
  return (
    <article
      className={styles.card}
      aria-label={`${row.batch.code} revision ${row.revision}`}
    >
      <div className={styles.cardTop}>
        <div>
          <h2>{row.batch.code}</h2>
          <p>
            {row.periodStart} to {row.periodEnd}
          </p>
        </div>
        <div className={styles.toolbar}>
          <span
            className={styles.badge}
            data-status={row.archivedAt ? "ARCHIVED" : row.status}
          >
            {row.archivedAt
              ? "Archived"
              : row.status === "SUBMITTED"
                ? "Awaiting Records review"
                : row.status === "REVIEWED"
                  ? "Reviewed"
                  : "Needs clarification"}
          </span>
          {canReview && (
            <SubmissionActions
              row={row}
              changed={changed}
              requestArchive={archive}
            />
          )}
        </div>
      </div>
      <div className={styles.cardMeta}>
        <span>
          PDF revision {row.revision} · {row.current.fileName}
        </span>
        <span>
          {row.current.uploadedBy.name} ·{" "}
          {new Date(row.current.submittedAt).toLocaleDateString()}
        </span>
        <span>
          {row.current.reading
            ? `${row.current.reading.transactionCount} transactions · ${row.current.reading.warningCount ? `${row.current.reading.warningCount} reading warnings` : "No reading flags"}`
            : "Original PDF · no extracted table"}
        </span>
      </div>
      {row.current.note && (
        <p className={styles.cardNote}>Handler: {row.current.note}</p>
      )}
      {row.current.reviewNote && (
        <p className={styles.cardNote}>
          Records: {row.current.reviewNote} · {row.current.reviewedBy?.name}
        </p>
      )}
      {row.archivedAt && (
        <p className={styles.cardNote}>
          Archived by {row.archivedBy?.name}: {row.archiveReason}
        </p>
      )}
      <div className={styles.toolbar}>
        <button type="button" className={styles.primary} onClick={open}>
          {canReview && !row.archivedAt && row.status === "SUBMITTED"
            ? "Review submission"
            : "Open submission"}
        </button>
        <button type="button" onClick={history}>
          PDF history
        </button>
        {canUpload &&
          !row.archivedAt &&
          row.status === "NEEDS_CLARIFICATION" && (
            <button type="button" disabled={busy} onClick={correct}>
              Submit corrected PDF
            </button>
          )}
      </div>
    </article>
  );
}
