"use client";

import CsrDashboard from "@/app/system/_role-designs/csr/app/system/csr-dashboard/CsrDashboard";
import WorkspaceProgress from "@/app/system/_role-designs/csr/components/WorkspaceProgress";

export function CsrDashboardLoading() {
  return <WorkspaceProgress label="Loading customer support…" />;
}

export default function StaffDashboard() {
  return <CsrDashboard />;
}
