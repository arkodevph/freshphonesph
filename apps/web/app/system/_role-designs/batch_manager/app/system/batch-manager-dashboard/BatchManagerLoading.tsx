import { SkeletonLine } from "@/app/system/_role-designs/batch_manager/components/WorkspaceProgress";
import BatchManagerBatchCard from "./BatchManagerBatchCard";
import styles from "./batch-manager-dashboard.module.css";

export function PendingValue({ width = "2ch" }: { width?: string }) {
  return (
    <span
      className={styles.skeletonValue}
      style={{ width }}
      aria-hidden="true"
    />
  );
}

export function BatchCardsSkeleton() {
  return (
    <div
      className={styles.batchGrid}
      role="status"
      aria-label="Loading assigned batches…"
      aria-busy="true"
    >
      {[0, 1, 2].map((key) => (
        <BatchManagerBatchCard key={key} />
      ))}
    </div>
  );
}

export function ReviewRowsSkeleton() {
  return (
    <ul
      className={styles.reviewList}
      role="status"
      aria-label="Loading enrollment reviews…"
      aria-busy="true"
    >
      {[0, 1].map((key) => (
        <li key={key} aria-hidden="true">
          <div className={styles.reviewPlaceholder}>
            <strong>
              <SkeletonLine width="17ch" />
            </strong>
            <span>
              <SkeletonLine width="12ch" />
            </span>
            <small>
              <SkeletonLine width="20ch" />
            </small>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function BatchManagerDashboardSkeleton() {
  return (
    <div
      className={styles.dashboard}
      role="status"
      aria-label="Loading Batch Manager dashboard…"
      aria-busy="true"
    >
      <div className={styles.toolbar} aria-hidden="true">
        <SkeletonLine width="24ch" />
        <div className={styles.toolbarPlaceholder}>
          <SkeletonLine width="14ch" />
          <SkeletonLine width="20ch" />
        </div>
      </div>
      <dl className={styles.summaryGrid} aria-hidden="true">
        {["Active batches", "Assigned members", "Ready for release"].map(
          (label) => (
            <div className={styles.metric} key={label}>
              <dt>{label}</dt>
              <dd>
                <PendingValue />
              </dd>
              <SkeletonLine width="16ch" />
            </div>
          ),
        )}
      </dl>
      <div className={styles.workspace}>
        <section className={styles.panel}>
          <header className={styles.panelHeader}>
            <h2>Assigned batches</h2>
          </header>
          <div className={styles.filters} aria-hidden="true">
            <span className={styles.filterPlaceholder}>Active</span>
            <span className={styles.filterPlaceholder}>Forming</span>
            <span className={styles.filterPlaceholder}>All batches</span>
          </div>
          <BatchCardsSkeleton />
        </section>
        <aside className={styles.sideColumn}>
          <section className={styles.panel}>
            <header className={styles.panelHeader}>
              <h2>Enrollment reviews</h2>
            </header>
            <ReviewRowsSkeleton />
          </section>
          <section className={styles.panel}>
            <header className={styles.panelHeader}>
              <h2>Open tasks</h2>
            </header>
            <ReviewRowsSkeleton />
          </section>
        </aside>
      </div>
    </div>
  );
}
