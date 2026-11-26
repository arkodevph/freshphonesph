"use client";

import { useCallback, useEffect, useState } from "react";
import { tsRequest } from "@/lib/ts-api";
import { useLiveRecords } from "@/lib/useLiveRecords";
import { formatDate } from "./task-view";
import styles from "./task-detail-panel.module.css";

type Event = {
  id: string;
  action: string;
  actorName: string;
  createdAt: string;
};

const actions: Record<string, string> = {
  "task.assigned": "assigned this task",
  "task.updated": "edited this task",
  "task.reassigned": "reassigned this task",
  "task.cancelled": "cancelled this task",
  "task.started": "started the task",
  "task.submitted": "submitted work",
  "task.completed": "completed the task",
  "kpi.reviewed": "recorded a KPI review",
};

export default function TaskActivity({
  taskId,
  version,
  enabled,
}: {
  taskId: string;
  version: number;
  enabled: boolean;
}) {
  const [events, setEvents] = useState<Event[] | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const refresh = useCallback(() => {
    setAttempt((value) => value + 1);
  }, []);

  useLiveRecords(refresh, enabled);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const controller = new AbortController();
    setEvents(null);
    setError("");

    void tsRequest<Event[]>(`/tasks/${taskId}/activity`, {
      signal: controller.signal,
    })
      .then(setEvents)
      .catch((error) => {
        if (!controller.signal.aborted) {
          setError(
            error instanceof Error ? error.message : "Could not load activity.",
          );
        }
      });

    return () => {
      controller.abort();
    };
  }, [taskId, version, enabled, attempt]);

  if (error) {
    return (
      <div className={styles.activityState} role="alert">
        <p>{error}</p>
        <button type="button" className={styles.secondary} onClick={refresh}>
          Try again
        </button>
      </div>
    );
  }

  if (!events) {
    return (
      <p className={styles.activityState} role="status">
        Loading activity…
      </p>
    );
  }
  if (!events.length) {
    return <p className={styles.activityState}>No activity recorded yet.</p>;
  }

  return (
    <ol className={styles.activity} aria-label="Task activity">
      {events.map((event) => (
        <li key={event.id}>
          <span className={styles.actor} aria-hidden="true">
            {event.actorName
              .trim()
              .split(/\s+/)
              .filter(Boolean)
              .map((part) => part[0])
              .slice(0, 2)
              .join("")}
          </span>
          <div>
            <p>
              <strong>{event.actorName}</strong>{" "}
              {actions[event.action] ?? "updated the task"}
            </p>
            <time dateTime={event.createdAt}>
              {formatDate(event.createdAt)}
            </time>
          </div>
        </li>
      ))}
    </ol>
  );
}
