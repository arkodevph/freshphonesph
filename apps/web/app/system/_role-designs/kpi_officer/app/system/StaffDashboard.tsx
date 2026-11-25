"use client";

import Link from "next/link";
import { ArrowClockwise, Check, ClipboardText } from "@phosphor-icons/react";
import { can, useMe } from "@/lib/useMe";
import Select from "@/app/system/_role-designs/kpi_officer/components/Select";
import WorkspaceProgress from "@/app/system/_role-designs/kpi_officer/components/WorkspaceProgress";
import { formatDate, label } from "./tasks/task-view";
import { kpiPeriod, useKpiOverview } from "./useKpiOverview";
import styles from "./kpi-dashboard.module.css";

const statuses = [
  ["TODO", "To do"],
  ["IN_PROGRESS", "In progress"],
  ["SUBMITTED", "Submitted"],
  ["DONE", "Completed"],
  ["CANCELLED", "Cancelled"],
] as const;

function Overview({ name }: { name: string }) {
  const state = useKpiOverview();

  const report = state.report.data;

  const queue = state.queue.data;

  const history = state.history.data;

  const onTime = report ? Math.max(0, report.submitted - report.late) : 0;

  const rate = report?.submitted
    ? Math.round((onTime / report.submitted) * 100)
    : null;

  const dates = kpiPeriod(state.period);

  return (
    <div className={styles.workspace} data-kpi-dashboard>
      <header className={styles.heading}>
        <h1>Hello, {name}.</h1>
        <button
          type="button"
          className={styles.button}
          disabled={state.loading}
          onClick={() => {
            void state.load();
          }}
        >
          <ArrowClockwise aria-hidden="true" size={17} />
          Refresh
        </button>
      </header>
      <div className={styles.layout}>
        <section
          className={styles.queue}
          aria-labelledby="kpi-queue-heading"
          aria-busy={state.loading}
        >
          <div className={styles.sectionHeading}>
            <div>
              <h2 id="kpi-queue-heading">
                Awaiting your review{" "}
                <span className={styles.count}>{queue?.count ?? "—"}</span>
              </h2>
              <p>Late submissions · all task dates</p>
            </div>
            <Link href="/system/tasks" className={styles.textLink}>
              View all tasks
            </Link>
          </div>
          {state.queue.error ? (
            <Failure error={state.queue.error} retry={state.load} />
          ) : !queue ? (
            <WorkspaceProgress
              className={styles.empty}
              label="Loading review queue…"
            />
          ) : queue.results.length === 0 ? (
            <div className={styles.empty}>
              <Check aria-hidden="true" size={26} />
              <strong>No submissions awaiting review</strong>
              <p>Late task submissions will appear here.</p>
            </div>
          ) : (
            <div className={styles.reviewList}>
              {queue.results.slice(0, 6).map((task) => (
                <Link
                  className={styles.reviewRow}
                  href={`/system/tasks?task=${task.id}`}
                  key={task.id}
                >
                  <span className={styles.avatar} aria-hidden="true">
                    {task.assigneeName
                      .split(" ")
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join("")}
                  </span>
                  <span className={styles.identity}>
                    <strong>{task.title}</strong>
                    <span>{task.assigneeName}</span>
                    <small>Due {formatDate(task.deadline)}</small>
                  </span>
                  <span className={styles.reviewMeta}>
                    <span className={styles.late}>Late</span>
                    <small>
                      {task.submittedAt
                        ? `Submitted ${formatDate(task.submittedAt)}`
                        : "Submission time unavailable"}
                    </small>
                    <span className={styles.textLink}>Review task</span>
                  </span>
                </Link>
              ))}
            </div>
          )}
          <footer className={styles.queueFooter}>
            <ClipboardText aria-hidden="true" size={17} />
            <p>
              Timing is a fact. Evaluations and recommendations are recorded by
              you.
            </p>
          </footer>
        </section>
        <section
          className={styles.performance}
          aria-labelledby="kpi-performance-heading"
          aria-busy={state.loading}
        >
          <div className={styles.sectionHeading}>
            <h2 id="kpi-performance-heading">Task performance</h2>
          </div>
          <label className={styles.period}>
            <span id="kpi-period-label">Tasks created</span>
            <Select
              labelId="kpi-period-label"
              id="kpi-period"
              value={state.period}
              options={[
                { value: "month", label: "This month" },
                { value: "previous", label: "Last month" },
                { value: "all", label: "All time" },
              ]}
              onValueChange={state.setPeriod}
            />
          </label>
          <p className={styles.scope}>
            {dates.dateFrom
              ? `${dates.dateFrom} – ${dates.dateTo} · PHT`
              : "All task creation dates"}
          </p>
          {state.report.error ? (
            <Failure error={state.report.error} retry={state.load} />
          ) : !report ? (
            <WorkspaceProgress
              className={styles.empty}
              label="Loading performance…"
            />
          ) : (
            <>
              <div className={styles.rate}>
                <span>On-time submissions</span>
                <strong>{rate === null ? "—" : `${rate}%`}</strong>
                <p>
                  {report.submitted
                    ? `${onTime} of ${report.submitted} submitted tasks`
                    : "No submitted tasks in this period"}
                </p>
              </div>
              <div className={styles.timingTrack} aria-hidden="true">
                {report.submitted > 0 && (
                  <>
                    <span
                      style={{ width: `${(onTime / report.submitted) * 100}%` }}
                    />
                    <span
                      style={{
                        width: `${(report.late / report.submitted) * 100}%`,
                      }}
                    />
                  </>
                )}
              </div>
              <dl className={styles.timing}>
                <div>
                  <dt>On time</dt>
                  <dd>{onTime}</dd>
                </div>
                <div>
                  <dt>Late</dt>
                  <dd>{report.late}</dd>
                </div>
                <div>
                  <dt>Reviewed</dt>
                  <dd>{report.reviewed}</dd>
                </div>
              </dl>
              <div className={styles.statusHeading}>
                <h3>Task breakdown</h3>
                <span>{report.total} total</span>
              </div>
              <dl className={styles.breakdown}>
                {statuses.map(([status, title]) => (
                  <div key={status}>
                    <dt>{title}</dt>
                    <dd>
                      <span className={styles.statusTrack} aria-hidden="true">
                        <span
                          style={{
                            width: `${report.total ? ((report.byStatus[status] ?? 0) / report.total) * 100 : 0}%`,
                          }}
                        />
                      </span>
                      <strong>{report.byStatus[status] ?? 0}</strong>
                    </dd>
                  </div>
                ))}
              </dl>
              <Link href="/system/reports" className={styles.reportLink}>
                Open task report
              </Link>
            </>
          )}
        </section>
        <section
          className={styles.history}
          aria-labelledby="kpi-history-heading"
          aria-busy={state.loading}
        >
          <div className={styles.sectionHeading}>
            <h2 id="kpi-history-heading">Recent decisions</h2>
            <Link
              href="/system/tasks#review-history"
              className={styles.textLink}
            >
              Review history
            </Link>
          </div>
          {state.history.error ? (
            <Failure error={state.history.error} retry={state.load} />
          ) : !history ? (
            <WorkspaceProgress
              className={styles.empty}
              label="Loading recent decisions…"
            />
          ) : history.results.length === 0 ? (
            <p className={styles.historyEmpty}>No reviews recorded yet.</p>
          ) : (
            <div className={styles.historyList}>
              {history.results.slice(0, 3).map((item) => (
                <Link
                  key={item.id}
                  href={`/system/tasks?task=${item.taskId}`}
                  className={styles.historyRow}
                >
                  <span className={styles.identity}>
                    <strong>{item.taskTitle}</strong>
                    <span>
                      {item.assigneeName} · {item.reviewerName}
                    </span>
                  </span>
                  <span className={styles.reviewMeta}>
                    <strong>{label(item.decision)}</strong>
                    <small>{formatDate(item.createdAt)}</small>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
      {state.loading && report && (
        <WorkspaceProgress label="Refreshing KPI workspace…" />
      )}
    </div>
  );
}

function Failure({
  error,
  retry,
}: {
  error: string;
  retry: () => Promise<void>;
}) {
  return (
    <div className={styles.failure} role="alert">
      <p>{error}</p>
      <button
        className={styles.button}
        type="button"
        onClick={() => {
          void retry();
        }}
      >
        Try again
      </button>
    </div>
  );
}

export default function StaffDashboard() {
  const me = useMe();

  if (!me) {
    return <WorkspaceProgress label="Loading KPI workspace…" />;
  }

  if (!can(me, "KPI_REVIEW", "REPORT_VIEW")) {
    return <p role="alert">No access to the KPI workspace.</p>;
  }

  return <Overview key={me.id} name={me.full_name?.split(" ")[0] ?? "there"} />;
}
