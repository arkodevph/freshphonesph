import styles from "./workspace-skeleton.module.css";

export function WorkspaceContentSkeleton({
  label = "Loading page",
}: {
  label?: string;
}) {
  return (
    <section
      className={styles.content}
      role="status"
      aria-label={label}
      aria-busy="true"
    >
      <span className="sr-only">{label}</span>
      <div className={styles.stack} aria-hidden="true">
        <div className={styles.heading}>
          <span className={`${styles.bar} ${styles.title}`} />
          <span className={`${styles.bar} ${styles.subtitle}`} />
        </div>
        <div className={styles.metrics}>
          {[0, 1, 2].map((index) => {
            return (
              <div key={index} className={styles.card}>
                <span className={`${styles.bar} ${styles.label}`} />
                <span className={`${styles.bar} ${styles.value}`} />
                <span className={`${styles.bar} ${styles.detail}`} />
              </div>
            );
          })}
        </div>
        <div className={styles.table}>
          <div className={styles.toolbar}>
            <span className={`${styles.bar} ${styles.search}`} />
            <span className={`${styles.bar} ${styles.action}`} />
          </div>
          {[0, 1, 2, 3, 4].map((index) => {
            return (
              <div key={index} className={styles.row}>
                <span className={`${styles.bar} ${styles.name}`} />
                <span className={`${styles.bar} ${styles.detail}`} />
                <span className={`${styles.bar} ${styles.badge}`} />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function WorkspaceSessionSkeleton() {
  return (
    <div className="system-shell" aria-busy="true">
      <aside className="system-sidebar" aria-hidden="true">
        <div className={styles.brand}>
          <span className={`${styles.bar} ${styles.mark}`} />
          <span className={`${styles.bar} ${styles.brandName}`} />
        </div>
        <div className={styles.navigation}>
          {[0, 1, 2, 3, 4, 5, 6].map((index) => {
            return (
              <div key={index} className={styles.navItem}>
                <span className={`${styles.bar} ${styles.icon}`} />
                <span className={`${styles.bar} ${styles.navLabel}`} />
              </div>
            );
          })}
        </div>
        <div className="system-sidebar-footer">
          <div className={styles.brand}>
            <span className={`${styles.bar} ${styles.avatar}`} />
            <span className={`${styles.bar} ${styles.brandName}`} />
          </div>
        </div>
      </aside>
      <div className="system-main">
        <div className="system-topbar" aria-hidden="true">
          <span className={`${styles.bar} ${styles.topbarTitle}`} />
          <span className={`${styles.bar} ${styles.avatar}`} />
        </div>
        <div className="system-content">
          <WorkspaceContentSkeleton label="Loading workspace" />
        </div>
      </div>
    </div>
  );
}
