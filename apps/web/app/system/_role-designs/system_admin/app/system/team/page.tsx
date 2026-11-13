import WorkspaceProgress from "@/app/system/_role-designs/system_admin/components/WorkspaceProgress";
import { Suspense } from "react";
import TeamDashboard from "@/app/system/_role-designs/system_admin/app/system/team/TeamDashboard";

export default function TeamPage() {
  return (
    <Suspense
      fallback={<WorkspaceProgress label="Loading account directory…" />}
    >
      <TeamDashboard />
    </Suspense>
  );
}
