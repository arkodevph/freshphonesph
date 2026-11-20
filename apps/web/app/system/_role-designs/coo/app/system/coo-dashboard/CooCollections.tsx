"use client";

import WorkspaceDetails from "@/app/system/_role-designs/coo/components/WorkspaceDetails";
import { useId, useLayoutEffect, useRef, useState } from "react";
import Select from "@/app/system/_role-designs/coo/components/Select";
import { Calendar } from "@/app/system/_role-designs/coo/components/SolarIcons";
import type { ChartMonths, ExecutiveChartData } from "@freshphones/contracts";
import { formatPeso } from "@/lib/currency";
import {
  collectionLines,
  shortMonth,
  reportingDate,
} from "@/lib/executive-overview";
import { useLiveRecords } from "@/lib/useLiveRecords";
import { useExecutiveCharts } from "@/app/system/useExecutiveCharts";
import ChartCursor from "@/app/system/_role-designs/coo/app/system/coo-dashboard/ChartCursor";
import { CollectionsPending } from "@/app/system/_role-designs/coo/app/system/coo-dashboard/CooLoading";
import styles from "@/app/system/_role-designs/coo/app/system/coo-dashboard/coo-dashboard.module.css";

const compact = new Intl.NumberFormat("en-PH", {
  notation: "compact",
  maximumSignificantDigits: 3,
});

function SquareStack({
  x,
  y,
  width,
  height,
  className,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  className: string;
}) {
  const gradientId = useId().replaceAll(":", "");

  if (height <= 0) {
    return null;
  }

  const size = Math.min(4, width);

  const step = size + 2;

  const columns = Math.max(1, Math.floor((width + 2) / step));

  const rows = Math.max(1, Math.round((height + 2) / step));

  const inset = (width - (columns * step - 2)) / 2;

  return (
    <g
      data-square-stack
      className={className}
      style={{ fill: `url(#${gradientId})` }}
    >
      <defs>
        <linearGradient
          id={gradientId}
          gradientUnits="userSpaceOnUse"
          x1="0"
          x2="0"
          y1={y + height}
          y2={y}
        >
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
          <stop offset="100%" stopColor="currentColor" />
        </linearGradient>
      </defs>
      {Array.from({ length: rows * columns }, (_, index) => {
        const row = Math.floor(index / columns);

        const column = index % columns;

        return (
          <rect
            key={index}
            x={x + inset + column * step}
            y={y + height - size - row * step}
            width={size}
            height={size}
            rx="0.5"
          />
        );
      })}
    </g>
  );
}

