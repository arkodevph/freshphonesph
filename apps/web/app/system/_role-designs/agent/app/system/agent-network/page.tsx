import { Suspense } from "react";
import WorkspaceProgress from "@/app/system/_role-designs/agent/components/WorkspaceProgress";
import AgentBatchWorkspace from "./AgentBatchWorkspace";

export default function Page() {
  return (
    <Suspense fallback={<WorkspaceProgress label="Loading your batches…" />}>
      <AgentBatchWorkspace />
    </Suspense>
  );
}
