"use client";

import Link from "next/link";
import type { CollectionReport, PaymentReport } from "@freshphones/contracts";
import { formatPeso } from "@/lib/currency";
import styles from "./analytics-dashboard.module.css";

export type AnalyticsData = {
  collections: CollectionReport;
  payments: PaymentReport;
};

function Value({
  pending,
  children,
}: {
  pending: boolean;
  children: React.ReactNode;
}) {
  return pending ? (
    <span className={styles.placeholder} aria-hidden="true">
      &nbsp;
    </span>
  ) : (
    children
  );
}

export function AnalyticsDashboardLoading() {
  return <AnalyticsDashboardLayout pending />;
}

export default function AnalyticsDashboardLayout({
  data,
  pending = false,
  refreshing = false,
  error,
  onRefresh,
}: {
  data?: AnalyticsData;
  pending?: boolean;
  refreshing?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}) {
  const payments = data?.payments;

  const collections = data?.collections;

  const rows = [...(collections?.items ?? [])]
    .sort((a, b) => {
      return Number(b.collectedInPeriod) - Number(a.collectedInPeriod);
    })
    .slice(0, 5);

  const maximum = Math.max(
    1,
    ...rows.map((row) => {
      return Math.abs(Number(row.collectedInPeriod));
    }),
  );

  const signed = rows.some((row) => {
    return Number(row.collectedInPeriod) < 0;
  });

  const statuses = [
    {
      label: "Verified",
      value: payments?.verifiedPayments ?? 0,
      tone: "verified",
    },
    {
      label: "Pending review",
      value: payments?.pendingVerification ?? 0,
      tone: "pending",
    },
    {
      label: "Needs clarification",
      value: payments?.needsClarification ?? 0,
      tone: "clarification",
    },
    {
      label: "Rejected",
      value: payments?.rejectedPayments ?? 0,
      tone: "rejected",
    },
  ];

  const total = payments?.total ?? 0;

  const verifiedShare = total
    ? Math.round((payments!.verifiedPayments / total) * 100)
    : null;

  const month = new Intl.DateTimeFormat("en-PH", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Manila",
  }).format(new Date());

  return (
    <div
      className={styles.dashboard}
      data-analytics-dashboard
      aria-busy={pending || refreshing}
    >
      <header className={styles.header}>
        <div>
          <h2>Business overview</h2>
          <p>{month} · Month to date</p>
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            onClick={onRefresh}
            disabled={pending || refreshing}
          >
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
          <Link href="/system/reports">Open reports</Link>
        </div>
      </header>
      {pending && (
        <span className={styles.srOnly} role="status">
          Loading business overview…
        </span>
      )}
      {refreshing && (
        <span className={styles.srOnly} role="status">
          Refreshing business overview…
        </span>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}{" "}
          <button type="button" onClick={onRefresh} disabled={refreshing}>
            Retry
          </button>
        </p>
      )}
      <section className={styles.summary} aria-label="Month to date figures">
        <article
          className={`${styles.summaryPanel} ${styles.lead}`}
          data-layout="collections-total"
        >
          <span>Verified collections</span>
          <strong>
            <Value pending={pending}>
              {payments ? formatPeso(payments.verifiedAmount) : "—"}
            </Value>
          </strong>
          <p>Finance-verified credit in this period</p>
          <div className={styles.leadFooter}>
            <span>Philippine peso</span>
            <span>PHP</span>
          </div>
        </article>
        <article className={styles.summaryPanel} data-layout="verified-count">
          <span>Verified payments</span>
          <strong>
            <Value pending={pending}>
              {payments?.verifiedPayments.toLocaleString() ?? "—"}
            </Value>
          </strong>
          <p>Approved payment records</p>
          <div className={styles.summaryFooter}>
            <span>Of all period records</span>
            <b>
              <Value pending={pending}>
                {total ? `${verifiedShare}%` : "—"}
              </Value>
            </b>
          </div>
        </article>
        <article className={styles.summaryPanel} data-layout="pending-total">
          <span>Pending claims</span>
          <strong>
            <Value pending={pending}>
              {payments ? formatPeso(payments.pendingAmount) : "—"}
            </Value>
          </strong>
          <p>Unverified · does not reduce balances</p>
          <div className={styles.summaryFooter}>
            <span>Awaiting Finance review</span>
            <b>
              <Value pending={pending}>
                {payments?.pendingVerification ?? "—"}
              </Value>
            </b>
          </div>
        </article>
      </section>
      <div className={styles.analysis}>
        <section
          className={styles.panel}
          data-layout="chart"
          aria-labelledby="analytics-collections"
        >
          <div className={styles.panelHeading}>
            <h3 id="analytics-collections">Collections by batch</h3>
            <span>PHP</span>
          </div>
          <p className={styles.note}>
            Up to five largest batches on this report page
          </p>
          <div
            className={styles.plot}
            role="region"
            tabIndex={0}
            aria-label="Verified collections by batch"
          >
            {Array.from({ length: 5 }, (_, index) => {
              const row = rows[index];

              const amount = Number(row?.collectedInPeriod ?? 0);

              const height = Math.max(
                amount ? 2 : 0,
                (Math.abs(amount) / maximum) * (signed ? 34 : 76),
              );

              const baseline = signed ? 50 : 0;

              return (
                <div className={styles.column} key={row?.id ?? index}>
                  <div className={styles.barSpace} data-signed={signed}>
                    {pending ? (
                      <div className={styles.barSkeleton} />
                    ) : (
                      row && (
                        <>
                          <span
                            style={{
                              bottom: `${amount < 0 ? baseline - height - 14 : baseline + height + 4}%`,
                            }}
                          >
                            {formatPeso(row.collectedInPeriod)}
                          </span>
                          <div
                            className={styles.bar}
                            data-negative={amount < 0}
                            style={{
                              height: `${height}%`,
                              bottom: `${amount < 0 ? baseline - height : baseline}%`,
                            }}
                          />
                        </>
                      )
                    )}
                  </div>
                  <div className={styles.columnLabel} title={row?.code}>
                    <Value pending={pending}>{row?.code ?? ""}</Value>
                  </div>
                </div>
              );
            })}
            {!pending && !rows.length && (
              <p className={styles.chartEmpty}>
                {data
                  ? "No batch collections in this period."
                  : "Figures are unavailable."}
              </p>
            )}
          </div>
          <div className={styles.chartFooter}>
            <span>
              <i />
              Verified credit
            </span>
            <Link href="/system/reports?report=collections">
              View collection report
            </Link>
          </div>
        </section>
        <section
          className={styles.panel}
          data-layout="status"
          aria-labelledby="analytics-health"
        >
          <div className={styles.panelHeading}>
            <h3 id="analytics-health">Payment health</h3>
            <span>Records</span>
          </div>
          <div className={styles.healthHeadline}>
            <strong>
              <Value pending={pending}>
                {verifiedShare === null ? "—" : `${verifiedShare}%`}
              </Value>
            </strong>
            <span>verified</span>
          </div>
          <div className={styles.statusTrack} aria-hidden="true">
            {pending ? (
              <span className={styles.trackSkeleton} />
            ) : (
              statuses.map((status) => {
                return (
                  <span
                    key={status.label}
                    data-tone={status.tone}
                    style={{ flex: status.value }}
                  />
                );
              })
            )}
          </div>
          <dl className={styles.legend}>
            {statuses.map((status) => {
              return (
                <div key={status.label}>
                  <dt>
                    <i data-tone={status.tone} />
                    {status.label}
                  </dt>
                  <dd>
                    <Value pending={pending}>
                      {payments ? status.value : "—"}
                    </Value>
                  </dd>
                </div>
              );
            })}
          </dl>
          <p className={styles.note}>Payment record counts for this period.</p>
        </section>
      </div>
      <section
        className={styles.panel}
        data-layout="ledger"
        aria-labelledby="analytics-batches"
      >
        <div className={styles.panelHeading}>
          <h3 id="analytics-batches">Batch performance</h3>
          <Link href="/system/reports?report=collections">
            All batch figures
          </Link>
        </div>
        <div
          className={styles.tableWrap}
          role="region"
          aria-label="Batch performance figures"
          tabIndex={0}
        >
          <table>
            <caption className={styles.srOnly}>
              Month-to-date collections and current outstanding balances. Same
              five batches as the chart.
            </caption>
            <thead>
              <tr>
                <th scope="col">Batch</th>
                <th scope="col">Clients</th>
                <th scope="col">Period collections</th>
                <th scope="col">Current balance</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }, (_, index) => {
                const row = rows[index];

                return (
                  <tr
                    key={row?.id ?? index}
                    aria-hidden={!pending && !row ? true : undefined}
                  >
                    <th scope="row" title={row?.code}>
                      <Value pending={pending}>{row?.code ?? "\u00a0"}</Value>
                    </th>
                    <td>
                      <Value pending={pending}>{row?.clients ?? ""}</Value>
                    </td>
                    <td>
                      <Value pending={pending}>
                        {row ? formatPeso(row.collectedInPeriod) : ""}
                      </Value>
                    </td>
                    <td>
                      <Value pending={pending}>
                        {row ? formatPeso(row.remainingBalance) : ""}
                      </Value>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!pending && !rows.length && (
            <p className={styles.tableEmpty}>
              {data
                ? "No batches in this selection."
                : "Batch figures are unavailable."}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
