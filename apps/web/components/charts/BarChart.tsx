"use client";

import { useId } from "react";
import { formatPeso } from "@/lib/currency";
import { barScale, type BarChartModel } from "@/lib/report-chart-data";
import styles from "./charts.module.css";

export function BarChart({ title, note, rows, unit }: BarChartModel) {
  const id = useId();

  const scale = barScale(rows);

  return (
    <figure className={`${styles.scope} ${styles.card}`} aria-labelledby={id}>
      <figcaption>
        <h3 id={id}>{title}</h3>
        <p>{note}</p>
      </figcaption>
      {scale.empty && rows.length > 0 && (
        <p className={styles.empty}>
          No activity captured for these categories.
        </p>
      )}
      <dl className={styles.barList}>
        {rows.map((row, index) => {
          return (
            <div className={styles.barRow} key={row.label}>
              <div className={styles.barHeading}>
                <dt>{row.label}</dt>
                <dd>
                  {unit === "money"
                    ? formatPeso(row.value)
                    : new Intl.NumberFormat("en-PH").format(Number(row.value))}
                </dd>
              </div>
              <div className={styles.track} aria-hidden="true">
                <span
                  className={styles.zeroLine}
                  style={{ left: `${scale.zero}%` }}
                />
                <span
                  className={styles.bar}
                  data-tone={row.tone ?? "accent"}
                  style={{
                    left: `${scale.rows[index].start}%`,
                    width: `${scale.rows[index].width}%`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </dl>
      {!rows.length && (
        <p className={styles.empty}>No records match this report.</p>
      )}
    </figure>
  );
}
