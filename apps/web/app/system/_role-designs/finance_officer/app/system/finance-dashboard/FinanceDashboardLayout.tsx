"use client";
import Link from "next/link";
import type { useExecutiveCharts } from "@/app/system/useExecutiveCharts";
import type { useFinanceOverview } from "./useFinanceOverview";
import type { useFinanceActivity } from "./useFinanceActivity";
import { useWorkspaceMotion } from "@/lib/useWorkspaceMotion";
import { formatPeso } from "@/lib/currency";
import {
  FinanceCollectionCard,
  FinanceMetricCards,
} from "./FinanceOverviewCards";
import FinanceCollections from "./FinanceCollections";
import FinanceRecentPayments from "./FinanceRecentPayments";
import { FinanceSlot } from "./FinanceSkeleton";
import styles from "./finance-dashboard.module.css";

type Props = {
  name?: string;
  overview: ReturnType<typeof useFinanceOverview>;
  chart: ReturnType<typeof useExecutiveCharts>;
  activity: ReturnType<typeof useFinanceActivity>;
};

export default function FinanceDashboardLayout({
  name,
  overview,
  chart,
  activity,
}: Props) {
  const motion = useWorkspaceMotion();
  const { data, error, pending } = overview;
  const loading = !data && !error;
  return (
    <div className={styles.dashboard} ref={motion}>
      <header className={styles.heading}>
        <h2>
          <FinanceSlot loading={!name} width="14ch">
            Hello, {name}.
          </FinanceSlot>
        </h2>
        <button
          className={styles.refresh}
          disabled={pending}
          onClick={() => {
            void overview.refresh();
            void chart.refresh();
            void activity.refresh();
          }}
        >
          {pending ? "Updating…" : "Refresh"}
        </button>
      </header>
      {error ? (
        <div className={styles.error} role="alert">
          <p>{error}</p>
          {data ? (
            <p>
              Showing the last successful update from{" "}
              {new Date(data.updatedAt).toLocaleTimeString("en-PH", {
                timeZone: "Asia/Manila",
              })}
              . These figures may have changed.
            </p>
          ) : null}
          <button onClick={() => void overview.refresh()} disabled={pending}>
            Try again
          </button>
        </div>
      ) : null}
      <span className="sr-only" role="status">
        {pending ? "Updating Finance overview…" : "Finance overview updated."}
      </span>
      <div className={styles.topGrid}>
        <FinanceCollectionCard
          data={data}
          error={error}
          period={overview.period}
          selectPeriod={overview.selectPeriod}
        />
        <FinanceMetricCards data={data} error={error} />
        <FinanceCollections state={chart} />
      </div>
      <div className={styles.lowerGrid}>
        <div className={styles.sideStack}>
          <section
            className={`${styles.panel} ${styles.refundPanel}`}
            aria-label="Approved refunds"
          >
            <header className={styles.panelHeader}>
              <h3>Approved refunds</h3>
              <span>
                <FinanceSlot loading={loading} width="2ch">
                  {data?.refunds.count ?? "—"}
                </FinanceSlot>
              </span>
            </header>
            <p className={styles.refundAmount}>
              <FinanceSlot loading={loading} width="65%">
                {data ? formatPeso(data.refunds.remaining) : "—"}
              </FinanceSlot>
            </p>
            <p className={styles.muted}>
              {data?.refunds.count === 0
                ? "No refunds awaiting recording."
                : "Record after payment outside the app."}
            </p>
            <Link
              className={styles.textLink}
              href="/system/withdrawals?refund=outstanding"
            >
              Open refunds
            </Link>
          </section>
          <section
            className={`${styles.panel} ${styles.tasksPanel}`}
            aria-label="Finance tasks"
          >
            <header className={styles.panelHeader}>
              <h3>Open tasks</h3>
              <Link href="/system/tasks">View all</Link>
            </header>
            <div className={styles.tasksContent}>
              {loading ? (
                <div className={styles.taskPlaceholder}>
                  <FinanceSlot loading width="85%">
                    &nbsp;
                  </FinanceSlot>
                  <FinanceSlot loading width="60%">
                    &nbsp;
                  </FinanceSlot>
                </div>
              ) : data?.tasks.items.length ? (
                <ul>
                  {data.tasks.items.slice(0, 2).map((task) => (
                    <li key={task.id}>
                      <Link href={`/system/tasks?task=${task.id}`}>
                        <strong>{task.title}</strong>
                        <small>
                          Due{" "}
                          {new Date(task.deadline).toLocaleDateString("en-PH", {
                            month: "short",
                            day: "numeric",
                            timeZone: "Asia/Manila",
                          })}
                        </small>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.muted}>
                  {error && !data
                    ? "Tasks unavailable."
                    : "No open tasks assigned to you."}
                </p>
              )}
            </div>
          </section>
        </div>
        <FinanceRecentPayments state={activity} />
      </div>
    </div>
  );
}

const idle = () => {};
const idleRefresh = async () => {};
export function FinanceDashboardLoading() {
  return (
    <FinanceDashboardLayout
      overview={{
        data: null,
        error: null,
        pending: true,
        period: "this_month",
        selectPeriod: idle,
        refresh: idleRefresh,
      }}
      chart={{
        data: null,
        error: null,
        pending: true,
        months: 6,
        selectMonths: idle,
        refresh: idleRefresh,
      }}
      activity={{
        data: null,
        count: null,
        error: null,
        pending: true,
        query: "",
        setQuery: idle,
        status: "all",
        setStatus: idle,
        refresh: idleRefresh,
      }}
    />
  );
}
