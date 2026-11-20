"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { listBatches, type Batch } from "@/lib/api";
import { tsRequest } from "@/lib/ts-api";
import { useLiveRecords } from "@/lib/useLiveRecords";
import type { EnrollmentPage } from "../enrollments/enrollment-types";

export function useBatchManagerBatches(status: string) {
  const [data, setData] = useState<{ items: Batch[]; count: number } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(true);
  const sequence = useRef(0);

  const refresh = useCallback(async () => {
    const request = ++sequence.current;
    setPending(true);
    try {
      const result = await listBatches(status ? { status } : {});
      if (request === sequence.current) {
        setData({ items: result.results.slice(0, 6), count: result.count });
        setError(null);
      }
    } catch (reason) {
      if (request === sequence.current) {
        setError(
          reason instanceof Error
            ? reason.message
            : "Could not load assigned batches.",
        );
      }
    } finally {
      if (request === sequence.current) {
        setPending(false);
      }
    }
  }, [status]);

  useEffect(() => {
    setData(null);
    void refresh();
    return () => {
      sequence.current++;
    };
  }, [refresh]);
  useLiveRecords(refresh);
  return { data, error, pending, refresh };
}

export function useBatchManagerReviews(enabled: boolean) {
  const [data, setData] = useState<EnrollmentPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sequence = useRef(0);
  const refresh = useCallback(async () => {
    if (!enabled) {
      return;
    }
    const request = ++sequence.current;
    try {
      const result = await tsRequest<EnrollmentPage>(
        "/enrollment/requests?page=1&status=PENDING",
      );
      if (request === sequence.current) {
        setData(result);
        setError(null);
      }
    } catch (reason) {
      if (request === sequence.current) {
        setError(
          reason instanceof Error
            ? reason.message
            : "Could not load enrollment reviews.",
        );
      }
    }
  }, [enabled]);
  useEffect(() => {
    void refresh();
    return () => {
      sequence.current++;
    };
  }, [refresh]);
  useLiveRecords(refresh, enabled);
  return { data, error, refresh };
}
