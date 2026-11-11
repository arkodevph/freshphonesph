"use client";

import Link from "next/link";
import { formatPeso } from "@/lib/currency";
import styles from "../ceo-portal.module.css";
import { CeoPlaceholder } from "./CeoLoading";
import { FileText, ShieldCheck, Stack } from "@phosphor-icons/react";
import type { ExecutiveChartData } from "@freshphones/contracts";
export default function CeoBatchCommitments({
  data,
  error,
  loading,
}: {
  data: ExecutiveChartData | null;
  error: string | null;
  loading: boolean;
}) {
  const largestBalance = Math.max(
    0,
    ...(data?.batches.items ?? []).map((batch) => {
      return Number(batch.remainingBalance);
    }),
  );

  return (
    <section
      className={`${styles.panel} ${styles.batchPanel}`}
      aria-labelledby="batch-balances-title"
    >
      <header className={styles.panelHeading}>
        <div>
          <h2 id="batch-balances-title">Batch commitments</h2>
          <p className={styles.scopeLabel}>
            Current outstanding balances · bars compare the largest shown
          </p>
        </div>
        <Link href="/system/reports" className={styles.textLink}>
          View reports
        </Link>
      </header>
      <div className={styles.batchTableWrap}>
        <table className={styles.batchTable}>
          <caption className="sr-only">
            Batches with the largest current outstanding balances
          </caption>
          <thead>
            <tr>
              <th>Batch</th>
              <th>Relative balance</th>
              <th>Outstanding</th>
            </tr>
          </thead>
          <tbody>
            {data?.batches.items.length ? (
              data.batches.items.map((batch) => {
                return (
                  <tr key={batch.code}>
                    <th>
                      <span className={styles.batchIcon}>
                        <Stack aria-hidden="true" />
                      </span>
                      {batch.code}
                    </th>
                    <td>
                      <span
                        className={styles.batchComparison}
                        aria-hidden="true"
                      >
                        <span
                          style={{
                            width: `${largestBalance > 0 ? (Math.max(0, Number(batch.remainingBalance)) / largestBalance) * 100 : 0}%`,
                          }}
                        />
                      </span>
                    </td>
                    <td>{formatPeso(batch.remainingBalance)}</td>
                  </tr>
                );
              })
            ) : loading ? (
              Array.from({ length: 5 }, (_, index) => {
                return (
                  <tr key={index}>
                    <th>
                      <span className={styles.batchIcon}>
                        <Stack aria-hidden="true" />
                      </span>
                      <CeoPlaceholder width="8ch" />
                    </th>
                    <td>
                      <span
                        className={`${styles.batchComparison} ${styles.placeholderTrack}`}
                      />
                    </td>
                    <td>
                      <CeoPlaceholder width="9ch" />
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={3} className={styles.tableEmpty}>
                  {data
                    ? "No outstanding batch balances to show. Open View reports to review other company activity."
                    : error
                      ? "Batch balances are unavailable."
                      : "Loading batch balances…"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className={styles.batchFoot}>
        <span>
          {data
            ? `${data.batches.items.length} largest of ${data.batches.total} batches`
            : "Current company balances"}
        </span>
        <span>
          <ShieldCheck aria-hidden="true" />
          Read-only reporting
        </span>
      </div>
      <div className={styles.reportLibrary}>
        <div>
          <FileText aria-hidden="true" />
          <strong>Explore the full picture</strong>
        </div>
        <p>Payments · Collections · Reconciliation · Tasks · Support</p>
        <Link href="/system/reports">Browse report library</Link>
      </div>
    </section>
  );
}
