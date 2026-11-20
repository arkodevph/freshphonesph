import Link from "next/link";
import { PendingValue } from "./BatchManagerLoading";
import type { useBatchManagerOverview } from "./useBatchManagerOverview";
import styles from "./batch-manager-dashboard.module.css";

export default function BatchManagerSummary({
  summary,
  error,
  pending,
  refresh,
}: ReturnType<typeof useBatchManagerOverview>) {
  const metrics = [
    {
      label: "Active batches",
      value: summary?.activeBatches,
      note: "Assigned to you",
      href: "/system/records",
    },
    {
      label: "Assigned members",
      value: summary?.clients,
      note: "Across your batches",
      href: "/system/clients",
    },
    {
      label: "Ready for release",
      value: summary?.readyForRelease,
      note: "Members marked ready",
      href: "/system/clients",
    },
  ];
  return (
    <section aria-label="Your batch overview" aria-busy={pending}>
      <dl className={styles.summaryGrid}>
        {metrics.map(({ label, value, note, href }) => (
          <div className={styles.metric} key={label}>
            <dt>{label}</dt>
            <dd>{value != null ? value : error ? "—" : <PendingValue />}</dd>
            <Link href={href}>{note}</Link>
          </div>
        ))}
      </dl>
      {error && (
        <div className={styles.error} role="alert">
          <p>{error}</p>
          <button type="button" onClick={refresh}>
            Try again
          </button>
        </div>
      )}
    </section>
  );
}
