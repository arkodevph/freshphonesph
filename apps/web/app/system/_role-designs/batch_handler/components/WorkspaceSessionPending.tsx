import WorkspaceProgress from "@/app/system/_role-designs/batch_handler/components/WorkspaceProgress";

/** Wait for identity without inventing a role-specific navigation or layout. */
export default function WorkspaceSessionPending() {
  return <WorkspaceProgress label="Opening your workspace…" />;
}
