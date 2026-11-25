"use client";

import { useMe } from "@/lib/useMe";
import { HandlerDashboardLoading } from "./handler/HandlerDashboardLayout";
import HandlerHome from "@/app/system/_role-designs/batch_handler/app/system/handler/HandlerHome";

export default function DashboardPage() {
  const me = useMe();

  if (!me) {
    return <HandlerDashboardLoading />;
  }

  return <HandlerHome key={me.id} name={me.full_name} />;
}
