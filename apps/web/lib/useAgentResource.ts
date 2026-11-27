"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, tsRequest } from "./ts-api";
import { useLiveRecords } from "./useLiveRecords";

export type AgentResource<T> = {
  data: T | null;
  loading: boolean;
  error: string;
  denied?: boolean;
  refresh: () => Promise<void>;
};

/** Independent Agent panels ignore responses from obsolete requests. */
export function useAgentResource<T>(path: string) {
  const sequence = useRef(0);

  const [snapshot, setSnapshot] = useState<{
    path: string;
    data: T | null;
    loading: boolean;
    error: string;
    denied?: boolean;
  }>({ path, data: null, loading: true, error: "" });

  const refresh = useCallback(async () => {
    const request = ++sequence.current;

    setSnapshot((current) => {
      return {
        path,
        data: current.path === path ? current.data : null,
        loading: true,
        error: "",
      };
    });

    try {
      const data = await tsRequest<T>(path);

      if (request === sequence.current) {
        setSnapshot({ path, data, loading: false, error: "" });
      }
    } catch (failure) {
      if (request === sequence.current) {
        const denied =
          failure instanceof ApiError &&
          [401, 403, 404].includes(failure.status);

        setSnapshot((current) => {
          return {
            path,
            data: denied || current.path !== path ? null : current.data,
            loading: false,
            denied,
            error:
              failure instanceof Error
                ? failure.message
                : "Could not load this view.",
          };
        });
      }
    }
  }, [path]);

  useEffect(() => {
    void refresh();

    return () => {
      ++sequence.current;
    };
  }, [refresh]);

  useLiveRecords(refresh);

  return snapshot.path === path
    ? {
        data: snapshot.data,
        loading: snapshot.loading,
        error: snapshot.error,
        denied: snapshot.denied ?? false,
        refresh,
      }
    : { data: null, loading: true, error: "", denied: false, refresh };
}
