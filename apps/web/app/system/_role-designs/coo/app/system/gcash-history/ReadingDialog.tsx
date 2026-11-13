"use client";

import ModalCloseButton from "@/app/system/_role-designs/coo/components/ModalCloseButton";
import WorkspaceProgress from "@/app/system/_role-designs/coo/components/WorkspaceProgress";
import WorkspaceDetails from "@/app/system/_role-designs/coo/components/WorkspaceDetails";
import WorkspaceNativeSelect from "@/app/system/_role-designs/coo/components/WorkspaceNativeSelect";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { GcashHistory, GcashSubmission } from "@freshphones/contracts";
import { useReviewWorkspace } from "@/app/system/gcash-history/useReviewWorkspace";
import { CorrectionForm } from "@/app/system/_role-designs/coo/app/system/gcash-history/CorrectionForm";
import { CorrectionHistory } from "@/app/system/_role-designs/coo/app/system/gcash-history/CorrectionHistory";
import { ReviewDecision } from "@/app/system/_role-designs/coo/app/system/gcash-history/ReviewDecision";
import { SubmissionActions } from "@/app/system/_role-designs/coo/app/system/gcash-history/SubmissionActions";
import { PaymentMatch } from "@/app/system/_role-designs/coo/app/system/gcash-history/PaymentMatch";
import { ReviewHistory } from "@/app/system/_role-designs/coo/app/system/gcash-history/ReviewHistory";
import styles from "@/app/system/_role-designs/coo/app/system/gcash-history/workspace.module.css";

const OriginalPdf = dynamic(
  () => {
    return import("@/app/system/_role-designs/coo/app/system/gcash-history/OriginalPdf");
  },
  {
    ssr: false,
    loading: () => {
      return <WorkspaceProgress label="Loading PDF viewer…" />;
    },
  },
);

