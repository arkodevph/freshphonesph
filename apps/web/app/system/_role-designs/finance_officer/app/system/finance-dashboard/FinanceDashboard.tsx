"use client";
import type { Me } from "@/lib/api";
import { can } from "@/lib/useMe";
import { useExecutiveCharts } from "@/app/system/useExecutiveCharts";
import { useFinanceOverview } from "./useFinanceOverview";
import { useFinanceActivity } from "./useFinanceActivity";
import FinanceDashboardLayout from "./FinanceDashboardLayout";

function FinanceDashboardView({ me }: { me: Me }) {
  const overview = useFinanceOverview();
  const chart = useExecutiveCharts();
  const activity = useFinanceActivity();
  return (
    <FinanceDashboardLayout
      name={me.full_name.trim().split(/\s+/)[0]}
      overview={overview}
      chart={chart}
      activity={activity}
    />
  );
}
export default function FinanceDashboard({ me }: { me: Me }) {
  return can(me, "PAYMENT_VERIFY") ? (
    <FinanceDashboardView me={me} />
  ) : (
    <p role="alert">No access to this Finance workspace.</p>
  );
}
