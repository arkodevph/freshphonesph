"use client";

import { useMe } from "@/lib/useMe";
import BatchManagerDashboardSkeleton from "./batch-manager-dashboard/BatchManagerLoading";
import BatchManagerDashboard from "./batch-manager-dashboard/BatchManagerDashboard";

export default function DashboardPage() {
  const me = useMe();

  if (!me) {
    return <BatchManagerDashboardSkeleton />;
  }

  return <BatchManagerDashboard key={me.id} me={me} />;
}
