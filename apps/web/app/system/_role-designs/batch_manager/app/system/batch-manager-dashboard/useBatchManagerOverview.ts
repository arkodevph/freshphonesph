"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getRecordOverview, type RecordOverview } from "@/lib/api";
import { useLiveRecords } from "@/lib/useLiveRecords";

export function useBatchManagerOverview() {
  const [summary, setSummary] = useState<RecordOverview | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [pending, setPending] = useState(true);

  const sequence = useRef(0);

  const refresh = useCallback(async () => {
    const request = ++sequence.current;

    setPending(true);

    try {
      const result = await getRecordOverview();

      if (request === sequence.current) {
        setSummary(result);

        setError(null);
      }
    } catch (reason) {
      if (request === sequence.current) {
        setError(
          reason instanceof Error
            ? reason.message
            : "Could not load assignments.",
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
