"use client";

import {
  useId,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createStyleSpring } from "@/lib/style-spring";
import { formatPeso } from "@/lib/currency";
import {
  chartMaximum,
  type BarChartModel,
  type BarDatum,
} from "@/lib/report-chart-data";
import styles from "./category-charts.module.css";

export function ChartFrame({
  title,
  note,
  children,
  pending = false,
}: {
  title: string;
  note: string;
  children: ReactNode;
  pending?: boolean;
}) {
  const id = useId();

  const element = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (!element.current || pending) {
      return;
    }

    const spring = createStyleSpring(element.current, { "--chart-reveal": 0 });

    spring.to({ "--chart-reveal": 1 });

    return () => spring.dispose();
  }, [pending]);

  return (
    <figure
      ref={element}
      className={styles.card}
      aria-labelledby={id}
      aria-busy={pending}
    >
      <figcaption>
        <h3 id={id}>{title}</h3>
        <p>{note}</p>
      </figcaption>
      {pending ? (
        <div className={styles.skeleton} aria-label="Loading chart" />
      ) : (
        children
      )}
    </figure>
  );
}

export function chartValue(value: string | number, unit: "money" | "count") {
  return unit === "money"
    ? formatPeso(value)
    : new Intl.NumberFormat("en-PH").format(Number(value));
}

function Empty({ rows }: { rows: BarDatum[] }) {
  return rows.length && rows.some((row) => Number(row.value) !== 0) ? null : (
    <p className={styles.empty}>
      {rows.length
        ? "No activity in this selection."
        : "No records in this selection."}
    </p>
  );
}

export function ColumnChart({
  title,
  note,
  rows,
  unit,
  pending,
}: BarChartModel & { pending?: boolean }) {
  const values = rows.map((row) => Number(row.value));

  const minimum = -chartMaximum(values.map((value) => Math.max(0, -value)));

  const maximum = chartMaximum(values.map((value) => Math.max(0, value)));

  const span = maximum - minimum || 1;

  return (
    <ChartFrame title={title} note={note} pending={pending}>
      <div
        className={styles.plotScroll}
        role="region"
        aria-label={`${title} chart data`}
        tabIndex={rows.length > 3 ? 0 : undefined}
      >
        <div
          className={styles.columnPlot}
          style={{
            minWidth:
              rows.length > 3 ? `${rows.length * 100 + 58}px` : undefined,
          }}
        >
          <div className={styles.axis} aria-hidden="true">
            {[1, 0.75, 0.5, 0.25, 0].map((fraction) => (
              <span key={fraction}>
                {unit === "money" ? "₱" : ""}
                {new Intl.NumberFormat("en-PH", {
                  notation: "compact",
                  maximumFractionDigits: 1,
                }).format(minimum + span * fraction)}
              </span>
            ))}
          </div>
          <div
            className={styles.columns}
            style={{ "--columns": Math.max(rows.length, 1) } as CSSProperties}
          >
            <div className={styles.gridLines} aria-hidden="true">
              {[0, 25, 50, 75, 100].map((top) => (
                <i key={top} style={{ top: `${top}%` }} />
              ))}
            </div>
            <i
              className={styles.columnZero}
              style={{ top: `${(maximum / span) * 180}px` }}
              aria-hidden="true"
            />
            {rows.map((row, index) => (
              <div
                className={styles.column}
                key={`${row.label}-${index}`}
                tabIndex={0}
                aria-label={`${row.label}: ${chartValue(row.value, unit)}`}
              >
                <div className={styles.columnSpace}>
                  <span
                    data-tone={row.tone ?? "blue"}
                    style={{
                      height: `${(Math.abs(Number(row.value)) / span) * 100}%`,
                      bottom: `${((Math.min(0, Number(row.value)) - minimum) / span) * 100}%`,
                      transformOrigin:
                        Number(row.value) < 0 ? "center top" : "center bottom",
                    }}
                  />
                  <strong className={styles.tooltip}>
                    {chartValue(row.value, unit)}
                  </strong>
                </div>
                <span className={styles.columnLabel}>{row.label}</span>
                <small>{chartValue(row.value, unit)}</small>
              </div>
            ))}
          </div>
        </div>
      </div>
      {rows.length > 3 && (
        <p className={styles.scrollHint}>
          Scroll horizontally to compare all {rows.length} entries.
        </p>
      )}
      <Empty rows={rows} />
    </ChartFrame>
  );
}

export function RankedChart({
  title,
  note,
  rows,
  unit,
  pending,
}: BarChartModel & { pending?: boolean }) {
  const maximum = Math.max(
    1,
    ...rows.map((row) => Math.abs(Number(row.value))),
  );

  return (
    <ChartFrame title={title} note={note} pending={pending}>
      <dl className={styles.rankList}>
        {rows.map((row, index) => (
          <div key={`${row.label}-${index}`}>
            <dt>
              <span className={styles.rank}>
                {String(index + 1).padStart(2, "0")}
              </span>
              {row.label}
            </dt>
            <dd>{chartValue(row.value, unit)}</dd>
            <div className={styles.lollipop} aria-hidden="true">
              <span
                data-tone={row.tone ?? "blue"}
                style={{
                  width: `${(Math.abs(Number(row.value)) / maximum) * 100}%`,
                }}
              >
                {Number(row.value) !== 0 && <i />}
              </span>
            </div>
          </div>
        ))}
      </dl>
      <Empty rows={rows} />
    </ChartFrame>
  );
}

