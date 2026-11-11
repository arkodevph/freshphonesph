import type { CSSProperties } from "react";
import styles from "../ceo-portal.module.css";

export function CeoPlaceholder({ width = "6ch" }: { width?: string }) {
  return (
    <span className={styles.placeholder} style={{ width }} aria-hidden="true" />
  );
}

export function CeoCollectionsSkeleton({ months }: { months: number }) {
  return (
    <div aria-hidden="true">
      <div className={styles.collectionTotal}>
        <strong>
          <CeoPlaceholder width="10ch" />
        </strong>
        <span>Verified in this period</span>
      </div>
      <div className={styles.collectionReadout}>
        <span>Selected period</span>
        <span>
          Pending <CeoPlaceholder width="8ch" />
        </span>
      </div>
      <p className={styles.chartUnit}>PHP · select a month below to inspect</p>
      <div className={`${styles.plot} ${styles.placeholderPlot}`}>
        <span className={styles.placeholder} />
      </div>
      <div
        className={styles.months}
        style={{ "--chart-months": months } as CSSProperties}
      >
        {Array.from({ length: months }, (_, index) => {
          return (
            <button key={index} type="button" disabled tabIndex={-1}>
              <CeoPlaceholder width="3ch" />
            </button>
          );
        })}
      </div>
      <div className={styles.legend}>
        <span>
          <i />
          Verified collections
        </span>
        <span>
          <i />
          Pending claims
        </span>
      </div>
      <div className={styles.chartDetails}>View exact figures</div>
    </div>
  );
}
