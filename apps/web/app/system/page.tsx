"use client";

import { useMe } from "@/lib/useMe";
import { WorkspaceContentSkeleton } from "@/components/WorkspaceSkeleton";
import CeoDashboard from "./CeoDashboard";
import HandlerHome from "./handler/HandlerHome";
import { isBatchHandler } from "@/lib/handler-workspace";
import StaffDashboard from "./StaffDashboard";
import CooDashboard from "./coo-dashboard/CooDashboard";

export default function DashboardPage() {
  const me = useMe();

  if (!me) {
    return <WorkspaceContentSkeleton />;
  }

  if (me.role === "ceo") {
    return <CeoDashboard key={me.id} name={me.full_name} />;
  }

  if (isBatchHandler(me.role)) {
    return <HandlerHome key={me.id} name={me.full_name} />;
  }

  if (me.role === "coo") {
    return <CooDashboard key={me.id} me={me} />;
  }

  return <StaffDashboard key={me.id} />;
}
