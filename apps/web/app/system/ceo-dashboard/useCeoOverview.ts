"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getDashboard, type DashboardCards } from "@/lib/api";
import { useExecutiveCharts } from "../useExecutiveCharts";

export function useCeoOverview() {
  const charts = useExecutiveCharts();

  const [summary, setSummary] = useState<DashboardCards | null>(null);

  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [summaryPending, setSummaryPending] = useState(true);

  const sequence = useRef(0);

  const refreshSummary = useCallback(async () => {
    const request = ++sequence.current;

    setSummaryPending(true);

    try {
      const result = await getDashboard();

      if (request === sequence.current) {
        setSummary(result);

        setSummaryError(null);
      }
    } catch (error) {
      if (request === sequence.current) {
        setSummaryError(
          error instanceof Error
            ? error.message
            : "Could not load company totals.",
        );
      }
    } finally {
      if (request === sequence.current) {
        setSummaryPending(false);
      }
    }
  }, []);

  useEffect(() => {
    void refreshSummary();

    const timer = window.setInterval(refreshSummary, 30_000);

    window.addEventListener("focus", refreshSummary);

    return () => {
      sequence.current++;

      window.clearInterval(timer);

      window.removeEventListener("focus", refreshSummary);
    };
  }, [refreshSummary]);

  return {
    ...charts,
    summary,
    summaryError,
    pending: charts.pending || summaryPending,
    refreshAll: () => {
      void refreshSummary();

      void charts.refresh();
    },
  };
}
