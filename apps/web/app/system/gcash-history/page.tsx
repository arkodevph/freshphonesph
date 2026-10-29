"use client";

import { useEffect, useState } from "react";
import type { GcashHistory, GcashHistoryStatus } from "@freshphones/contracts";
import { Field, inputCls } from "@/components/FormField";
import { useGcashHistory } from "./useGcashHistory";
import { ReadingDialog } from "./ReadingDialog";
import { GcashFeedback } from "./GcashFeedback";
import { PdfPasswordField } from "./PdfPasswordField";
import { HistoryDialog } from "./HistoryDialog";

const button =
  "rounded-xl border border-slate-200 px-3 py-2 text-sm font-600 disabled:opacity-50";

function ReviewForm({
  row,
  saving,
  submit,
  cancel,
  refresh,
  download,
  read,
}: {
  row: GcashHistory;
  saving: boolean;
  submit: (value: {
    version: number;
    status: "REVIEWED" | "NEEDS_CLARIFICATION";
    note: string;
  }) => Promise<void>;
  cancel: () => void;
  refresh: () => Promise<void>;
  download: () => Promise<void>;
  read: () => void;
}) {
  const [status, setStatus] = useState<"REVIEWED" | "NEEDS_CLARIFICATION">(
    "REVIEWED",
  );

  const [note, setNote] = useState("");

  return (
    <form
      aria-label="Review GCash PDF"
      className="glass mb-5 rounded-3xl p-5"
      onSubmit={(event) => {
        event.preventDefault();

        void submit({ version: row.version, status, note });
      }}
    >
      <h2 className="font-display text-lg font-700">
        Review {row.batch.code} · revision {row.revision}
      </h2>
      <p className="mb-3 text-sm text-ink-soft">
        {row.periodStart} to {row.periodEnd}. Review the full PDF before
        recording your decision.
      </p>
      <button
        type="button"
        className={button}
        onClick={() => {
          void download();
        }}
      >
        Download PDF for this review
      </button>
      {row.current.reading && (
        <button type="button" className={button} onClick={read}>
          View extracted transactions
        </button>
      )}
      {row.status !== "SUBMITTED" && (
        <p role="status">
          This submission is now {row.status.replaceAll("_", " ").toLowerCase()}
          . Close this review and check the queue.
        </p>
      )}
      <fieldset
        disabled={saving || row.status !== "SUBMITTED"}
        className="mt-3 grid gap-3 sm:grid-cols-2"
      >
        <Field label="Records decision">
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as typeof status);
            }}
            className={inputCls}
          >
            <option value="REVIEWED">Reviewed</option>
            <option value="NEEDS_CLARIFICATION">Needs clarification</option>
          </select>
        </Field>
        <Field label="Review note">
          <textarea
            required
            maxLength={2000}
            value={note}
            onChange={(event) => {
              setNote(event.target.value);
            }}
            className={inputCls}
            placeholder="What was checked, or what needs correcting"
          />
        </Field>
      </fieldset>
      <p className="my-3 text-xs text-ink-soft">
        Records review does not verify payments or change member balances.
        Finance retains final verification.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          className="btn-candy rounded-xl px-4 py-2"
          disabled={saving || !note.trim() || row.status !== "SUBMITTED"}
        >
          {saving ? "Saving…" : "Save Records review"}
        </button>
        <button
          type="button"
          disabled={saving}
          className={button}
          onClick={() => {
            void refresh();
          }}
        >
          Load latest submission
        </button>
        <button
          type="button"
          disabled={saving}
          className={button}
          onClick={cancel}
        >
          Close review
        </button>
      </div>
    </form>
  );
}

export default function GcashHistoryPage() {
  const work = useGcashHistory();

  const [history, setHistory] = useState<GcashHistory | null>(null);

  const [reading, setReading] = useState<{
    id: string;
    fileName: string;
  } | null>(null);

  useEffect(() => {
    setHistory(null);

    setReading(null);
  }, [work.me?.id, work.canRead]);

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
          Full transaction-history PDFs · Handler submission · Records review
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
      {work.reviewing && work.canReview && (
        <ReviewForm
          key={work.reviewing.id}
          row={work.reviewing}
          saving={work.saving}
          read={() => {
            if (work.reviewing) {
              setReading(work.reviewing.current);
            }
          }}
          submit={work.review}
          cancel={() => {
            work.setReviewing(null);
          }}
          refresh={work.refreshReview}
          download={() => {
            return work.download(
              work.reviewing!.current.id,
              work.reviewing!.current.fileName,
            );
          }}
        />
      )}
      <section
        className="glass rounded-3xl p-5"
        aria-label="GCash review queue"
      >
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <Field label="Search batch">
            <input
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
                <article
                  key={row.id}
                  className="min-w-0 rounded-2xl border border-slate-200 p-4"
                  aria-label={`${row.batch.code} revision ${row.revision}`}
                >
                  <div className="flex flex-wrap justify-between gap-2">
                    <h2 className="font-display font-700 text-blue-ink">
                      {row.batch.code} · revision {row.revision}
                    </h2>
                    <span className="text-sm font-600">
                      {row.status === "SUBMITTED"
                        ? "Awaiting Records review"
                        : row.status === "REVIEWED"
                          ? "Reviewed"
                          : "Needs clarification"}
                    </span>
                  </div>
                  <p className="my-1 text-sm">
                    {row.periodStart} to {row.periodEnd}
                  </p>
                  <p className="break-words text-sm">
                    {row.current.fileName} · {row.current.uploadedBy.name}
                  </p>
                  {row.current.reading && (
                    <p className="my-2 text-sm text-ink-soft">
                      {row.current.reading.transactionCount} transactions read
                      {row.current.reading.warningCount
                        ? " · Reading needs checking"
                        : " · Totals checked"}
                    </p>
                  )}
                  {row.current.note && (
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm">
                      Handler: {row.current.note}
                    </p>
                  )}
                  {row.current.reviewNote && (
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm">
                      Records: {row.current.reviewNote} ·{" "}
                      {row.current.reviewedBy?.name}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={button}
                      onClick={() => {
                        void work.download(
                          row.current.id,
                          row.current.fileName,
                        );
                      }}
                    >
                      Download PDF
                    </button>
                    <button
                      type="button"
                      className={button}
                      onClick={() => {
                        setHistory(row);
                      }}
                    >
                      PDF history
                    </button>
                    {row.current.reading && (
                      <button
                        type="button"
                        className={button}
                        onClick={() => {
                          setReading(row.current);
                        }}
                      >
                        View extracted transactions
                      </button>
                    )}
                    {work.canReview && row.status === "SUBMITTED" && (
                      <button
                        type="button"
                        className={button}
                        disabled={work.saving}
                        onClick={() => {
                          work.setReviewing(row);

                          work.setError(null);
                        }}
                      >
                        Review submission
                      </button>
                    )}
                    {work.canUpload && row.status === "NEEDS_CLARIFICATION" && (
                      <button
                        type="button"
                        className={button}
                        disabled={work.saving}
                        onClick={() => {
                          work.correct(row);
                        }}
                      >
                        Submit corrected PDF
                      </button>
                    )}
                  </div>
                </article>
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
        />
      )}
      {reading && (
        <ReadingDialog
          key={reading.id}
          id={reading.id}
          filename={reading.fileName}
          close={() => {
            setReading(null);
          }}
        />
      )}
    </>
  );
}
