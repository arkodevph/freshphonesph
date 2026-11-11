"use client";

import { useContext } from "react";
import { usePathname } from "next/navigation";
import { CurrentUserContext } from "@/lib/useMe";
import { WorkspaceContentSkeleton } from "@/components/WorkspaceSkeleton";
import CeoDashboardSkeleton from "./ceo-dashboard/CeoDashboardSkeleton";
import CooDashboardSkeleton from "./coo-dashboard/CooDashboardSkeleton";

export default function Loading() {
  const me = useContext(CurrentUserContext);

  const pathname = usePathname();

  if (me?.role === "coo" && pathname === "/system") {
    return <CooDashboardSkeleton me={me} />;
  }

  return me?.role === "ceo" && pathname === "/system" ? (
    <CeoDashboardSkeleton name={me.full_name} />
  ) : (
    <WorkspaceContentSkeleton />
  );
}
