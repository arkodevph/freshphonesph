"use client";

import { BarChart } from "@/components/charts/BarChart";
import styles from "@/components/charts/charts.module.css";
import { reportChartModels } from "@/lib/report-chart-data";
import type { LoadedReport } from "./report-view";

export default function ReportVisuals({ report }: { report: LoadedReport }) {
  return (
    <div className={styles.grid} aria-label="Report charts">
      {reportChartModels(report).map((chart) => {
        return <BarChart key={chart.title} {...chart} />;
      })}
    </div>
  );
}
