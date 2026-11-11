import WorkspaceProgress from "@/components/WorkspaceProgress";
import { Suspense } from "react";
import ClientsDashboard from "./ClientsDashboard";

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
