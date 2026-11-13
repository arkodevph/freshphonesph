import WorkspaceProgress from "@/app/system/_role-designs/system_admin/components/WorkspaceProgress";
import { Suspense } from "react";
import SupportDashboard from "@/app/system/_role-designs/system_admin/app/system/support/SupportDashboard";

export default function SupportPage() {
  return (
    <Suspense
      fallback={<WorkspaceProgress label="Loading Customer Service…" />}
    >
      <SupportDashboard />
    </Suspense>
  );
}
