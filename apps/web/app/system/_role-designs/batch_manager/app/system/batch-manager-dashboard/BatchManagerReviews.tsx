import Link from "next/link";
import { ReviewRowsSkeleton } from "./BatchManagerLoading";
import { useBatchManagerReviews } from "./useBatchManagerBatches";
import styles from "./batch-manager-dashboard.module.css";

export default function BatchManagerReviews() {
  const { data, error, refresh } = useBatchManagerReviews(true);
  return (
    <section className={styles.panel} aria-labelledby="batch-reviews-title">
      <header className={styles.panelHeader}>
        <h2 id="batch-reviews-title">Enrollment reviews</h2>
        <span className={styles.count}>{data?.total ?? "—"}</span>
      </header>
      {error ? (
        <div className={styles.error} role="alert">
          <p>{error}</p>
          <button type="button" onClick={refresh}>
            Try again
          </button>
        </div>
      ) : !data ? (
        <ReviewRowsSkeleton />
      ) : data.items.length ? (
        <ul className={styles.reviewList}>
          {data.items.slice(0, 4).map((item) => (
            <li key={item.id}>
              <Link
                href={`/system/enrollments?request=${encodeURIComponent(item.id)}`}
              >
                <strong>{item.name}</strong>
                <span>{item.batchCode}</span>
                <small>Awaiting your review</small>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className={styles.empty}>
          <strong>No enrollments awaiting review</strong>
          <p>Your assigned batches are up to date.</p>
        </div>
      )}
      <Link className={styles.panelAction} href="/system/enrollments">
        Review enrollments
      </Link>
    </section>
  );
}