const money = (value: string | null) => {
  return value === null
    ? "Not read"
    : `₱${Number(value).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export function ReadingDialog({
  row,
  submission,
  canReview = false,
  viewerId,
  changed,
  download,
  close,
}: {
  row: GcashHistory;
  submission: GcashSubmission;
  canReview?: boolean;
  viewerId?: string;
  changed: (row: GcashHistory) => void;
  download: (id: string, filename: string) => Promise<void>;
  close: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  const [view, setView] = useState<"pdf" | "transactions">("transactions");

  const [pdfPage, setPdfPage] = useState(1);

  const [discard, setDiscard] = useState(false);

  const work = useReviewWorkspace(submission.id, row, changed);

  const { result, record } = work;

  const current = record.current.id === submission.id;

  const requestClose = () => {
    if (work.saving) {
      return;
    }

    if (work.edit !== null) {
      setDiscard(true);
    } else {
      close();
    }
  };

  useEffect(() => {
    const element = dialog.current;

    element?.showModal();

    return () => {
      element?.close();
    };
  }, []);

  return (
    <dialog
      data-workspace-modal
      data-modal-size="review"
      data-modal-framed
      ref={dialog}
      className={styles.dialog}
      aria-labelledby="gcash-workspace-title"
      onCancel={(event) => {
        event.preventDefault();

        requestClose();
      }}
    >
      <header data-modal-header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>GCash statement review</span>
          <h2 id="gcash-workspace-title">{record.batch.code}</h2>
          <p>
            {record.periodStart} — {record.periodEnd}{" "}
            <span>· PDF revision {submission.revision}</span>
          </p>
        </div>
        <div className={styles.toolbar}>
          <span
            className={styles.badge}
            data-status={
              record.archivedAt
                ? "ARCHIVED"
                : current
                  ? record.status
                  : submission.status
            }
          >
            {record.archivedAt
              ? "Archived"
              : (current ? record.status : submission.status) === "SUBMITTED"
                ? "Awaiting Records review"
                : (current ? record.status : submission.status) === "REVIEWED"
                  ? "Reviewed"
                  : "Needs clarification"}
          </span>
          <button
            type="button"
            onClick={() => {
              void download(submission.id, submission.fileName);
            }}
          >
            Download original
          </button>
          {canReview && work.edit === null && !work.saving && (
            <SubmissionActions row={record} changed={work.updated} />
          )}
          <ModalCloseButton onClick={requestClose} disabled={work.saving} />
        </div>
      </header>
      <p className={styles.boundary}>
        Statement evidence only. Payments and member balances change through
        Finance verification.
      </p>
      {record.archivedAt && (
        <p className={styles.warning}>
          Archived by {record.archivedBy?.name} · {record.archiveReason}.
          Restore this period to make changes.
        </p>
      )}
      {!current && (
        <p className={styles.warning}>
          Historical PDF revision. Corrections and decisions apply to the latest
          revision.
        </p>
      )}
      {discard && (
        <div className={styles.warning} role="alert">
          <p>Discard the unsaved correction and close?</p>
          <div className={styles.toolbar}>
            <button type="button" onClick={close}>
              Discard and close
            </button>
            <button
              type="button"
              onClick={() => {
                setDiscard(false);
              }}
            >
              Keep editing
            </button>
          </div>
        </div>
      )}
      {work.error && (
        <div className={styles.warning} role="alert">
          {work.error}
          <button type="button" onClick={work.reload} disabled={work.saving}>
            Discard draft and load latest submission
          </button>
        </div>
      )}
      {work.notice && (
        <p className={styles.success} role="status">
          {work.notice}
        </p>
      )}
      <div
        className={styles.mobileTabs}
        role="group"
        aria-label="Comparison view"
      >
        <button
          type="button"
          aria-pressed={view === "pdf"}
          onClick={() => {
            setView("pdf");
          }}
        >
          Original PDF
        </button>
        <button
          type="button"
          aria-pressed={view === "transactions"}
          onClick={() => {
            setView("transactions");
          }}
        >
          Transactions
        </button>
      </div>
      <div className={styles.comparison} data-view={view}>
        <OriginalPdf
          key={submission.id}
          active={view === "pdf"}
          id={submission.id}
          filename={submission.fileName}
          page={pdfPage}
          setPage={setPdfPage}
        />
        <section
          className={styles.transactions}
          aria-label="Statement transactions"
        >
          <header className={styles.panelHeader}>
            <div>
              <h3>Transactions</h3>
              <p>
                {result
                  ? `${result.total} rows · ${result.correctionVersion} manual corrections`
                  : "Extracted from this PDF revision"}
              </p>
            </div>
            <button
              type="button"
              disabled={work.edit !== null || work.saving || work.loading}
              onClick={work.reload}
            >
              Refresh transactions and matches
            </button>
            <label>
              Reading version
              <WorkspaceNativeSelect
                aria-label="Reading version"
                disabled={work.edit !== null || work.saving}
                value={work.source}
                onChange={(event) => {
                  const value = event.target.value;

                  work.setSource(value as "current" | "original");

                  work.setPage(1);
                }}
              >
                <option value="current">Current interpretation</option>
                <option value="original">Original extraction</option>
              </WorkspaceNativeSelect>
            </label>
          </header>
          <div className={styles.transactionBody}>
            {work.loading ? (
              <WorkspaceProgress label="Loading extracted transactions…" />
            ) : work.readingError ? (
              <div className={styles.warning} role="alert">
                <p>{work.readingError}</p>
                <button type="button" onClick={work.reload}>
                  Retry transactions
                </button>
                <p>The original PDF remains available for review.</p>
              </div>
            ) : (
              result && (
                <>
                  <WorkspaceDetails className={styles.matchHelp}>
                    <summary>
                      Payment matching rules · {result.unmatchedPayments}{" "}
                      unmatched
                    </summary>
                    <p>
                      Suggestions require the exact reference, amount and
                      Philippine calendar date within this batch. Finance still
                      verifies payments.
                    </p>
                    <p>
                      Recorded GCash payments without an exact statement row:{" "}
                      <strong>{result.unmatchedPayments}</strong>.
                    </p>
                  </WorkspaceDetails>
                  <dl className={styles.totals}>
                    {[
                      ["Opening", result.openingBalance],
                      ["Debit read", result.calculatedDebit],
                      ["Credit read", result.calculatedCredit],
                      ["Closing", result.closingBalance],
                    ].map(([label, value]) => {
                      return (
                        <div key={label}>
                          <dt>{label}</dt>
                          <dd>{money(value)}</dd>
                        </div>
                      );
                    })}
                  </dl>
                  <div
                    className={styles.checks}
                    aria-label="Reconciliation checks"
                  >
                    {[
                      ["Debit total", result.checks.debitTotalMatches],
                      ["Credit total", result.checks.creditTotalMatches],
                      ["Running balances", result.checks.runningBalancesMatch],
                      ["Closing balance", result.checks.closingBalanceMatches],
                    ].map(([label, value]) => {
                      return (
                        <span
                          key={String(label)}
                          data-check={value === true ? "match" : "check"}
                        >
                          {label}:{" "}
                          {value === true
                            ? "Matches"
                            : value === false
                              ? "Needs checking"
                              : "Not checked"}
                        </span>
                      );
                    })}
                  </div>
                  {result.warnings.length > 0 && (
                    <WorkspaceDetails className={styles.warning}>
                      <summary>
                        {result.warnings.length} reading{" "}
                        {result.warnings.length === 1 ? "warning" : "warnings"}{" "}
                        — check against the PDF
                      </summary>
                      <ul>
                        {result.warnings.map((warning) => {
                          return <li key={warning}>{warning}</li>;
                        })}
                      </ul>
                    </WorkspaceDetails>
                  )}
                  {work.edit !== null && result.items[work.edit] && (
                    <CorrectionForm
                      key={`${submission.id}-${work.page}-${work.edit}`}
                      row={result.items[work.edit]}
                      rowIndex={(work.page - 1) * result.pageSize + work.edit}
                      reading={result}
                      saving={work.saving}
                      save={work.correct}
                      cancel={() => {
                        work.setEdit(null);
                      }}
                    />
                  )}
                  {!result.total ? (
                    <p className={styles.message}>
                      No transaction table was identified. Use the original PDF
                      for the Records review.
                    </p>
                  ) : (
                    <div
                      className={styles.tableWrap}
                      tabIndex={0}
                      role="region"
                      aria-label="Extracted GCash transaction table"
                    >
                      <table>
                        <thead>
                          <tr>
                            {[
                              "Date / source",
                              "Description",
                              "Reference",
                              "Debit",
                              "Credit",
                              "Balance",
                              "Payment match",
                              "Actions",
                            ].map((heading) => {
                              return (
                                <th key={heading} scope="col">
                                  {heading}
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody>
                          {result.items.map((item, index) => {
                            return (
                              <tr
                                key={`${work.page}-${index}`}
                                data-editing={work.edit === index}
                              >
                                <td data-label="Date / source">
                                  {item.date}
                                  <small>{item.time}</small>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPdfPage(item.page);

                                      setView("pdf");

                                      requestAnimationFrame(() => {
                                        dialog.current
                                          ?.querySelector<HTMLElement>(
                                            '[aria-label="PDF page viewer"]',
                                          )
                                          ?.focus();
                                      });
                                    }}
                                  >
                                    PDF page {item.page}
                                  </button>
                                </td>
                                <td
                                  data-label="Description"
                                  className={styles.description}
                                >
                                  {item.description || "Not read"}
                                  {item.warnings.length > 0 && (
                                    <WorkspaceDetails>
                                      <summary>
                                        Reading flags ({item.warnings.length})
                                      </summary>
                                      <ul>
                                        {item.warnings.map((warning) => {
                                          return (
                                            <li key={warning}>{warning}</li>
                                          );
                                        })}
                                      </ul>
                                    </WorkspaceDetails>
                                  )}
                                </td>
                                <td data-label="Reference">
                                  {item.reference || "Not read"}
                                </td>
                                <td data-label="Debit">
                                  {item.debit === null
                                    ? "—"
                                    : money(item.debit)}
                                </td>
                                <td data-label="Credit">
                                  {item.credit === null
                                    ? "—"
                                    : money(item.credit)}
                                </td>
                                <td data-label="Balance">
                                  {money(item.balance)}
                                </td>
                                <td
                                  data-label="Payment match"
                                  className={styles.matchCell}
                                >
                                  {result.paymentMatches[index] && (
                                    <PaymentMatch
                                      match={result.paymentMatches[index]}
                                    />
                                  )}
                                </td>
                                <td data-label="Actions">
                                  {canReview && result.editable ? (
                                    <button
                                      type="button"
                                      disabled={
                                        work.edit !== null || work.saving
                                      }
                                      onClick={() => {
                                        work.setEdit(index);
                                      }}
                                    >
                                      Correct row{" "}
                                      {index +
                                        1 +
                                        (work.page - 1) * result.pageSize}
                                    </button>
                                  ) : (
                                    "Read only"
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <nav
                    className={styles.pagination}
                    aria-label="Extracted transaction pages"
                  >
                    <button
                      type="button"
                      disabled={
                        work.page === 1 || work.edit !== null || work.saving
                      }
                      onClick={() => {
                        work.setPage(work.page - 1);
                      }}
                    >
                      Previous transactions
                    </button>
                    <span>
                      Page {work.page} of{" "}
                      {Math.max(1, Math.ceil(result.total / result.pageSize))}
                    </span>
                    <button
                      type="button"
                      disabled={
                        work.page * result.pageSize >= result.total ||
                        work.edit !== null ||
                        work.saving
                      }
                      onClick={() => {
                        work.setPage(work.page + 1);
                      }}
                    >
                      Next transactions
                    </button>
                  </nav>
                </>
              )
            )}
            <CorrectionHistory id={submission.id} refresh={work.attempt} />
          </div>
        </section>
      </div>
      {current &&
        canReview &&
        !record.archivedAt &&
        (record.reviewRequired ?? record.status === "SUBMITTED") &&
        record.current.uploadedBy.id !== viewerId && (
          <ReviewDecision
            key={record.version}
            row={record}
            disabled={work.saving || work.edit !== null}
            save={work.review}
          />
        )}
      {current && record.current.reviewNote && (
        <p className={styles.reviewNote}>
          <strong>Records review</strong> · {record.current.reviewedBy?.name}:{" "}
          {record.current.reviewNote}
        </p>
      )}
      <ReviewHistory id={record.id} refresh={work.attempt} />
    </dialog>
  );
}
