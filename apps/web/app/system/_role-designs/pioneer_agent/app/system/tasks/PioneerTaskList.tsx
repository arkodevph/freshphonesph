"use client";

import WorkspaceNativeSelect from "@/app/system/_role-designs/pioneer_agent/components/WorkspaceNativeSelect";
import WorkspaceProgress from "@/app/system/_role-designs/pioneer_agent/components/WorkspaceProgress";
import { usePioneerTaskList } from "./usePioneerTaskList";
import { label, formatDate, Pagination } from "./task-view";
import styles from "./staff-tasks.module.css";

export default function PioneerTaskList({
  list,
}: {
  list: ReturnType<typeof usePioneerTaskList>;
}) {
  return (
    <section
      className={`${styles.card} ${styles.pioneerList}`}
      aria-labelledby="pioneer-task-list-title"
      aria-busy={list.pending}
    >
      <div className={styles.sectionHead}>
        <div>
          <h2 id="pioneer-task-list-title">
            {list.view === "own" ? "My tasks" : "Agent team tasks"}
          </h2>
          <p className={styles.help}>
            {list.data
              ? `${new Intl.NumberFormat("en-PH").format(list.data.count)} tasks in this view`
              : "Task total unavailable"}
          </p>
        </div>
        <button
          className={styles.secondary}
          type="button"
          disabled={list.pending}
          onClick={() => {
            void list.reload();
          }}
        >
          {list.pending ? "Refreshing…" : "Refresh tasks"}
        </button>
      </div>
      <div className={styles.taskToolbar}>
        <div className={styles.views} role="group" aria-label="Task view">
          {(["own", "team"] as const).map((view) => {
            return (
              <button
                type="button"
                className={styles.secondary}
                key={view}
                aria-pressed={list.view === view}
                onClick={() => {
                  list.navigate({ view, page: "1" });
                }}
              >
                {view === "own" ? "My tasks" : "Agent team"}
              </button>
            );
          })}
        </div>
        <label className={styles.filter}>
          Status
          <WorkspaceNativeSelect
            value={list.status}
            onChange={(event) => {
              list.navigate({ status: event.target.value || null, page: "1" });
            }}
          >
            <option value="">All statuses</option>
            {["TODO", "IN_PROGRESS", "SUBMITTED", "DONE", "CANCELLED"].map(
              (status) => {
                return (
                  <option value={status} key={status}>
                    {label(status)}
                  </option>
                );
              },
            )}
          </WorkspaceNativeSelect>
        </label>
      </div>
      {list.error && (
        <div className={styles.error} role="alert">
          <p>{list.error}</p>
          {list.data && (
            <p>
              Showing the last successful update for this view. These tasks may
              have changed.
            </p>
          )}
          <button
            className={styles.secondary}
            type="button"
            onClick={() => {
              void list.reload();
            }}
          >
            Try again
          </button>
        </div>
      )}
      {!list.data ? (
        !list.error && <WorkspaceProgress label="Loading tasks…" />
      ) : !list.data.results.length ? (
        <p className={styles.empty}>
          {list.status
            ? "No tasks match this status in this view."
            : list.view === "own"
              ? "No tasks are assigned to you yet."
              : "Your current active Agent team has no assigned tasks."}
        </p>
      ) : (
        <ul className={styles.list}>
          {list.data.results.map((task) => {
            return (
              <li className={styles.taskRow} key={task.id}>
                <div className={styles.taskMain}>
                  <strong>{task.title}</strong>
                  <span>{task.assigneeName}</span>
                </div>
                <div className={styles.rowFacts}>
                  <span className={styles.badge} data-status={task.status}>
                    {label(task.status)}
                  </span>
                  <span
                    className={styles.priority}
                    data-priority={task.priority}
                  >
                    {label(task.priority)} priority
                  </span>
                  <span className={styles.timing}>
                    Due {formatDate(task.deadline)}
                  </span>
                </div>
                <button
                  type="button"
                  className={styles.secondary}
                  onClick={() => {
                    list.navigate({ task: task.id });
                  }}
                  aria-label={`View task: ${task.title}`}
                >
                  View task
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {list.data && (
        <Pagination
          data={list.data}
          setPage={(page) => {
            list.navigate({ page: String(page) });
          }}
        />
      )}
    </section>
  );
}
