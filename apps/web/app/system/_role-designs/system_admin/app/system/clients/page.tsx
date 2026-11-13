import WorkspaceProgress from "@/app/system/_role-designs/system_admin/components/WorkspaceProgress";
import { Suspense } from "react";
import ClientsDashboard from "@/app/system/_role-designs/system_admin/app/system/clients/ClientsDashboard";

export default function ClientsPage() {
  return (
    <Suspense
      fallback={
        <WorkspaceProgress
          className="p-5 text-sm text-ink-soft"
          label="Loading clients…"
        />
      }
    >
      <ClientsDashboard />
    </Suspense>
  );
}
