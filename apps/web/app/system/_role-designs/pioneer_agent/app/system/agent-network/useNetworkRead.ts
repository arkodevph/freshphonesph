"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/ts-api";
import { useLiveRecords } from "@/lib/useLiveRecords";

export function useNetworkRead<T>(key: string | null, read: () => Promise<T>) {
  const [state, setState] = useState<{
    key: string | null;
    data: T | null;
    error: string | null;
    loading: boolean;
  }>({ key: null, data: null, error: null, loading: true });

  const reader = useRef(read);

  const sequence = useRef(0);

  reader.current = read;

  const refresh = useCallback(async () => {
    if (!key) {
      return;
    }

    const current = ++sequence.current;

    setState((previous) => {
      return {
        key,
        data: previous.key === key ? previous.data : null,
        error: null,
        loading: true,
      };
    });

    try {
      const data = await reader.current();

      if (current === sequence.current) {
        setState({ key, data, error: null, loading: false });
      }
    } catch (caught) {
      if (current === sequence.current) {
        const clear =
          caught instanceof ApiError && [401, 403, 404].includes(caught.status);

        setState((previous) => {
          return {
            key,
            data: clear ? null : previous.data,
            error:
              caught instanceof Error
                ? caught.message
                : "Could not load this view.",
            loading: false,
          };
        });
      }
    }
  }, [key]);

  useEffect(() => {
    void refresh();

    window.addEventListener("focus", refresh);

    return () => {
      sequence.current++;

      window.removeEventListener("focus", refresh);
    };
  }, [refresh]);

  useLiveRecords(refresh, Boolean(key));

  return {
    ...(state.key === key && key
      ? state
      : { data: null, error: null, loading: Boolean(key) }),
    refresh,
  };
}
