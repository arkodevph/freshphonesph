import Link from "next/link";
import type {
  FinanceOverview,
  FinancePaymentQueue,
} from "@freshphones/contracts";
import { formatPeso } from "@/lib/currency";
import { financeQueueLabels } from "@/lib/finance-workspace";
import {
  Calendar,
  CheckCircle,
  ClockCircle,
  Wallet,
} from "@/app/system/_role-designs/finance_officer/components/SolarIcons";
import { FinanceValue } from "./FinanceSummary";
import { SkeletonLine } from "@/app/system/_role-designs/finance_officer/components/WorkspaceProgress";
import styles from "./finance-dashboard.module.css";

const stages: { queue: FinancePaymentQueue; detail: string }[] = [
  { queue: "ready", detail: "Proof and cross-checks complete" },
  {
    queue: "waiting_records",
    detail: "Receipt proof or completeness approval needed",
  },
  {
    queue: "waiting_manager",
    detail: "Assigned Manager cross-check needed",
  },
  {
    queue: "waiting_evidence",
    detail: "Batch submission evidence incomplete",
  },
  {
    queue: "membership_closed",
    detail: "Handed over · history only",
  },
];

export function FinanceQueues({
  data,
  error,
}: {
  data: FinanceOverview | null;
  error: string | null;
}) {
  return (
    <section
      className={`${styles.panel} ${styles.reviewPanel}`}
      aria-labelledby="finance-queues-title"
    >
      <header className={styles.panelHeader}>
        <div>
          <h3 id="finance-queues-title">Payment review</h3>
        </div>
        <Link href="/system/payments?queue=all" className={styles.textLink}>
          All payments
        </Link>
      </header>
      <ul className={styles.queueList}>
        {stages.map(({ queue, detail }) => {
          return (
            <li key={queue} data-ready={queue === "ready" || undefined}>
              {queue === "waiting_records" && (
                <p className={styles.queueGroup}>Waiting on your team</p>
              )}
              {queue === "membership_closed" && (
                <p className={styles.queueGroup}>Archived memberships</p>
              )}
              <Link href={`/system/payments?queue=${queue}`}>
                <span className={styles.taskIcon}>
                  {queue === "ready" ? <CheckCircle /> : <ClockCircle />}
                </span>
                <span className={styles.queueCopy}>
                  <strong>{financeQueueLabels[queue]}</strong>
                  <small>{detail}</small>
                </span>
                <span className={styles.queueValue}>
                  <FinanceValue value={data?.queues[queue]} error={error} />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function FinanceRefunds({
  data,
  error,
}: {
  data: FinanceOverview | null;
  error: string | null;
}) {
  return (
    <section className={styles.panel} aria-labelledby="finance-refunds-title">
      <header className={styles.panelHeader}>
        <div>
          <h3 id="finance-refunds-title">
            Approved refunds{" "}
            <span className={styles.count}>
              <FinanceValue value={data?.refunds.count} error={error} />
            </span>
          </h3>
        </div>
        <Wallet />
      </header>
      <p className={styles.refundAmount}>
        <FinanceValue
          value={data ? formatPeso(data.refunds.remaining) : undefined}
          error={error}
        />
      </p>
      <p className={styles.muted}>
        {data?.refunds.count === 0
          ? "No approved refunds awaiting recording."
          : "Record refunds after they have been paid externally."}
      </p>
      <Link
        href="/system/withdrawals?refund=outstanding"
        className={styles.reportLink}
      >
        Open approved refunds
      </Link>
    </section>
  );
}

export function FinanceTasks({
  data,
  error,
}: {
  data: FinanceOverview | null;
  error: string | null;
}) {
  return (
    <section className={styles.panel} aria-labelledby="finance-tasks-title">
      <header className={styles.panelHeader}>
        <div>
          <h3 id="finance-tasks-title">
            Open tasks{" "}
            <span className={styles.count}>
              <FinanceValue value={data?.tasks.count} error={error} />
            </span>
          </h3>
        </div>
        <Link href="/system/tasks" className={styles.textLink}>
          View all
        </Link>
      </header>
      {data ? (
        data.tasks.items.length ? (
          <ol className={styles.taskList}>
            {data.tasks.items.map((task) => {
              return (
                <li key={task.id}>
                  <Link href={`/system/tasks?task=${task.id}`}>
                    <span className={styles.taskIcon}>
                      <Calendar />
                    </span>
                    <span>
                      <strong>{task.title}</strong>
                      <small>
                        Due{" "}
                        {new Intl.DateTimeFormat("en-PH", {
                          month: "short",
                          day: "numeric",
                          timeZone: "Asia/Manila",
                        }).format(new Date(task.deadline))}
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
            <strong>You’re all caught up</strong>
            <p>No open tasks assigned to you.</p>
          </div>
        )
      ) : error ? (
        <p className={styles.muted}>
          Tasks are unavailable. Retry the overview above.
        </p>
      ) : (
        <div className={styles.taskSkeleton} aria-label="Loading your tasks">
          <SkeletonLine width="70%" />
          <SkeletonLine width="45%" />
        </div>
      )}
    </section>
  );
}
