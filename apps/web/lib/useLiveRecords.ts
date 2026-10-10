"use client";

import { useEffect, useRef } from "react";
import { API_URL, TYPESCRIPT_API } from "./backend";
import { ApiError, tsRequest } from "./ts-api";

/** Events only invalidate reads. Ready/reconnect always fetches the authoritative snapshot. */
export function useLiveRecords(reload: () => void, enabled = true) {
  const callback = useRef(reload);
  useEffect(() => { callback.current = reload; }, [reload]);
  useEffect(() => {
    if (!TYPESCRIPT_API || !enabled) return;
    let stopped = false;
    let source: EventSource | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let failures = 0;
    const retry = (minimumSeconds = 0) => {
      if (stopped) return;
      const backoff = Math.min(60_000, 2000 * 2 ** Math.min(failures++, 5));
      timer = setTimeout(() => {
        void tsRequest("/auth/me").then(connect).catch((error: unknown) => {
          if (error instanceof ApiError && error.status === 401) return;
          retry(error instanceof ApiError ? error.retryAfterSeconds : undefined);
        });
      }, Math.max(minimumSeconds * 1000, backoff) + Math.random() * 1000);
    };
    const connect = () => {
      if (stopped) return;
      source = new EventSource(`${API_URL}/api/events`, { withCredentials: true });
      source.addEventListener("ready", () => { failures = 0; callback.current(); });
      source.addEventListener("change", () => callback.current());
      source.onerror = () => {
        source?.close();
        retry();
      };
    };
    connect();
    const onFocus = () => callback.current();
    window.addEventListener("focus", onFocus);
    return () => { stopped = true; source?.close(); clearTimeout(timer); window.removeEventListener("focus", onFocus); };
  }, [enabled]);
}
