"use client";

import { SkeletonLine } from "@/components/WorkspaceProgress";
import { useId } from "react";
import { formatPeso } from "@/lib/currency";
import { barScale, type BarChartModel } from "@/lib/report-chart-data";
import styles from "./charts.module.css";

export function BarChart({
  title,
  note,
  rows,
  unit,
  pending = false,
}: BarChartModel & { pending?: boolean }) {
  const id = useId();

  const scale = barScale(rows);

  return (
    <figure className={`${styles.scope} ${styles.card}`} aria-labelledby={id}>
      <figcaption>
        <h3 id={id}>{title}</h3>
        <p>{note}</p>
      </figcaption>
      {!pending && scale.empty && rows.length > 0 && (
        <p className={styles.empty}>
          No activity captured for these categories.
        </p>
      )}
      <dl className={styles.barList}>
        {rows.map((row, index) => {
          return (
            <div className={styles.barRow} key={row.label}>
              <div className={styles.barHeading}>
                <dt>
                  {pending && !row.label.trim() ? (
                    <SkeletonLine width="120px" />
                  ) : (
                    row.label
                  )}
                </dt>
                <dd>
                  {pending ? (
                    <SkeletonLine width="8ch" />
                  ) : unit === "money" ? (
                    formatPeso(row.value)
                  ) : (
                    new Intl.NumberFormat("en-PH").format(Number(row.value))
                  )}
                </dd>
              </div>
              <div
                className={`${styles.track}${pending ? ` ${styles.skeletonTrack}` : ""}`}
                aria-hidden="true"
              >
                {!pending && !scale.empty && scale.zero > 0 && (
                  <span
                    className={styles.zeroLine}
                    style={{ left: `${scale.zero}%` }}
                  />
                )}
                {!pending && (
                  <span
                    className={styles.bar}
                    data-tone={row.tone ?? "accent"}
                    data-negative={Number(row.value) < 0 || undefined}
                    style={{
                      left: `${scale.rows[index].start}%`,
                      width: `${scale.rows[index].width}%`,
                    }}
                  />
                )}
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
