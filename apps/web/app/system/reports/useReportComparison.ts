"use client";

import { useEffect, useState } from "react";
import type {
  CollectionReport,
  PaymentReport,
  ReconciliationReport,
  ReportKind,
  SupportReport,
  TaskReport,
} from "@freshphones/contracts";
import { tsRequest } from "@/lib/ts-api";
import { reportFilterQuery, type ReportFilters } from "@/lib/report-filters";
import { previousReportPeriod } from "@/lib/report-comparison";
import type { LoadedReport } from "./report-view";

async function loadPreviousReport(
  kind: ReportKind,
  query: string,
  signal: AbortSignal,
): Promise<LoadedReport> {
  const path = `/reports/${kind}?${query}`;

  switch (kind) {
    case "payments":
      return { kind, data: await tsRequest<PaymentReport>(path, { signal }) };
    case "collections":
      return {
        kind,
        data: await tsRequest<CollectionReport>(path, { signal }),
      };
    case "reconciliation":
      return {
        kind,
        data: await tsRequest<ReconciliationReport>(path, { signal }),
      };
    case "tasks":
      return { kind, data: await tsRequest<TaskReport>(path, { signal }) };
    case "support":
      return { kind, data: await tsRequest<SupportReport>(path, { signal }) };
  }
}

export function useReportComparison(
  kind: ReportKind,
  filters: ReportFilters,
  currentReport: LoadedReport | null,
) {
  const previous = previousReportPeriod(filters);

  const params =
    currentReport && previous ? reportFilterQuery(kind, previous).params : null;

  const query = params ? new URLSearchParams(params).toString() : null;

  const key = `${kind}?${query}`;

  const [result, setResult] = useState<{
    key: string;
    basis: LoadedReport | null;
    report: LoadedReport | null;
    failed: boolean;
  } | null>(null);

  useEffect(() => {
    if (query === null) {
      return;
    }

    const controller = new AbortController();

    async function load(query: string) {
      try {
        // The same authenticated report endpoint enforces role and report-family
        // scope. Preserve batch/status filters; only the period changes.
        const report = await loadPreviousReport(kind, query, controller.signal);

        if (!controller.signal.aborted) {
          setResult({
            key,
            basis: currentReport,
            report,
            failed: false,
          });
        }
      } catch {
        if (!controller.signal.aborted) {
          setResult({ key, basis: currentReport, report: null, failed: true });
        }
      }
    }

    void load(query);

    return () => {
      controller.abort();
    };
  }, [key, kind, query, currentReport]);

  const current = result?.key === key && result.basis === currentReport;

  return {
    previous,
    report: current ? result.report : null,
    pending: query !== null && !current,
    failed: query !== null && current && result.failed,
  };
}
