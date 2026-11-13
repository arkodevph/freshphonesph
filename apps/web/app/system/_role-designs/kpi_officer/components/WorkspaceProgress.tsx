import type { ReactNode } from "react";
import styles from "@/app/system/_role-designs/kpi_officer/components/workspace-progress.module.css";

export function SkeletonLine({ width = "72%" }: { width?: string }) {
  return (
    <span
      className={styles.line}
      style={{ width }}
      data-skeleton-line
      aria-hidden="true"
    />
  );
}

/** Preserve the exact line wrapping of a known label while its value is pending. */
export function SkeletonText({ children }: { children: ReactNode }) {
  return (
    <span className={styles.text} aria-hidden="true">
      {children}
    </span>
  );
}

/** Render placeholders inside the real table so columns and cell spacing stay aligned. */
export function TableSkeletonRows({
  columns,
  rows = 5,
  cellClassName,
  label = "Loading records",
  identity = false,
}: {
  columns: number;
  rows?: number;
  cellClassName?: string;
  label?: string;
  identity?: boolean;
}) {
  return Array.from({ length: rows }, (_, row) => {
    return (
      <tr key={row} aria-busy="true" aria-label={row === 0 ? label : undefined}>
        {Array.from({ length: columns }, (_, column) => {
          return (
            <td key={column} className={cellClassName}>
              <span className={styles.cell}>
                {identity && column === 0 ? (
                  <>
                    <span className={styles.avatar} />
                    <span className={styles.identity}>
                      <SkeletonLine width="76%" />
                      <SkeletonLine width="90%" />
                      <SkeletonLine width="50%" />
                    </span>
                  </>
                ) : (
                  <SkeletonLine width={column === 0 ? "76%" : "64%"} />
                )}
              </span>
            </td>
          );
        })}
      </tr>
    );
  });
}

/** Compact activity feedback for an operation with unknown duration. */
export default function WorkspaceProgress({
  label = "Loading…",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={`${styles.pending} ${className}`}
      role="status"
      aria-label={label}
      aria-busy="true"
    >
      <span className={styles.indicator} aria-hidden="true">
        {Array.from({ length: 12 }, (_, index) => {
          return (
            <span
              key={index}
              className={styles.spoke}
              style={{
                transform: `rotate(${index * 30}deg) translateY(-7px)`,
                animationDelay: `${index / 12 - 1}s`,
              }}
            />
          );
        })}
      </span>
      <span className={styles.label}>{label}</span>
    </span>
  );
}
