"use client";

import { useMe } from "@/lib/useMe";
import { FinanceDashboardLoading } from "./finance-dashboard/FinanceDashboardLayout";
import FinanceDashboard from "./finance-dashboard/FinanceDashboard";

export default function DashboardPage() {
  const me = useMe();

  if (!me) {
    return <FinanceDashboardLoading />;
  }

  return <FinanceDashboard key={me.id} me={me} />;
}
