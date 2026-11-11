"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSchedule, type RecordId, type ScheduleItem } from "@/lib/api";
import { ApiError } from "@/lib/ts-api";
import { useLiveRecords } from "@/lib/useLiveRecords";

export function useHandlerMemberSchedule(id: RecordId) {
  const [items, setItems] = useState<ScheduleItem[] | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [accessLost, setAccessLost] = useState(false);

  const controller = useRef<AbortController | null>(null);

  const sequence = useRef(0);

  const load = useCallback(async () => {
    const request = ++sequence.current;

    controller.current?.abort();

    const abort = new AbortController();

    controller.current = abort;

    setItems(null);

    setError(null);

    setLoading(true);

    try {
      const current = await getSchedule(id, abort.signal);

      if (request !== sequence.current || abort.signal.aborted) {
        return;
      }

      setAccessLost(false);

      setItems(current);
    } catch (caught) {
      if (request !== sequence.current || abort.signal.aborted) {
        return;
      }

      if (
        caught instanceof ApiError &&
        caught.status === 409 &&
        /does not have an issued schedule/i.test(caught.message)
      ) {
        setAccessLost(false);

        setItems([]);
      } else {
        if (
          caught instanceof ApiError &&
          [401, 403, 404].includes(caught.status)
        ) {
          setAccessLost(true);
        }

        setError(
          caught instanceof Error
            ? caught.message
            : "Could not load the installment schedule.",
        );
      }
    } finally {
      if (request === sequence.current) {
        setLoading(false);
      }
    }
  }, [id]);

  useEffect(() => {
    void load();

    return () => {
      ++sequence.current;

      controller.current?.abort();
    };
  }, [load]);

  useLiveRecords(load);

  return { items, loading, error, accessLost, load };
}
