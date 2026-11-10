"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChartMonths, ExecutiveChartData } from "@freshphones/contracts";
import { getExecutiveCharts } from "@/lib/api";

export function useExecutiveCharts() {
  const [months, setMonths] = useState<ChartMonths>(6);

  const [data, setData] = useState<ExecutiveChartData | null>(null);

  const [pending, setPending] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const sequence = useRef(0);

  const refresh = useCallback(async () => {
    const request = ++sequence.current;

    setPending(true);

    try {
      const result = await getExecutiveCharts(months);

      if (request === sequence.current) {
        setData(result);

        setError(null);
      }
    } catch (reason) {
      if (request === sequence.current) {
        setError(
          reason instanceof Error ? reason.message : "Could not load charts.",
        );
      }
    } finally {
      if (request === sequence.current) {
        setPending(false);
      }
    }
  }, [months]);

  useEffect(() => {
    void refresh();

    const timer = window.setInterval(refresh, 30_000);

    const focus = () => {
      void refresh();
    };

    window.addEventListener("focus", focus);

    return () => {
      sequence.current++;

      window.clearInterval(timer);

      window.removeEventListener("focus", focus);
    };
  }, [refresh]);

  function selectMonths(value: ChartMonths) {
    if (months === value) {
      return;
    }

    sequence.current++;

    setData(null);

    setError(null);

    setPending(true);

    setMonths(value);
  }

  return { months, data, pending, error, refresh, selectMonths };
}
