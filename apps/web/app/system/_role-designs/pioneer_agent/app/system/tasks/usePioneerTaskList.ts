"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ApiError } from "@/lib/ts-api";
import { useLiveRecords } from "@/lib/useLiveRecords";
import { message, type Page, type Task, type Status } from "./task-view";
import { taskApi } from "./pioneer-task-api";

const statuses: Status[] = [
  "TODO",
  "IN_PROGRESS",
  "SUBMITTED",
  "DONE",
  "CANCELLED",
];

export function usePioneerTaskList() {
  const params = useSearchParams();

  const view = params.get("view") === "team" ? "team" : "own";

  const status = statuses.includes(params.get("status") as Status)
    ? params.get("status")!
    : "";

  const rawPage = Number(params.get("page") ?? 1);

  const page =
    Number.isInteger(rawPage) && rawPage > 0 && rawPage <= 10000 ? rawPage : 1;

  const key = `view=${view}&page=${page}${status ? `&status=${status}` : ""}`;

  const [snapshot, setSnapshot] = useState<{
    key: string;
    data: Page<Task>;
  } | null>(null);

  const [issue, setIssue] = useState<{ key: string; text: string } | null>(
    null,
  );

  const [pending, setPending] = useState(true);

  const sequence = useRef(0);

  const navigate = useCallback(
    (values: Record<string, string | null>) => {
      const query = new URLSearchParams(params.toString());

      for (const [name, value] of Object.entries(values)) {
        if (value === null) {
          query.delete(name);
        } else {
          query.set(name, value);
        }
      }

      // These filters are client reads. Keep their URL state independent of a
      // server navigation so an unavailable read cannot stall view switching.
      window.history.replaceState(
        null,
        "",
        `/system/tasks${query.size ? `?${query}` : ""}`,
      );
    },
    [params],
  );

  const reload = useCallback(async () => {
    const request = ++sequence.current;

    setPending(true);

    try {
      const data = await taskApi.list(key);

      if (request !== sequence.current) {
        return false;
      }

      setSnapshot({ key, data });

      setIssue(null);

      if (page > Math.max(1, Math.ceil(data.count / data.pageSize))) {
        navigate({ page: "1" });
      }

      return true;
    } catch (error) {
      if (request !== sequence.current) {
        return false;
      }

      if (error instanceof ApiError && [401, 403].includes(error.status)) {
        setSnapshot(null);
      }

      setIssue({ key, text: message(error) });

      return false;
    } finally {
      if (request === sequence.current) {
        setPending(false);
      }
    }
  }, [key, page, navigate]);

  useEffect(() => {
    void reload();

    return () => {
      sequence.current++;
    };
  }, [reload]);

  useLiveRecords(reload);

  return {
    view,
    status,
    page,
    pending,
    data: snapshot?.key === key ? snapshot.data : null,
    error: issue?.key === key ? issue.text : "",
    reload,
    navigate,
    taskId: params.get("task"),
  };
}
