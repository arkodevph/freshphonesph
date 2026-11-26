"use client";

import type { InstallmentEarningsReport } from "@freshphones/contracts";
import { ChartFrame, ColumnChart } from "./CategoryCharts";
import styles from "./category-charts.module.css";

export default function InstallmentCharts({
  report,
}: {
  report: InstallmentEarningsReport;
}) {
  const rows = [...report.items]
    .sort((a, b) => Number(b.scheduledAmount) - Number(a.scheduledAmount))
    .slice(0, 6);

  const known = Math.max(
    0,
    report.totals.members - report.totals.membersWithoutSchedule,
  );

  return (
    <div
      className={styles.grid}
      data-kind="installments"
      aria-label="Installment earnings report charts"
    >
      <ColumnChart
        title="Scheduled obligations"
        note={`PHP · six largest ${report.groupBy === "members" ? "members" : "batches"} on this page. Obligations, not received payments or profit.`}
        unit="money"
        rows={rows.map((row) => ({
          label:
            report.groupBy === "members"
              ? `${row.memberName ?? "Member"} · ${row.batchCode}`
              : row.batchCode,
          value: row.scheduledAmount,
          tone: "blue",
        }))}
      />
      <ChartFrame
        title="Schedule coverage"
        note="Membership records across every page in this selection."
      >
        <div className={styles.segmentHeadline}>
          <strong>
            {report.totals.members
              ? `${Math.round((known / report.totals.members) * 100)}%`
              : "—"}
          </strong>
          <span>with an issued schedule</span>
        </div>
        <div className={styles.segments} aria-hidden="true">
          <span data-tone="blue" style={{ flex: known }} />
          <span
            data-tone="pending"
            style={{ flex: report.totals.membersWithoutSchedule }}
          />
        </div>
        <dl className={styles.segmentLegend}>
          <div>
            <dt>
              <i data-tone="blue" />
              With schedule
            </dt>
            <dd>{known}</dd>
          </div>
          <div>
            <dt>
              <i data-tone="pending" />
              Without schedule
            </dt>
            <dd>{report.totals.membersWithoutSchedule}</dd>
          </div>
          <div>
            <dt>Installments due</dt>
            <dd>{report.totals.installments}</dd>
          </div>
        </dl>
        <p className={styles.footnote}>
          {report.totals.membersWithoutSchedule
            ? "Amounts for memberships without a schedule are unknown, not zero earnings."
            : report.totals.members
              ? "Coverage includes retained historical memberships."
              : "No memberships in this selection."}
        </p>
      </ChartFrame>
    </div>
  );
}
