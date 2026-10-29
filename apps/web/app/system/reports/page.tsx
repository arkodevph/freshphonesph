"use client";

import {
  reportKindsFor,
  roleSchema,
  type ReportKind,
} from "@freshphones/contracts";
import { can, useMe } from "@/lib/useMe";
import ReportsDashboard from "./ReportsDashboard";

export default function ReportsPage() {
  const me = useMe();

  if (!me) {
    return <p role="status">Checking report access…</p>;
  }

  if (me.account_type !== "employee" || !can(me, "REPORT_VIEW")) {
    return (
      <section className="system-panel p-8">
        <h1 className="font-display text-xl font-700">No access</h1>
        <p className="mt-2 text-sm">Your account cannot view these reports.</p>
      </section>
    );
  }

  return (
    <ReportsDashboard
      key={`${me.id}:${me.permissions.join(",")}`}
      canReviewPayments={can(me, "PAYMENT_READ")}
      canWriteReports={can(me, "REPORT_WRITE")}
      allowedKinds={reportKindsFor({
        role: roleSchema.parse(me.role?.toUpperCase()),
      }).map((kind) => {
        return kind.toLowerCase() as ReportKind;
      })}
      showVisuals={me.role === "ceo"}
    />
  );
}
