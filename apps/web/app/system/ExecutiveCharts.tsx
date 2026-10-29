"use client";

import type { ChartMonths } from "@freshphones/contracts";
import { BarChart } from "@/components/charts/BarChart";
import { MonthlyCollectionsChart } from "@/components/charts/MonthlyCollectionsChart";
import styles from "@/components/charts/charts.module.css";
import { useExecutiveCharts } from "./useExecutiveCharts";

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export default function ExecutiveCharts() {
  const { months, data, pending, error, refresh, selectMonths } =
    useExecutiveCharts();

  return (
    <section
      className={styles.scope}
      aria-label="CEO performance charts"
      aria-busy={pending}
    >
      <header className={styles.controls}>
        <div>
          <h3>Performance at a glance</h3>
          <p>
            {data
              ? `${dateLabel(data.dateFrom)} – ${dateLabel(data.dateTo)}`
              : "Collections, payment status and batch balances."}
          </p>
        </div>
        <div className={styles.actions}>
          <label>
            Chart period
            <select
              value={months}
              onChange={(event) => {
                return selectMonths(Number(event.target.value) as ChartMonths);
              }}
            >
              <option value={3}>Last 3 months</option>
              <option value={6}>Last 6 months</option>
              <option value={12}>Last 12 months</option>
            </select>
          </label>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              return void refresh();
            }}
          >
            {pending ? "Refreshing…" : "Refresh charts"}
          </button>
        </div>
      </header>
      {error && (
        <div role="alert" className={styles.error}>
          {data
            ? "Could not refresh charts. Showing the previous figures. "
            : "Charts are unavailable. "}
          {error}{" "}
          <button
            type="button"
            className={styles.retry}
            onClick={() => {
              return void refresh();
            }}
          >
            Retry charts
          </button>
        </div>
      )}
      {!data && !error && (
        <div role="status" className={styles.loading}>
          Loading performance charts…
        </div>
      )}
      {data && (
        <div className={styles.executiveGrid}>
          <MonthlyCollectionsChart
            key={`${data.dateFrom}:${data.dateTo}`}
            data={data}
          />
          <BarChart
            title="Payment status"
            unit="count"
            note="Records in the selected period. Counts include verified records whose credits were later reversed."
            rows={[
              {
                label: "Verified",
                value: data.paymentCounts.verified,
                tone: "verified",
              },
              {
                label: "Pending review",
                value: data.paymentCounts.pending,
                tone: "pending",
              },
              {
                label: "Needs clarification",
                value: data.paymentCounts.clarification,
                tone: "accent",
              },
              {
                label: "Rejected",
                value: data.paymentCounts.rejected,
                tone: "negative",
              },
            ]}
          />
          <div className={styles.batchCard}>
            <BarChart
              title="Outstanding batch balances"
              unit="money"
              note={`Current overall balances across all payment dates · ${data.batches.items.length} largest of ${data.batches.total} batches.`}
              rows={data.batches.items.map((batch) => {
                return {
                  label: batch.code,
                  value: batch.remainingBalance,
                  tone: "accent",
                };
              })}
            />
          </div>
        </div>
      )}
    </section>
  );
}
