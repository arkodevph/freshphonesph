"use client";

import Link from "next/link";
import { formatPeso } from "@/lib/currency";
import styles from "@/app/system/_role-designs/ceo/app/system/ceo-portal.module.css";
import { CeoPlaceholder } from "@/app/system/_role-designs/ceo/app/system/ceo-dashboard/CeoLoading";
import { CheckCircle, Clock, FileText, Stack } from "@phosphor-icons/react";
import type { DashboardCards } from "@/lib/api";
export default function CeoBalanceCard({
  summary,
  loading,
}: {
  summary: DashboardCards | null;
  loading: boolean;
}) {
  return (
    <section
      className={`${styles.panel} ${styles.balance}`}
      aria-labelledby="verified-title"
    >
      <div className={styles.balanceCard}>
        <div className={styles.balanceCardTop}>
          <span className={styles.balanceBrand}>Fresh Phones</span>
          <span className={styles.balanceCardMark} aria-hidden="true">
            <span />
            <span />
          </span>
        </div>
        <div className={styles.balanceCardAmount}>
          <h2 id="verified-title">Verified collections</h2>
          <div className={styles.balanceValue}>
            {summary ? (
              formatPeso(summary.verified_total)
            ) : loading ? (
              <CeoPlaceholder width="8ch" />
            ) : (
              "—"
            )}
          </div>
        </div>
        <div className={styles.balanceCardFoot}>
          <span>Company total · all payment dates</span>
          <span className={styles.balanceCurrency}>PHP</span>
        </div>
      </div>
      <dl className={styles.balanceDetails}>
        <div>
          <dt>
            <Stack aria-hidden="true" />
            Active batches
          </dt>
          <dd>
            {summary?.active_batches ??
              (loading ? <CeoPlaceholder width="2ch" /> : "—")}
          </dd>
        </div>
        <div>
          <dt>
            <CheckCircle aria-hidden="true" />
            Verified payments
          </dt>
          <dd>
            {summary?.verified_payments ??
              (loading ? <CeoPlaceholder width="2ch" /> : "—")}
          </dd>
        </div>
        <div>
          <dt>
            <Clock aria-hidden="true" />
            Awaiting Finance
          </dt>
          <dd>
            {summary?.pending_verification ??
              (loading ? <CeoPlaceholder width="2ch" /> : "—")}
          </dd>
        </div>
      </dl>
      <Link href="/system/reports" className={styles.reportButton}>
        <FileText aria-hidden="true" />
        Open company reports
      </Link>
    </section>
  );
}
