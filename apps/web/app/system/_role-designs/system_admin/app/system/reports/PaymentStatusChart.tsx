import {
  SkeletonLine,
  SkeletonText,
} from "@/app/system/_role-designs/system_admin/components/WorkspaceProgress";
import { useId } from "react";
import { paymentStatusRows } from "@/lib/report-summary";
import type { LoadedReport } from "@/app/system/_role-designs/system_admin/app/system/reports/report-view";
import styles from "@/app/system/_role-designs/system_admin/app/system/reports/reports.module.css";

export default function PaymentStatusChart({
  report,
}: {
  report: Extract<LoadedReport, { kind: "payments" }> | null;
}) {
  const titleId = useId();

  const rows = report
    ? paymentStatusRows(report)
    : [
        { label: "Verified", tone: "verified", value: 0 },
        { label: "Pending review", tone: "pending", value: 0 },
        { label: "Clarification", tone: "clarification", value: 0 },
        { label: "Rejected", tone: "rejected", value: 0 },
      ];

  const total = rows.reduce((sum, row) => {
    return sum + row.value;
  }, 0);

  let cursor = 0;

  const segments = rows.map((row) => {
    const start = cursor;

    const size = total ? (row.value / total) * 100 : 0;

    cursor += size;

    return { ...row, start, size };
  });

  return (
    <figure className={styles.statusChart} aria-labelledby={titleId}>
      <figcaption>
        <h3 id={titleId}>Payment status</h3>
        <p>Recorded payments by current status</p>
      </figcaption>
      <div className={styles.statusBody}>
        <div
          className={`${styles.donut}${!report ? ` ${styles.skeletonDonut}` : ""}`}
          aria-hidden="true"
        >
          <svg viewBox="0 0 144 144" className={styles.donutPlot}>
            <circle cx="72" cy="72" r="65" className={styles.donutTrack} />
            {report &&
              segments.map((segment) => {
                return (
                  <circle
                    key={segment.tone}
                    cx="72"
                    cy="72"
                    r="65"
                    pathLength="100"
                    className={styles.donutArc}
                    stroke={`var(--report-${segment.tone})`}
                    strokeDasharray={`${segment.size} ${100 - segment.size}`}
                    strokeDashoffset={-segment.start}
                  />
                );
              })}
          </svg>
          <div>
            <strong>
              {report ? (
                new Intl.NumberFormat("en-PH").format(total)
              ) : (
                <SkeletonLine width="2ch" />
              )}
            </strong>
            <span>records</span>
          </div>
        </div>
        <dl className={styles.statusLegend}>
          {rows.map((row) => {
            return (
              <div key={row.label}>
                <dt>
                  <i data-tone={row.tone} aria-hidden="true" />
                  {row.label}
                </dt>
                <dd>{report ? row.value : <SkeletonLine width="2ch" />}</dd>
              </div>
            );
          })}
        </dl>
      </div>
      <p className={styles.chartFootnote}>
        {!report ? (
          <SkeletonText>
            Record counts include verified payments whose credit was later
            reversed.
          </SkeletonText>
        ) : (
          <>
            {total === 0
              ? "No payment records in this selection. Try a wider period or another batch."
              : "Record counts include verified payments whose credit was later reversed."}
            {report?.data.rejectedPayments === undefined
              ? " Rejected counts were not captured in this saved report."
              : ""}
          </>
        )}
      </p>
    </figure>
  );
}
