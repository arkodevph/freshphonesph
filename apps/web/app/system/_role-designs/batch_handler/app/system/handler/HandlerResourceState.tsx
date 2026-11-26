import WorkspaceProgress from "@/app/system/_role-designs/batch_handler/components/WorkspaceProgress";
import type { Resource } from "@/app/system/handler/useHandlerHome";
import styles from "./handler-home.module.css";

export function HandlerResourceState({
  resource,
  loading,
  retry,
  label = "Loading claims…",
}: {
  resource: Resource<unknown>;
  loading: boolean;
  retry: () => void;
  label?: string;
}) {
  if (resource.error) {
    return (
      <div className={styles.error} role="alert">
        <p>{resource.error}</p>
        <button type="button" className={styles.textLink} onClick={retry}>
          Try again
        </button>
      </div>
    );
  }

  if (loading && !resource.data) {
    return (
      <div className={styles.loading}>
        <WorkspaceProgress label={label} />
      </div>
    );
  }

  return null;
}
