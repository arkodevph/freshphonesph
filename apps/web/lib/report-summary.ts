import type { LoadedReport } from "../app/system/reports/report-view";
import { formatPeso } from "./currency";

export type ReportHighlight = {
  label: string;
  value: string | number;
  note: string;
  comparisonValue?: number | string;
};

export function reportHighlights(report: LoadedReport): ReportHighlight[] {
  if (report.kind === "payments") {
    const d = report.data;

    return [
      {
        label: "Verified collections",
        value: formatPeso(d.verifiedAmount),
        comparisonValue: d.verifiedAmount,
        note: `${d.verifiedPayments} verified payment records`,
      },
      {
        label: "Awaiting verification",
        value: formatPeso(d.pendingAmount),
        comparisonValue: d.pendingAmount,
        note: `${d.pendingVerification} pending · excluded from balances`,
      },
      {
        label: "Needs clarification",
        value: d.needsClarification,
        comparisonValue: d.needsClarification,
        note: "Records that need more information",
      },
      {
        label: "Rejected records",
        value: d.rejectedPayments ?? "Not captured",
        comparisonValue: d.rejectedPayments,
        note: "Excluded from verified collections",
      },
    ];
  }

  if (report.kind === "collections") {
    const d = report.data.totals;

    return [
      {
        label: "Verified in period",
        value: formatPeso(d.collectedInPeriod),
        comparisonValue: d.collectedInPeriod,
        note: `${d.verifiedPaymentsInPeriod} verified payment records`,
      },
      {
        label: "Pending in period",
        value: formatPeso(d.pendingInPeriod),
        comparisonValue: d.pendingInPeriod,
        note: "Excluded from balances",
      },
      {
        label: "Remaining overall",
        value: formatPeso(d.remainingBalance),
        note: "Current balance across all dates",
      },
      {
        label: "Without a schedule",
        value: d.clientsWithoutSchedule,
        note: "Agreed amounts are not yet known",
      },
    ];
  }

  if (report.kind === "reconciliation") {
    const d = report.data.totals;

    return [
      {
        label: "Verified credit",
        value: formatPeso(d.verifiedAmount),
        comparisonValue: d.verifiedAmount,
        note: "Includes recorded Finance adjustments",
      },
      {
        label: "Audit evidence gap",
        value: formatPeso(d.unmatchedVerifiedAmount),
        comparisonValue: d.unmatchedVerifiedAmount,
        note: `${d.unmatchedVerifiedPayments} records require review`,
      },
      {
        label: "Payments flagged",
        value: d.paymentsWithFlags,
        comparisonValue: d.paymentsWithFlags,
        note: "Each payment counted once",
      },
      {
        label: "Recorded payments",
        value: d.payments,
        comparisonValue: d.payments,
        note: "All statuses in the selected period",
      },
    ];
  }

  if (report.kind === "tasks") {
    const d = report.data;

    return [
      {
        label: "Tasks created",
        value: d.total,
        comparisonValue: d.total,
        note: "Created within the selected period",
      },
      {
        label: "Submitted",
        value: d.submitted,
        comparisonValue: d.submitted,
        note: "Includes completed submissions",
      },
      {
        label: "Submitted late",
        value: d.late,
        comparisonValue: d.late,
        note: "Recorded timing, not a wage deduction",
      },
      {
        label: "KPI reviews",
        value: d.reviewed,
        comparisonValue: d.reviewed,
        note: "Reviews entered by a person",
      },
    ];
  }

  const d = report.data;

  return [
    {
      label: "Cases created",
      value: d.total,
      comparisonValue: d.total,
      note: "Created within the selected period",
    },
    {
      label: "Open cases",
      value: d.open,
      comparisonValue: d.open,
      note: "Current status of scoped cases",
    },
    {
      label: "Resolved or closed",
      value: d.closed,
      comparisonValue: d.closed,
      note: "Current status of scoped cases",
    },
    {
      label: "Reported categories",
      value: d.categories.length,
      comparisonValue: d.categories.length,
      note: "Categories represented in this period",
    },
  ];
}

export function paymentStatusRows(
  report: Extract<LoadedReport, { kind: "payments" }>,
) {
  const d = report.data;

  return [
    { label: "Verified", value: d.verifiedPayments, tone: "verified" },
    { label: "Pending review", value: d.pendingVerification, tone: "pending" },
    {
      label: "Clarification",
      value: d.needsClarification,
      tone: "clarification",
    },
    ...(d.rejectedPayments === undefined
      ? []
      : [{ label: "Rejected", value: d.rejectedPayments, tone: "rejected" }]),
  ];
}
