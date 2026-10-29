"use client";

import { formatPeso as currency } from "@/lib/currency";
import {
  getReportBatches,
  getReportSnapshots,
  submitReportAnalysis,
  supportSourceLabel,
} from "@/lib/api";
import { type ReportFilters } from "@/lib/report-filters";
import type {
  CollectionReport,
  CollectionSnapshot,
  Page,
  PaymentReport,
  ReconciliationReport,
  ReconciliationSnapshot,
  ReportBatchOption,
  ReportKind,
  ReportSnapshot,
  SupportReport,
  TaskReport,
} from "@freshphones/contracts";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
} from "react";
import ReconciliationResults from "./ReconciliationResults";
import ReportVisuals from "./ReportVisuals";
import styles from "./reports.module.css";

export type LoadedReport =
  | {
      kind: "reconciliation";
      data: ReconciliationReport | ReconciliationSnapshot;
    }
  | { kind: "payments"; data: PaymentReport }
  | { kind: "tasks"; data: TaskReport }
  | { kind: "support"; data: SupportReport }
  | { kind: "collections"; data: CollectionReport | CollectionSnapshot };

export const names = {
  payments: "Payments",
  collections: "Batch & Collections",
  reconciliation: "Reconciliation",
  tasks: "Tasks & KPI",
  support: "Support",
};

export const statusNames: Record<string, string> = {
  VERIFIED: "Verified",
  PENDING: "Pending review",
  NEEDS_CLARIFICATION: "Needs clarification",
  REJECTED: "Rejected",
  TODO: "To do",
  IN_PROGRESS: "In progress",
  SUBMITTED: "Submitted",
  DONE: "Done",
};

export const message = (error: unknown) => {
  return error instanceof Error
    ? error.message
    : "Could not complete this request.";
};

