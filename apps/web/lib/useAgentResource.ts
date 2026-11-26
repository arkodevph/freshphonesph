"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { tsRequest } from "./ts-api";
import { useLiveRecords } from "./useLiveRecords";

/** Independent Agent panels ignore responses from obsolete requests. */
export function useAgentResource<T>(path: string) {
  const sequence = useRef(0);
  const [snapshot, setSnapshot] = useState<{ path: string; data: T } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    const request = ++sequence.current;
    setLoading(true);
    setError("");
    try {
      const data = await tsRequest<T>(path);
      if (request === sequence.current) { setSnapshot({ path, data }); }
    } catch (failure) {
      if (request === sequence.current) {
        setError(failure instanceof Error ? failure.message : "Could not load this view.");
      }
    } finally {
      if (request === sequence.current) { setLoading(false); }
    }
  }, [path]);
  useEffect(() => {
    void refresh();
    return () => { ++sequence.current; };
  }, [refresh]);
  useLiveRecords(refresh);
  return { data: snapshot?.path === path ? snapshot.data : null, loading, error, refresh };
}
