import WorkspaceProgress from "@/components/WorkspaceProgress";
import { Suspense } from "react";
import TeamDashboard from "./TeamDashboard";

export default function TeamPage() {
  return (
    <Suspense
      fallback={<WorkspaceProgress label="Loading account directory…" />}
    >
      <TeamDashboard />
    </Suspense>
  );
}
