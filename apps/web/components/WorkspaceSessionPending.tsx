import WorkspaceProgress from "./WorkspaceProgress";

/** Wait for identity without inventing a role-specific navigation or layout. */
export default function WorkspaceSessionPending() {
  return <WorkspaceProgress label="Opening your workspace…" />;
}
