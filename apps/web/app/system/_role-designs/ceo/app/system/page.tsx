"use client";

import { useMe } from "@/lib/useMe";
import WorkspaceProgress from "@/app/system/_role-designs/ceo/components/WorkspaceProgress";
import CeoDashboard from "@/app/system/_role-designs/ceo/app/system/CeoDashboard";

export default function DashboardPage() {
  const me = useMe();

  if (!me) {
    return <WorkspaceProgress label="Loading workspace…" />;
  }

  return <CeoDashboard key={me.id} name={me.full_name} />;
}
