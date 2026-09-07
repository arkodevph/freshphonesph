"use client";

import { useEffect, useRef } from "react";
import { API_URL, TYPESCRIPT_API } from "./backend";
import { tsRequest } from "./ts-api";

/** Events only invalidate reads. Ready/reconnect always fetches the authoritative snapshot. */
export function useLiveRecords(reload: () => void, enabled = true) {
  const callback = useRef(reload);
  useEffect(() => { callback.current = reload; }, [reload]);
  useEffect(() => {
    if (!TYPESCRIPT_API || !enabled) return;
    let stopped = false;
    let source: EventSource | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const connect = () => {
      if (stopped) return;
      source = new EventSource(`${API_URL}/api/events`, { withCredentials: true });
      source.addEventListener("ready", () => callback.current());
      source.addEventListener("change", () => callback.current());
      source.onerror = () => {
        source?.close();
        timer = setTimeout(() => {
          void tsRequest("/auth/me").then(connect).catch(() => {
            if (!stopped) timer = setTimeout(connect, 5000);
          });
        }, 2000);
      };
    };
    connect();
    const onFocus = () => callback.current();
    window.addEventListener("focus", onFocus);
    return () => { stopped = true; source?.close(); clearTimeout(timer); window.removeEventListener("focus", onFocus); };
  }, [enabled]);
}
