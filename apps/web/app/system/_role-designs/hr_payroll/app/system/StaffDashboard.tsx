"use client";

import { useMe } from "@/lib/useMe";
import HrDashboard from "./hr-dashboard/HrDashboard";
import WorkspaceProgress from "@/app/system/_role-designs/hr_payroll/components/WorkspaceProgress";

export default function StaffDashboard() {
  const me = useMe();

  return me ? (
    <HrDashboard me={me} />
  ) : (
    <WorkspaceProgress label="Loading HR workspace" />
  );
}
