"use client";

import { useState, type CSSProperties } from "react";
import type { ExecutiveChartData } from "@freshphones/contracts";
import { formatPeso } from "@/lib/currency";
import { collectionLines, shortMonth } from "@/lib/executive-overview";
import styles from "../ceo-portal.module.css";

export default function CeoCollections({ data }: { data: ExecutiveChartData }) {
  const [selected, setSelected] = useState<number | null>(null);

  const lines = collectionLines(data);

  const point = selected === null ? null : data.months[selected];

  return (
    <>
      <div className={styles.collectionTotal}>
        <strong>
          {formatPeso(point?.verifiedAmount ?? data.verifiedAmount)}
        </strong>
        <span>
          {point
            ? `Verified · ${shortMonth(point.month)} ${point.month.slice(0, 4)}`
            : "Verified in this period"}
        </span>
      </div>
      <div className={styles.collectionReadout} aria-live="polite">
        <span>
          {point
            ? `${shortMonth(point.month)} ${point.month.slice(0, 4)}`
            : "Period totals"}
        </span>
        <span>
          Pending{" "}
          <strong>
            {formatPeso(point?.pendingAmount ?? data.pendingAmount)}
          </strong>
        </span>
      </div>
      <p className={styles.chartUnit}>PHP · select a month below to inspect</p>
      <div className={styles.plot}>
        {!lines.empty && (
          <div className={styles.collectionAxis} aria-hidden="true">
            {lines.ticks.map((tick, index) => {
              return (
                <span key={index} style={{ top: `${(tick.y / 176) * 100}%` }}>
                  {new Intl.NumberFormat("en-PH", {
                    notation: "compact",
                    maximumSignificantDigits: 3,
                  }).format(tick.amount)}
                </span>
              );
            })}
          </div>
        )}
        <svg
          viewBox="0 0 500 176"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {lines.ticks.map((tick, index) => {
            return (
              <line
                key={index}
                x1="0"
                x2="500"
                y1={tick.y}
                y2={tick.y}
                className={styles.gridLine}
              />
            );
          })}
          {!lines.empty && (
            <>
              <line
                x1="0"
                x2="500"
                y1={lines.zero}
                y2={lines.zero}
                className={styles.zeroLine}
              />
              {lines.bars.map((bar, index) => {
                return (
                  <g
                    key={data.months[index].month}
                    opacity={selected === null || selected === index ? 1 : 0.35}
                  >
                    <title>{`${shortMonth(data.months[index].month)}: verified ${formatPeso(data.months[index].verifiedAmount)}, pending ${formatPeso(data.months[index].pendingAmount)}`}</title>
                    <rect
                      x={bar.x - lines.barWidth - 2}
                      y={bar.verified.y}
                      width={lines.barWidth}
                      height={bar.verified.height}
                      rx="3"
                      className={styles.verifiedColumn}
                    />
                    <rect
                      x={bar.x + 2}
                      y={bar.pending.y}
                      width={lines.barWidth}
                      height={bar.pending.height}
                      rx="3"
                      className={styles.pendingColumn}
                    />
                  </g>
                );
              })}
            </>
          )}
        </svg>
        {lines.empty && (
          <div className={styles.plotEmpty}>
            <strong>No collections in this period</strong>
            <span>Verified and pending amounts will appear here.</span>
            <span>Choose another period above to compare activity.</span>
          </div>
        )}
      </div>
      <div
        className={styles.months}
        style={
          { "--chart-months": Math.max(1, data.months.length) } as CSSProperties
        }
        aria-label="Inspect monthly collections"
      >
        {data.months.map((month, index) => {
          return (
            <button
              key={month.month}
              type="button"
              aria-pressed={selected === index}
              onClick={() => {
                return setSelected(selected === index ? null : index);
              }}
              aria-label={`${shortMonth(month.month)} ${month.month.slice(0, 4)}: verified ${formatPeso(month.verifiedAmount)}, pending ${formatPeso(month.pendingAmount)}`}
            >
              {shortMonth(month.month)}
            </button>
          );
        })}
      </div>
      <div className={styles.legend}>
        <span>
          <i />
          Verified collections
        </span>
        <span>
          <i />
          Pending claims
        </span>
      </div>
      <details className={styles.chartDetails}>
        <summary>View exact figures</summary>
        <table>
          <caption className="sr-only">Monthly collections in PHP</caption>
          <thead>
            <tr>
              <th>Month</th>
              <th>Verified</th>
              <th>Pending</th>
            </tr>
          </thead>
          <tbody>
            {data.months.map((month) => {
              return (
                <tr key={month.month}>
                  <th>
                    {shortMonth(month.month)} {month.month.slice(0, 4)}
                  </th>
                  <td>{formatPeso(month.verifiedAmount)}</td>
                  <td>{formatPeso(month.pendingAmount)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </details>
    </>
  );
}
