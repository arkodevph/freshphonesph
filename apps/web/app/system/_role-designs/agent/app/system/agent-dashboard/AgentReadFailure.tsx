"use client";

import styles from "./agent-dashboard.module.css";

export default function ReadFailure({
  error,
  retry,
}: {
  error: string;
  retry: () => Promise<void>;
}) {
  return (
    <div className={styles.state} role="alert">
      <p>{error}</p>
      <button
        type="button"
        onClick={() => {
          void retry();
        }}
      >
        Try again
      </button>
    </div>
  );
}
