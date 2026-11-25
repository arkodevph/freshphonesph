"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { listPayments, type Payment } from "@/lib/api";
import { ApiError } from "@/lib/ts-api";
import { useLiveRecords } from "@/lib/useLiveRecords";

export function useFinanceActivity() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [data, setData] = useState<Payment[] | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(true);
  const sequence = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++sequence.current;
    setPending(true);
    try {
      const result = await listPayments({
        q: query,
        ...(status !== "all" ? { status } : {}),
        sortBy: "createdAt",
        sortDirection: "desc",
      });
      if (request === sequence.current) {
        setData(result.results.slice(0, 5));
        setCount(result.count);
        setError(null);
      }
    } catch (reason) {
      if (request === sequence.current) {
        if (reason instanceof ApiError && [401, 403].includes(reason.status)) {
          setData(null);
          setCount(null);
        }
        setError(
          reason instanceof Error ? reason.message : "Could not load payments.",
        );
      }
    } finally {
      if (request === sequence.current) {
        setPending(false);
      }
    }
  }, [query, status]);
  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 250);
    return () => {
      window.clearTimeout(timer);
      sequence.current++;
    };
  }, [refresh]);
  useLiveRecords(refresh);
  return {
    query,
    setQuery,
    status,
    setStatus,
    data,
    count,
    error,
    pending,
    refresh,
  };
}
