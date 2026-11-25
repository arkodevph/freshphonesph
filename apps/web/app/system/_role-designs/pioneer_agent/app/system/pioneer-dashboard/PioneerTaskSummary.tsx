import type { PioneerTaskOverview } from "@freshphones/contracts";
import styles from "./pioneer-dashboard.module.css";

const metrics = [
  ["outstanding", "Outstanding"],
  ["todo", "To do"],
  ["inProgress", "In progress"],
  ["submitted", "Submitted"],
  ["done", "Completed"],
  ["overdue", "Overdue to submit"],
  ["total", "All tasks"],
] as const;

export default function PioneerTaskSummary({
  data,
}: {
  data: PioneerTaskOverview | null;
}) {
  return (
    <div className={styles.taskSummary}>
      <p className={styles.summaryScope}>
        All recorded dates · your work and current active Agent team
      </p>
      <div className={styles.taskCounts}>
        {(["own", "team"] as const).map((scope) => {
          return (
            <section
              key={scope}
              aria-label={
                scope === "own" ? "Your task totals" : "Agent team task totals"
              }
            >
              <h4>{scope === "own" ? "Your tasks" : "Agent team tasks"}</h4>
              <dl>
                {metrics.map(([key, title]) => {
                  return (
                    <div key={key}>
                      <dt>{title}</dt>
                      <dd>
                        {data
                          ? new Intl.NumberFormat("en-PH").format(
                              data[scope][key],
                            )
                          : "—"}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </section>
          );
        })}
      </div>
      <p className={styles.summaryScope}>
        Outstanding includes submitted work awaiting completion. Overdue counts
        unsubmitted work past its deadline; formal KPI review is separate.
      </p>
    </div>
  );
}
