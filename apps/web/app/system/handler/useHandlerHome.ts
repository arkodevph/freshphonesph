"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getRecordOverview,
  listPayments,
  type Paginated,
  type Payment,
  type RecordOverview,
} from "@/lib/api";
import { tsRequest } from "@/lib/ts-api";
import type { Page as TaskPage, Task } from "../tasks/task-view";
import { useLiveRecords } from "@/lib/useLiveRecords";

export type Resource<T> = { data: T | null; error: string | null };

type HomeTask = Pick<Task, "id" | "title" | "deadline" | "status"> & {
  createdAt: string;
};

type Snapshot = {
  assignments: Resource<RecordOverview>;
  returned: Resource<Paginated<Payment>>;
  missing: Resource<Paginated<Payment>>;
  pending: Resource<Paginated<Payment>>;
  todo: Resource<TaskPage<HomeTask>>;
  inProgress: Resource<TaskPage<HomeTask>>;
};

const empty = { data: null, error: null };

function result<T>(value: PromiseSettledResult<T>): Resource<T> {
  return value.status === "fulfilled"
    ? { data: value.value, error: null }
    : {
        data: null,
        error:
          value.reason instanceof Error
            ? value.reason.message
            : "Could not load these records.",
      };
}

export function useHandlerHome() {
  const [snapshot, setSnapshot] = useState<Snapshot>({
    assignments: empty,
    returned: empty,
    missing: empty,
    pending: empty,
    todo: empty,
    inProgress: empty,
  });

  const [loading, setLoading] = useState(true);

  const sequence = useRef(0);

  const load = useCallback(async () => {
    const request = ++sequence.current;

    setLoading(true);

    const values = await Promise.allSettled([
      getRecordOverview(),
      listPayments({ status: "needs_clarification" }),
      listPayments({ status: "pending", proof: "missing" }),
      listPayments({ status: "pending" }),
      tsRequest<TaskPage<HomeTask>>("/tasks?status=TODO"),
      tsRequest<TaskPage<HomeTask>>("/tasks?status=IN_PROGRESS"),
    ]);

    if (request !== sequence.current) {
      return;
    }

    setSnapshot({
      assignments: result(values[0]),
      returned: result(values[1]),
      missing: result(values[2]),
      pending: result(values[3]),
      todo: result(values[4]),
      inProgress: result(values[5]),
    });

    setLoading(false);
  }, []);

  useEffect(() => {
    void load();

    window.addEventListener("focus", load);

    return () => {
      sequence.current++;

      window.removeEventListener("focus", load);
    };
  }, [load]);

  useLiveRecords(() => {
    void load();
  });

  return { ...snapshot, loading, load };
}
