"use client";

import WorkspaceProgress from "@/app/system/_role-designs/batch_handler/components/WorkspaceProgress";
import type { Dispatch, SetStateAction } from "react";
import {
  Add,
  Calendar,
  CheckCircle,
  ClockCircle,
  FileSend,
} from "@/app/system/_role-designs/batch_handler/components/SolarIcons";
import {
  label,
  Pagination,
  type Page,
  type Task,
  type Status,
} from "@/app/system/_role-designs/batch_handler/app/system/tasks/task-view";
import {
  useCooTaskCounts,
  taskStatuses,
} from "@/app/system/tasks/coo/useCooTaskCounts";
import CooTaskAssignment, {
  type AssignmentProps,
} from "@/app/system/_role-designs/batch_handler/app/system/tasks/coo/CooTaskAssignment";
import styles from "@/app/system/_role-designs/batch_handler/app/system/tasks/coo/coo-tasks.module.css";

type Props = {
  tasks: Page<Task> | null;
  status: string;
  onStatus: (status: string) => void;
  setPage: Dispatch<SetStateAction<number>>;
  openTask: (id: string) => Promise<void>;
  reload: () => Promise<void>;
  canAssign: boolean;
  assignmentOpen: boolean;
  setAssignmentOpen: Dispatch<SetStateAction<boolean>>;
  assignment: AssignmentProps;
  error: string;
};

const dates = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "Asia/Manila",
});

const times = new Intl.DateTimeFormat("en-PH", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Manila",
});

const statusInfo = {
  TODO: { label: "To do", icon: ClockCircle },
  IN_PROGRESS: { label: "In progress", icon: Calendar },
  SUBMITTED: { label: "Submitted", icon: FileSend },
  DONE: { label: "Completed", icon: CheckCircle },
};

