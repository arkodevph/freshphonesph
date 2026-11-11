"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { tsRequest } from "@/lib/ts-api";
import { useLiveRecords } from "@/lib/useLiveRecords";
import type { Page, Task } from "../tasks/task-view";

export function useCooTasks() {
  const [tasks, setTasks] = useState<{ count: number; items: Task[] } | null>(
    null,
  );

  const [error, setError] = useState<string | null>(null);

  const [pending, setPending] = useState(true);

  const sequence = useRef(0);

  const refresh = useCallback(async () => {
    const request = ++sequence.current;

    setPending(true);

    try {
      const [todo, progress] = await Promise.all([
        tsRequest<Page<Task>>("/tasks?page=1&status=TODO"),
        tsRequest<Page<Task>>("/tasks?page=1&status=IN_PROGRESS"),
      ]);

      if (request === sequence.current) {
        setTasks({
          count: todo.count + progress.count,
          items: [...todo.results, ...progress.results]
            .sort((a, b) => {
              return Date.parse(a.deadline) - Date.parse(b.deadline);
            })
            .slice(0, 5),
        });

        setError(null);
      }
    } catch (reason) {
      if (request === sequence.current) {
        setError(
          reason instanceof Error
            ? reason.message
            : "Could not load open tasks.",
        );
      }
    } finally {
      if (request === sequence.current) {
        setPending(false);
      }
    }
  }, []);

  useEffect(() => {
    void refresh();

    return () => {
      sequence.current++;
    };
  }, [refresh]);

  useLiveRecords(refresh);

  return { tasks, error, pending, refresh };
}
