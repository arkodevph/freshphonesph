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
import styles from "./finance-dashboard.module.css";

const stages: { queue: FinancePaymentQueue; detail: string }[] = [
  { queue: "ready", detail: "Eligible for final Finance verification" },
  {
    queue: "waiting_records",
    detail: "Receipt proof or current completeness approval needed",
  },
  {
    queue: "waiting_manager",
    detail: "Current assigned Manager cross-check needed",
  },
  {
    queue: "waiting_evidence",
    detail: "Required batch submission evidence is incomplete",
  },
  {
    queue: "membership_closed",
    detail: "Handed-over membership; payment history is read-only",
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
    <section className={styles.panel} aria-labelledby="finance-queues-title">
      <header className={styles.panelHeader}>
        <div>
          <h3 id="finance-queues-title">Payment review queues</h3>
          <p>Each pending claim appears at its next blocking stage.</p>
        </div>
        <Link href="/system/payments?queue=all" className={styles.textLink}>
          All payments
        </Link>
      </header>
      <ul className={styles.queueList}>
        {stages.map(({ queue, detail }) => {
          return (
            <li key={queue}>
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
          <p>COO-approved refunds with an amount still to record.</p>
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
        Remaining approved amount. Record only refunds already paid outside the
        app.
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
            Your open tasks{" "}
            <span className={styles.count}>
              <FinanceValue value={data?.tasks.count} error={error} />
            </span>
          </h3>
          <p>Your earliest deadlines · to do and in progress</p>
        </div>
        <Link href="/system/tasks" className={styles.textLink}>
          Task workspace
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
            <strong>No open tasks assigned to you</strong>
            <p>
              Your Finance department&apos;s other work remains in the task
              workspace.
            </p>
          </div>
        )
      ) : (
        <p className={styles.muted}>
          {error
            ? "Your tasks are unavailable. Retry the overview above."
            : "Loading your tasks…"}
        </p>
      )}
    </section>
  );
}
