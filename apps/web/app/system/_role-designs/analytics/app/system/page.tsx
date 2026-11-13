"use client";

import { useMe } from "@/lib/useMe";
import WorkspaceProgress from "@/app/system/_role-designs/analytics/components/WorkspaceProgress";
import StaffDashboard from "@/app/system/_role-designs/analytics/app/system/StaffDashboard";

export default function DashboardPage() {
  const me = useMe();

  if (!me) {
    return <WorkspaceProgress label="Loading workspace…" />;
  }

  return <StaffDashboard key={me.id} />;
}
