"use client";

import CeoDashboardLayout from "./ceo-dashboard/CeoDashboardLayout";
import { useCeoOverview } from "./ceo-dashboard/useCeoOverview";

export default function CeoDashboard({ name }: { name: string }) {
  const overview = useCeoOverview();

  return <CeoDashboardLayout name={name} overview={overview} />;
}
