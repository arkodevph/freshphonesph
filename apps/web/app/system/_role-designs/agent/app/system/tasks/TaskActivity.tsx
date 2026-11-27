"use client";

import { useEffect } from "react";
import { useAgentResource } from "@/lib/useAgentResource";
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
  "task.started": "started the task",
  "task.submitted": "submitted work",
  "task.completed": "completed the task",
  "task.cancelled": "cancelled the task",
  "task.edited": "updated the task",
  "kpi.reviewed": "recorded a review",
};

export default function TaskActivity({
  taskId,
  version,
  enabled,
  onAccessLost,
}: {
  taskId: string;
  version: number;
  enabled: boolean;
  onAccessLost?: () => void;
}) {
  return enabled ? (
    <Activity
      key={`${taskId}:${version}`}
      taskId={taskId}
      onAccessLost={onAccessLost}
    />
  ) : null;
}

function Activity({
  taskId,
  onAccessLost,
}: {
  taskId: string;
  onAccessLost?: () => void;
}) {
  const resource = useAgentResource<Event[]>(`/tasks/${taskId}/activity`);

  useEffect(() => {
    if (resource.denied) {
      onAccessLost?.();
    }
  }, [resource.denied, onAccessLost]);

  if (resource.error) {
    return (
      <div className={styles.activityState} role="alert">
        <p>{resource.error}</p>
        <button
          type="button"
          className={styles.secondary}
          onClick={() => {
            return void resource.refresh();
          }}
        >
          Retry task activity
        </button>
      </div>
    );
  }

  if (!resource.data) {
    return (
      <p className={styles.activityState} role="status">
        Loading activity…
      </p>
    );
  }

  if (!resource.data.length) {
    return (
      <p className={styles.activityState}>
        No activity recorded yet. Check again after the next task update.
      </p>
    );
  }

  return (
    <ol className={styles.activity} aria-label="Task activity">
      {resource.data.map((event) => {
        return (
          <li key={event.id}>
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
        );
      })}
    </ol>
  );
}
