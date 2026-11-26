"use client";

import type { ReportKind } from "@freshphones/contracts";
import { reportChartModels } from "@/lib/report-chart-data";
import type { LoadedReport } from "./report-view";
import PaymentStatusChart from "./PaymentStatusChart";
import {
  ChartFrame,
  ColumnChart,
  FlagChart,
  RankedChart,
  SegmentChart,
  TimingChart,
  WaterfallChart,
} from "./CategoryCharts";
import styles from "./category-charts.module.css";

export default function ReportVisuals({
  report,
  kind = report?.kind ?? "payments",
}: {
  report: LoadedReport | null;
  kind?: ReportKind;
}) {
  const charts = report ? reportChartModels(report) : [];

  return (
    <div
      className={styles.grid}
      data-kind={kind}
      aria-label={`${kind} report charts`}
    >
      {!report ? (
        <>
          <ChartFrame
            title="Report breakdown"
            note="Loading the applied selection"
            pending
          >
            {null}
          </ChartFrame>
          <ChartFrame
            title="Supporting figures"
            note="Loading the applied selection"
            pending
          >
            {null}
          </ChartFrame>
        </>
      ) : kind === "payments" ? (
        <>
          <PaymentStatusChart
            report={report.kind === "payments" ? report : null}
          />
          <ColumnChart {...charts[1]} />
        </>
      ) : kind === "collections" ? (
        <>
          <ColumnChart {...charts[1]} />
          <RankedChart {...charts[0]} />
        </>
      ) : kind === "reconciliation" ? (
        <>
          <WaterfallChart {...charts[0]} />
          <FlagChart {...charts[1]} />
        </>
      ) : kind === "tasks" ? (
        <>
          <SegmentChart {...charts[0]} noun="tasks" />
          <TimingChart {...charts[1]} />
        </>
      ) : (
        <>
          <RankedChart {...charts[0]} />
          {charts[1] ? (
            <SegmentChart
              {...charts[1]}
              noun="cases"
              rows={charts[1].rows.map((row, index) => {
                return {
                  ...row,
                  tone: (
                    ["blue", "pending", "accent", "negative", "muted"] as const
                  )[index % 5],
                };
              })}
            />
          ) : (
            <ChartFrame
              title="Enquiry sources"
              note="Source data was not captured in this report."
            >
              {null}
            </ChartFrame>
          )}
        </>
      )}
    </div>
  );
}
