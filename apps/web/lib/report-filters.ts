import { collectionReportQuerySchema, reconciliationReportQuerySchema, operationsReportQuerySchema, reportQuerySchema, reportSnapshotSchema, type ReportKind, type ReportSnapshotInput } from "@freshphones/contracts";

export type ReportFilters = { dateFrom: string; dateTo: string; batchId: string; status: string };

export function defaultReportFilters(now = new Date()): ReportFilters {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (name: string) => parts.find((item) => item.type === name)!.value;
  const month = `${part("year")}-${part("month")}`;
  return { dateFrom: `${month}-01`, dateTo: `${month}-${part("day")}`, batchId: "", status: "" };
}

export function reportFilterQuery(kind: ReportKind, filters: ReportFilters):
  { params: Record<string, string>; error: null } | { params: null; error: string } {
  const params = {
    ...(filters.dateFrom ? { dateFrom: filters.dateFrom } : {}),
    ...(filters.dateTo ? { dateTo: filters.dateTo } : {}),
    ...((["payments", "collections", "reconciliation"].includes(kind)) && filters.batchId ? { batchId: filters.batchId } : {}),
    ...(kind === "payments" && filters.status ? { status: filters.status } : {}),
  };
  const result = (kind === "payments" ? reportQuerySchema : kind === "collections" ? collectionReportQuerySchema : kind === "reconciliation" ? reconciliationReportQuerySchema : operationsReportQuerySchema).safeParse(params);
  return result.success ? { params, error: null } : { params: null, error: result.error.issues.map((issue) => issue.message).join(" ") };
}

export function snapshotInput(kind: ReportKind, filters: ReportFilters):
  { input: ReportSnapshotInput; error: null } | { input: null; error: string } {
  if (!filters.dateFrom || !filters.dateTo) return { input: null, error: "Choose both dates before saving a period report." };
  const result = reportSnapshotSchema.safeParse({
    kind: kind.toUpperCase(), periodStart: filters.dateFrom, periodEnd: filters.dateTo,
    ...((["payments", "collections", "reconciliation"].includes(kind)) && filters.batchId ? { batchId: filters.batchId } : {}),
    ...(kind === "payments" && filters.status ? { status: filters.status } : {}),
  });
  return result.success ? { input: result.data, error: null } : { input: null, error: result.error.issues.map((issue) => issue.message).join(" ") };
}
