"use client";

import WorkspaceProgress from "@/app/system/_role-designs/agent/components/WorkspaceProgress";
import WorkspaceDetails from "@/app/system/_role-designs/agent/components/WorkspaceDetails";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { reportFilterQuery, type ReportFilters } from "@/lib/report-filters";
import type { ReportBatchOption, ReportKind } from "@freshphones/contracts";
import { DownloadSimple, FloppyDisk } from "@phosphor-icons/react";
import SplitButton from "@/app/system/_role-designs/agent/components/SplitButton";
import styles from "@/app/system/_role-designs/agent/app/system/reports/reports.module.css";
import ReportTabs from "@/app/system/_role-designs/agent/app/system/reports/ReportTabs";
import ReportVisuals from "@/app/system/_role-designs/agent/app/system/reports/ReportVisuals";
import ReportHighlights from "@/app/system/_role-designs/agent/app/system/reports/ReportHighlights";
import {
  LoadedReport,
  names,
  periodLabel,
  ReportResults,
  statusNames,
} from "@/app/system/_role-designs/agent/app/system/reports/report-view";

type Props = {
  history?: ReactNode;
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
  error: string | null;
  canReviewPayments: boolean;
  canWriteReports: boolean;
  showVisuals: boolean;
  onPage: (page: number) => void;
  analysisDraft: string;
  onAnalysisChange: (value: string) => void;
};

export default function ReportResultsPanel({
  history,
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
  error,
  canReviewPayments,
  canWriteReports,
  showVisuals,
  onPage,
  analysisDraft,
  onAnalysisChange,
}: Props) {
  const [view, setView] = useState("overview");

  const content = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (content.current) {
      content.current.scrollTop = 0;
    }
  }, [view, kind, applied, report]);

  return (
    <section
      className={`${styles.panel} ${showVisuals ? styles.resultsPanel : ""}`}
      aria-labelledby="report-results-title"
      aria-busy={loading}
    >
      <div className={styles.sectionHeading}>
        <div>
          <h2 id="report-results-title">{names[kind]} report</h2>
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
            {loading && <WorkspaceProgress label="Refreshing figures" />}
            Refresh figures
          </button>
          <SplitButton
            label={
              busy === "csv" || busy === "xlsx" ? "Downloading…" : "Export CSV"
            }
            icon={<DownloadSimple aria-hidden="true" />}
            disabled={loading || !report || dirty || Boolean(busy)}
            onAction={() => {
              return void runAction("csv");
            }}
            menuLabel="Report export options"
            actions={[
              {
                label: "Export Excel (.xlsx)",
                icon: <DownloadSimple aria-hidden="true" />,
                onAction: () => {
                  return void runAction("xlsx");
                },
              },
            ]}
          />
          {canWriteReports && (
            <button
              type="button"
              data-variant="primary"
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
      {showVisuals && (
        <ReportTabs
          label="Report view"
          variant="views"
          sliding
          disabled={false}
          value={view}
          onValueChange={setView}
          items={[
            { value: "overview", label: "Overview" },
            { value: "records", label: "Detailed figures" },
            { value: "history", label: "Saved reports" },
          ]}
        />
      )}
      <div
        className={styles.reportContent}
        ref={content}
        tabIndex={showVisuals ? 0 : undefined}
        role={showVisuals ? "region" : undefined}
        aria-label={
          showVisuals
            ? `${names[kind]} ${view === "overview" ? "overview" : view === "records" ? "detailed figures" : "saved reports"}`
            : undefined
        }
      >
        {showVisuals && view === "history" ? (
          history
        ) : (
          <>
            {actionError && (
              <p role="alert" className={styles.error}>
                {actionError}
              </p>
            )}
            {loading && !report ? (
              <div
                role="status"
                aria-label="Loading report figures"
                data-report-skeleton
              >
                <span className="sr-only">Loading report figures</span>
                <div aria-hidden="true">
                  {showVisuals && view === "overview" ? (
                    <>
                      <ReportHighlights
                        report={null}
                        kind={kind}
                        filters={applied}
                      />
                      <ReportVisuals report={null} kind={kind} />
                    </>
                  ) : (
                    <WorkspaceProgress
                      className={styles.empty}
                      label="Loading detailed report figures"
                    />
                  )}
                </div>
              </div>
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
                  {showVisuals && view === "overview" && (
                    <ReportHighlights report={report} filters={applied} />
                  )}
                  {showVisuals && view === "overview" && (
                    <ReportVisuals report={report} />
                  )}
                  {showVisuals &&
                    view === "overview" &&
                    report.kind === "payments" && (
                      <div className={styles.readingNote}>
                        <strong>Read the figures correctly</strong>
                        <p>
                          Only Finance-verified payments reduce balances.
                          Pending claims are shown separately. Corrections are
                          already included in verified credit; these are
                          collections, not profit or scheduled earnings.
                        </p>
                      </div>
                    )}
                  {(!showVisuals || view === "records") && (
                    <WorkspaceDetails className={styles.detailDisclosure} open>
                      <summary>
                        Detailed figures &amp; report notes{" "}
                        <span>
                          Definitions, adjustments and supporting records
                        </span>
                      </summary>
                      <ReportResults
                        report={report}
                        scope={
                          reportFilterQuery(kind, applied).params ?? undefined
                        }
                        canReviewPayments={canReviewPayments}
                        pageDisabled={dirty || Boolean(busy)}
                        onPage={onPage}
                      />
                    </WorkspaceDetails>
                  )}
                </>
              )
            )}
            {canWriteReports && (!showVisuals || view === "records") && (
              <>
                <div className={styles.analysisEntry}>
                  <label htmlFor="report-period-analysis">
                    Analysis for this saved period
                  </label>
                  <span id="report-analysis-help" className={styles.help}>
                    Optional. Human-written; visible to all report viewers.
                    Summarize trends and actions without customer names, contact
                    details or private task evidence.
                  </span>
                  <textarea
                    id="report-period-analysis"
                    aria-describedby="report-analysis-help report-analysis-count"
                    value={analysisDraft}
                    onChange={(event) => {
                      onAnalysisChange(event.target.value);
                    }}
                    disabled={loading || Boolean(busy)}
                    maxLength={4000}
                    rows={5}
                    placeholder="What do the figures mean for this period?"
                  />
                  <small id="report-analysis-count">
                    {analysisDraft.length}/4000 characters
                  </small>
                </div>
                <div className={styles.actions}>
                  <button
                    type="button"
                    data-variant="primary"
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
            {(!showVisuals || view === "records") && (
              <p className={styles.help}>
                {canWriteReports ? (
                  <>
                    Downloads contain only report fields. Choose both dates to
                    save a period report; saved figures and submitted analysis
                    stay as they were at submission. You can add analysis later
                    to a saved report that has none.
                  </>
                ) : (
                  "Downloads contain only report fields. Saved figures and submitted analysis are available in the report history below."
                )}
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
