"use client";

import { useMe } from "@/lib/useMe";
import { AnalyticsDashboardLoading } from "./AnalyticsDashboardLayout";
import StaffDashboard from "@/app/system/_role-designs/analytics/app/system/StaffDashboard";

export default function DashboardPage() {
  const me = useMe();

  if (!me) {
    return <AnalyticsDashboardLoading />;
  }

  return <StaffDashboard key={me.id} />;
}
