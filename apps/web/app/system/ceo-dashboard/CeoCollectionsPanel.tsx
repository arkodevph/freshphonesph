"use client";

import styles from "../ceo-portal.module.css";
import Select from "@/components/Select";
import type { ChartMonths, ExecutiveChartData } from "@freshphones/contracts";
import { reportingDate } from "@/lib/executive-overview";
import CeoCollections from "./CeoCollections";
import { CeoCollectionsSkeleton } from "./CeoLoading";
export default function CeoCollectionsPanel({
  data,
  error,
  months,
  selectMonths,
}: {
  data: ExecutiveChartData | null;
  error: string | null;
  months: ChartMonths;
  selectMonths: (value: ChartMonths) => void;
}) {
  const period = data
    ? `${reportingDate(data.dateFrom)} – ${reportingDate(data.dateTo)}`
    : `Last ${months} months`;

  return (
    <section
      className={`${styles.panel} ${styles.collections}`}
      aria-labelledby="collections-title"
    >
      <header className={styles.panelHeading}>
        <h2 id="collections-title">Total collections</h2>
        <div className={styles.periodSelect}>
          <span id="collection-period-label" className={styles.controlLabel}>
            Period
          </span>
          <Select
            animate
            fitViewport
            id="collection-period"
            labelId="collection-period-label"
            value={String(months)}
            onValueChange={(value) => {
              return selectMonths(Number(value) as ChartMonths);
            }}
            options={[3, 6, 12].map((value) => {
              return {
                value: String(value),
                label: `${value} months`,
              };
            })}
          />
        </div>
      </header>
      <p className={styles.scopeLabel}>{period}</p>
      {data ? (
        <CeoCollections key={`${data.dateFrom}:${data.dateTo}`} data={data} />
      ) : !error ? (
        <CeoCollectionsSkeleton months={months} />
      ) : (
        <div className={styles.loading} role="status">
          Collection figures unavailable.
        </div>
      )}
    </section>
  );
}
