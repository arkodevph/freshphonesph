"use client";

import type { Me } from "@/lib/api";
import { useCooOverview } from "./useCooOverview";
import CooDashboardLayout from "./CooDashboardLayout";

export default function CooDashboard({ me }: { me: Me }) {
  const overview = useCooOverview();

  return <CooDashboardLayout me={me} overview={overview} />;
}
