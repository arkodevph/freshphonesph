"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowClockwise,
  Plus,
  FilePdf,
  UploadSimple,
  Users,
  CheckCircle,
  ListChecks,
} from "@phosphor-icons/react";
import type { useHandlerHome } from "@/app/system/handler/useHandlerHome";
import { formatPeso } from "@/lib/currency";
import {
  handlerPaymentStage,
  handlerReturnNote,
} from "@/lib/handler-workspace";
import styles from "./handler-dashboard.module.css";

type Work = ReturnType<typeof useHandlerHome>;

type Inbox = "missing" | "returned" | "pending";

const views = [
  {
    key: "missing",
    label: "Receipt needed",
    href: "/system/payments?status=pending&proof=missing",
  },
  {
    key: "returned",
    label: "Returned",
    href: "/system/payments?status=needs_clarification",
  },
  {
    key: "pending",
    label: "Pending review",
    href: "/system/payments?status=pending",
  },
] as const;

function PendingValue({
  pending,
  children,
}: {
  pending: boolean;
  children: ReactNode;
}) {
  return pending ? (
    <span className={styles.skeleton} aria-hidden="true">
      &nbsp;
    </span>
  ) : (
    children
  );
}

export function HandlerDashboardLoading() {
  return <HandlerDashboardLayout />;
}

