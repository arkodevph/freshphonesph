import WorkspaceProgress from "@/app/system/_role-designs/coo/components/WorkspaceProgress";
import { Suspense } from "react";
import TeamDashboard from "@/app/system/_role-designs/coo/app/system/team/TeamDashboard";

export default function TeamPage() {
  return (
    <Suspense
      fallback={<WorkspaceProgress label="Loading account directory…" />}
    >
      <TeamDashboard />
    </Suspense>
  );
}
