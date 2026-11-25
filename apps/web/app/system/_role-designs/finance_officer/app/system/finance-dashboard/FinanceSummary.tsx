import Link from "next/link";
import type {
  FinanceOverview,
  FinanceOverviewPeriod,
} from "@freshphones/contracts";
import { formatPeso } from "@/lib/currency";
import {
  CheckCircle,
  ClockCircle,
  FileText,
} from "@/app/system/_role-designs/finance_officer/components/SolarIcons";
import { SkeletonLine } from "@/app/system/_role-designs/finance_officer/components/WorkspaceProgress";
import Select from "@/app/system/_role-designs/finance_officer/components/Select";
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
  period,
  selectPeriod,
}: {
  data: FinanceOverview | null;
  error: string | null;
  period: FinanceOverviewPeriod;
  selectPeriod: (period: FinanceOverviewPeriod) => void;
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
              {data ? (
                `${new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", timeZone: "Asia/Manila" }).format(new Date(`${data.collections.from}T00:00:00+08:00`))} – ${new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila" }).format(new Date(`${data.collections.to}T00:00:00+08:00`))}`
              ) : (
                <SkeletonLine width="18ch" />
              )}
            </span>
          </div>
          <div className={styles.periodControl}>
            <span id="finance-period-label" className="sr-only">
              Collections period
            </span>
            <Select
              id="finance-period"
              labelId="finance-period-label"
              value={period}
              options={[
                { value: "this_month", label: "This month to date" },
                { value: "last_month", label: "Last month" },
                { value: "year_to_date", label: "Year to date" },
              ]}
              onValueChange={(value) => {
                selectPeriod(value as FinanceOverviewPeriod);
              }}
            />
          </div>
        </div>
        <div className={styles.smallMetric}>
          <dl className={styles.metricDefinition}>
            <dt>
              <CheckCircle />
              Verified payments
            </dt>
            <dd>
              <Link
                href={collectionLink}
                aria-label="Open verified payments for the displayed period"
              >
                <FinanceValue
                  value={data?.collections.payments}
                  error={error}
                />
              </Link>
            </dd>
          </dl>
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
        View verified payments
      </Link>
    </section>
  );
}
