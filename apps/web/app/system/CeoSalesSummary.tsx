"use client";

import { useState, type CSSProperties } from "react";
import {
  CaretDown,
  ChartBar,
  CheckCircle,
  Receipt,
} from "@phosphor-icons/react";
import { formatPeso } from "@/lib/currency";
import styles from "./ceo-assistant.module.css";

const weeks = [264000, 288000, 312000, 384000];

const products = [
  { name: "iPhone 15", units: 24, sales: 672000 },
  { name: "iPhone 14", units: 16, sales: 384000 },
  { name: "iPhone 13", units: 12, sales: 192000 },
];

export default function CeoSalesSummary() {
  const [expanded, setExpanded] = useState(false);

  return (
    <article
      className={styles.salesSummary}
      aria-label="Sample total sales summary"
    >
      <header className={styles.salesHeading}>
        <span>
          <ChartBar aria-hidden="true" />
          Sales overview
        </span>
        <span className={styles.sampleBadge}>Sample data</span>
      </header>
      <div className={styles.salesHero}>
        <p>Gross sales · October 2026</p>
        <h2>{formatPeso(1248000)}</h2>
        <span>20% above September’s sample sales</span>
      </div>
      <p className={styles.salesIntro}>
        Here’s the sample breakdown: 52 phones sold, with an average sale of{" "}
        {formatPeso(24000)}. iPhone 15 contributed the most, at{" "}
        {formatPeso(672000)}.
      </p>
      <dl className={styles.salesMetrics}>
        <div>
          <dt>
            <Receipt aria-hidden="true" />
            Phones sold
          </dt>
          <dd>52</dd>
        </div>
        <div>
          <dt>Average sale</dt>
          <dd>{formatPeso(24000)}</dd>
        </div>
        <div>
          <dt>Previous month</dt>
          <dd>{formatPeso(1040000)}</dd>
        </div>
      </dl>
      <figure className={styles.salesChart}>
        <figcaption>
          <strong>Weekly sales</strong>
          <span>October 2026 · PHP</span>
        </figcaption>
        <div className={styles.salesBars}>
          {weeks.map((amount, index) => {
            return (
              <div key={index} className={styles.salesBarColumn}>
                <span>{formatPeso(amount)}</span>
                <div className={styles.salesBarTrack}>
                  <i
                    style={
                      {
                        "--bar-height": `${(amount / 384000) * 100}%`,
                        "--bar-delay": `${index * 70}ms`,
                      } as CSSProperties
                    }
                  />
                </div>
                <small>Week {index + 1}</small>
              </div>
            );
          })}
        </div>
      </figure>
      <div className={styles.salesInsight}>
        <CheckCircle aria-hidden="true" />
        <p>
          <strong>Strongest week: Week 4.</strong> {formatPeso(384000)} in
          sample sales, or 30.8% of the month’s total.
        </p>
      </div>
      <button
        type="button"
        className={styles.breakdownToggle}
        aria-expanded={expanded}
        onClick={() => {
          return setExpanded(!expanded);
        }}
      >
        Sales by device
        <CaretDown aria-hidden="true" />
      </button>
      <div
        className={styles.salesDisclosure}
        data-open={expanded}
        aria-hidden={!expanded}
        inert={!expanded}
      >
        <div className={styles.salesTableWrap}>
          <table className={styles.salesTable}>
            <caption className="sr-only">
              Sample October sales by device
            </caption>
            <thead>
              <tr>
                <th scope="col">Device</th>
                <th scope="col">Units</th>
                <th scope="col">Gross sales</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                return (
                  <tr key={product.name}>
                    <th scope="row">{product.name}</th>
                    <td>{product.units}</td>
                    <td>{formatPeso(product.sales)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">Total</th>
                <td>52</td>
                <td>{formatPeso(1248000)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      <footer className={styles.salesDisclaimer}>
        Scripted demo · Fixed sample figures, not company records or verified
        collections.
      </footer>
    </article>
  );
}
