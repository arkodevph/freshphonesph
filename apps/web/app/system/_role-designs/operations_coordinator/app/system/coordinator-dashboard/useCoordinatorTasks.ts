"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { listTasks, type Task } from "@/lib/api";
import { can, useMe } from "@/lib/useMe";
import { useLiveRecords } from "@/lib/useLiveRecords";

export function useCoordinatorTasks() {
  const me = useMe();

  const allowed = can(me, "TASK_READ");

  const [data, setData] = useState<{ count: number; items: Task[] } | null>(
    null,
  );

  const [error, setError] = useState("");

  const [loading, setLoading] = useState(true);

  const request = useRef(0);

  const load = useCallback(async () => {
    if (!allowed) {
      setLoading(false);

      return;
    }

    const token = ++request.current;

    setLoading(true);

    try {
      const [todo, progress] = await Promise.all([
        listTasks({ status: "todo" }),
        listTasks({ status: "in_progress" }),
      ]);

      if (token !== request.current) {
        return;
      }

      setData({
        count: todo.count + progress.count,
        items: [...todo.results, ...progress.results].sort((a, b) => {
          return a.deadline.localeCompare(b.deadline);
        }),
      });

      setError("");
    } catch (reason) {
      if (token !== request.current) {
        return;
      }

      setData(null);

      setError(
        reason instanceof Error ? reason.message : "Could not load tasks.",
      );
    } finally {
      if (token === request.current) {
        setLoading(false);
      }
    }
  }, [allowed, me?.id]);

  useEffect(() => {
    void load();

    return () => {
      request.current++;
    };
  }, [load]);

  useLiveRecords(() => {
    void load();
  }, allowed);

  return { data, error, loading, load, allowed };
}
