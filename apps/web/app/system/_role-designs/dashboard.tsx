"use client";

import CooPage from "@/app/system/_role-designs/coo/app/system/page";
import dynamic from "next/dynamic";
import { useMe } from "@/lib/useMe";
import { workspaceDesignRole } from "@/lib/workspace-design-role";
import RoleDesignLoading from "./RoleDesignLoading";
import { CsrDashboardLoading } from "./csr/app/system/StaffDashboard";
import { HandlerDashboardLoading } from "./batch_handler/app/system/handler/HandlerDashboardLayout";
import { AnalyticsDashboardLoading } from "./analytics/app/system/AnalyticsDashboardLayout";
import BatchManagerDashboardSkeleton from "./batch_manager/app/system/batch-manager-dashboard/BatchManagerLoading";
import { FinanceDashboardLoading } from "./finance_officer/app/system/finance-dashboard/FinanceDashboardLayout";

const views = {
  ceo: dynamic(
    () => {
      return import("@/app/system/_role-designs/ceo/app/system/page");
    },
    {
      loading: RoleDesignLoading,
    },
  ),
  system_admin: dynamic(
    () => {
      return import("@/app/system/_role-designs/system_admin/app/system/page");
    },
    { loading: RoleDesignLoading },
  ),
  coo: CooPage,
  batch_manager: dynamic(
    () => {
      return import("@/app/system/_role-designs/batch_manager/app/system/page");
    },
    { loading: BatchManagerDashboardSkeleton },
  ),
  hr_payroll: dynamic(
    () => {
      return import("@/app/system/_role-designs/hr_payroll/app/system/page");
    },
    { loading: RoleDesignLoading },
  ),
  finance_officer: dynamic(
    () => {
      return import("@/app/system/_role-designs/finance_officer/app/system/page");
    },
    { loading: FinanceDashboardLoading },
  ),
  records: dynamic(
    () => {
      return import("@/app/system/_role-designs/records/app/system/page");
    },
    { loading: RoleDesignLoading },
  ),
  kpi_officer: dynamic(
    () => {
      return import("@/app/system/_role-designs/kpi_officer/app/system/page");
    },
    { loading: RoleDesignLoading },
  ),
  operations_coordinator: dynamic(
    () => {
      return import("@/app/system/_role-designs/operations_coordinator/app/system/page");
    },
    { loading: RoleDesignLoading },
  ),
  csr: dynamic(
    () => {
      return import("@/app/system/_role-designs/csr/app/system/page");
    },
    {
      loading: CsrDashboardLoading,
    },
  ),
  pioneer_agent: dynamic(
    () => {
      return import("@/app/system/_role-designs/pioneer_agent/app/system/page");
    },
    { loading: RoleDesignLoading },
  ),
  agent: dynamic(
    () => {
      return import("@/app/system/_role-designs/agent/app/system/page");
    },
    { loading: RoleDesignLoading },
  ),
  batch_handler: dynamic(
    () => {
      return import("@/app/system/_role-designs/batch_handler/app/system/page");
    },
    { loading: HandlerDashboardLoading },
  ),
  analytics: dynamic(
    () => {
      return import("@/app/system/_role-designs/analytics/app/system/page");
    },
    { loading: AnalyticsDashboardLoading },
  ),
};

export default function RolePage(props: Record<string, never>) {
  const me = useMe();

  if (!me) {
    return <RoleDesignLoading />;
  }

  const role = workspaceDesignRole(me.role);

  const View = role && role in views ? views[role as keyof typeof views] : null;

  if (!View) {
    return <p role="alert">No access to this workspace.</p>;
  }

  return <View key={me.id + ":" + role} {...props} />;
}
