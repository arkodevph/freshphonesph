"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DeviceInquiry, SupportReport } from "@freshphones/contracts";
import { getSupportReport, listTasks, type Task } from "@/lib/api";
import { getCustomerWork, type CustomerWorkPage } from "@/lib/customer-work";
import { listInquiries } from "@/lib/inquiries";
import { useLiveRecords } from "@/lib/useLiveRecords";
import { can, useMe } from "@/lib/useMe";
import { ApiError } from "@/lib/ts-api";
import { supportPeriodQuery, type ReportPeriod } from "./csr-dashboard-data";
export type Resource<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
};

type ItemPage<T> = { results: T[]; count: number };

function initial<T>(): Resource<T> {
  return { data: null, error: null, loading: true };
}

export function useCsrDashboard() {
  const me = useMe();

  const support = can(me, "SUPPORT_MANAGE");

  const reports = can(me, "REPORT_VIEW");

  const tasksAllowed = can(me, "TASK_READ");

  const [period, setPeriod] = useState<ReportPeriod>("month");

  const [report, setReport] = useState<Resource<SupportReport>>(initial);

  const [followup, setFollowup] = useState<Resource<CustomerWorkPage>>(initial);

  const [inquiries, setInquiries] =
    useState<Resource<ItemPage<DeviceInquiry>>>(initial);

  const [tasks, setTasks] = useState<Resource<ItemPage<Task>>>(initial);

  const sequence = useRef(0);

  const load = useCallback(async () => {
    if (!me) {
      return;
    }

    const version = ++sequence.current;

    const pending = <T>(r: Resource<T>): Resource<T> => {
      return { ...r, loading: true };
    };

    setReport(pending);

    setFollowup(pending);

    setInquiries(pending);

    setTasks(pending);

    async function read<T>(
      allowed: boolean,
      request: () => Promise<T>,
      set: (update: (old: Resource<T>) => Resource<T>) => void,
    ) {
      if (!allowed) {
        set(() => {
          return { data: null, error: "Access unavailable", loading: false };
        });

        return;
      }

      try {
        const data = await request();

        if (version === sequence.current) {
          set(() => {
            return { data, error: null, loading: false };
          });
        }
      } catch (caught) {
        if (version !== sequence.current) {
          return;
        }

        set((old) => {
          return {
            data:
              caught instanceof ApiError && [401, 403].includes(caught.status)
                ? null
                : old.data,
            error:
              caught instanceof Error
                ? caught.message
                : "Could not load this section.",
            loading: false,
          };
        });
      }
    }

    await Promise.allSettled([
      read(
        reports,
        () => {
          return getSupportReport(supportPeriodQuery(period));
        },
        setReport,
      ),
      read(
        support,
        () => {
          return getCustomerWork("support");
        },
        setFollowup,
      ),
      read(
        support,
        async () => {
          const result = await listInquiries({ page: 1, q: "", status: "NEW" });

          return { results: result.items, count: result.total };
        },
        setInquiries,
      ),
      read(
        tasksAllowed,
        async () => {
          const [todo, progress] = await Promise.all([
            listTasks({ status: "todo" }),
            listTasks({ status: "in_progress" }),
          ]);

          return {
            count: todo.count + progress.count,
            results: [...todo.results, ...progress.results].sort((a, b) => {
              return b.created_at.localeCompare(a.created_at);
            }),
          };
        },
        setTasks,
      ),
    ]);
  }, [me, support, reports, tasksAllowed, period]);

  useEffect(() => {
    void load();

    return () => {
      ++sequence.current;
    };
  }, [load]);

  useLiveRecords(() => {
    void load();
  }, support);

  // Reporting values belong to the chosen period; do not show the old period while it reloads.
  function changePeriod(next: ReportPeriod) {
    if (next === period) {
      return;
    }

    setReport(initial());

    setPeriod(next);
  }

  return {
    me,
    period,
    setPeriod: changePeriod,
    report,
    followup,
    inquiries,
    tasks,
    load,
    loading:
      report.loading || followup.loading || inquiries.loading || tasks.loading,
  };
}

export type CsrDesk = ReturnType<typeof useCsrDashboard>;
