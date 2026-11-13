import styles from "./ceo-assistant.module.css";

/** One status label accompanies the single animated reply mark. */
export function AssistantProgress({ label }: { label: string }) {
  return (
    <div className={styles.responseProgress} data-response-progress>
      <span className={styles.progressLabel}>{label || "Thinking"}</span>
    </div>
  );
}
