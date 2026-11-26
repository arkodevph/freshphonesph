import Link from "next/link";
import {
  FilePdf,
  UploadSimple,
  CheckCircle,
  ListChecks,
} from "@phosphor-icons/react";
import type { useHandlerHome } from "@/app/system/handler/useHandlerHome";
import { HandlerResourceState } from "./HandlerResourceState";
import styles from "./handler-home.module.css";

type Work = ReturnType<typeof useHandlerHome>;

export function StatementEntry() {
  return (
    <section
      className={styles.statement}
      aria-labelledby="handler-statement-title"
    >
      <div className={styles.statementTop}>
        <span className={styles.statementIcon}>
          <FilePdf aria-hidden="true" />
        </span>
      </div>
      <h2 id="handler-statement-title">GCash history</h2>

      <Link className={styles.primary} href="/system/gcash-history">
        <UploadSimple aria-hidden="true" />
        Upload a PDF
      </Link>
      <Link className={styles.statementLink} href="/system/gcash-history">
        Open statement history
      </Link>
      <p className={styles.fileNote}>PDF · up to 10 MB · password supported</p>
    </section>
  );
}

export function HandlerTasks({
  todo,
  inProgress,
  loading,
  retry,
}: Pick<Work, "todo" | "inProgress" | "loading"> & { retry: () => void }) {
  const tasks = [
    ...(todo.data?.results ?? []),
    ...(inProgress.data?.results ?? []),
  ]
    .sort((a, b) => {
      return a.deadline.localeCompare(b.deadline) || a.id.localeCompare(b.id);
    })
    .slice(0, 4);

  return (
    <section className={styles.tasks} aria-labelledby="handler-tasks-title">
      <header className={styles.panelHeading}>
        <h2 id="handler-tasks-title">
          <ListChecks aria-hidden="true" />
          My tasks
        </h2>
        <Link href="/system/tasks" className={styles.textLink}>
          View all
        </Link>
      </header>
      <HandlerResourceState
        resource={todo}
        loading={loading}
        retry={retry}
        label="Loading tasks…"
      />
      <HandlerResourceState
        resource={inProgress}
        loading={loading && !!todo.data}
        retry={retry}
        label="Loading tasks in progress…"
      />
      <ul className={styles.taskList}>
        {tasks.map((task) => {
          return (
            <li key={task.id}>
              <Link href={`/system/tasks?task=${task.id}`}>
                <span className={styles.taskMarker} aria-hidden="true" />
                <span>
                  <strong>{task.title}</strong>
                  <small>
                    {task.status === "IN_PROGRESS" ? "In progress" : "To do"} ·
                    Due{" "}
                    {new Date(task.deadline).toLocaleDateString("en-PH", {
                      timeZone: "Asia/Manila",
                      month: "short",
                      day: "numeric",
                    })}
                  </small>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      {todo.data && inProgress.data && !tasks.length && (
        <div className={styles.taskEmpty}>
          <CheckCircle aria-hidden="true" />
          <strong>You’re up to date.</strong>
          <p>No open tasks assigned to you.</p>
        </div>
      )}
    </section>
  );
}
