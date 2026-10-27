"use client";

import { useEffect, useRef } from "react";
import { subscribeLiveRecords } from "./live-records";

/** Events only invalidate reads. Ready/reconnect always fetches the authoritative snapshot. */
export function useLiveRecords(reload: () => void, enabled = true) {
  const callback = useRef(reload);

  useEffect(() => {
    callback.current = reload;
  }, [reload]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    return subscribeLiveRecords(() => {
      callback.current();
    });
  }, [enabled]);
}
