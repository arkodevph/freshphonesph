"use client";

import type { Me } from "@/lib/api";
import { useCooOverview } from "@/app/system/coo-dashboard/useCooOverview";
import CooDashboardLayout from "@/app/system/_role-designs/coo/app/system/coo-dashboard/CooDashboardLayout";

export default function CooDashboard({ me }: { me: Me }) {
  const overview = useCooOverview();

  return <CooDashboardLayout me={me} overview={overview} />;
}
