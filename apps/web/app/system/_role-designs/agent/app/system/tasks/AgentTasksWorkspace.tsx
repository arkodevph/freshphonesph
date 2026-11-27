"use client";

import { useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import type { Me } from "@/lib/api";
import { useAgentResource } from "@/lib/useAgentResource";
import WorkspaceNativeSelect from "../../../components/WorkspaceNativeSelect";
import { taskStatuses } from "@freshphones/contracts";
import {
  agentTaskHref,
  agentTaskLocation,
  agentTaskLabels,
  type TaskLocation,
} from "./agent-task";
import {
  formatDate,
  Pagination,
  type Page,
  type Task,
  type Status,
} from "./task-view";
import { useAgentTask } from "./useAgentTask";
import AgentTaskDialog from "./AgentTaskDialog";
import styles from "./staff-tasks.module.css";

export default function AgentTasksWorkspace({ me }: { me: Me }) {
  const parsed = agentTaskLocation(useSearchParams());

  const location = parsed ?? { page: 1 };

  const list = useAgentResource<Page<Task>>(
    `/tasks?page=${location.page}${location.status ? `&status=${location.status}` : ""}`,
  );

  const detail = useAgentTask(location.task);

  const trigger = useRef<HTMLElement | null>(null);

  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (list.denied) {
      detail.clear();
    }
  }, [list.denied, detail.clear]);

  const close = useCallback(() => {
    window.history.replaceState(
      null,
      "",
      agentTaskHref(location, { task: undefined }),
    );

    requestAnimationFrame(() => {
      const target = trigger.current?.isConnected
        ? trigger.current
        : heading.current;

      target?.focus();
    });
  }, [location.page, location.status]);

  function navigate(next: Partial<TaskLocation>) {
    window.history.pushState(null, "", agentTaskHref(location, next));
  }

  const data = list.error ? null : list.data;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 ref={heading} tabIndex={-1}>
            My tasks
          </h1>
          <p>
            Start your assigned work, submit a report or evidence, and follow
            its review.
          </p>
          <p>
            Your assigner completes the task. Formal KPI decisions stay with
            authorized reviewers.
          </p>
        </div>
      </header>
      {!parsed && (
        <p role="status">
          These task filters are invalid.{" "}
          <button
            onClick={() => {
              return navigate({ page: 1, status: undefined, task: undefined });
            }}
          >
            Reset filters
          </button>
        </p>
      )}
      <section
        className={styles.card}
        aria-label="My assigned tasks"
        aria-busy={list.loading}
      >
        <div className={styles.sectionHead}>
          <h2>Assigned to me {data && <span>· {data.count}</span>}</h2>
          <label className={styles.filter}>
            Task status
            <WorkspaceNativeSelect
              value={location.status ?? ""}
              onChange={(event) => {
                return navigate({
                  status: (event.target.value as Status) || undefined,
                  page: 1,
                  task: undefined,
                });
              }}
            >
              <option value="">All statuses</option>
              {taskStatuses.map((status) => {
                return (
                  <option key={status} value={status}>
                    {agentTaskLabels[status]}
                  </option>
                );
              })}
            </WorkspaceNativeSelect>
          </label>
          <button
            type="button"
            className={styles.secondary}
            disabled={list.loading}
            onClick={() => {
              return void list.refresh();
            }}
          >
            Refresh tasks
          </button>
        </div>
        {list.error ? (
          <div className={styles.error} role="alert">
            <p>{list.error}</p>
            <button
              onClick={() => {
                return void list.refresh();
              }}
            >
              Retry my tasks
            </button>
          </div>
        ) : !data ? (
          <p role="status">Loading my tasks…</p>
        ) : data.results.length === 0 ? (
          <div className={styles.empty}>
            <p>No assigned tasks match this view.</p>
            <p>
              Check another status or ask your Pioneer Agent about your next
              assignment.
            </p>
            <button
              onClick={() => {
                return navigate({ page: 1, status: undefined });
              }}
            >
              Show all my tasks
            </button>
          </div>
        ) : (
          <div className={styles.list}>
            {data.results.map((task) => {
              return (
                <article className={styles.taskRow} key={task.id}>
                  <div className={styles.taskMain}>
                    <h3>{task.title}</h3>
                    <span>
                      From {task.creatorName} · Due {formatDate(task.deadline)}
                    </span>
                  </div>
                  <span
                    className={styles.priority}
                    data-priority={task.priority}
                  >
                    {task.priority.toLowerCase()} priority
                  </span>
                  <span className={styles.badge} data-status={task.status}>
                    {agentTaskLabels[task.status]}
                  </span>
                  <button
                    type="button"
                    className={styles.secondary}
                    aria-label={`View task: ${task.title}`}
                    onClick={(event) => {
                      trigger.current = event.currentTarget;

                      navigate({ task: task.id });
                    }}
                  >
                    View task
                  </button>
                </article>
              );
            })}
          </div>
        )}
        {data && (
          <Pagination
            data={data}
            setPage={(page) => {
              return navigate({ page });
            }}
          />
        )}
      </section>
      {location.task && (
        <AgentTaskDialog
          key={location.task}
          detail={detail}
          me={me}
          close={close}
          onSaved={() => {
            return void list.refresh();
          }}
        />
      )}
    </div>
  );
}
