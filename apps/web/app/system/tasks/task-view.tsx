"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import styles from "./staff-tasks.module.css";

export type Status = "TODO" | "IN_PROGRESS" | "SUBMITTED" | "DONE";

export type Priority = "LOW" | "MEDIUM" | "HIGH";

export type Task = {
  id: string;
  title: string;
  instructions: string;
  assigneeId: string;
  assigneeName: string;
  creatorName: string;
  priority: Priority;
  deadline: string;
  status: Status;
  report: string;
  submittedAt: string | null;
  lateFlag: boolean | null;
  attachment: { fileName: string; size: number } | null;
  reviewed: boolean;
  review: {
    reviewerName: string;
    factualEvidence: string;
    evaluation: string;
    recommendation: string;
    decision: string;
    createdAt: string;
  } | null;
  version: number;
};

export type Page<T> = {
  results: T[];
  count: number;
  page: number;
  pageSize: number;
};

export type Assignee = { id: string; name: string; role: string };

export type Review = {
  id: string;
  taskId: string;
  taskTitle: string;
  assigneeName: string;
  reviewerName: string;
  factualEvidence: string;
  evaluation: string;
  recommendation: string;
  decision: string;
  createdAt: string;
};

export const formatDate = (date: string) => {
  return (
    new Intl.DateTimeFormat("en-PH", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Manila",
    }).format(new Date(date)) + " PHT"
  );
};

export const label = (value: string) => {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => {
      return letter.toUpperCase();
    });
};

export const deadlineDefault = () => {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};

export const message = (error: unknown) => {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
};

export function TaskLocationSync({
  onTask,
}: {
  onTask: (id: string | null) => void;
}) {
  const raw = useSearchParams().get("task");

  useEffect(() => {
    onTask(
      raw &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          raw,
        )
        ? raw
        : null,
    );
  }, [raw, onTask]);

  return null;
}

export function Pagination<T>({
  data,
  setPage,
}: {
  data: Page<T>;
  setPage: (page: number) => void;
}) {
  if (data.count <= data.pageSize) {
    return null;
  }
  const pages = Math.ceil(data.count / data.pageSize);

  return (
    <nav className={styles.pagination} aria-label="Pages">
      <span>
        Showing {(data.page - 1) * data.pageSize + 1}–
        {Math.min(data.page * data.pageSize, data.count)} of {data.count}
      </span>
      <div>
        <button
          type="button"
          disabled={data.page === 1}
          onClick={() => {
            return setPage(data.page - 1);
          }}
        >
          Previous
        </button>
        <span>
          Page {data.page} of {pages}
        </span>
        <button
          type="button"
          disabled={data.page >= pages}
          onClick={() => {
            return setPage(data.page + 1);
          }}
        >
          Next
        </button>
      </div>
    </nav>
  );
}
