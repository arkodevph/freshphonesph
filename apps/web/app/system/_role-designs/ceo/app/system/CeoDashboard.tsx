"use client";

import CeoDashboardLayout from "@/app/system/_role-designs/ceo/app/system/ceo-dashboard/CeoDashboardLayout";
import { useCeoOverview } from "@/app/system/ceo-dashboard/useCeoOverview";

export default function CeoDashboard({ name }: { name: string }) {
  const overview = useCeoOverview();

  return <CeoDashboardLayout name={name} overview={overview} />;
}
