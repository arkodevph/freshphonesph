"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  FinanceOverview,
  FinanceOverviewPeriod,
} from "@freshphones/contracts";
import { getFinanceOverview } from "@/lib/finance-workspace";
import { ApiError } from "@/lib/ts-api";
import { useLiveRecords } from "@/lib/useLiveRecords";

export function useFinanceOverview() {
  const [period, setPeriod] = useState<FinanceOverviewPeriod>("this_month");

  const [data, setData] = useState<FinanceOverview | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [pending, setPending] = useState(true);

  const sequence = useRef(0);

  const refresh = useCallback(async () => {
    const request = ++sequence.current;

    setPending(true);

    try {
      const result = await getFinanceOverview(period);

      if (request === sequence.current) {
        setData(result);

        setError(null);
      }
    } catch (reason) {
      if (request === sequence.current) {
        if (reason instanceof ApiError && [401, 403].includes(reason.status)) {
          setData(null);
        }

        setError(
          reason instanceof Error
            ? reason.message
            : "Could not load Finance overview.",
        );
      }
    } finally {
      if (request === sequence.current) {
        setPending(false);
      }
    }
  }, [period]);

  useEffect(() => {
    void refresh();

    return () => {
      sequence.current++;
    };
  }, [refresh]);

  useLiveRecords(refresh);

  function selectPeriod(next: FinanceOverviewPeriod) {
    if (next === period) {
      return;
    }

    sequence.current++;

    setData(null);

    setError(null);

    setPending(true);

    setPeriod(next);
  }

  return { data, error, pending, refresh, period, selectPeriod };
}
