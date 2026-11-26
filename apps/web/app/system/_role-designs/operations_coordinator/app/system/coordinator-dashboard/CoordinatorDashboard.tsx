"use client";

import Link from "next/link";
import {
  ArrowsClockwise,
  CheckCircle,
  ClipboardText,
  Clock,
  UsersThree,
} from "@phosphor-icons/react";
import { can } from "@/lib/useMe";
import { useOperationsMonitor } from "@/app/system/operations-monitor/useOperationsMonitor";
import MonitorFollowUp from "../operations-monitor/MonitorFollowUp";
import {
  monitorTabs,
  monitorReasons,
  waitingAge,
} from "../operations-monitor/monitor-view";
import WorkspaceProgress from "@/app/system/_role-designs/operations_coordinator/components/WorkspaceProgress";
import { useCoordinatorTasks } from "./useCoordinatorTasks";
import styles from "./coordinator-dashboard.module.css";

const stages = [
  { key: "HANDLER", label: "Handler", detail: "Submission" },
  { key: "RECORDS", label: "Records", detail: "Evidence check" },
  { key: "MANAGER", label: "Manager", detail: "Review" },
  { key: "FINANCE", label: "Finance", detail: "Verification" },
  { key: "COMPLETE", label: "Complete", detail: "Review finished" },
] as const;

