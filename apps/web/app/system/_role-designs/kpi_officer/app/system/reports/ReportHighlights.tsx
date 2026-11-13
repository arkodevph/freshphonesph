"use client";

import {
  SkeletonLine,
  SkeletonText,
} from "@/app/system/_role-designs/kpi_officer/components/WorkspaceProgress";
import type { ReportKind } from "@freshphones/contracts";
import { reportHighlights } from "@/lib/report-summary";
import { reportChange } from "@/lib/report-comparison";
import type { ReportFilters } from "@/lib/report-filters";
import {
  ChartBar,
  Clock,
  Info,
  CheckCircle,
  Minus,
} from "@phosphor-icons/react/dist/ssr";
import type { LoadedReport } from "@/app/system/_role-designs/kpi_officer/app/system/reports/report-view";
import styles from "@/app/system/_role-designs/kpi_officer/app/system/reports/reports.module.css";
import { dateLabel } from "@/app/system/_role-designs/kpi_officer/app/system/reports/report-view";
import { useReportComparison } from "@/app/system/reports/useReportComparison";

const pendingLabels: Record<ReportKind, string[]> = {
  payments: [
    "Verified collections",
    "Awaiting verification",
    "Needs clarification",
    "Rejected records",
  ],
  collections: [
    "Verified in period",
    "Pending in period",
    "Remaining overall",
    "Without a schedule",
  ],
  reconciliation: [
    "Verified credit",
    "Audit evidence gap",
    "Payments flagged",
    "Recorded payments",
  ],
  tasks: ["Tasks created", "Submitted", "Submitted late", "KPI reviews"],
  support: [
    "Cases created",
    "Open cases",
    "Resolved or closed",
    "Reported categories",
  ],
};

const pendingNotes: Record<ReportKind, string[]> = {
  payments: [
    "00 verified payment records",
    "00 pending · excluded from balances",
    "Records that need more information",
    "Excluded from verified collections",
  ],
  collections: [
    "00 verified payment records",
    "Excluded from balances",
    "Current balance across all dates",
    "Agreed amounts are not yet known",
  ],
  reconciliation: [
    "Includes recorded Finance adjustments",
    "00 records require review",
    "Each payment counted once",
    "All statuses in the selected period",
  ],
  tasks: [
    "Created within the selected period",
    "Includes completed submissions",
    "Recorded timing, not a wage deduction",
    "Reviews entered by a person",
  ],
  support: [
    "Created within the selected period",
    "Current status of scoped cases",
    "Current status of scoped cases",
    "Categories represented in this period",
  ],
};

const icons = [CheckCircle, Clock, Info, ChartBar];

function WavyTrendArrow({ direction }: { direction: "up" | "down" | "flat" }) {
  const flat = direction === "flat";

  return (
    <svg
      className={styles.wavyArrow}
      viewBox="0 0 24 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      data-trend-wave={direction}
    >
      <g
        transform={
          direction === "down" ? "translate(0 16) scale(1 -1)" : undefined
        }
      >
        <path
          d={
            flat
              ? "M2 8C4 3 7 3 9 8S14 13 17 8H22"
              : "M2 13C5 13 3.5 6.5 7 6.5S9.5 11 12 9S14.5 3.5 18 3.5H22"
          }
        />
        <path d={flat ? "M19 5L22 8L19 11" : "M18.5 1L22 3.5L18.5 6"} />
      </g>
    </svg>
  );
}

export default function ReportHighlights({
  report,
  filters,
  kind = report?.kind ?? "payments",
}: {
  report: LoadedReport | null;
  kind?: ReportKind;
  filters: ReportFilters;
}) {
  const comparison = useReportComparison(kind, filters, report);

  const previous = comparison.report ? reportHighlights(comparison.report) : [];

  const period = comparison.previous
    ? `${dateLabel(comparison.previous.dateFrom)} – ${dateLabel(comparison.previous.dateTo)}`
    : null;

  const items = report
    ? reportHighlights(report)
    : pendingLabels[kind].map((label) => {
        return { label, value: "", note: "", comparisonValue: undefined };
      });

  return (
    <>
      <dl className={styles.highlights} aria-label="Key report figures">
        {items.map((item, index) => {
          const Icon = icons[index];

          const change = reportChange(
            item.comparisonValue,
            previous[index]?.comparisonValue,
          );

          const pending =
            comparison.pending && item.comparisonValue !== undefined;

          const explanation = `${change.explanation}${period ? ` Comparison period: ${period}.` : " Select both dates to compare periods."}`;

          return (
            <div key={item.label}>
              <dt>
                <span>{item.label}</span>
                <Icon aria-hidden="true" />
              </dt>
              <dd>
                <span>
                  {report ? (
                    item.value
                  ) : (
                    <SkeletonLine width={index < 2 ? "8.5ch" : "2ch"} />
                  )}
                </span>
                {!report && (
                  <span className={styles.metricChange}>
                    <SkeletonText>↝ 00.00%</SkeletonText>
                  </span>
                )}
                {report && (
                  <span
                    className={styles.metricChange}
                    data-direction={pending ? "unavailable" : change.direction}
                    role="img"
                    title={
                      pending ? "Loading the previous period…" : explanation
                    }
                    aria-label={
                      pending ? "Loading the previous period" : explanation
                    }
                  >
                    {pending || change.direction === "unavailable" ? (
                      <Minus aria-hidden="true" />
                    ) : (
                      <WavyTrendArrow direction={change.direction} />
                    )}
                    <span>{pending ? "Comparing…" : change.label}</span>
                  </span>
                )}
              </dd>
              <p>
                {report ? (
                  item.note
                ) : (
                  <SkeletonText>{pendingNotes[kind][index]}</SkeletonText>
                )}
              </p>
            </div>
          );
        })}
      </dl>
      <p className={styles.comparisonNote}>
        {period
          ? `Compared with ${period} (same length).`
          : "Choose both dates for a period comparison."}{" "}
        Green means an increase; red means a decrease.
        {comparison.failed &&
          " Previous-period figures could not be loaded. Refresh figures to retry."}
      </p>
    </>
  );
}
