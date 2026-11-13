import { SkeletonLine } from "@/app/system/_role-designs/records/components/WorkspaceProgress";
import styles from "@/app/system/_role-designs/records/components/record-details.module.css";

export default function RecordDetailsSkeleton({
  kind,
}: {
  kind: "batch" | "client";
}) {
  return (
    <div role="status" aria-label="Loading record details" aria-busy="true">
      {kind === "batch" && (
        <div className={styles.section}>
          <SkeletonLine width="190px" />
        </div>
      )}
      <div className={styles.grid} aria-hidden="true">
        {Array.from({ length: kind === "client" ? 7 : 2 }, (_, index) => {
          return (
            <div key={index} className={styles.field}>
              <SkeletonLine width="110px" />
              <span className={styles.skeletonControl} />
            </div>
          );
        })}
      </div>
      {kind === "batch" && (
        <div className={styles.skeletonTerms} aria-hidden="true">
          <SkeletonLine width="100%" />
          <SkeletonLine width="72%" />
          <SkeletonLine width="210px" />
          <SkeletonLine width="220px" />
        </div>
      )}
      <div className={styles.actions} aria-hidden="true">
        <span className={styles.skeletonButton} />
        <span className={styles.skeletonButton} />
      </div>
    </div>
  );
}
