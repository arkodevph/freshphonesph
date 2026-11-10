"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
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
import styles from "./reports.module.css";
import { LoadedReport, message, names, ReportHistory } from "./report-view";
import ReportFiltersPanel from "./ReportFiltersPanel";
import ReportResultsPanel from "./ReportResultsPanel";
import InstallmentEarnings from "./InstallmentEarnings";

export default function ReportsDashboard({
  canReviewPayments = false,
  canWriteReports = false,
  showVisuals = false,
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

  const [notice, setNotice] = useState<string | null>(null);

  const [analysisDraft, setAnalysisDraft] = useState("");

  const [busy, setBusy] = useState<"csv" | "xlsx" | "save" | null>(null);

  const [historyRefresh, setHistoryRefresh] = useState(0);

  const [reportPage, setReportPage] = useState(1);

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
    if (showEarnings) {
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

    setReport(null);

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
  }, [kind, applied, reportPage, showEarnings]);

  useEffect(() => {
    void load();

    return () => {
      sequence.current++;
    };
  }, [load]);

  function apply(event: FormEvent) {
    event.preventDefault();

    const query = reportFilterQuery(kind, draft);

    if (!query.params) {
      setValidation(query.error);

      return;
    }

    sequence.current++;

    setValidation(null);

    setNotice(null);

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

    setNotice(null);

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

    setNotice(null);

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

    setNotice(null);

    try {
      if (action === "save") {
        await createReportSnapshot({
          ...saved.input!,
          ...(written ? { analysis: written } : {}),
        });

        if (mounted.current) {
          setAnalysisDraft("");

          setNotice(
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
          setNotice(
            `${action.toUpperCase()} download started for the applied filters.`,
          );
        }
      }
    } catch (reason) {
      if (mounted.current) {
        setActionError(message(reason));
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

    setNotice(null);
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
          <p className={styles.kicker}>
            {showVisuals ? "Company reports" : "Operations overview"}
          </p>
          <h1>Reports</h1>
          <p>
            Review scheduled earnings, collections, task timing and customer
            support across a chosen period.
          </p>
        </div>
      </header>
      <nav className={styles.tabs} aria-label="Report types">
        {(Object.keys(names) as ReportKind[])
          .filter((kind) => {
            return allowedKinds.includes(kind);
          })
          .map((item) => {
            return (
              <button
                key={item}
                type="button"
                aria-pressed={!showEarnings && kind === item}
                disabled={Boolean(busy)}
                onClick={() => {
                  return selectKind(item);
                }}
              >
                {names[item]}
              </button>
            );
          })}
        {allowedKinds.includes("collections") && (
          <button
            type="button"
            aria-pressed={showEarnings}
            disabled={Boolean(busy)}
            onClick={() => {
              sequence.current++;

              setShowEarnings(true);
            }}
          >
            Installment earnings
          </button>
        )}
      </nav>
      {showEarnings ? (
        <InstallmentEarnings />
      ) : (
        <>
          <ReportFiltersPanel
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

          <ReportResultsPanel
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
            notice={notice}
            error={error}
            canReviewPayments={canReviewPayments}
            canWriteReports={canWriteReports}
            showVisuals={showVisuals}
            onPage={selectPage}
            analysisDraft={analysisDraft}
            onAnalysisChange={editAnalysis}
          />
          <ReportHistory
            key={`${kind}:${historyRefresh}`}
            kind={kind}
            canWriteReports={canWriteReports}
            showVisuals={showVisuals}
          />
        </>
      )}
    </div>
  );
}
