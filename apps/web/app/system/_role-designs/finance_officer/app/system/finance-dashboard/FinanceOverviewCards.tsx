import Link from "next/link";
import type {
  FinanceOverview,
  FinanceOverviewPeriod,
} from "@freshphones/contracts";
import { formatPeso } from "@/lib/currency";
import Select from "@/app/system/_role-designs/finance_officer/components/Select";
import { FinanceSlot } from "./FinanceSkeleton";
import styles from "./finance-dashboard.module.css";

export const periodOptions = [
  { value: "this_month", label: "Month to date" },
  { value: "last_month", label: "Last month" },
  { value: "year_to_date", label: "Year to date" },
];

export function FinanceCollectionCard({
  data,
  error,
  period,
  selectPeriod,
}: {
  data: FinanceOverview | null;
  error: string | null;
  period: FinanceOverviewPeriod;
  selectPeriod: (value: FinanceOverviewPeriod) => void;
}) {
  const loading = !data && !error;
  const href = data
    ? `/system/payments?queue=all&status=verified&dateFrom=${data.collections.from}&dateTo=${data.collections.to}`
    : "/system/payments?queue=all&status=verified";
  return (
    <section
      className={`${styles.panel} ${styles.collectionCard}`}
      aria-label="Verified collections"
      aria-busy={loading}
    >
      <header className={styles.panelHeader}>
        <h3>Verified collections</h3>
        <span className={styles.currency}>PHP</span>
      </header>
      <p className={styles.amount} data-record-card>
        <FinanceSlot loading={loading}>
          {data ? formatPeso(data.collections.amount) : "—"}
        </FinanceSlot>
      </p>
      <p className={styles.scope}>
        <FinanceSlot loading={loading} width="85%">
          {data
            ? `${data.collections.from} – ${data.collections.to}`
            : "Unavailable"}
        </FinanceSlot>
      </p>
      <div className={styles.cardActions}>
        <Link
          className={styles.primaryAction}
          href="/system/payments?queue=ready"
        >
          Review payments
        </Link>
        <Link className={styles.secondaryAction} href={href}>
          View history
        </Link>
      </div>
      <div className={styles.period}>
        <span id="finance-period-label" className="sr-only">
          Collections period
        </span>
        <Select
          id="finance-period"
          labelId="finance-period-label"
          value={period}
          options={periodOptions}
          onValueChange={(v) => selectPeriod(v as FinanceOverviewPeriod)}
        />
      </div>
      <div className={styles.miniGroup}>
        <span className={styles.muted}>Verification pipeline</span>
        <div className={styles.miniGrid}>
          {[
            { label: "Records", key: "waiting_records" },
            { label: "Manager", key: "waiting_manager" },
            { label: "Evidence", key: "waiting_evidence" },
          ].map((item) => (
            <Link key={item.key} href={`/system/payments?queue=${item.key}`}>
              <span>{item.label}</span>
              <strong>
                <FinanceSlot loading={loading}>
                  {data?.queues[item.key as keyof FinanceOverview["queues"]] ??
                    "—"}
                </FinanceSlot>
              </strong>
              <small>Waiting</small>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinanceMetricCards({
  data,
  error,
}: {
  data: FinanceOverview | null;
  error: string | null;
}) {
  const loading = !data && !error;
  const items = [
    {
      label: "Ready for Finance",
      value: data?.queues.ready,
      href: "/system/payments?queue=ready",
      featured: true,
      detail: "Ready to verify",
    },
    {
      label: "Verified payments",
      value: data?.collections.payments,
      href: data
        ? `/system/payments?queue=all&status=verified&dateFrom=${data.collections.from}&dateTo=${data.collections.to}`
        : "/system/payments?queue=all&status=verified",
      detail: "Selected period",
    },
    {
      label: "Needs clarification",
      value: data?.queues.clarification,
      href: "/system/payments?queue=clarification",
      detail: "Returned for correction",
    },
    {
      label: "Waiting upstream",
      value: data?.queues.waiting,
      href: "/system/payments?queue=waiting",
      detail: "Proof or approval needed",
    },
  ];
  return (
    <section className={styles.metrics} aria-label="Payment figures">
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className={styles.metric}
          data-featured={item.featured || undefined}
        >
          <span>{item.label}</span>
          <strong>
            <FinanceSlot loading={loading} width="55%">
              {item.value ?? "—"}
            </FinanceSlot>
          </strong>
          <small>{item.detail}</small>
        </Link>
      ))}
    </section>
  );
}
