"use client";

import { useEffect, useState } from "react";
import styles from "./ceo-assistant.module.css";

/** Interaction reference: assistant-ui ThinkingIndicator (MIT); original implementation. */
export function AssistantProgress({ label }: { label: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const started = Date.now();

    const timer = window.setInterval(() => {
      return setElapsed(Math.floor((Date.now() - started) / 1000));
    }, 1000);

    return () => {
      return window.clearInterval(timer);
    };
  }, []);

  return (
    <div
      className={styles.responseProgress}
      aria-hidden="true"
      data-response-progress
    >
      <div>
        <span className={styles.progressDot} />
        <span className={styles.progressLabel}>{label}</span>
        {elapsed >= 2 && (
          <span className={styles.progressElapsed}>{elapsed}s</span>
        )}
      </div>
      {elapsed >= 8 && (
        <p>This is taking a little longer. You can stop anytime.</p>
      )}
    </div>
  );
}
