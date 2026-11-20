import { BATCH_REAL_MEMBER_CAPACITY } from "@freshphones/contracts";
import { SkeletonLine } from "@/app/system/_role-designs/batch_manager/components/WorkspaceProgress";
import type { Batch, RecordId } from "@/lib/api";
import styles from "./batch-manager-dashboard.module.css";

const date = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "Asia/Manila",
});
function formatDate(value: string | null) {
  return value && !Number.isNaN(Date.parse(value))
    ? date.format(new Date(value))
    : "Not scheduled";
}
const labels: Record<string, string> = {
  active: "Active",
  forming: "Forming",
  planned: "Forming",
  closed: "Completed",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function BatchManagerBatchCard({
  batch,
  onOpen,
}: {
  batch?: Batch;
  onOpen?: (id: RecordId) => void;
}) {
  return (
    <article
      className={styles.batchCard}
      aria-hidden={!batch || undefined}
      data-batch-skeleton={!batch || undefined}
    >
      <div className={styles.batchTop}>
        <span className={styles.batchCode}>
          {batch ? batch.batch_number : <SkeletonLine width="18ch" />}
        </span>
        <span className={styles.batchStatus} data-status={batch?.status}>
          {batch ? (
            (labels[batch.status.toLowerCase()] ?? batch.status)
          ) : (
            <SkeletonLine width="5ch" />
          )}
        </span>
      </div>
      <h3>{batch ? batch.unit_model : <SkeletonLine width="80%" />}</h3>
      <p className={styles.batchDate}>
        {batch ? (
          `${formatDate(batch.start_date)} – ${formatDate(batch.end_date)}`
        ) : (
          <SkeletonLine width="25ch" />
        )}
      </p>
      <div className={styles.capacityLabel}>
        <span>Member capacity</span>
        <strong>
          {batch ? (
            `${batch.member_count} / ${BATCH_REAL_MEMBER_CAPACITY}`
          ) : (
            <SkeletonLine width="4ch" />
          )}
        </strong>
      </div>
      {batch ? (
        <meter
          className={styles.capacity}
          min={0}
          max={BATCH_REAL_MEMBER_CAPACITY}
          value={Math.min(batch.member_count, BATCH_REAL_MEMBER_CAPACITY)}
          aria-label={`${batch.batch_number} member capacity`}
        />
      ) : (
        <div className={`${styles.capacity} ${styles.capacitySkeleton}`} />
      )}
      {batch && batch.member_count > BATCH_REAL_MEMBER_CAPACITY && (
        <p className={styles.legacy}>Existing batch above capacity</p>
      )}
      <dl className={styles.batchTeam}>
        <div>
          <dt>Handler</dt>
          <dd>
            {batch ? (
              batch.handler_name || "Unassigned"
            ) : (
              <SkeletonLine width="12ch" />
            )}
          </dd>
        </div>
        <div>
          <dt>Agent</dt>
          <dd>
            {batch ? (
              batch.agent_name || "Unassigned"
            ) : (
              <SkeletonLine width="14ch" />
            )}
          </dd>
        </div>
      </dl>
      {batch ? (
        <button
          className={styles.batchOpen}
          type="button"
          onClick={() => onOpen?.(batch.id)}
        >
          View batch<span className={styles.srOnly}> {batch.batch_number}</span>
        </button>
      ) : (
        <div className={styles.batchOpen}>
          <SkeletonLine width="9ch" />
        </div>
      )}
    </article>
  );
}
