"use client";

import styles from "@/app/system/_role-designs/ceo/app/system/ceo-portal.module.css";
import { CeoPlaceholder } from "@/app/system/_role-designs/ceo/app/system/ceo-dashboard/CeoLoading";
import { ChartLineUp } from "@phosphor-icons/react";
import type { ExecutiveChartData } from "@freshphones/contracts";
export default function CeoPaymentActivity({
  data,
  loading,
}: {
  data: ExecutiveChartData | null;
  loading: boolean;
}) {
  const counts = data?.paymentCounts;

  const total = counts
    ? counts.verified + counts.pending + counts.clarification + counts.rejected
    : 0;

  const statuses = [
    { label: "Verified", value: counts?.verified, tone: "verified" },
    { label: "Pending review", value: counts?.pending, tone: "pending" },
    {
      label: "Needs clarification",
      value: counts?.clarification,
      tone: "clarification",
    },
    { label: "Rejected", value: counts?.rejected, tone: "rejected" },
  ];

  return (
    <section
      className={`${styles.panel} ${styles.paymentStatus}`}
      aria-labelledby="payment-status-title"
    >
      <header className={styles.panelHeading}>
        <h2 id="payment-status-title">Payment activity</h2>
        <ChartLineUp aria-hidden="true" />
      </header>
      <p className={styles.scopeLabel}>Records in the selected period</p>
      <div className={styles.activityRing}>
        <svg viewBox="0 0 160 160" aria-hidden="true">
          <circle cx="80" cy="80" r="65" className={styles.ringTrack} />
          {statuses.map((status, index) => {
            const size = total ? ((status.value ?? 0) / total) * 100 : 0;

            const offset = total
              ? (statuses.slice(0, index).reduce((sum, item) => {
                  return sum + (item.value ?? 0);
                }, 0) /
                  total) *
                100
              : 0;

            return (
              <circle
                key={status.tone}
                cx="80"
                cy="80"
                r="65"
                pathLength="100"
                className={styles.ringSegment}
                data-tone={status.tone}
                strokeDasharray={`${size} ${100 - size}`}
                strokeDashoffset={-offset}
              />
            );
          })}
        </svg>
        <div className={styles.ringLabel}>
          <strong>
            {counts ? (
              total.toLocaleString("en-PH")
            ) : loading ? (
              <CeoPlaceholder width="2ch" />
            ) : (
              "—"
            )}
          </strong>
          <span>payment records</span>
        </div>
      </div>
      <dl className={styles.statusList}>
        {statuses.map((status) => {
          return (
            <div key={status.label}>
              <dt>
                <i data-status={status.tone} />
                {status.label}
              </dt>
              <dd>
                {status.value ??
                  (loading ? <CeoPlaceholder width="2ch" /> : "—")}
                {counts && (
                  <small>
                    {total
                      ? Math.round(((status.value ?? 0) / total) * 100)
                      : 0}
                    %
                  </small>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
      <p className={styles.footnote}>
        Record counts by status, not the share of money collected.
      </p>
    </section>
  );
}
