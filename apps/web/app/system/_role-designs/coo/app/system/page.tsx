"use client";

import { useMe } from "@/lib/useMe";
import WorkspaceProgress from "@/app/system/_role-designs/coo/components/WorkspaceProgress";
import CooDashboard from "@/app/system/_role-designs/coo/app/system/coo-dashboard/CooDashboard";

export default function DashboardPage() {
  const me = useMe();

  if (!me) {
    return <WorkspaceProgress label="Loading workspace…" />;
  }

  return <CooDashboard key={me.id} me={me} />;
}
