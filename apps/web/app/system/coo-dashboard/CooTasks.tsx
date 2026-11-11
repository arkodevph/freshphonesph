"use client";

import Link from "next/link";
import { SkeletonLine } from "@/components/WorkspaceProgress";
import { Calendar, CheckCircle } from "@/components/SolarIcons";
import { useCooTasks } from "./useCooTasks";
import { PendingValue } from "./CooLoading";
import styles from "./coo-dashboard.module.css";

const date = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  timeZone: "Asia/Manila",
});

function CooTasksView({
  tasks,
  error,
  pending,
  refresh,
}: ReturnType<typeof useCooTasks>) {
  return (
    <section
      className={`${styles.panel} ${styles.taskPanel}`}
      aria-labelledby="staff-tasks-title"
      aria-busy={pending}
    >
      <header className={styles.panelHeader}>
        <div>
          <h3 id="staff-tasks-title">
            Open tasks{" "}
            {!error && (
              <span className={styles.count}>
                {tasks ? tasks.count : <PendingValue />}
              </span>
            )}
          </h3>
          <p>To do and in progress</p>
        </div>
        <Link href="/system/tasks" className={styles.textLink}>
          View all
        </Link>
      </header>
      {error ? (
        <div className={styles.error} role="alert">
          <p>{error}</p>
          <button type="button" onClick={refresh}>
            Try again
          </button>
        </div>
      ) : !tasks ? (
        <ol className={styles.taskList} aria-label="Loading open tasks">
          {[0, 1].map((row) => {
            return (
              <li key={row} aria-hidden="true">
                <div className={styles.taskPlaceholder}>
                  <span className={styles.taskIcon}>
                    <Calendar />
                  </span>
                  <span>
                    <strong>
                      <SkeletonLine width="14ch" />
                    </strong>
                    <small>
                      <SkeletonLine width="25ch" />
                    </small>
                  </span>
                  <span className={styles.status}>
                    <SkeletonLine width="7ch" />
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      ) : tasks.items.length ? (
        <ol className={styles.taskList}>
          {tasks.items.map((task) => {
            return (
              <li key={task.id}>
                <Link
                  href={`/system/tasks?task=${encodeURIComponent(task.id)}`}
                >
                  <span className={styles.taskIcon}>
                    <Calendar />
                  </span>
                  <span>
                    <strong>{task.title}</strong>
                    <small>
                      {task.assigneeName} ·{" "}
                      <time dateTime={task.deadline}>
                        Due {date.format(new Date(task.deadline))}
                      </time>
                    </small>
                  </span>
                  <span className={styles.status}>
                    {task.status === "IN_PROGRESS" ? "In progress" : "To do"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className={styles.empty}>
          <CheckCircle />
          <strong>No open tasks</strong>
          <p>There are no tasks to do or in progress in your workspace.</p>
          <Link href="/system/tasks" className={styles.textLink}>
            Open Tasks &amp; KPI
          </Link>
        </div>
      )}
    </section>
  );
}

function LiveCooTasks() {
  const state = useCooTasks();

  return <CooTasksView {...state} />;
}

export default function CooTasks({ loading = false }: { loading?: boolean }) {
  return loading ? (
    <CooTasksView tasks={null} error={null} pending refresh={async () => {}} />
  ) : (
    <LiveCooTasks />
  );
}
