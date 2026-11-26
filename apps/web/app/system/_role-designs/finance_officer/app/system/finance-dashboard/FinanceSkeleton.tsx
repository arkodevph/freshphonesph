import type { CSSProperties, ReactNode } from "react";
import styles from "./finance-dashboard.module.css";

/** Placeholder occupies the same content slot as its finished value. */
export function FinanceSlot({
  loading,
  children,
  width = "70%",
}: {
  loading: boolean;
  children: ReactNode;
  width?: string;
}) {
  return loading ? (
    <span
      className={styles.skeleton}
      style={{ "--slot-width": width } as CSSProperties}
      data-finance-skeleton
      aria-hidden="true"
    >
      &nbsp;
    </span>
  ) : (
    children
  );
}
