"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TaskReport } from "@freshphones/contracts";
import { getTaskReport } from "@/lib/api";
import { defaultReportFilters } from "@/lib/report-filters";
import { tsRequest } from "@/lib/ts-api";
import { useLiveRecords } from "@/lib/useLiveRecords";
import type { Page, Review, Task } from "./tasks/task-view";

type Resource<T> = { data: T | null; error: string | null };

function result<T>(value: PromiseSettledResult<T>): Resource<T> {
  return value.status === "fulfilled"
    ? { data: value.value, error: null }
    : {
        data: null,
        error:
          value.reason instanceof Error
            ? value.reason.message
            : "Could not load this section.",
      };
}

export function kpiPeriod(period: string): Record<string, string> {
  const today = defaultReportFilters();

  if (period === "all") {
    return {};
  }

  if (period === "previous") {
    const first = new Date(`${today.dateFrom}T00:00:00Z`);

    first.setUTCDate(0);

    const end = first.toISOString().slice(0, 10);

    return { dateFrom: `${end.slice(0, 7)}-01`, dateTo: end };
  }

  return { dateFrom: today.dateFrom, dateTo: today.dateTo };
}

export function useKpiOverview() {
  const [period, setPeriod] = useState("month");

  const [report, setReport] = useState<Resource<TaskReport>>({
    data: null,
    error: null,
  });

  const [queue, setQueue] = useState<Resource<Page<Task>>>({
    data: null,
    error: null,
  });

  const [history, setHistory] = useState<Resource<Page<Review>>>({
    data: null,
    error: null,
  });

  const [loading, setLoading] = useState(true);

  const sequence = useRef(0);

  const load = useCallback(async () => {
    const request = ++sequence.current;

    setLoading(true);

    const [reportResult, queueResult, historyResult] = await Promise.allSettled(
      [
        getTaskReport(kpiPeriod(period)),
        tsRequest<Page<Task>>("/kpi/queue?page=1"),
        tsRequest<Page<Review>>("/kpi/reviews?page=1"),
      ],
    );

    if (request !== sequence.current) {
      return;
    }

    setReport(result(reportResult));

    setQueue(result(queueResult));

    setHistory(result(historyResult));

    setLoading(false);
  }, [period]);

  useEffect(() => {
    void load();

    return () => {
      sequence.current++;
    };
  }, [load]);

  useLiveRecords(load);

  function selectPeriod(value: string) {
    if (value === period) {
      return;
    }

    sequence.current++;

    setReport({ data: null, error: null });

    setLoading(true);

    setPeriod(value);
  }

  return {
    period,
    setPeriod: selectPeriod,
    report,
    queue,
    history,
    loading,
    load,
  };
}
