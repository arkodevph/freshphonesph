"use client";

import { useMe } from "@/lib/useMe";
import WorkspaceProgress from "@/app/system/_role-designs/finance_officer/components/WorkspaceProgress";
import FinanceDashboard from "./finance-dashboard/FinanceDashboard";

export default function DashboardPage() {
  const me = useMe();

  if (!me) {
    return <WorkspaceProgress label="Loading workspace…" />;
  }

  return <FinanceDashboard key={me.id} me={me} />;
}
