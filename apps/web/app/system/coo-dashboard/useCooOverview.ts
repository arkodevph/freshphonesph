"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getDashboard, type DashboardCards } from "@/lib/api";
import { useLiveRecords } from "@/lib/useLiveRecords";

export function useCooOverview() {
  const [summary, setSummary] = useState<DashboardCards | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [pending, setPending] = useState(true);

  const sequence = useRef(0);

  const refresh = useCallback(async () => {
    const request = ++sequence.current;

    setPending(true);

    try {
      const result = await getDashboard();

      if (request === sequence.current) {
        setSummary(result);

        setError(null);
      }
    } catch (reason) {
      if (request === sequence.current) {
        setError(
          reason instanceof Error
            ? reason.message
            : "Could not load collections.",
        );
      }
    } finally {
      if (request === sequence.current) {
        setPending(false);
      }
    }
  }, []);

  useEffect(() => {
    void refresh();

    return () => {
      sequence.current++;
    };
  }, [refresh]);

  useLiveRecords(refresh);

  return { summary, error, pending, refresh };
}
