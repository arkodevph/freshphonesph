"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { toast } from "sonner";
import { ChartBar } from "@phosphor-icons/react";
import type { ReportBatchOption, ReportKind } from "@freshphones/contracts";
import {
  createReportSnapshot,
  downloadReportExport,
  getCollectionReport,
  getPaymentReport,
  getReconciliationReport,
  getSupportReport,
  getTaskReport,
} from "@/lib/api";
import {
  defaultReportFilters,
  reportFilterQuery,
  snapshotInput,
  type ReportFilters,
} from "@/lib/report-filters";
import styles from "@/app/system/_role-designs/system_admin/app/system/reports/reports.module.css";
import {
  LoadedReport,
  message,
  names,
  periodLabel,
  ReportHistory,
} from "@/app/system/_role-designs/system_admin/app/system/reports/report-view";
import ReportFiltersPanel from "@/app/system/_role-designs/system_admin/app/system/reports/ReportFiltersPanel";
import ReportResultsPanel from "@/app/system/_role-designs/system_admin/app/system/reports/ReportResultsPanel";
import InstallmentEarnings from "@/app/system/_role-designs/system_admin/app/system/reports/InstallmentEarnings";
import ReportTabs from "@/app/system/_role-designs/system_admin/app/system/reports/ReportTabs";

