"use client";

import { useState } from "react";
import type { ExecutiveChartData } from "@freshphones/contracts";
import { formatPeso } from "@/lib/currency";
import { shortMonth } from "@/lib/executive-overview";
import Select from "@/app/system/_role-designs/ceo/components/Select";
import { CeoPlaceholder } from "@/app/system/_role-designs/ceo/app/system/ceo-dashboard/CeoLoading";
import MonthlyAmountChart from "@/app/system/_role-designs/ceo/app/system/ceo-dashboard/MonthlyAmountChart";
import styles from "@/app/system/_role-designs/ceo/app/system/ceo-portal.module.css";

export default function CeoMonthlyInsight({
  data,
  error,
}: {
  data: ExecutiveChartData | null;
  error: string | null;
}) {
  const [selectedMonth, setSelectedMonth] = useState("");

  const month =
    data?.months.find((point) => {
      return point.month === selectedMonth;
    }) ?? data?.months.at(-1);

  const loading = !data && !error;

  const amounts = [
    { label: "Verified", value: month?.verifiedAmount, tone: "verified" },
    { label: "Pending", value: month?.pendingAmount, tone: "pending" },
  ];

  return (
    <section
      className={`${styles.panel} ${styles.monthlyInsight}`}
      aria-labelledby="monthly-insight-title"
    >
      <header className={styles.panelHeading}>
        <h2 id="monthly-insight-title">Monthly insight</h2>
        {loading ? (
          <div className={styles.periodSelect} aria-hidden="true">
            <span className={styles.controlLabel}>Month</span>
            <div className={styles.placeholderSelect}>
              <CeoPlaceholder width="7ch" />
            </div>
          </div>
        ) : (
          month && (
            <div className={styles.periodSelect}>
              <span id="insight-month-label" className={styles.controlLabel}>
                Month
              </span>
              <Select
                animate
                fitViewport
                id="insight-month"
                labelId="insight-month-label"
                value={month.month}
                onValueChange={setSelectedMonth}
                options={(data?.months ?? []).map((point) => {
                  return {
                    value: point.month,
                    label: `${shortMonth(point.month)} ${point.month.slice(0, 4)}`,
                  };
                })}
              />
            </div>
          )
        )}
      </header>
      <div className={styles.insightAmount}>
        <strong>
          {month ? (
            formatPeso(month.verifiedAmount)
          ) : loading ? (
            <CeoPlaceholder width="9ch" />
          ) : (
            "—"
          )}
        </strong>
        <span>Verified collections</span>
      </div>
      {month || loading ? (
        <>
          <MonthlyAmountChart amounts={amounts} loading={loading} />

          <p className={styles.footnote}>
            {Number(month?.verifiedAmount) === 0 &&
            Number(month?.pendingAmount) === 0
              ? "No collections recorded this month."
              : "Pending isn’t collected. Stripes mark negative corrections."}
          </p>
        </>
      ) : (
        <p className={styles.footnote} role="status">
          {error
            ? "Monthly figures unavailable. Use Refresh to try again."
            : data
              ? "No monthly figures available for this period."
              : "Loading monthly figures…"}
        </p>
      )}
    </section>
  );
}
