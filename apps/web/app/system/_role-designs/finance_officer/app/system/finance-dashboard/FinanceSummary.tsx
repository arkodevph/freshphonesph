import Link from "next/link";
import type { FinanceOverview } from "@freshphones/contracts";
import { formatPeso } from "@/lib/currency";
import {
  CheckCircle,
  ClockCircle,
  FileText,
} from "@/app/system/_role-designs/finance_officer/components/SolarIcons";
import { SkeletonLine } from "@/app/system/_role-designs/finance_officer/components/WorkspaceProgress";
import styles from "./finance-dashboard.module.css";

export function FinanceValue({
  value,
  error,
}: {
  value: number | string | undefined;
  error: string | null;
}) {
  return value !== undefined ? (
    value
  ) : error ? (
    "—"
  ) : (
    <SkeletonLine width="5ch" />
  );
}

export default function FinanceSummary({
  data,
  error,
}: {
  data: FinanceOverview | null;
  error: string | null;
}) {
  const collectionLink = data
    ? `/system/payments?queue=all&status=verified&dateFrom=${data.collections.from}&dateTo=${data.collections.to}`
    : "/system/payments?queue=all&status=verified";

  return (
    <section
      className={`${styles.panel} ${styles.summaryPanel}`}
      aria-label="Finance overview"
    >
      <div className={styles.summaryGrid}>
        <div className={styles.featuredMetric} data-record-card>
          <div className={styles.cardBrand}>
            <span>Fresh Phones</span>
            <span>PHP</span>
          </div>
          <dl className={styles.metricDefinition}>
            <dt>Verified collections</dt>
            <dd
              data-long={
                data && formatPeso(data.collections.amount).length > 14
                  ? true
                  : undefined
              }
            >
              <FinanceValue
                value={data ? formatPeso(data.collections.amount) : undefined}
                error={error}
              />
            </dd>
          </dl>
          <div className={styles.cardScope}>
            <span>
              {data
                ? `${data.collections.from} – ${data.collections.to}`
                : "Selected payment dates"}
            </span>
          </div>
        </div>
        <div className={styles.smallMetric}>
          <dl className={styles.metricDefinition}>
            <dt>
              <CheckCircle />
              Ready for Finance
            </dt>
            <dd>
              <Link
                href="/system/payments?queue=ready"
                aria-label="Open payments ready for Finance"
              >
                <FinanceValue value={data?.queues.ready} error={error} />
              </Link>
            </dd>
          </dl>
          <span>Current approvals and evidence</span>
        </div>
        <div className={styles.smallMetric}>
          <dl className={styles.metricDefinition}>
            <dt>
              <ClockCircle />
              Needs clarification
            </dt>
            <dd>
              <Link
                href="/system/payments?queue=clarification"
                aria-label="Open payments needing clarification"
              >
                <FinanceValue
                  value={data?.queues.clarification}
                  error={error}
                />
              </Link>
            </dd>
          </dl>
          <span>Returned for correction</span>
        </div>
        <dl className={styles.pendingMetric}>
          <dt>
            <ClockCircle />
            <span>
              Waiting upstream<small>Not ready for verification</small>
            </span>
          </dt>
          <dd>
            <Link
              href="/system/payments?queue=waiting"
              aria-label="Open payments waiting upstream"
            >
              <FinanceValue value={data?.queues.waiting} error={error} />
            </Link>
          </dd>
        </dl>
      </div>
      <Link href={collectionLink} className={styles.reportLink}>
        <FileText />
        View payments for this period
      </Link>
    </section>
  );
}