export default function CoordinatorDashboard() {
  const work = useOperationsMonitor();

  const tasks = useCoordinatorTasks();

  if (!work.me) {
    return <WorkspaceProgress label="Loading coordination desk…" />;
  }

  if (!work.enabled) {
    return <p role="alert">No access to operations monitoring.</p>;
  }

  const items = work.data?.items ?? [];

  const snapshot = work.data;

  const pending = work.loading && !snapshot;

  const date = new Intl.DateTimeFormat("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  const refresh = () => {
    void work.refresh();

    void tasks.load();
  };

  return (
    <div className={styles.desk} data-coordinator-dashboard>
      <div className={styles.toolbar}>
        <p>{date}</p>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Refresh coordination dashboard"
            onClick={refresh}
          >
            <ArrowsClockwise size={18} />
          </button>
          <Link className={styles.primary} href="/system/operations-monitor">
            Open monitor
          </Link>
        </div>
      </div>
      <section
        className={styles.pipeline}
        aria-labelledby="coordination-stages-title"
        aria-busy={work.loading}
      >
        <header className={styles.pipelineHeading}>
          <div>
            <h2 id="coordination-stages-title">Review handoffs</h2>
            <p>
              {snapshot
                ? `${items.length} of ${snapshot.total} active items · current page`
                : pending
                  ? "Loading active review stages…"
                  : "Review stages unavailable"}
            </p>
          </div>
          <span className={styles.rule}>
            <Clock size={16} />
            {snapshot
              ? `Review window · ${snapshot.policy.reviewDueHours}h`
              : "Review window · —"}
          </span>
        </header>
        <div className={styles.stages}>
          {stages.map((stage, index) => {
            const count = items.filter((item) => {
              return item.stage === stage.key;
            }).length;

            return (
              <Link
                key={stage.key}
                href={`/system/operations-monitor?stage=${stage.key}`}
                className={styles.stage}
                aria-label={`${stage.label}: ${snapshot ? count : "unavailable"} on this page. Open stage queue.`}
              >
                <span className={styles.stageTop}>
                  <span className={styles.step}>{index + 1}</span>
                  <span>{stage.label}</span>
                </span>
                <strong>{snapshot ? count : "—"}</strong>
                <small>{stage.detail}</small>
                <span className={styles.track} aria-hidden="true">
                  <span
                    style={{
                      width: `${items.length ? (count / items.length) * 100 : 0}%`,
                    }}
                  />
                </span>
              </Link>
            );
          })}
        </div>
      </section>
      <div className={styles.columns}>
        <section
          className={styles.queue}
          aria-labelledby="coordination-queue-title"
        >
          <header className={styles.heading}>
            <div>
              <h2 id="coordination-queue-title">Needs coordination</h2>
              <p>Overdue first, then longest waiting</p>
            </div>
            <Link href="/system/operations-monitor">View all</Link>
          </header>
          <nav className={styles.filters} aria-label="Open monitoring category">
            {monitorTabs
              .filter((tab) => {
                return tab.key !== "all";
              })
              .map((tab) => {
                return (
                  <Link
                    key={tab.key}
                    href={`/system/operations-monitor?kind=${tab.key}`}
                  >
                    {tab.label}
                    <span>{snapshot?.counts[tab.key] ?? "—"}</span>
                  </Link>
                );
              })}
          </nav>
          <p className={styles.filterNote}>
            An item can appear in more than one category.
          </p>
          {work.error ? (
            <div className={styles.state} role="alert">
              <strong>Monitoring unavailable</strong>
              <p>{work.error}</p>
              <button
                type="button"
                onClick={() => {
                  void work.refresh();
                }}
              >
                Try again
              </button>
            </div>
          ) : pending ? (
            <div className={styles.state}>
              <WorkspaceProgress label="Loading coordination queue…" />
            </div>
          ) : !items.length ? (
            <div className={styles.state}>
              <CheckCircle size={26} />
              <strong>No active items</strong>
              <p>New review items and open follow-ups will appear here.</p>
            </div>
          ) : (
            <ul className={styles.records}>
              {items.slice(0, 6).map((item) => {
                return (
                  <li key={`${item.source}:${item.id}`}>
                    <button
                      type="button"
                      className={styles.record}
                      data-coordinator-record
                      onClick={() => {
                        void work.open(item);
                      }}
                    >
                      <span className={styles.recordIcon}>
                        <ClipboardText size={20} />
                      </span>
                      <span className={styles.recordCopy}>
                        <strong>{item.batchCode}</strong>
                        <span>
                          {item.source === "PAYMENT"
                            ? "Payment"
                            : "GCash statement"}{" "}
                          · {item.responsibleName}
                        </span>
                        <small>{monitorReasons(item)}</small>
                      </span>
                      <span className={styles.recordMeta}>
                        <span>
                          {item.stage.charAt(0) +
                            item.stage.slice(1).toLowerCase()}
                        </span>
                        <strong data-overdue={item.overdue}>
                          {waitingAge(
                            item.waitingSince,
                            Date.parse(snapshot!.asOf),
                          )}
                        </strong>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {items.length > 6 && (
            <p className={styles.queueFoot}>
              Showing the first 6 items.{" "}
              <Link href="/system/operations-monitor">Continue in monitor</Link>
            </p>
          )}
        </section>
        <aside className={styles.rail}>
          {tasks.allowed && (
            <section
              className={styles.tasks}
              aria-labelledby="coordinator-tasks-title"
              aria-busy={tasks.loading}
            >
              <header className={styles.heading}>
                <div>
                  <h2 id="coordinator-tasks-title">
                    Open tasks <span>{tasks.data?.count ?? "—"}</span>
                  </h2>
                  <p>In your task scope</p>
                </div>
              </header>
              {tasks.error ? (
                <div className={styles.state} role="alert">
                  <p>{tasks.error}</p>
                  <button
                    type="button"
                    onClick={() => {
                      void tasks.load();
                    }}
                  >
                    Retry tasks
                  </button>
                </div>
              ) : !tasks.data ? (
                <div className={styles.state}>
                  <WorkspaceProgress label="Loading open tasks…" />
                </div>
              ) : !tasks.data.items.length ? (
                <div className={styles.state}>
                  <CheckCircle size={24} />
                  <strong>No open tasks</strong>
                </div>
              ) : (
                <ul className={styles.taskList}>
                  {tasks.data.items.slice(0, 4).map((task) => {
                    return (
                      <li key={task.id}>
                        <Link
                          href={`/system/tasks?task=${encodeURIComponent(task.id)}`}
                        >
                          <strong>{task.title}</strong>
                          <span>{task.assignee_name}</span>
                          <small>
                            {new Intl.DateTimeFormat("en-PH", {
                              month: "short",
                              day: "numeric",
                              timeZone: "Asia/Manila",
                            }).format(new Date(task.deadline))}{" "}
                            · {task.status.replaceAll("_", " ")}
                          </small>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
              <Link className={styles.taskLink} href="/system/tasks">
                {can(work.me, "TASK_ASSIGN")
                  ? "View & assign tasks"
                  : "View tasks"}
              </Link>
            </section>
          )}
          <section
            className={styles.people}
            aria-labelledby="coordinator-people-title"
          >
            <UsersThree size={22} />
            <h2 id="coordinator-people-title">People & ownership</h2>
            <div>
              {can(work.me, "STAFF_READ") && (
                <Link href="/system/personnel">Personnel directory</Link>
              )}
              {can(work.me, "AGENT_NETWORK_READ") && (
                <Link href="/system/agent-network">Agent network</Link>
              )}
            </div>
          </section>
        </aside>
      </div>
      {snapshot && (
        <p className={styles.updated}>
          Updated{" "}
          {new Intl.DateTimeFormat("en-PH", {
            hour: "numeric",
            minute: "2-digit",
            timeZone: "Asia/Manila",
          }).format(new Date(snapshot.asOf))}{" "}
          · Philippine time
        </p>
      )}
      <MonitorFollowUp work={work} />
    </div>
  );
}