export function SegmentChart({
  title,
  note,
  rows,
  unit,
  pending,
  noun = "records",
}: BarChartModel & { pending?: boolean; noun?: string }) {
  const total = rows.reduce((sum, row) => sum + Number(row.value), 0);

  return (
    <ChartFrame title={title} note={note} pending={pending}>
      <div className={styles.segmentHeadline}>
        <strong>{total.toLocaleString("en-PH")}</strong>
        <span>{noun}</span>
      </div>
      <div className={styles.segments} aria-hidden="true">
        {rows.map((row, index) => (
          <span
            key={index}
            data-tone={
              row.label === "Completed"
                ? "complete"
                : (row.tone ?? (index % 2 ? "pending" : "blue"))
            }
            hidden={Number(row.value) === 0}
            style={{ flex: Number(row.value) }}
          />
        ))}
      </div>
      <dl className={styles.segmentLegend}>
        {rows.map((row, index) => (
          <div key={`${row.label}-${index}`}>
            <dt>
              <i
                data-tone={
                  row.label === "Completed"
                    ? "complete"
                    : (row.tone ?? (index % 2 ? "pending" : "blue"))
                }
              />
              {row.label}
            </dt>
            <dd>
              {chartValue(row.value, unit)}
              <small>
                {total
                  ? `${Math.round((Number(row.value) / total) * 100)}%`
                  : "—"}
              </small>
            </dd>
          </div>
        ))}
      </dl>
      <Empty rows={rows} />
    </ChartFrame>
  );
}

export function TimingChart({
  rows,
  title,
  note,
  pending,
}: BarChartModel & { pending?: boolean }) {
  const onTime = Number(rows[0]?.value ?? 0);

  const late = Number(rows[1]?.value ?? 0);

  const submitted = onTime + late;

  const percent = submitted ? (onTime / submitted) * 100 : 0;

  return (
    <ChartFrame title={title} note={note} pending={pending}>
      <div className={styles.gauge}>
        <svg viewBox="0 0 240 138" aria-hidden="true">
          <path
            className={styles.gaugeTrack}
            d="M 20 120 A 100 100 0 0 1 220 120"
            pathLength="100"
          />
          <path
            className={styles.gaugeValue}
            d="M 20 120 A 100 100 0 0 1 220 120"
            pathLength="100"
            strokeDasharray={`${percent} 100`}
            style={{ visibility: percent === 0 ? "hidden" : "visible" }}
          />
        </svg>
        <div>
          <strong>{submitted ? `${Math.round(percent)}%` : "—"}</strong>
          <span>of submissions on time</span>
        </div>
      </div>
      <dl className={styles.segmentLegend}>
        {rows.map((row) => (
          <div key={row.label}>
            <dt>
              <i data-tone={row.tone} />
              {row.label}
            </dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
      {!submitted && (
        <p className={styles.empty}>No submissions to measure yet.</p>
      )}
    </ChartFrame>
  );
}

export function WaterfallChart({
  title,
  note,
  rows,
  pending,
}: BarChartModel & { pending?: boolean }) {
  // Older snapshots may not capture the original/adjustment components.
  const complete = rows.length === 3;

  const values = rows.map((row) => Number(row.value));

  const original = values[0] ?? 0;

  const adjustment = values[1] ?? 0;

  const net = values[2] ?? 0;

  const min = Math.min(0, original, original + adjustment, net);

  const max =
    Math.max(0, original, original + adjustment, net) || (min === 0 ? 1 : 0);

  const span = max - min || 1;

  return (
    <ChartFrame title={title} note={note} pending={pending}>
      {!complete ? (
        <>
          <p className={styles.empty}>
            The credit bridge was not fully captured in this saved report.
          </p>
          <dl className={styles.segmentLegend}>
            {rows.map((row) => (
              <div key={row.label}>
                <dt>{row.label}</dt>
                <dd>{formatPeso(row.value)}</dd>
              </div>
            ))}
          </dl>
        </>
      ) : (
        <>
          <div className={styles.waterfall}>
            <div
              className={styles.waterfallZero}
              style={{ top: `${36 + (max / span) * 180}px` }}
              aria-hidden="true"
            >
              <small>₱0</small>
            </div>
            {rows.map((row, index) => {
              const from = index === 1 ? original : 0;

              const to =
                index === 1 ? original + adjustment : Number(row.value);

              return (
                <div className={styles.waterfallColumn} key={row.label}>
                  <strong>{formatPeso(row.value)}</strong>
                  <div className={styles.bridgeSpace}>
                    <span
                      data-tone={row.tone}
                      style={{
                        bottom: `${((Math.min(from, to) - min) / span) * 100}%`,
                        height: `${(Math.abs(to - from) / span) * 100}%`,
                      }}
                    />
                    {index < 2 && (
                      <i
                        className={styles.bridgeConnector}
                        style={{ bottom: `${((to - min) / span) * 100}%` }}
                      />
                    )}
                  </div>
                  <span>{row.label}</span>
                </div>
              );
            })}
          </div>
          <p className={styles.footnote}>
            Original credit + signed corrections = net verified credit
          </p>
        </>
      )}
    </ChartFrame>
  );
}

export function FlagChart({
  title,
  note,
  rows,
  pending,
}: BarChartModel & { pending?: boolean }) {
  return (
    <ChartFrame title={title} note={note} pending={pending}>
      <dl className={styles.flagList}>
        {rows.map((row) => (
          <div key={row.label} data-clear={Number(row.value) === 0}>
            <dt>
              <i data-tone={Number(row.value) ? row.tone : "muted"} />
              {row.label}
            </dt>
            <dd>
              {Number(row.value) === 0 ? (
                <>
                  <span aria-hidden="true">✓ </span>0
                </>
              ) : (
                row.value
              )}
            </dd>
          </div>
        ))}
      </dl>
      <p className={styles.footnote}>
        Flags can overlap. Counts are not a share of one total.
      </p>
    </ChartFrame>
  );
}