export const dateLabel = (date: string) => {
  return new Intl.DateTimeFormat("en-PH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
};

export const periodLabel = (filters: ReportFilters) => {
  return `${filters.dateFrom ? dateLabel(filters.dateFrom) : "All earlier dates"} – ${filters.dateTo ? dateLabel(filters.dateTo) : "All later dates"}`;
};

export function BatchPicker({
  value,
  onChange,
}: {
  value: ReportBatchOption | null;
  onChange: (value: ReportBatchOption | null) => void;
}) {
  const id = useId();

  const [text, setText] = useState("");

  const [query, setQuery] = useState("");

  const [page, setPage] = useState(1);

  const [result, setResult] = useState<Page<ReportBatchOption> | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const sequence = useRef(0);

  const load = useCallback(async () => {
    const request = ++sequence.current;

    setLoading(true);

    setError(null);

    try {
      const rows = await getReportBatches({ q: query, page: String(page) });

      if (request === sequence.current) {
        setResult(rows);
      }
    } catch (reason) {
      if (request === sequence.current) {
        setError(message(reason));
      }
    } finally {
      if (request === sequence.current) {
        setLoading(false);
      }
    }
  }, [query, page]);

  useEffect(() => {
    void load();

    return () => {
      sequence.current++;
    };
  }, [load]);

  const search = () => {
    sequence.current++;

    setResult(null);

    setQuery(text.trim());

    setPage(1);

    if (query === text.trim() && page === 1) {
      void load();
    }
  };

  const rows = result?.items ?? [];

  return (
    <div className={styles.batchPicker}>
      <div className={styles.field}>
        <label htmlFor={id}>Batch</label>
        <select
          id={id}
          value={value?.id ?? ""}
          onChange={(event) => {
            return onChange(
              event.target.value
                ? [value, ...rows].find((item) => {
                    return item?.id === event.target.value;
                  })!
                : null,
            );
          }}
        >
          <option value="">All batches</option>
          {value &&
            !rows.some((item) => {
              return item.id === value.id;
            }) && <option value={value.id}>{value.code}</option>}
          {rows.map((item) => {
            return (
              <option key={item.id} value={item.id}>
                {item.code}
              </option>
            );
          })}
        </select>
      </div>
      <label className={styles.field}>
        Find a batch code
        <input
          value={text}
          maxLength={100}
          placeholder="Search all batches…"
          onChange={(event) => {
            return setText(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();

              search();
            }
          }}
        />
      </label>
      <div className={styles.actions}>
        <button type="button" onClick={search}>
          Find batches
        </button>
      </div>
      <div className={styles.batchStatus}>
        {loading ? (
          <span role="status">Loading batch choices…</span>
        ) : error ? (
          <span role="alert">
            {error}{" "}
            <button
              type="button"
              onClick={() => {
                return void load();
              }}
            >
              Retry batches
            </button>
          </span>
        ) : (
          <>
            <span>
              {result?.total ?? 0} matching batches · Page {page}
            </span>
            <button
              type="button"
              aria-label="Previous batch choices"
              disabled={page === 1}
              onClick={() => {
                sequence.current++;

                setPage(page - 1);
              }}
            >
              Previous
            </button>
            <button
              type="button"
              aria-label="Next batch choices"
              disabled={!result || page * result.pageSize >= result.total}
              onClick={() => {
                sequence.current++;

                setPage(page + 1);
              }}
            >
              Next
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function Metrics({
  items,
}: {
  items: { label: string; value: string | number; note?: string }[];
}) {
  return (
    <dl className={styles.metrics}>
      {items.map((item) => {
        return (
          <div key={item.label}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
            {item.note && <p>{item.note}</p>}
          </div>
        );
      })}
    </dl>
  );
}

export function ReportResults({
  report,
  onPage,
  pageDisabled,
  scope,
  canReviewPayments = false,
}: {
  report: LoadedReport;
  onPage?: (page: number) => void;
  pageDisabled?: boolean;
  scope?: Record<string, string>;
  canReviewPayments?: boolean;
}) {
  if (report.kind === "reconciliation") {
    return (
      <ReconciliationResults
        data={report.data}
        scope={scope}
        canReview={canReviewPayments}
        onPage={onPage}
        disabled={pageDisabled}
      />
    );
  }

  if (report.kind === "collections") {
    return (
      <CollectionResults
        data={report.data}
        onPage={onPage}
        disabled={pageDisabled}
      />
    );
  }

  if (report.kind === "payments") {
    const data = report.data;

    // Older saved payment summaries predate the total and rejected fields.
    const total =
      data.total ??
      data.verifiedPayments +
        data.pendingVerification +
        data.needsClarification;

    return (
      <>
        <Metrics
          items={[
            {
              label: "Verified collections",
              value: currency(data.verifiedAmount),
              note: `${data.verifiedPayments} verified payments`,
            },
            {
              label: "Finance adjustments",
              value:
                data.adjustmentAmount === undefined
                  ? "Not captured"
                  : currency(data.adjustmentAmount),
              note: "Included in verified credit; original payment dates determine the period",
            },
            {
              label: "Awaiting verification",
              value: currency(data.pendingAmount),
              note: `${data.pendingVerification} pending payments`,
            },
            { label: "Needs clarification", value: data.needsClarification },
            {
              label: "Rejected",
              value: data.rejectedPayments ?? "Not captured",
            },
          ]}
        />
        {total === 0 && (
          <p className={styles.empty}>No payments match these filters.</p>
        )}
        <p className={styles.help}>
          Operational reporting only. These figures are not an official BIR
          invoice or a payment receipt.
        </p>
      </>
    );
  }

  if (report.kind === "tasks") {
    const data = report.data;

    return (
      <>
        <Metrics
          items={[
            { label: "Tasks created", value: data.total },
            { label: "Submitted", value: data.submitted },
            { label: "Late submissions", value: data.late },
            { label: "Human KPI reviews", value: data.reviewed },
          ]}
        />
        {data.total === 0 ? (
          <p className={styles.empty}>No tasks were created in this period.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table>
              <caption>Task status totals</caption>
              <thead>
                <tr>
                  <th scope="col">Status</th>
                  <th scope="col">Tasks</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data.byStatus).map(([status, total]) => {
                  return (
                    <tr key={status}>
                      <th scope="row">{statusNames[status] ?? status}</th>
                      <td>{total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className={styles.help}>{data.disclaimer}</p>
      </>
    );
  }

  const data = report.data;

  return (
    <>
      <Metrics
        items={[
          { label: "Cases created", value: data.total },
          { label: "Open cases", value: data.open },
          { label: "Resolved or closed", value: data.closed },
        ]}
      />
      {data.total === 0 ? (
        <p className={styles.empty}>
          No support cases were created in this period.
        </p>
      ) : (
        <>
          <div className={styles.tableWrap}>
            <table>
              <caption>Support categories and turnaround</caption>
              <thead>
                <tr>
                  <th scope="col">Category</th>
                  <th scope="col">Cases</th>
                  <th scope="col">Closed with timing</th>
                  <th scope="col">Average turnaround</th>
                </tr>
              </thead>
              <tbody>
                {data.categories.map((item) => {
                  return (
                    <tr key={item.category}>
                      <th scope="row">{item.category}</th>
                      <td>{item.total}</td>
                      <td>{item.closed}</td>
                      <td>
                        {item.averageTurnaroundHours === null
                          ? "No timed closures"
                          : `${item.averageTurnaroundHours} hours`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {data.sources && (
            <div className={styles.tableWrap}>
              <table>
                <caption>Support cases by contact source</caption>
                <thead>
                  <tr>
                    <th scope="col">Source</th>
                    <th scope="col">Cases</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sources.map((item) => {
                    return (
                      <tr key={item.source}>
                        <th scope="row">{supportSourceLabel(item.source)}</th>
                        <td>{item.total}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      <p className={styles.help}>
        Turnaround uses cases with a recorded closure time. Individual concerns,
        replies and contact details are excluded.
      </p>
    </>
  );
}

export function CollectionResults({
  data,
  onPage,
  disabled = false,
}: {
  data: CollectionReport | CollectionSnapshot;
  onPage?: (page: number) => void;
  disabled?: boolean;
}) {
  const [savedPage, setSavedPage] = useState(1);

  const live = "items" in data;

  const page = live ? data.page : savedPage;

  const total = live ? data.total : data.batches.length;

  const pageSize = live ? data.pageSize : 20;

  const rows = live
    ? data.items
    : data.batches.slice((page - 1) * pageSize, page * pageSize);

  const changePage = live ? onPage : setSavedPage;

  const totals = data.totals;

  return (
    <>
      <h3 className={styles.subheading}>Collections in the selected period</h3>
      <Metrics
        items={[
          {
            label: "Verified in period",
            value: currency(totals.collectedInPeriod),
            note: `${totals.verifiedPaymentsInPeriod} verified payments`,
          },
          {
            label: "Pending in period",
            value: currency(totals.pendingInPeriod),
            note: `${totals.pendingPaymentsInPeriod} pending payments · excluded from balances`,
          },
        ]}
      />
      <h3 className={styles.subheading}>
        {live ? "Current overall totals" : "Overall totals captured when saved"}
      </h3>
      <Metrics
        items={[
          {
            label: "Clients in scoped batches",
            value: totals.clients,
            note: `${total} batches · ${totals.scheduledClients} clients with issued schedules`,
          },
          {
            label: "Without issued schedule",
            value: totals.clientsWithoutSchedule,
            note: "Agreed amounts are unknown until Records issues a schedule",
          },
          {
            label: "Agreed / issued total",
            value: currency(totals.agreedAmount),
          },
          { label: "Verified overall", value: currency(totals.verifiedAmount) },
          {
            label: "Finance adjustments overall",
            value:
              totals.adjustmentAmount === undefined
                ? "Not captured"
                : currency(totals.adjustmentAmount),
            note: "Included in verified credit",
          },
          {
            label: "Pending overall",
            value: currency(totals.pendingAmount),
            note: "Excluded from balances",
          },
          {
            label: "Remaining overall",
            value: currency(totals.remainingBalance),
            note: "Outstanding amounts added per client",
          },
          {
            label: "Overpaid / unapplied",
            value: currency(totals.overpaidAmount),
            note: "Including verified funds without an issued schedule",
          },
        ]}
      />
      {totals.clientsWithoutSchedule > 0 && (
        <p className={styles.warning}>
          {totals.clientsWithoutSchedule} clients have no issued schedule. Their
          agreed total is unknown; Records needs to review their payment terms.
        </p>
      )}
      {total === 0 ? (
        <p className={styles.empty}>No batches match these filters.</p>
      ) : (
        <>
          <div
            className={styles.tableWrap}
            tabIndex={0}
            role="region"
            aria-label="Batch collection figures"
          >
            <table className={styles.collectionTable}>
              <caption>
                Per-batch overall totals and collections in the selected period
                (PHP)
              </caption>
              <thead>
                <tr>
                  {[
                    "Batch",
                    "Status",
                    "Clients",
                    "Agreed / issued",
                    "Verified overall",
                    "Pending overall",
                    "Remaining overall",
                    "Overpaid / unapplied",
                    "Verified in period",
                    "Pending in period",
                  ].map((label) => {
                    return (
                      <th key={label} scope="col">
                        {label}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  return (
                    <tr key={row.id}>
                      <th scope="row">{row.code}</th>
                      <td>{row.status.toLowerCase().replaceAll("_", " ")}</td>
                      <td>
                        {row.clients}
                        <small>
                          {row.scheduledClients} scheduled ·{" "}
                          {row.clientsWithoutSchedule} without schedule
                        </small>
                      </td>
                      <td>{currency(row.agreedAmount)}</td>
                      <td>{currency(row.verifiedAmount)}</td>
                      <td>{currency(row.pendingAmount)}</td>
                      <td>{currency(row.remainingBalance)}</td>
                      <td>{currency(row.overpaidAmount)}</td>
                      <td>
                        {currency(row.collectedInPeriod)}
                        <small>{row.verifiedPaymentsInPeriod} payments</small>
                      </td>
                      <td>
                        {currency(row.pendingInPeriod)}
                        <small>{row.pendingPaymentsInPeriod} payments</small>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <nav
            className={styles.pagination}
            aria-label={live ? "Batch report pages" : "Captured batch pages"}
          >
            <span>{total} batches · Totals cover every scoped batch</span>
            <button
              type="button"
              disabled={disabled || page === 1 || !changePage}
              onClick={() => {
                return changePage?.(page - 1);
              }}
            >
              Previous batches
            </button>
            <span>
              Page {page} of {Math.max(1, Math.ceil(total / pageSize))}
            </span>
            <button
              type="button"
              disabled={disabled || page * pageSize >= total || !changePage}
              onClick={() => {
                return changePage?.(page + 1);
              }}
            >
              Next batches
            </button>
          </nav>
        </>
      )}
      <p className={styles.help}>
        Balances use issued schedule amounts and verified payments across all
        dates. Each client belongs to their current batch. Overpayments cannot
        offset another client’s balance. Overpaid amounts are not a refund
        authorization.
      </p>
      {live ? (
        <p className={styles.help}>
          CSV, XLSX and saved reports include all scoped batches, across every
          page. These are current totals, not historical balances as of the
          selected end date.
        </p>
      ) : (
        <p className={styles.help}>
          These overall totals were captured when the report was saved. They are
          not historical balances as of the period end date.
        </p>
      )}
    </>
  );
}

export function ReportHistory({
  kind,
  canWriteReports = false,
  showVisuals = false,
}: {
  kind: ReportKind;
  canWriteReports?: boolean;
  showVisuals?: boolean;
}) {
  const [page, setPage] = useState(1);

  const [result, setResult] = useState<Page<ReportSnapshot> | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const sequence = useRef(0);

  const load = useCallback(async () => {
    const request = ++sequence.current;

    setLoading(true);

    setError(null);

    setResult(null);

    try {
      const rows = await getReportSnapshots(
        kind.toUpperCase() as ReportSnapshot["kind"],
        page,
      );

      if (request !== sequence.current) {
        return;
      }

      const last = Math.max(1, Math.ceil(rows.total / rows.pageSize));

      if (page > last) {
        setPage(last);

        return;
      }

      setResult(rows);
    } catch (reason) {
      if (request === sequence.current) {
        setError(message(reason));
      }
    } finally {
      if (request === sequence.current) {
        setLoading(false);
      }
    }
  }, [kind, page]);

  useEffect(() => {
    void load();

    return () => {
      sequence.current++;
    };
  }, [load]);

  const latest = () => {
    if (page !== 1) {
      sequence.current++;

      setPage(1);
    } else {
      void load();
    }
  };

  return (
    <section
      className={styles.panel}
      aria-labelledby="report-history-title"
      aria-busy={loading}
    >
      <div className={styles.sectionHeading}>
        <div>
          <h2 id="report-history-title">
            Saved {names[kind].toLowerCase()} reports
          </h2>
          <p className={styles.help}>
            Captured figures from prior periods. Changes to live records do not
            alter these saved reports.
          </p>
        </div>
        <button type="button" disabled={loading} onClick={latest}>
          Refresh history
        </button>
      </div>
      {loading ? (
        <p role="status" className={styles.empty}>
          Loading saved reports…
        </p>
      ) : error ? (
        <p role="alert" className={styles.error}>
          {error}{" "}
          <button
            type="button"
            onClick={() => {
              return void load();
            }}
          >
            Retry history
          </button>
        </p>
      ) : result?.items.length ? (
        <div className={styles.history}>
          {result.items.map((item) => {
            return (
              <SavedReport
                key={item.id}
                item={item}
                canWriteReports={canWriteReports}
                showVisuals={showVisuals}
                onSubmitted={() => {
                  return void load();
                }}
              />
            );
          })}
        </div>
      ) : (
        <p className={styles.empty}>
          {canWriteReports
            ? "No saved reports yet. Choose a period and use ‘Save period report’ to retain its figures."
            : "No saved reports are available for this report type yet."}
        </p>
      )}
      <nav className={styles.pagination} aria-label="Saved report pages">
        <span>{result?.total ?? "—"} saved reports</span>
        <button
          type="button"
          disabled={loading || page === 1}
          onClick={() => {
            sequence.current++;

            setPage(page - 1);
          }}
        >
          Previous
        </button>
        <span>
          Page {page} of {Math.max(1, Math.ceil((result?.total ?? 0) / 20))}
        </span>
        <button
          type="button"
          disabled={
            loading || !result || page * result.pageSize >= result.total
          }
          onClick={() => {
            sequence.current++;

            setPage(page + 1);
          }}
        >
          Next
        </button>
      </nav>
    </section>
  );
}

export function SavedReport({
  item,
  onSubmitted,
  canWriteReports = false,
  showVisuals = false,
}: {
  item: ReportSnapshot;
  onSubmitted: () => void;
  canWriteReports?: boolean;
  showVisuals?: boolean;
}) {
  const [draft, setDraft] = useState("");

  const [busy, setBusy] = useState(false);

  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();

    if (!canWriteReports || busy || draft.trim().length < 20) {
      return;
    }

    setBusy(true);

    setError(null);

    try {
      await submitReportAnalysis(item.id, draft.trim());

      onSubmitted();
    } catch (reason) {
      setError(message(reason));
    } finally {
      setBusy(false);
    }
  }

  const report: LoadedReport =
    item.kind === "PAYMENTS"
      ? { kind: "payments", data: item.payload }
      : item.kind === "RECONCILIATION"
        ? { kind: "reconciliation", data: item.payload }
        : item.kind === "COLLECTIONS"
          ? { kind: "collections", data: item.payload }
          : item.kind === "TASKS"
            ? { kind: "tasks", data: item.payload }
            : { kind: "support", data: item.payload };

  const filters =
    item.kind === "PAYMENTS" ||
    item.kind === "COLLECTIONS" ||
    item.kind === "RECONCILIATION"
      ? item.payload.filters
      : undefined;

  const status =
    item.kind === "PAYMENTS" ? item.payload.filters?.status : undefined;

  return (
    <details className={styles.saved}>
      <summary>
        <strong>
          {dateLabel(item.periodStart)} – {dateLabel(item.periodEnd)}
        </strong>
        <span>
          {item.kind === "PAYMENTS" ||
          item.kind === "COLLECTIONS" ||
          item.kind === "RECONCILIATION"
            ? filters?.batchCode
              ? `Batch ${filters.batchCode}`
              : "All batches"
            : "Created in this period"}
          {status ? ` · ${statusNames[status]}` : ""}
        </span>
        <small>
          Saved by {item.createdBy.name} ·{" "}
          {new Intl.DateTimeFormat("en-PH", {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: "Asia/Manila",
          }).format(new Date(item.createdAt))}{" "}
          (Manila)
        </small>
        <span className={styles.viewSaved}>
          {item.analysis
            ? "View figures and submitted analysis"
            : "View figures · Analysis pending"}
        </span>
      </summary>
      <div className={styles.savedFigures}>
        {item.analysis ? (
          <section
            className={styles.submittedAnalysis}
            aria-label="Submitted period analysis"
          >
            <h3>Submitted analysis</h3>
            <p>{item.analysis.body}</p>
            <small>
              Submitted by {item.analysis.submittedBy.name} ·{" "}
              {new Intl.DateTimeFormat("en-PH", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "Asia/Manila",
              }).format(new Date(item.analysis.createdAt))}{" "}
              (Manila)
            </small>
          </section>
        ) : canWriteReports ? (
          <form onSubmit={submit} className={styles.analysisEntry}>
            <label htmlFor={`analysis-${item.id}`}>
              Submit analysis for this saved period
            </label>
            <p className={styles.help}>
              This becomes a permanent part of this report. Avoid names, contact
              details and private evidence.
            </p>
            <textarea
              id={`analysis-${item.id}`}
              value={draft}
              onChange={(event) => {
                return setDraft(event.target.value);
              }}
              minLength={20}
              maxLength={4000}
              rows={5}
              required
              disabled={busy}
              placeholder="Describe the period’s findings and follow-up."
            />
            <small>{draft.length}/4000 characters</small>
            {error && (
              <p role="alert" className={styles.error}>
                {error}
              </p>
            )}
            <button
              type="submit"
              className={styles.primary}
              disabled={busy || draft.trim().length < 20}
            >
              {busy ? "Submitting…" : "Submit analysis"}
            </button>
          </form>
        ) : (
          <p className={styles.help}>
            No analysis has been submitted for this saved period.
          </p>
        )}
        {showVisuals && <ReportVisuals report={report} />}
        <ReportResults report={report} />
      </div>
    </details>
  );
}

export { formatPeso as currency } from "@/lib/currency";
