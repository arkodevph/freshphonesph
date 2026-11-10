"use client";

import { reportFilterQuery, type ReportFilters } from "@/lib/report-filters";
import type { ReportBatchOption, ReportKind } from "@freshphones/contracts";
import { DownloadSimple, FloppyDisk } from "@phosphor-icons/react";
import styles from "./reports.module.css";
import ReportVisuals from "./ReportVisuals";
import {
  LoadedReport,
  names,
  periodLabel,
  ReportResults,
  statusNames,
} from "./report-view";

type Props = {
  loading: boolean;
  kind: ReportKind;
  applied: ReportFilters;
  appliedBatch: ReportBatchOption | null;
  busy: "csv" | "xlsx" | "save" | null;
  load: () => Promise<void>;
  report: LoadedReport | null;
  dirty: boolean;
  runAction: (action: "csv" | "xlsx" | "save") => Promise<void>;
  actionError: string | null;
  notice: string | null;
  error: string | null;
  canReviewPayments: boolean;
  canWriteReports: boolean;
  showVisuals: boolean;
  onPage: (page: number) => void;
  analysisDraft: string;
  onAnalysisChange: (value: string) => void;
};

export default function ReportResultsPanel({
  loading,
  kind,
  applied,
  appliedBatch,
  busy,
  load,
  report,
  dirty,
  runAction,
  actionError,
  notice,
  error,
  canReviewPayments,
  canWriteReports,
  showVisuals,
  onPage,
  analysisDraft,
  onAnalysisChange,
}: Props) {
  return (
    <section
      className={styles.panel}
      aria-labelledby="report-results-title"
      aria-busy={loading}
    >
      <div className={styles.sectionHeading}>
        <div>
          <h2 id="report-results-title">{names[kind]} overview</h2>
          <p className={styles.help}>
            Applied period: {periodLabel(applied)}
            {kind === "payments" && applied.status
              ? ` · ${statusNames[applied.status]}`
              : ""}
            {["payments", "collections", "reconciliation"].includes(kind) &&
            applied.batchId
              ? ` · Batch ${appliedBatch?.code ?? "selected"}`
              : ""}
          </p>
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            disabled={loading || Boolean(busy)}
            onClick={() => {
              return void load();
            }}
          >
            Refresh figures
          </button>
          {(["csv", "xlsx"] as const).map((format) => {
            return (
              <button
                key={format}
                type="button"
                disabled={loading || !report || dirty || Boolean(busy)}
                onClick={() => {
                  return void runAction(format);
                }}
              >
                <DownloadSimple aria-hidden="true" />
                {busy === format ? "Downloading…" : format.toUpperCase()}
              </button>
            );
          })}
          {canWriteReports && (
            <button
              type="button"
              className={styles.primary}
              disabled={
                loading ||
                !report ||
                dirty ||
                Boolean(busy) ||
                !applied.dateFrom ||
                !applied.dateTo
              }
              onClick={() => {
                return void runAction("save");
              }}
            >
              <FloppyDisk aria-hidden="true" />
              {busy === "save" ? "Saving…" : "Save period report"}
            </button>
          )}
        </div>
      </div>
      {actionError && (
        <p role="alert" className={styles.error}>
          {actionError}
        </p>
      )}
      {notice && (
        <p role="status" className={styles.notice}>
          {notice}
        </p>
      )}
      {loading ? (
        <p role="status" className={styles.empty}>
          Loading report figures…
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
            Retry report
          </button>
        </p>
      ) : (
        report && (
          <>
            {showVisuals && <ReportVisuals report={report} />}
            <ReportResults
              report={report}
              scope={reportFilterQuery(kind, applied).params ?? undefined}
              canReviewPayments={canReviewPayments}
              pageDisabled={dirty || Boolean(busy)}
              onPage={onPage}
            />
          </>
        )
      )}
      {canWriteReports && (
        <>
          <label className={styles.analysisEntry}>
            Analysis for this saved period{" "}
            <span className={styles.help}>
              Optional. Human-written; visible to all report viewers. Summarize
              trends and actions without customer names, contact details or
              private task evidence.
            </span>
            <textarea
              value={analysisDraft}
              onChange={(event) => {
                onAnalysisChange(event.target.value);
              }}
              disabled={loading || Boolean(busy)}
              maxLength={4000}
              rows={5}
              placeholder="What do the figures mean for this period?"
            />
            <small>{analysisDraft.length}/4000 characters</small>
          </label>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primary}
              disabled={
                loading ||
                !report ||
                dirty ||
                Boolean(busy) ||
                !applied.dateFrom ||
                !applied.dateTo
              }
              onClick={() => {
                return void runAction("save");
              }}
            >
              <FloppyDisk aria-hidden="true" />
              {busy === "save"
                ? "Saving…"
                : analysisDraft.trim()
                  ? "Save period and analysis"
                  : "Save period report"}
            </button>
          </div>
        </>
      )}
      <p className={styles.help}>
        {canWriteReports ? (
          <>
            Downloads contain only report fields. Choose both dates to save a
            period report; saved figures and submitted analysis stay as they
            were at submission. You can add analysis later to a saved report
            that has none.
          </>
        ) : (
          "Downloads contain only report fields. Saved figures and submitted analysis are available in the report history below."
        )}
      </p>
    </section>
  );
}
