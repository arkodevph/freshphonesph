"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { tsRequest } from "@/lib/ts-api";
import type { Page, Task, Status } from "../task-view";

export const taskStatuses: Status[] = [
  "TODO",
  "IN_PROGRESS",
  "SUBMITTED",
  "DONE",
];

export function useCooTaskCounts(snapshot: Page<Task> | null) {
  const [counts, setCounts] = useState<Record<Status, number> | null>(null);

  const [error, setError] = useState(false);

  const sequence = useRef(0);

  const refresh = useCallback(async () => {
    const request = ++sequence.current;

    try {
      const pages = await Promise.all(
        taskStatuses.map((status) => {
          return tsRequest<Page<Task>>(`/tasks?page=1&status=${status}`);
        }),
      );

      if (request === sequence.current) {
        setCounts({
          TODO: pages[0].count,
          IN_PROGRESS: pages[1].count,
          SUBMITTED: pages[2].count,
          DONE: pages[3].count,
        });

        setError(false);
      }
    } catch {
      if (request === sequence.current) {
        setError(true);
      }
    }
  }, []);

  useEffect(() => {
    if (!snapshot) {
      return;
    }

    void refresh();

    return () => {
      sequence.current++;
    };
  }, [refresh, snapshot]);

  return { counts: error ? null : counts, error, refresh };
}
