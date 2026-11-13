"use client";

import { useMe } from "@/lib/useMe";
import WorkspaceProgress from "@/app/system/_role-designs/batch_handler/components/WorkspaceProgress";
import HandlerHome from "@/app/system/_role-designs/batch_handler/app/system/handler/HandlerHome";

export default function DashboardPage() {
  const me = useMe();

  if (!me) {
    return <WorkspaceProgress label="Loading workspace…" />;
  }

  return <HandlerHome key={me.id} name={me.full_name} />;
}
