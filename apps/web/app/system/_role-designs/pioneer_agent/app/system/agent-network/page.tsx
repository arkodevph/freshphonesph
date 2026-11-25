import { Suspense } from "react";
import NetworkWorkspace from "@/app/system/_role-designs/pioneer_agent/app/system/agent-network/NetworkWorkspace";
import WorkspaceProgress from "@/app/system/_role-designs/pioneer_agent/components/WorkspaceProgress";

export default function Page() {
  return (
    <Suspense fallback={<WorkspaceProgress label="Loading Agent network…" />}>
      <NetworkWorkspace />
    </Suspense>
  );
}
