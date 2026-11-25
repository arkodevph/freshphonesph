"use client";

import { useContext } from "react";
import { usePathname } from "next/navigation";
import {
  reportKindsFor,
  roleSchema,
  type ReportKind,
} from "@freshphones/contracts";
import { CurrentUserContext, can } from "@/lib/useMe";
import ReportsDashboard from "@/app/system/reports/ReportsDashboard";
import CooReportsDashboard from "@/app/system/_role-designs/coo/app/system/reports/ReportsDashboard";
import FinanceReportsDashboard from "@/app/system/_role-designs/finance_officer/app/system/reports/ReportsDashboard";
import FinanceClientsLoading from "@/app/system/_role-designs/finance_officer/app/system/clients/ClientsLoading";
import { FinanceDashboardLoading } from "@/app/system/_role-designs/finance_officer/app/system/finance-dashboard/FinanceDashboardLayout";
import CooRoleWorkspace from "@/app/system/_role-designs/coo/app/system/RoleWorkspace";
import ClientsLoading from "@/app/system/_role-designs/coo/app/system/clients/ClientsLoading";
import WorkspaceProgress from "./WorkspaceProgress";
import { AnalyticsDashboardLoading } from "@/app/system/_role-designs/analytics/app/system/AnalyticsDashboardLayout";
import { HandlerDashboardLoading } from "@/app/system/_role-designs/batch_handler/app/system/handler/HandlerDashboardLayout";

/** Reuse the finished page composition whenever identity and route are known. */
export function WorkspaceContentSkeleton({
  label = "Loading page…",
}: {
  label?: string;
}) {
  const pathname = usePathname();

  const me = useContext(CurrentUserContext);

  if (me?.role === "finance_officer" && pathname === "/system") {
    return <FinanceDashboardLoading />;
  }

  if (me?.role === "finance_officer" && pathname === "/system/clients") {
    return <FinanceClientsLoading />;
  }

  if (me?.role === "coo" && pathname === "/system/clients") {
    return <ClientsLoading />;
  }

  if (me?.role === "coo" && pathname === "/system/agent-network") {
    return (
      <div aria-busy="true" inert>
        <CooRoleWorkspace section="network" skeletonOnly />
      </div>
    );
  }

  if (me?.role === "analytics" && pathname === "/system") {
    return <AnalyticsDashboardLoading />;
  }

  if (
    ["batch_handler", "core_handler"].includes(me?.role ?? "") &&
    pathname === "/system"
  ) {
    return <HandlerDashboardLoading />;
  }

  if (pathname === "/system/reports" && me && can(me, "REPORT_VIEW")) {
    const Dashboard =
      me.role === "coo"
        ? CooReportsDashboard
        : me.role === "finance_officer"
          ? FinanceReportsDashboard
          : ReportsDashboard;

    return (
      <div aria-busy="true" inert>
        <Dashboard
          skeletonOnly
          canReviewPayments={can(me, "PAYMENT_READ")}
          canWriteReports={can(me, "REPORT_WRITE")}
          allowedKinds={reportKindsFor({
            role: roleSchema.parse(me.role?.toUpperCase()),
          }).map((kind) => {
            return kind.toLowerCase() as ReportKind;
          })}
          showVisuals={["ceo", "coo", "finance_officer"].includes(
            me.role ?? "",
          )}
          minimalHeading={["coo", "finance_officer"].includes(me.role ?? "")}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        placeItems: "center",
        minHeight: "calc(100dvh - 160px)",
      }}
    >
      <WorkspaceProgress label={label} />
    </div>
  );
}
