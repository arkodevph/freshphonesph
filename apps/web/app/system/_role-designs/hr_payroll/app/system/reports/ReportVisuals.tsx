"use client";

import type { ReportKind } from "@freshphones/contracts";
import { BarChart } from "@/app/system/_role-designs/hr_payroll/components/charts/BarChart";
import styles from "@/app/system/_role-designs/hr_payroll/components/charts/charts.module.css";
import { reportChartModels } from "@/lib/report-chart-data";
import type { LoadedReport } from "@/app/system/_role-designs/hr_payroll/app/system/reports/report-view";
import layout from "@/app/system/_role-designs/hr_payroll/app/system/reports/reports.module.css";
import PaymentStatusChart from "@/app/system/_role-designs/hr_payroll/app/system/reports/PaymentStatusChart";

const pendingCharts: Record<
  ReportKind,
  { title: string; note: string; labels: string[] }[]
> = {
  payments: [],
  collections: [
    {
      title: "Outstanding balances by batch",
      note: "Current overall balances · up to six largest batches on this page.",
      labels: Array.from({ length: 6 }, (_, index) => {
        return "\u00a0".repeat(index + 1);
      }),
    },
    {
      title: "Collections by batch",
      note: "Verified credit in the applied period · up to six largest batches on this page.",
      labels: Array.from({ length: 6 }, (_, index) => {
        return "\u00a0".repeat(index + 1);
      }),
    },
  ],
  reconciliation: [
    {
      title: "Verified credit and corrections",
      note: "PHP · signed adjustments are already included in net verified credit.",
      labels: [
        "Original verified credit",
        "Finance adjustments",
        "Net verified credit",
      ],
    },
    {
      title: "Reconciliation review flags",
      note: "Records can have more than one flag. Flags require review and do not authorize a correction.",
      labels: [
        "Duplicate references",
        "Verification audit gaps",
        "Batch mismatches",
        "Schedule mismatches",
        "Adjustment audit gaps",
      ],
    },
  ],
  tasks: [
    {
      title: "Task progress",
      note: "Number of tasks created in the applied period, grouped by current status.",
      labels: ["To do", "In progress", "Submitted", "Completed"],
    },
    {
      title: "Submission timing",
      note: "Factual submission timing only; no automatic payroll or disciplinary action.",
      labels: ["Submitted on time", "Submitted late", "Not submitted"],
    },
  ],
  support: [
    {
      title: "Support cases by category",
      note: "Cases created in the applied period · up to eight largest categories.",
      labels: Array.from({ length: 4 }, (_, index) => {
        return "\u00a0".repeat(index + 1);
      }),
    },
    {
      title: "Where enquiries came from",
      note: "Recorded source of support cases in the applied period.",
      labels: Array.from({ length: 4 }, (_, index) => {
        return "\u00a0".repeat(index + 1);
      }),
    },
  ],
};

export default function ReportVisuals({
  report,
  kind = report?.kind ?? "payments",
}: {
  report: LoadedReport | null;
  kind?: ReportKind;
}) {
  if (kind === "payments") {
    const chart =
      report?.kind === "payments"
        ? reportChartModels(report)[1]
        : {
            title: "Collections and pending claims",
            note: "PHP · verified credit includes Finance corrections. Pending claims do not reduce balances.",
            unit: "money" as const,
            rows: ["Verified collections", "Pending claims"].map((label) => {
              return { label, value: "" };
            }),
          };

    return (
      <div
        className={`${styles.grid} ${layout.reportCharts} ${layout.paymentCharts}`}
        aria-label="Report charts"
      >
        <PaymentStatusChart
          report={report?.kind === "payments" ? report : null}
        />
        <BarChart {...chart} pending={!report} />
      </div>
    );
  }

  return (
    <div
      className={`${styles.grid} ${layout.reportCharts}`}
      aria-label="Report charts"
    >
      {(report
        ? reportChartModels(report)
        : pendingCharts[kind].map(({ title, note, labels }) => {
            return {
              title,
              note,
              unit: "count" as const,
              rows: labels.map((label) => {
                return { label, value: "" };
              }),
            };
          })
      ).map((chart) => {
        return <BarChart key={chart.title} {...chart} pending={!report} />;
      })}
    </div>
  );
}
