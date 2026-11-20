import styles from "./coo-dashboard.module.css";

export function PendingValue({ width = "2ch" }: { width?: string }) {
  return (
    <span
      className={styles.skeletonValue}
      style={{ width }}
      aria-hidden="true"
    />
  );
}
