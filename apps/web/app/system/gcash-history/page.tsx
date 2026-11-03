"use client";

import { useEffect, useState } from "react";
import type {
  GcashHistory,
  GcashHistoryStatus,
  GcashSubmission,
} from "@freshphones/contracts";
import { Field, inputCls } from "@/components/FormField";
import { useGcashHistory } from "./useGcashHistory";
import { ReadingDialog } from "./ReadingDialog";
import { GcashFeedback } from "./GcashFeedback";
import { PdfPasswordField } from "./PdfPasswordField";
import { HistoryDialog } from "./HistoryDialog";
import { SubmissionCard } from "./SubmissionCard";
import { ArchiveConfirmation } from "./SubmissionActions";
import styles from "./workspace.module.css";

const button =
  "rounded-xl border border-slate-200 px-3 py-2 text-sm font-600 disabled:opacity-50";

export default function GcashHistoryPage() {
  const work = useGcashHistory();

  const [history, setHistory] = useState<GcashHistory | null>(null);

  const [archiving, setArchiving] = useState<GcashHistory | null>(null);

  const [reading, setReading] = useState<{
    row: GcashHistory;
    submission: GcashSubmission;
  } | null>(null);

  useEffect(() => {
    setHistory(null);

    setReading(null);

    setArchiving(null);
  }, [work.me?.id, work.canRead, work.canReview]);

  if (work.me && !work.canRead) {
    return (
      <section className="glass rounded-3xl p-8">
        <h1 className="font-display text-xl font-700">No access</h1>
        <p>Your role does not have access to GCash history PDFs.</p>
      </section>
    );
  }

  return (
    <>
      <header className="glass mb-5 rounded-3xl p-5">
        <h1 className="font-display text-xl font-700 text-blue-ink">
          GCash history
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Compare original statements, check transaction readings and keep a
          clear review trail.
        </p>
        <p className="mt-2 text-sm text-ink-soft">
          This workspace does not verify payments or change balances.
        </p>
      </header>
      <GcashFeedback feedback={work.feedback} dismiss={work.dismissFeedback} />
      {work.canUpload && (
        <form
          onSubmit={(event) => {
            void work.submit(event);
          }}
          className="glass mb-5 rounded-3xl p-5"
          aria-label="Submit GCash PDF"
          aria-busy={work.saving}
        >
          <h2 className="font-display text-lg font-700">
            {work.correcting
              ? `Correct ${work.correcting.batch.code} · revision ${work.correcting.revision + 1}`
              : "Submit full GCash history"}
          </h2>
          <p className="my-2 text-sm text-ink-soft">
            Upload the complete PDF exported from GCash for this batch and date
            range. PDF only, up to 10 MB.
          </p>
          {work.correcting && (
            <p className="mb-3 text-sm">
              Records requested: {work.correcting.current.reviewNote}
            </p>
          )}
          {work.choicesError && (
            <p role="alert">
              {work.choicesError}{" "}
              <button type="button" onClick={work.retryChoices}>
                Retry batches
              </button>
            </p>
          )}
          <fieldset
            disabled={work.saving}
            className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            <Field label="Batch">
              <select
                required
                disabled={Boolean(work.correcting)}
                value={work.draft.batchId}
                onChange={(event) => {
                  work.setDraft({ ...work.draft, batchId: event.target.value });
                }}
                className={inputCls}
              >
                <option value="">Choose an assigned batch</option>
                {work.correcting &&
                  !work.choices.some((item) => {
                    return String(item.id) === work.correcting?.batch.id;
                  }) && (
                    <option value={work.correcting.batch.id}>
                      {work.correcting.batch.code}
                    </option>
                  )}
                {work.choices.map((item) => {
                  return (
                    <option key={item.id} value={item.id}>
                      {item.batch_number} — {item.unit_model}
                    </option>
                  );
                })}
              </select>
            </Field>
            <Field label="History from">
              <input
                required
                type="date"
                readOnly={Boolean(work.correcting)}
                value={work.draft.periodStart}
                onChange={(event) => {
                  work.setDraft({
                    ...work.draft,
                    periodStart: event.target.value,
                  });
                }}
                className={inputCls}
              />
            </Field>
            <Field label="History through">
              <input
                required
                type="date"
                min={work.draft.periodStart}
                readOnly={Boolean(work.correcting)}
                value={work.draft.periodEnd}
                onChange={(event) => {
                  work.setDraft({
                    ...work.draft,
                    periodEnd: event.target.value,
                  });
                }}
                className={inputCls}
              />
            </Field>
            <Field label="Full GCash PDF">
              <input
                key={work.inputKey}
                type="file"
                required
                accept="application/pdf,.pdf"
                className={inputCls}
                onChange={(event) => {
                  const file = event.target.files?.[0];

                  const error = work.selectFile(file ?? null);

                  if (error) {
                    event.target.value = "";
                  }
                }}
              />
            </Field>
            <PdfPasswordField
              value={work.password}
              onChange={work.setPassword}
              resetKey={work.inputKey}
              disabled={work.saving}
            />
            <Field label="Handler note (optional)">
              <textarea
                value={work.draft.note}
                maxLength={1000}
                onChange={(event) => {
                  work.setDraft({ ...work.draft, note: event.target.value });
                }}
                className={inputCls}
              />
            </Field>
          </fieldset>
          {work.file && (
            <p className="my-2 break-words text-sm">
              Selected: {work.file.name} ·{" "}
              {(work.file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              disabled={work.saving || !work.file || !work.draft.batchId}
              className="btn-candy rounded-xl px-4 py-2"
            >
              {work.saving
                ? "Reading and submitting PDF…"
                : "Submit PDF to Records"}
            </button>
            <button
              type="button"
              disabled={work.saving}
              className={button}
              onClick={work.resetDraft}
            >
              {work.correcting ? "Cancel correction" : "Clear draft"}
            </button>
          </div>
        </form>
      )}
      <section
        className={`glass rounded-3xl p-5 ${styles.queue}`}
        aria-label="GCash review queue"
        tabIndex={-1}
      >
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Search batch">
            <input
              placeholder="Search by batch code"
              maxLength={100}
              value={work.query}
              onChange={(event) => {
                work.setQuery(event.target.value);

                work.setPage(1);
              }}
              className={inputCls}
            />
          </Field>
          <Field label="Review status">
            <select
              aria-label="Review status"
              value={work.status}
              onChange={(event) => {
                work.setStatus(event.target.value as GcashHistoryStatus | "");

                work.setPage(1);
              }}
              className={inputCls}
            >
              <option value="">All statuses</option>
              <option value="SUBMITTED">Awaiting Records review</option>
              <option value="NEEDS_CLARIFICATION">Needs clarification</option>
              <option value="REVIEWED">Reviewed</option>
            </select>
          </Field>
          <Field label="Queue view">
            <select
              aria-label="Queue view"
              className={inputCls}
              value={work.archived}
              onChange={(event) => {
                work.setArchived(event.target.value as "active" | "archived");

                work.setPage(1);
              }}
            >
              <option value="active">Active submissions</option>
              <option value="archived">Archived submissions</option>
            </select>
          </Field>
          <button
            type="button"
            disabled={work.loading}
            className={button}
            onClick={() => {
              void work.load();
            }}
          >
            Refresh queue
          </button>
        </div>
        {work.loading ? (
          <p role="status">Loading GCash history…</p>
        ) : work.listError ? (
          <p role="alert">
            {work.listError}{" "}
            <button
              type="button"
              onClick={() => {
                void work.load();
              }}
            >
              Retry queue
            </button>
          </p>
        ) : !work.items.length ? (
          <p>No GCash histories match these filters.</p>
        ) : (
          <div className="grid gap-3">
            {work.items.map((row) => {
              return (
                <SubmissionCard
                  key={row.id}
                  row={row}
                  canReview={work.canReview}
                  canUpload={work.canUpload}
                  busy={work.saving}
                  open={() => {
                    setReading({ row, submission: row.current });
                  }}
                  history={() => {
                    setHistory(row);
                  }}
                  correct={() => {
                    work.correct(row);
                  }}
                  changed={() => {
                    void work.load();
                  }}
                  archive={() => {
                    setArchiving(row);
                  }}
                />
              );
            })}
          </div>
        )}
        <nav
          aria-label="GCash queue pages"
          className="mt-4 flex flex-wrap items-center gap-3"
        >
          <button
            type="button"
            className={button}
            disabled={work.loading || work.page === 1}
            onClick={() => {
              work.setPage(work.page - 1);
            }}
          >
            Previous page
          </button>
          <span className="text-sm">
            Page {work.page} of {Math.max(1, Math.ceil(work.total / 20))} ·{" "}
            {work.total} histories
          </span>
          <button
            type="button"
            className={button}
            disabled={work.loading || work.page * 20 >= work.total}
            onClick={() => {
              work.setPage(work.page + 1);
            }}
          >
            Next page
          </button>
        </nav>
      </section>
      {history && work.canRead && (
        <HistoryDialog
          key={history.id}
          row={history}
          close={() => {
            setHistory(null);
          }}
          download={work.download}
          canReview={work.canReview}
          viewerId={work.me ? String(work.me.id) : undefined}
          changed={() => {
            void work.load();
          }}
        />
      )}
      {archiving && work.canReview && (
        <ArchiveConfirmation
          key={`${work.me?.id}-${archiving.id}-${archiving.version}`}
          row={archiving}
          changed={() => {
            void work.load();
          }}
          close={() => {
            setArchiving(null);
          }}
        />
      )}
      {reading && (
        <ReadingDialog
          key={`${work.me?.id}-${reading.submission.id}`}
          row={reading.row}
          submission={reading.submission}
          canReview={work.canReview}
          viewerId={work.me ? String(work.me.id) : undefined}
          changed={() => {
            void work.load();
          }}
          download={work.download}
          close={() => {
            setReading(null);

            requestAnimationFrame(() => {
              document
                .querySelector<HTMLElement>(
                  'section[aria-label="GCash review queue"]',
                )
                ?.focus();
            });
          }}
        />
      )}
    </>
  );
}