export default function ReportsDashboard({
  canReviewPayments = false,
  canWriteReports = false,
  showVisuals = false,
  minimalHeading = false,
  skeletonOnly = false,
  allowedKinds = [
    "payments",
    "collections",
    "reconciliation",
    "tasks",
    "support",
  ],
}: {
  canReviewPayments?: boolean;
  canWriteReports?: boolean;
  showVisuals?: boolean;
  minimalHeading?: boolean;
  skeletonOnly?: boolean;
  allowedKinds?: readonly ReportKind[];
}) {
  const [kind, setKind] = useState<ReportKind>(allowedKinds[0] ?? "tasks");

  const [showEarnings, setShowEarnings] = useState(false);

  const [draft, setDraft] = useState<ReportFilters>(defaultReportFilters);

  const [applied, setApplied] = useState<ReportFilters>(defaultReportFilters);

  const [batch, setBatch] = useState<ReportBatchOption | null>(null);

  const [appliedBatch, setAppliedBatch] = useState<ReportBatchOption | null>(
    null,
  );

  const [report, setReport] = useState<LoadedReport | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [validation, setValidation] = useState<string | null>(null);

  const [actionError, setActionError] = useState<string | null>(null);

  const [analysisDraft, setAnalysisDraft] = useState("");

  const [busy, setBusy] = useState<"csv" | "xlsx" | "save" | null>(null);

  const [historyRefresh, setHistoryRefresh] = useState(0);

  const [reportPage, setReportPage] = useState(1);

  const resultsViewport = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (resultsViewport.current) {
      resultsViewport.current.scrollTop = 0;
    }
  }, [kind, applied, reportPage, showEarnings, skeletonOnly]);

  const sequence = useRef(0);

  const operation = useRef(false);

  const mounted = useRef(true);

  const dirty = JSON.stringify(draft) !== JSON.stringify(applied);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (skeletonOnly || showEarnings) {
      return;
    }

    const query = reportFilterQuery(kind, applied);

    if (!query.params) {
      setValidation(query.error);

      return;
    }

    const request = ++sequence.current;

    setLoading(true);

    setError(null);

    try {
      const loaded: LoadedReport =
        kind === "payments"
          ? { kind, data: await getPaymentReport(query.params) }
          : kind === "reconciliation"
            ? {
                kind,
                data: await getReconciliationReport({
                  ...query.params,
                  page: String(reportPage),
                }),
              }
            : kind === "collections"
              ? {
                  kind,
                  data: await getCollectionReport({
                    ...query.params,
                    page: String(reportPage),
                  }),
                }
              : kind === "tasks"
                ? { kind, data: await getTaskReport(query.params) }
                : { kind, data: await getSupportReport(query.params) };

      if (
        request === sequence.current &&
        (loaded.kind === "collections" || loaded.kind === "reconciliation") &&
        "items" in loaded.data
      ) {
        const last = Math.max(
          1,
          Math.ceil(loaded.data.total / loaded.data.pageSize),
        );

        if (reportPage > last) {
          setReportPage(last);

          return;
        }
      }

      if (request === sequence.current) {
        setReport(loaded);
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
  }, [kind, applied, reportPage, showEarnings, skeletonOnly]);

  useEffect(() => {
    void load();

    return () => {
      sequence.current++;
    };
  }, [load]);

  function apply(event: FormEvent) {
    event.preventDefault();

    if (loading || busy) {
      return;
    }

    const query = reportFilterQuery(kind, draft);

    if (!query.params) {
      setValidation(query.error);

      return;
    }

    sequence.current++;

    setValidation(null);

    setActionError(null);

    setAnalysisDraft("");

    setLoading(true);

    setReport(null);

    setReportPage(1);

    setAppliedBatch(batch);

    setApplied({ ...draft });
  }

  function selectKind(next: ReportKind) {
    if ((next === kind && !showEarnings) || operation.current) {
      return;
    }

    sequence.current++;

    setShowEarnings(false);

    const filters = { ...applied, batchId: "", status: "" };

    setKind(next);

    setReportPage(1);

    setApplied(filters);

    setDraft(filters);

    setBatch(null);

    setAppliedBatch(null);

    setReport(null);

    setLoading(true);

    setError(null);

    setValidation(null);

    setActionError(null);

    setAnalysisDraft("");
  }

  function selectPage(page: number) {
    sequence.current++;

    setReport(null);

    setLoading(true);

    setReportPage(page);
  }

  function resetFilters() {
    const filters = defaultReportFilters();

    sequence.current++;

    setDraft(filters);

    setApplied(filters);

    setReportPage(1);

    setBatch(null);

    setAppliedBatch(null);

    setLoading(true);

    setReport(null);

    setValidation(null);

    setActionError(null);

    setAnalysisDraft("");
  }

  function selectBatch(item: ReportBatchOption | null) {
    setBatch(item);

    edit("batchId", item?.id ?? "");
  }

  function editAnalysis(value: string) {
    setAnalysisDraft(value);

    setActionError(null);
  }

  async function runAction(action: "csv" | "xlsx" | "save") {
    if (action === "save" && !canWriteReports) {
      return;
    }

    if (operation.current || loading || !report || dirty) {
      return;
    }

    const query = reportFilterQuery(kind, applied);

    if (!query.params) {
      setValidation(query.error);

      return;
    }

    const saved = snapshotInput(kind, applied);

    if (action === "save" && !saved.input) {
      setActionError(saved.error);

      return;
    }

    const written = analysisDraft.trim();

    if (action === "save" && written && written.length < 20) {
      setActionError(
        "Write at least 20 characters for analysis, or leave it blank and add it later.",
      );

      return;
    }

    operation.current = true;

    setBusy(action);

    setActionError(null);

    try {
      if (action === "save") {
        await createReportSnapshot({
          ...saved.input!,
          ...(written ? { analysis: written } : {}),
        });

        if (mounted.current) {
          setAnalysisDraft("");

          toast.success(
            written
              ? "Period report and analysis submitted. View them in the history below."
              : "Period report saved. You can submit analysis from its history entry.",
          );

          setHistoryRefresh((value) => {
            return value + 1;
          });
        }
      } else {
        await downloadReportExport(kind, action, query.params);

        if (mounted.current) {
          toast.success(
            `${action.toUpperCase()} download started for the applied filters.`,
          );
        }
      }
    } catch (reason) {
      if (mounted.current) {
        toast.error(message(reason));
      }
    } finally {
      operation.current = false;

      if (mounted.current) {
        setBusy(null);
      }
    }
  }

  const edit = (field: keyof ReportFilters, value: string) => {
    setDraft((current) => {
      return { ...current, [field]: value };
    });

    setValidation(null);
  };

  return (
    <div className={`${styles.page}${showVisuals ? ` ${styles.ceoPage}` : ""}`}>
      <header className={styles.heading}>
        {!showVisuals && (
          <div className={styles.titleIcon}>
            <ChartBar weight="fill" aria-hidden="true" />
          </div>
        )}
        <div>
          {!minimalHeading && (
            <p className={styles.kicker}>
              {showVisuals ? "Company reports" : "Operations overview"}
            </p>
          )}
          <h1>{minimalHeading ? "Reports" : "Business reports"}</h1>
          {!minimalHeading && (
            <p>
              A clear view of collections, payment health and team performance.
            </p>
          )}
        </div>
        <div className={styles.periodStamp}>
          <span>Reporting period</span>
          <strong>
            {showEarnings
              ? "Scheduled installment earnings"
              : periodLabel(applied)}
          </strong>
          <small>
            {showEarnings ||
            ["payments", "collections", "reconciliation"].includes(kind)
              ? "PHP · Philippine peso"
              : "Counts · Created in this period"}
          </small>
        </div>
      </header>
      <ReportTabs
        value={showEarnings ? "earnings" : kind}
        disabled={Boolean(busy)}
        sliding={showVisuals}
        items={[
          ...(Object.keys(names) as ReportKind[])
            .filter((item) => {
              return allowedKinds.includes(item);
            })
            .map((item) => {
              return { value: item, label: names[item] };
            }),
          ...(allowedKinds.includes("collections")
            ? [{ value: "earnings", label: "Installment earnings" }]
            : []),
        ]}
        onValueChange={(value) => {
          if (value === "earnings") {
            sequence.current++;

            setShowEarnings(true);
          } else {
            selectKind(value as ReportKind);
          }
        }}
      />
      {showEarnings ? (
        <div
          className={styles.reportViewport}
          tabIndex={showVisuals ? 0 : undefined}
          role={showVisuals ? "region" : undefined}
          aria-label={showVisuals ? "Installment earnings results" : undefined}
          ref={resultsViewport}
        >
          <InstallmentEarnings />
        </div>
      ) : (
        <div className={styles.reportWorkspace}>
          <ReportFiltersPanel
            loading={loading}
            kind={kind}
            apply={apply}
            busy={busy}
            draft={draft}
            edit={edit}
            onReset={resetFilters}
            onBatchChange={selectBatch}
            batch={batch}
            validation={validation}
            dirty={dirty}
          />

          <div className={styles.reportViewport} ref={resultsViewport}>
            <ReportResultsPanel
              history={
                showVisuals ? (
                  <ReportHistory
                    key={`${kind}:${historyRefresh}`}
                    kind={kind}
                    canWriteReports={canWriteReports}
                    showVisuals={showVisuals}
                  />
                ) : undefined
              }
              loading={loading}
              kind={kind}
              applied={applied}
              appliedBatch={appliedBatch}
              busy={busy}
              load={load}
              report={report}
              dirty={dirty}
              runAction={runAction}
              actionError={actionError}
              error={error}
              canReviewPayments={canReviewPayments}
              canWriteReports={canWriteReports}
              showVisuals={showVisuals}
              onPage={selectPage}
              analysisDraft={analysisDraft}
              onAnalysisChange={editAnalysis}
            />
            {!showVisuals && (
              <ReportHistory
                key={`${kind}:${historyRefresh}`}
                kind={kind}
                canWriteReports={canWriteReports}
                showVisuals={showVisuals}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
