import Link from "next/link";
import type { DashboardCards } from "@/lib/api";
import { formatPeso } from "@/lib/currency";
import {
  Box,
  CheckCircle,
  ClockCircle,
  FileText,
} from "@/app/system/_role-designs/coo/components/SolarIcons";
import { PendingValue } from "@/app/system/_role-designs/coo/app/system/coo-dashboard/CooLoading";
import styles from "@/app/system/_role-designs/coo/app/system/coo-dashboard/coo-dashboard.module.css";

type Props = {
  summary: DashboardCards | null;
  error: string | null;
  pending: boolean;
  refresh: () => void;
  reports: boolean;
};

export default function CooSummary({
  summary,
  error,
  pending,
  refresh,
  reports,
}: Props) {
  const data = error ? null : summary;

  return (
    <section
      className={`${styles.panel} ${styles.summaryPanel}`}
      aria-label="Operations overview"
      aria-busy={pending}
    >
      <dl className={styles.summaryGrid}>
        <div className={styles.featuredMetric} data-record-card>
          <div className={styles.cardBrand}>
            <span>Fresh Phones</span>
            <span>PHP</span>
          </div>
          <dt>Verified collections</dt>
          <dd>
            {data ? (
              formatPeso(data.verified_total)
            ) : error ? (
              "—"
            ) : (
              <PendingValue width="8.5ch" />
            )}
          </dd>
          <div className={styles.cardScope}>
            <span>Company total · all payment dates</span>
          </div>
        </div>
        <div className={styles.smallMetric}>
          <dt>
            <Box />
            Active batches
          </dt>
          <dd>{data ? data.active_batches : error ? "—" : <PendingValue />}</dd>
          <span>Current Paluwagan groups</span>
        </div>
        <div className={styles.smallMetric}>
          <dt>
            <CheckCircle />
            Verified payments
          </dt>
          <dd>
            {data ? data.verified_payments : error ? "—" : <PendingValue />}
          </dd>
          <span>Finance-approved records</span>
        </div>
        <div className={styles.pendingMetric}>
          <dt>
            <ClockCircle />
            <span>
              Awaiting review<small>Pending Finance verification</small>
            </span>
          </dt>
          <dd>
            {data ? data.pending_verification : error ? "—" : <PendingValue />}
          </dd>
        </div>
      </dl>
      {error && (
        <div className={styles.error} role="alert">
          <p>{error}</p>
          <button type="button" onClick={refresh}>
            Try again
          </button>
        </div>
      )}
      {reports && (
        <Link href="/system/reports" className={styles.reportLink}>
          <FileText />
          Open company reports
        </Link>
      )}
    </section>
  );
}
