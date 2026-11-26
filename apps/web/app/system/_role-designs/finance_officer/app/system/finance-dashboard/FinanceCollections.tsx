"use client";
import { useId, useState } from "react";
import type { ChartMonths } from "@freshphones/contracts";
import type { useExecutiveCharts } from "@/app/system/useExecutiveCharts";
import { formatPeso } from "@/lib/currency";
import Select from "@/app/system/_role-designs/finance_officer/components/Select";
import { FinanceSlot } from "./FinanceSkeleton";
import styles from "./finance-dashboard.module.css";

export default function FinanceCollections({
  state,
}: {
  state: ReturnType<typeof useExecutiveCharts>;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const pattern = useId().replaceAll(":", "");
  const loading = !state.data && !state.error;
  const points =
    state.data?.months ??
    Array.from({ length: state.months }, (_, i) => ({
      month: String(i),
      verifiedAmount: "0",
      pendingAmount: "0",
    }));
  const max = Math.max(
    1,
    ...points.flatMap((p) => [
      Number(p.verifiedAmount),
      Number(p.pendingAmount),
    ]),
  );
  const active =
    state.data?.months.find((p) => p.month === selected) ??
    state.data?.months.at(-1);
  const label = (month: string) =>
    new Date(`${month}-01T00:00:00+08:00`).toLocaleDateString("en-PH", {
      month: "short",
      timeZone: "Asia/Manila",
    });
  return (
    <section
      className={`${styles.panel} ${styles.chartPanel}`}
      aria-labelledby="finance-chart-title"
      aria-busy={state.pending}
    >
      <header className={styles.panelHeader}>
        <h3 id="finance-chart-title">Monthly collections</h3>
        <div className={styles.chartPeriod}>
          <span id="finance-chart-period-label" className="sr-only">
            Chart period
          </span>
          <Select
            id="finance-chart-period"
            labelId="finance-chart-period-label"
            value={String(state.months)}
            options={[3, 6, 12].map((v) => ({
              value: String(v),
              label: `${v} months`,
            }))}
            onValueChange={(v) => state.selectMonths(Number(v) as ChartMonths)}
          />
        </div>
      </header>
      <div className={styles.legend}>
        <span>Verified</span>
        <span>Pending claims</span>
      </div>
      <div className={styles.plot} data-chart-loading={loading || undefined}>
        <svg
          viewBox="0 0 300 176"
          role="img"
          aria-label={
            loading
              ? "Loading monthly collections"
              : "Verified and pending monthly amounts in PHP"
          }
          preserveAspectRatio="none"
        >
          <defs>
            <pattern
              id={pattern}
              width="4"
              height="4"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(35)"
            >
              <rect width="4" height="4" fill="var(--workspace-action)" />
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="4"
                stroke="white"
                strokeOpacity=".3"
              />
            </pattern>
          </defs>
          {[0, 1, 2, 3].map((i) => (
            <line
              key={i}
              x1="0"
              x2="300"
              y1={10 + i * 50}
              y2={10 + i * 50}
              stroke="var(--system-border)"
              strokeDasharray="2 4"
            />
          ))}
          {!loading &&
            points.map((p, i) => {
              const slot = 300 / points.length;
              const width = Math.min(17, slot * 0.31);
              return (
                <g key={p.month}>
                  <rect
                    x={i * slot + slot * 0.14}
                    y={160 - (Number(p.verifiedAmount) / max) * 145}
                    width={width}
                    height={(Number(p.verifiedAmount) / max) * 145}
                    rx="3"
                    fill={`url(#${pattern})`}
                  />
                  <rect
                    x={i * slot + slot * 0.14 + width + 3}
                    y={160 - (Number(p.pendingAmount) / max) * 145}
                    width={width}
                    height={(Number(p.pendingAmount) / max) * 145}
                    rx="3"
                    fill="var(--system-muted)"
                    opacity=".55"
                  />
                </g>
              );
            })}
        </svg>
        {loading ? (
          <div className={styles.chartSkeleton}>
            <FinanceSlot loading width="100%">
              &nbsp;
            </FinanceSlot>
          </div>
        ) : null}
        <div className={styles.chartLabels}>
          {points.map((p) => (
            <button
              key={p.month}
              disabled={loading || (!!state.error && !state.data)}
              onClick={() => setSelected(p.month)}
              aria-label={
                loading
                  ? "Loading month"
                  : state.data
                    ? `${label(p.month)}: verified ${formatPeso(p.verifiedAmount)}, pending ${formatPeso(p.pendingAmount)}`
                    : "Chart unavailable"
              }
              aria-pressed={active?.month === p.month}
            >
              <FinanceSlot loading={loading} width="85%">
                {state.data ? label(p.month) : "—"}
              </FinanceSlot>
            </button>
          ))}
        </div>
      </div>
      <div className={styles.chartReading} aria-live="polite">
        <FinanceSlot loading={loading} width="90%">
          {active
            ? `${label(active.month)} · ${formatPeso(active.verifiedAmount)} verified · ${formatPeso(active.pendingAmount)} pending`
            : "No chart data"}
        </FinanceSlot>
      </div>
      {state.error ? (
        <p className={styles.inlineError} role="alert">
          {state.error}{" "}
          <button onClick={() => void state.refresh()}>Retry</button>
        </p>
      ) : null}
    </section>
  );
}
