import WorkspaceProgress from "@/components/WorkspaceProgress";
import { Suspense } from "react";
import SupportDashboard from "./SupportDashboard";

export default function SupportPage() {
  return (
    <Suspense
      fallback={<WorkspaceProgress label="Loading Customer Service…" />}
    >
      <SupportDashboard />
    </Suspense>
  );
}
