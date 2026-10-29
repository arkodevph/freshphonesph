"use client";

import { useId, useState, type CSSProperties } from "react";
import type { ExecutiveChartData } from "@freshphones/contracts";
import { formatPeso } from "@/lib/currency";
import { chartMaximum } from "@/lib/report-chart-data";
import styles from "./charts.module.css";

function monthLabel(month: string, short = false) {
  return new Intl.DateTimeFormat("en-PH", {
    month: short ? "short" : "long",
    ...(short ? {} : { year: "numeric" }),
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00Z`));
}

export function MonthlyCollectionsChart({
  data,
}: {
  data: ExecutiveChartData;
}) {
  const id = useId();

  const [selected, setSelected] = useState(data.months.length - 1);

  const maximum = chartMaximum(
    data.months.flatMap((point) => {
      return [Number(point.verifiedAmount), Number(point.pendingAmount)];
    }),
  );

  const point = data.months[selected] ?? data.months[data.months.length - 1];

  const compact = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    notation: "compact",
    maximumFractionDigits: 1,
  });

  return (
    <figure
      className={`${styles.scope} ${styles.card} ${styles.trend}`}
      aria-labelledby={id}
    >
      <figcaption>
        <div className={styles.figureHeading}>
          <div>
            <h3 id={id}>Collections over time</h3>
            <p>PHP · verified credit after Finance corrections.</p>
          </div>
          <span className={styles.periodTotal}>
            <small>Verified in this period</small>
            <strong>{formatPeso(data.verifiedAmount)}</strong>
          </span>
        </div>
        <div className={styles.legend}>
          <span>
            <i data-tone="verified" />
            Verified collections
          </span>
          <span>
            <i data-tone="pending" />
            Pending claims
          </span>
        </div>
      </figcaption>
      {maximum === 0 ? (
        <p className={styles.empty}>
          No verified or pending amounts in this period.
        </p>
      ) : (
        <div className={styles.plotScroll}>
          <div
            className={styles.plot}
            style={{ "--months": data.months.length } as CSSProperties}
          >
            <div className={styles.axis} aria-hidden="true">
              {[1, 0.75, 0.5, 0.25, 0].map((tick) => {
                return (
                  <span key={tick} style={{ top: `${(1 - tick) * 100}%` }}>
                    {compact.format(maximum * tick)}
                  </span>
                );
              })}
            </div>
            <div className={styles.columns}>
              <div className={styles.gridLines} aria-hidden="true">
                {[0, 25, 50, 75, 100].map((top) => {
                  return <i key={top} style={{ top: `${top}%` }} />;
                })}
              </div>
              {data.months.map((month, index) => {
                const name = monthLabel(month.month);

                return (
                  <button
                    key={month.month}
                    type="button"
                    className={styles.monthColumn}
                    aria-label={`${name}: verified ${formatPeso(month.verifiedAmount)}, pending ${formatPeso(month.pendingAmount)}`}
                    title={`${name} · Verified ${formatPeso(month.verifiedAmount)} · Pending ${formatPeso(month.pendingAmount)}`}
                    aria-pressed={selected === index}
                    onClick={() => {
                      return setSelected(index);
                    }}
                  >
                    <span className={styles.barPair} aria-hidden="true">
                      <span
                        data-tone="verified"
                        style={{
                          height: `${(Number(month.verifiedAmount) / maximum) * 100}%`,
                        }}
                      />
                      <span
                        data-tone="pending"
                        style={{
                          height: `${(Number(month.pendingAmount) / maximum) * 100}%`,
                        }}
                      />
                    </span>
                    <span className={styles.monthLabel}>
                      {monthLabel(month.month, true)}
                      <small>
                        {index === 0 || month.month.endsWith("-01")
                          ? month.month.slice(0, 4)
                          : ""}
                      </small>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {point && (
        <div className={styles.readout}>
          <strong>
            {monthLabel(point.month)}
            {point.month === data.dateTo.slice(0, 7) ? " · to date" : ""}
          </strong>
          <dl>
            <div>
              <dt>Verified collections</dt>
              <dd>{formatPeso(point.verifiedAmount)}</dd>
            </div>
            <div>
              <dt>Pending claims</dt>
              <dd>{formatPeso(point.pendingAmount)}</dd>
            </div>
          </dl>
        </div>
      )}
      <p className={styles.hint}>
        Select a month to inspect its figures. The current month is shown to
        date.
      </p>
      <details className={styles.dataTable}>
        <summary>View chart data</summary>
        <div>
          <table>
            <caption>
              Monthly collections, {data.dateFrom} to {data.dateTo}
            </caption>
            <thead>
              <tr>
                <th scope="col">Month</th>
                <th scope="col">Verified (PHP)</th>
                <th scope="col">Pending (PHP)</th>
              </tr>
            </thead>
            <tbody>
              {data.months.map((month) => {
                return (
                  <tr key={month.month}>
                    <th scope="row">{monthLabel(month.month)}</th>
                    <td>{formatPeso(month.verifiedAmount)}</td>
                    <td>{formatPeso(month.pendingAmount)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