function CollectionsPlot({ data }: { data: ExecutiveChartData }) {
  const [selected, setSelected] = useState<number | null>(null);

  const chart = collectionLines(data);

  const svg = useRef<SVGSVGElement>(null);

  const [plotWidth, setPlotWidth] = useState(500);

  useLayoutEffect(() => {
    const element = svg.current;

    if (!element) {
      return;
    }

    const measure = () => {
      setPlotWidth(Math.max(1, element.getBoundingClientRect().width));
    };

    measure();

    const observer = new ResizeObserver(measure);

    observer.observe(element);

    return () => {
      return observer.disconnect();
    };
  }, []);

  const stackWidth = Math.max(
    4,
    Math.min(
      42,
      ((plotWidth / Math.max(1, data.months.length)) * 0.72 - 6) / 2,
    ),
  );

  const selectedIndex =
    selected !== null && selected < data.months.length
      ? selected
      : data.months.length - 1;

  const month = data.months[selectedIndex];

  return (
    <>
      <div
        className={styles.plot}
        data-collection-square-stack
        role="group"
        aria-label="Monthly collections. Select a month to inspect verified and pending amounts."
      >
        <div className={styles.axis} aria-hidden="true">
          {chart.ticks.map(({ amount, y }) => {
            return (
              <span key={amount} style={{ top: `${(y / 176) * 100}%` }}>
                {compact.format(amount)}
              </span>
            );
          })}
        </div>
        <svg
          ref={svg}
          viewBox={`0 0 ${plotWidth} 176`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {chart.ticks.map(({ amount, y }) => {
            return (
              <line
                key={amount}
                x1="0"
                x2={plotWidth}
                y1={y}
                y2={y}
                className={styles.gridLine}
              />
            );
          })}
          {!chart.empty && (
            <line
              x1="0"
              x2={plotWidth}
              y1={chart.zero}
              y2={chart.zero}
              className={styles.zeroLine}
            />
          )}
          {chart.bars.map((bar, index) => {
            return (
              <g key={data.months[index].month}>
                <title>{`${shortMonth(data.months[index].month)}: verified ${formatPeso(data.months[index].verifiedAmount)}, pending ${formatPeso(data.months[index].pendingAmount)}`}</title>
                <SquareStack
                  x={(bar.x / 500) * plotWidth - stackWidth - 2}
                  y={bar.verified.y}
                  width={stackWidth}
                  height={bar.verified.height}
                  className={styles.verifiedBar}
                />
                <SquareStack
                  x={(bar.x / 500) * plotWidth + 2}
                  y={bar.pending.y}
                  width={stackWidth}
                  height={bar.pending.height}
                  className={styles.pendingBar}
                />
              </g>
            );
          })}
        </svg>
        {!chart.empty && (
          <div
            className={styles.chartTargets}
            style={{
              gridTemplateColumns: `repeat(${data.months.length}, minmax(0, 1fr))`,
            }}
          >
            <ChartCursor index={selectedIndex} count={data.months.length} />
            {data.months.map((item, index) => {
              return (
                <button
                  type="button"
                  key={item.month}
                  data-chart-month
                  aria-label={`Inspect ${shortMonth(item.month)} ${item.month.slice(0, 4)}: verified ${formatPeso(item.verifiedAmount)}, pending ${formatPeso(item.pendingAmount)}`}
                  aria-pressed={selectedIndex === index}
                  onPointerEnter={() => {
                    setSelected(index);
                  }}
                  onFocus={() => {
                    setSelected(index);
                  }}
                  onClick={() => {
                    setSelected(index);
                  }}
                />
              );
            })}
          </div>
        )}
        {chart.empty && (
          <p className={styles.plotEmpty}>
            No collections recorded in this period.
          </p>
        )}
      </div>
      <div
        className={styles.monthLabels}
        style={{
          gridTemplateColumns: `repeat(${data.months.length}, minmax(0, 1fr))`,
        }}
        aria-hidden="true"
      >
        {data.months.map(({ month }, index) => {
          return (
            <span key={month} data-selected={selectedIndex === index}>
              {shortMonth(month)}
            </span>
          );
        })}
      </div>
      {month && !chart.empty && (
        <div
          className={styles.chartReadout}
          aria-live="polite"
          aria-atomic="true"
        >
          <strong>
            {shortMonth(month.month)} {month.month.slice(0, 4)}
          </strong>
          <span>
            <i className={styles.verifiedBar} />
            {formatPeso(month.verifiedAmount)} <small>verified</small>
          </span>
          <span>
            <i className={styles.pendingBar} />
            {formatPeso(month.pendingAmount)} <small>pending</small>
          </span>
        </div>
      )}
      <div className={styles.legend}>
        <span>
          <i className={styles.verifiedBar} />
          Verified collections
        </span>
        <span>
          <i className={styles.pendingBar} />
          Pending claims
        </span>
      </div>
      <WorkspaceDetails className={styles.exactFigures}>
        <summary>View exact monthly figures</summary>
        <div className={styles.tableScroll}>
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
                    <th scope="row">
                      {shortMonth(month.month)} {month.month.slice(0, 4)}
                    </th>
                    <td>{formatPeso(month.verifiedAmount)}</td>
                    <td>{formatPeso(month.pendingAmount)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </WorkspaceDetails>
    </>
  );
}

function CooCollectionsView({
  data,
  pending,
  error,
  months,
  selectMonths,
  refresh,
}: ReturnType<typeof useExecutiveCharts>) {
  return (
    <section
      className={`${styles.panel} ${styles.collections}`}
      aria-labelledby="staff-collections-title"
      aria-busy={pending}
    >
      <header className={styles.panelHeader}>
        <div>
          <h3 id="staff-collections-title">Monthly collections</h3>
          <p>
            {data
              ? `${reportingDate(data.dateFrom)} – ${reportingDate(data.dateTo)}`
              : `Last ${months} months`}{" "}
            · PHP
          </p>
        </div>
        <div className={styles.period}>
          <span id="coo-collection-period-label" className="sr-only">
            Collection period
          </span>
          <Calendar className={styles.periodIcon} />
          <Select
            id="coo-collection-period"
            labelId="coo-collection-period-label"
            value={String(months)}
            onValueChange={(value) => {
              return selectMonths(Number(value) as ChartMonths);
            }}
            options={[3, 6, 12].map((value) => {
              return { value: String(value), label: `Last ${value} months` };
            })}
            animate
            fitViewport
          />
        </div>
      </header>
      {error ? (
        <div className={styles.error} role="alert">
          <p>{error}</p>
          <button type="button" onClick={refresh}>
            Try again
          </button>
        </div>
      ) : data ? (
        <CollectionsPlot data={data} />
      ) : (
        <CollectionsPending months={months} />
      )}
    </section>
  );
}

function LiveCooCollections() {
  const state = useExecutiveCharts();

  useLiveRecords(state.refresh);

  return <CooCollectionsView {...state} />;
}

export default function CooCollections({
  loading = false,
}: {
  loading?: boolean;
}) {
  return loading ? (
    <CooCollectionsView
      data={null}
      pending
      error={null}
      months={6}
      selectMonths={() => {}}
      refresh={async () => {}}
    />
  ) : (
    <LiveCooCollections />
  );
}
