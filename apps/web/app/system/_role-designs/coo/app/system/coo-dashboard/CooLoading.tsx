import { SkeletonLine } from "@/app/system/_role-designs/coo/components/WorkspaceProgress";
import styles from "@/app/system/_role-designs/coo/app/system/coo-dashboard/coo-dashboard.module.css";

export function PendingValue({ width = "2ch" }: { width?: string }) {
  return (
    <span
      className={styles.skeletonValue}
      style={{ width }}
      aria-hidden="true"
    />
  );
}

/** The pending chart retains the real plot, month, readout and legend slots. */
export function CollectionsPending({ months }: { months: number }) {
  return (
    <div aria-busy="true">
      <span className="sr-only" role="status">
        Loading collections
      </span>
      <div aria-hidden="true">
        <div className={styles.plot}>
          <div className={styles.axis}>
            {[12.5, 31.25, 50, 68.75, 87.5].map((top) => {
              return (
                <span key={top} style={{ top: `${top}%` }}>
                  <SkeletonLine width="3ch" />
                </span>
              );
            })}
          </div>
          <svg viewBox="0 0 500 176" preserveAspectRatio="none">
            {[22, 55, 88, 121, 154].map((y) => {
              return (
                <line
                  key={y}
                  x1="0"
                  x2="500"
                  y1={y}
                  y2={y}
                  className={styles.gridLine}
                />
              );
            })}
          </svg>
          <div className={styles.chartSkeleton} />
        </div>
        <div
          className={styles.monthLabels}
          style={{ gridTemplateColumns: `repeat(${months}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: months }, (_, index) => {
            return (
              <span key={index}>
                <SkeletonLine width="3ch" />
              </span>
            );
          })}
        </div>
        <div className={styles.chartReadout}>
          <strong>
            <SkeletonLine width="8ch" />
          </strong>
          <span>
            <i className={styles.verifiedBar} />
            <SkeletonLine width="9ch" />
            <small>verified</small>
          </span>
          <span>
            <i className={styles.pendingBar} />
            <SkeletonLine width="9ch" />
            <small>pending</small>
          </span>
        </div>
        <div className={styles.legend}>
          <span>
            <i className={styles.verifiedBar} />
            Verified collections
          </span>
          <span>
            <i className={styles.pendingBar} />
            Pending claims
          </span>
        </div>
        <div className={styles.exactFigures}>
          <span className={styles.pendingSummary}>
            ▸ View exact monthly figures
          </span>
        </div>
      </div>
    </div>
  );
}
