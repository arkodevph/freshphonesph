"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, tsRequest } from "@/lib/ts-api";
import { useLiveRecords } from "@/lib/useLiveRecords";

/** Existing scoped reads; failed refreshes keep explicitly stale data. */
export function usePioneerRead<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [pending, setPending] = useState(Boolean(path));

  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const generation = useRef(0);

  const refresh = useCallback(async () => {
    const current = ++generation.current;

    if (!path) {
      setData(null);

      setError(null);

      setUpdatedAt(null);

      setPending(false);

      return;
    }

    setPending(true);

    try {
      const result = await tsRequest<T>(path);

      if (current === generation.current) {
        setData(result);

        setError(null);

        setUpdatedAt(new Date());
      }
    } catch (caught) {
      if (current !== generation.current) {
        return;
      }

      if (caught instanceof ApiError && [401, 403].includes(caught.status)) {
        setData(null);

        setUpdatedAt(null);
      }

      setError(
        caught instanceof Error ? caught.message : "This view could not load.",
      );
    } finally {
      if (current === generation.current) {
        setPending(false);
      }
    }
  }, [path]);

  useEffect(() => {
    void refresh();

    const focus = () => {
      return void refresh();
    };

    window.addEventListener("focus", focus);

    return () => {
      generation.current++;

      window.removeEventListener("focus", focus);
    };
  }, [refresh]);

  useLiveRecords(refresh, Boolean(path));

  return {
    data: path ? data : null,
    error: path ? error : null,
    pending: path ? pending : false,
    updatedAt: path ? updatedAt : null,
    refresh,
  };
}