export default function HandlerDashboardLayout({
  name,
  work,
  onRefresh,
}: {
  name?: string;
  work?: Work;
  onRefresh?: () => void;
}) {
  const [view, setView] = useState<Inbox>("missing");

  const resource = work?.[view];

  const pending = !work || (work.loading && !resource?.data);

  const assignmentPending = !work || (work.loading && !work.assignments.data);

  const rows = resource?.data?.results.slice(0, 4) ?? [];

  const openTasks =
    work?.todo.data && work.inProgress.data
      ? work.todo.data.count + work.inProgress.data.count
      : null;

  const tasks = [
    ...(work?.todo.data?.results ?? []),
    ...(work?.inProgress.data?.results ?? []),
  ]
    .sort((a, b) => {
      return a.deadline.localeCompare(b.deadline);
    })
    .slice(0, 3);

  const tasksPending =
    !work || (work.loading && !work.todo.data && !work.inProgress.data);

  const date = new Intl.DateTimeFormat("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Manila",
  }).format(new Date());

  const currentView = views.find((item) => {
    return item.key === view;
  })!;

  return (
    <div
      className={styles.dashboard}
      data-handler-dashboard
      aria-busy={!work || work.loading}
    >
      <header className={styles.toolbar}>
        <p>{date}</p>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Refresh dashboard"
            onClick={onRefresh}
            disabled={!work || work.loading}
          >
            <ArrowClockwise aria-hidden="true" />
          </button>
          <Link
            className={styles.primary}
            href="/system/payments#record-payment"
          >
            <Plus aria-hidden="true" />
            Record payment
          </Link>
        </div>
      </header>
      {!work && (
        <span className={styles.srOnly} role="status">
          Loading handler dashboard…
        </span>
      )}
      <div className={styles.overview}>
        <section
          className={`${styles.panel} ${styles.assignments}`}
          data-handler-region="assignments"
          aria-labelledby="handler-assignment-title"
        >
          <div className={styles.cardHeading}>
            <h2 id="handler-assignment-title">Your assignments</h2>
            <Users aria-hidden="true" />
          </div>
          <div className={styles.memberTotal}>
            <strong>
              <PendingValue pending={assignmentPending}>
                {work?.assignments.data?.clients ?? "—"}
              </PendingValue>
            </strong>
            <span>members</span>
          </div>
          <div className={styles.assignmentDetails}>
            <Link href="/system/records">
              <span>Active batches</span>
              <b>
                <PendingValue pending={assignmentPending}>
                  {work?.assignments.data?.activeBatches ?? "—"}
                </PendingValue>
              </b>
            </Link>
            <Link href="/system/clients">
              <span>Ready for release</span>
              <b>
                <PendingValue pending={assignmentPending}>
                  {work?.assignments.data?.readyForRelease ?? "—"}
                </PendingValue>
              </b>
            </Link>
          </div>
          {work?.assignments.error && (
            <p className={styles.inlineError} role="alert">
              {work.assignments.error}
              <button type="button" onClick={onRefresh}>
                Retry
              </button>
            </p>
          )}
        </section>
        <section
          className={`${styles.panel} ${styles.statement}`}
          data-handler-region="statement"
          aria-labelledby="handler-gcash-title"
        >
          <div className={styles.cardHeading}>
            <h2 id="handler-gcash-title">GCash statements</h2>
            <FilePdf aria-hidden="true" />
          </div>
          <div className={styles.statementActions}>
            <Link className={styles.uploadButton} href="/system/gcash-history">
              <UploadSimple aria-hidden="true" />
              Upload GCash PDF
            </Link>
            <Link className={styles.textLink} href="/system/gcash-history">
              Statement history
            </Link>
          </div>
          <small>PDF · up to 10 MB · password supported</small>
        </section>
      </div>
      <section
        className={styles.inbox}
        id="handler-payment-inbox"
        data-handler-region="inbox"
        aria-labelledby="handler-inbox-title"
        aria-busy={pending}
      >
        <header className={styles.inboxHeading}>
          <h2 id="handler-inbox-title">Payment inbox</h2>
          <Link className={styles.textLink} href={currentView.href}>
            View all {resource?.data ? `(${resource.data.count})` : ""}
          </Link>
        </header>
        <div
          className={styles.tabs}
          role="group"
          aria-label="Payment inbox views"
        >
          {views.map((item) => {
            return (
              <button
                key={item.key}
                type="button"
                aria-pressed={view === item.key}
                onClick={() => {
                  setView(item.key);
                }}
              >
                <span>{item.label}</span>
                <span className={styles.tabCount}>
                  <PendingValue
                    pending={!work || (work.loading && !work[item.key].data)}
                  >
                    {work?.[item.key].data?.count ?? "—"}
                  </PendingValue>
                </span>
              </button>
            );
          })}
        </div>
        <div className={styles.records}>
          <table data-handler-table className={styles.table}>
            <caption className={styles.srOnly}>
              {currentView.label} in your assigned batches. Latest four shown.
            </caption>
            <thead>
              <tr>
                <th scope="col">Member / batch</th>
                <th scope="col">Payment date</th>
                <th scope="col">Amount</th>
                <th scope="col">Next step</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 4 }, (_, index) => {
                const row = rows[index];

                const href = row
                  ? `/system/payments?payment=${row.id}`
                  : undefined;

                return (
                  <tr
                    key={row?.id ?? index}
                    aria-hidden={!row && !pending ? true : undefined}
                  >
                    <th scope="row">
                      <div className={styles.identity}>
                        <span className={styles.avatar} aria-hidden="true">
                          {pending
                            ? ""
                            : row?.client_name
                                ?.trim()
                                .slice(0, 1)
                                .toUpperCase()}
                        </span>
                        <div>
                          {pending ? (
                            <>
                              <span
                                className={`${styles.skeleton} ${styles.nameSkeleton}`}
                              />
                              <span
                                className={`${styles.skeleton} ${styles.detailSkeleton}`}
                              />
                            </>
                          ) : (
                            row && (
                              <>
                                <Link href={href!} title={row.client_name}>
                                  {row.client_name || "Name unavailable"}
                                </Link>
                                <small title={row.batch_code ?? undefined}>
                                  {row.batch_code}
                                </small>
                              </>
                            )
                          )}
                        </div>
                      </div>
                    </th>
                    <td data-label="Payment date">
                      <PendingValue pending={pending}>
                        {row?.payment_date}
                      </PendingValue>
                    </td>
                    <td data-label="Amount" className={styles.amount}>
                      <PendingValue pending={pending}>
                        {row ? formatPeso(row.amount) : ""}
                      </PendingValue>
                    </td>
                    <td data-label="Next step">
                      {pending ? (
                        <span className={styles.skeleton} />
                      ) : (
                        row && (
                          <Link
                            className={styles.rowAction}
                            href={href!}
                            title={
                              view === "returned"
                                ? handlerReturnNote(row)
                                : undefined
                            }
                          >
                            {view === "returned"
                              ? "Correct claim"
                              : view === "missing"
                                ? "Attach proof"
                                : handlerPaymentStage(row)}
                          </Link>
                        )
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!pending && !rows.length && (
            <div
              className={styles.empty}
              role={resource?.error ? "alert" : "status"}
            >
              <CheckCircle aria-hidden="true" />
              <strong>
                {resource?.error
                  ? "Could not load this queue"
                  : view === "returned"
                    ? "No claims returned for correction"
                    : view === "missing"
                      ? "No claims missing receipt proof"
                      : "No claims waiting for review"}
              </strong>
              {resource?.error && (
                <>
                  <p>{resource.error}</p>
                  <button
                    type="button"
                    onClick={onRefresh}
                    className={styles.uploadButton}
                  >
                    Try again
                  </button>
                </>
              )}
            </div>
          )}
          {resource?.error && rows.length > 0 && (
            <p className={styles.refreshError} role="alert">
              {resource.error}
              <button type="button" onClick={onRefresh}>
                Retry
              </button>
            </p>
          )}
        </div>
        <footer className={styles.inboxFooter}>
          <span>
            {pending
              ? "Loading claims…"
              : `${rows.length} of ${resource?.data?.count ?? "—"} shown`}
          </span>
          <p>Only Finance-verified payments change a member’s balance.</p>
        </footer>
      </section>
      <section
        className={styles.tasks}
        data-handler-region="tasks"
        aria-labelledby="handler-work-title"
      >
        <div className={styles.taskTitle}>
          <ListChecks aria-hidden="true" />
          <h2 id="handler-work-title">My tasks</h2>
          <span>
            <PendingValue pending={tasksPending}>
              {openTasks ?? "—"}
            </PendingValue>
          </span>
          <Link className={styles.textLink} href="/system/tasks">
            View all
          </Link>
        </div>
        <div className={styles.taskItems}>
          {tasksPending ? (
            <span className={styles.skeleton} />
          ) : tasks.length ? (
            tasks.map((task) => {
              return (
                <Link key={task.id} href={`/system/tasks?task=${task.id}`}>
                  <strong>{task.title}</strong>
                  <small>
                    {task.status === "IN_PROGRESS" ? "In progress" : "To do"} ·{" "}
                    {new Date(task.deadline).toLocaleDateString("en-PH", {
                      timeZone: "Asia/Manila",
                      month: "short",
                      day: "numeric",
                    })}
                  </small>
                </Link>
              );
            })
          ) : (
            <p>
              {work?.todo.error || work?.inProgress.error
                ? "Tasks are unavailable. Refresh to try again."
                : "You’re up to date. No open tasks assigned to you."}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
