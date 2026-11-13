"use client";

import { useContext } from "react";
import { usePathname } from "next/navigation";
import {
  reportKindsFor,
  roleSchema,
  type ReportKind,
} from "@freshphones/contracts";
import { CurrentUserContext, can } from "@/lib/useMe";
import ReportsDashboard from "@/app/system/_role-designs/finance_officer/app/system/reports/ReportsDashboard";
import { SkeletonLine } from "@/app/system/_role-designs/finance_officer/components/WorkspaceProgress";

/** Reuse the finished page composition whenever identity and route are known. */
export function WorkspaceContentSkeleton({
  label = "Loading page…",
}: {
  label?: string;
}) {
  const pathname = usePathname();

  const me = useContext(CurrentUserContext);

  if (pathname === "/system/reports" && me && can(me, "REPORT_VIEW")) {
    return (
      <div aria-busy="true" inert>
        <ReportsDashboard
          skeletonOnly
          canReviewPayments={can(me, "PAYMENT_READ")}
          canWriteReports={can(me, "REPORT_WRITE")}
          allowedKinds={reportKindsFor({
            role: roleSchema.parse(me.role?.toUpperCase()),
          }).map((kind) => {
            return kind.toLowerCase() as ReportKind;
          })}
          showVisuals={me.role === "ceo" || me.role === "coo"}
          minimalHeading={me.role === "coo"}
        />
      </div>
    );
  }

  return (
    <div role="status" aria-label={label} aria-busy="true">
      <SkeletonLine />
    </div>
  );
}