export default function CooTasksView({
  tasks,
  status,
  onStatus,
  setPage,
  openTask,
  reload,
  canAssign,
  assignmentOpen,
  setAssignmentOpen,
  assignment,
  error,
}: Props) {
  const { counts, error: countError, refresh } = useCooTaskCounts(tasks);

  const total = counts
    ? taskStatuses.reduce((sum, item) => {
        return sum + counts[item];
      }, 0)
    : null;

  return (
    <>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            COO workspace <span>/</span> Team operations
          </p>
          <h1>Tasks &amp; KPI</h1>
          <p>Keep the work moving, from assignment to completion.</p>
        </div>
        {canAssign && (
          <button
            type="button"
            data-variant="primary"
            className={styles.primary}
            onClick={() => {
              return setAssignmentOpen(true);
            }}
          >
            <Add />
            Assign task
          </button>
        )}
      </header>
      {error && (
        <div className={styles.error} role="alert">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => {
              return void reload();
            }}
          >
            Try again
          </button>
        </div>
      )}
      <section
        className={styles.listPanel}
        aria-labelledby="coo-task-list-title"
      >
        <header className={styles.listHeader}>
          <div>
            <h2 id="coo-task-list-title">
              Team tasks <span>{tasks?.count ?? "—"}</span>
            </h2>
            <p>
              {status
                ? `${statusInfo[status as Status].label} tasks in your workspace`
                : "Assignments, owners, and what happens next."}
            </p>
          </div>
        </header>
        <div className={styles.workload} aria-label="Filter tasks by status">
          <button
            type="button"
            className={styles.total}
            aria-pressed={!status}
            onClick={() => {
              return onStatus("");
            }}
          >
            <span>All tasks</span>
            <strong>{total ?? "—"}</strong>
            {!status && <CheckCircle aria-hidden="true" />}
          </button>
          <div
            className={styles.statusOverview}
            role="group"
            aria-label="Filter tasks by status"
          >
            {taskStatuses.map((item) => {
              const Icon = statusInfo[item].icon;

              return (
                <button
                  key={item}
                  type="button"
                  className={styles.workloadFilter}
                  data-task-status={item}
                  aria-pressed={status === item}
                  aria-label={`Show ${statusInfo[item].label.toLowerCase()} tasks`}
                  onClick={() => {
                    return onStatus(status === item ? "" : item);
                  }}
                >
                  <span>
                    <Icon />
                    {statusInfo[item].label}
                  </span>
                  <strong>{counts?.[item] ?? "—"}</strong>
                  {status === item && (
                    <CheckCircle
                      className={styles.selectedCheck}
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </div>
          {countError && (
            <button
              className={styles.countRetry}
              type="button"
              onClick={refresh}
            >
              Retry counts
            </button>
          )}
        </div>
        {!tasks ? (
          <WorkspaceProgress className={styles.empty} label="Loading tasks…" />
        ) : tasks.results.length === 0 ? (
          <div className={styles.empty}>
            <CheckCircle />
            <h3>
              {status
                ? `No ${statusInfo[status as Status].label.toLowerCase()} tasks`
                : "No tasks yet"}
            </h3>
            <p>
              {status
                ? "Try another status to see more of your team's work."
                : "New assignments will appear here with their owner and deadline."}
            </p>
            {status && (
              <button
                className={styles.secondary}
                type="button"
                onClick={() => {
                  return onStatus("");
                }}
              >
                Show all tasks
              </button>
            )}
          </div>
        ) : (
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <caption className="sr-only">Team task assignments</caption>
              <thead>
                <tr>
                  <th scope="col">Task</th>
                  <th scope="col">Assignee</th>
                  <th scope="col">Priority</th>
                  <th scope="col">Due date</th>
                  <th scope="col">Status</th>
                  <th scope="col">
                    <span className="sr-only">Open task</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {tasks.results.map((task) => {
                  return (
                    <tr key={task.id}>
                      <td data-label="Task">
                        <button
                          type="button"
                          className={styles.taskTitle}
                          onClick={() => {
                            return void openTask(task.id);
                          }}
                        >
                          {task.title}
                        </button>
                        <p className={styles.instructions}>
                          {task.instructions || "No extra instructions"}
                        </p>
                      </td>
                      <td data-label="Assignee">
                        <span className={styles.assignee}>
                          <span className={styles.avatar} aria-hidden="true">
                            {task.assigneeName
                              .split(" ")
                              .map((part) => {
                                return part[0];
                              })
                              .slice(0, 2)
                              .join("")}
                          </span>
                          <span>{task.assigneeName}</span>
                        </span>
                      </td>
                      <td data-label="Priority">
                        <span
                          className={styles.priority}
                          data-priority={task.priority}
                        >
                          <i />
                          {label(task.priority)}
                        </span>
                      </td>
                      <td data-label="Due date">
                        <time dateTime={task.deadline}>
                          {dates.format(new Date(task.deadline))}
                          <small>
                            {times.format(new Date(task.deadline))} PHT
                          </small>
                        </time>
                      </td>
                      <td data-label="Status">
                        <span
                          className={styles.status}
                          data-task-status={task.status}
                        >
                          {statusInfo[task.status].label}
                        </span>
                        {task.lateFlag !== null && (
                          <small className={styles.timing}>
                            {task.lateFlag
                              ? "Submitted late"
                              : "Submitted on time"}
                          </small>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className={styles.openTask}
                          onClick={() => {
                            return void openTask(task.id);
                          }}
                        >
                          View task
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {tasks && (
          <div className={styles.pagination}>
            <Pagination data={tasks} setPage={setPage} />
          </div>
        )}
      </section>
      <p className={styles.footnote}>
        Task timing records the facts. HR/Owner reviews the context before a KPI
        decision.
      </p>
      {canAssign && (
        <CooTaskAssignment
          {...assignment}
          open={assignmentOpen}
          onClose={() => {
            return setAssignmentOpen(false);
          }}
          error={error}
        />
      )}
    </>
  );
}
