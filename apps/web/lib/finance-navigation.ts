import type { ReportKind } from "@freshphones/contracts";
import {
  defaultReportFilters,
  reportFilterQuery,
  type ReportFilters,
} from "./report-filters";

export const isFinanceId = (
  value: string | null | undefined,
): value is string => {
  return Boolean(
    value && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value),
  );
};

export function financePage(value: string | null) {
  const n = Number(value);

  return Number.isInteger(n) && n >= 1 && n <= 100000 ? n : 1;
}

/** Only known local Finance sources can become a return destination. */
export function safeFinanceReturn(value?: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  try {
    const url = new URL(value, "https://finance.invalid");

    return url.origin === "https://finance.invalid" &&
      ["/system/reports", "/system/gcash-history"].includes(url.pathname)
      ? url.pathname + url.search
      : null;
  } catch {
    return null;
  }
}

export function financeReportHref(
  kind: ReportKind,
  filters: ReportFilters,
  page = 1,
) {
  const scope = reportFilterQuery(kind, filters);

  if (!scope.params) {
    return "/system/reports";
  }

  const query = new URLSearchParams({
    report: kind,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    ...scope.params,
  });

  if (page > 1) {
    query.set("page", String(page));
  }

  return `/system/reports?${query}`;
}

export function financeReportLocation(
  search: string,
  allowed: readonly ReportKind[],
) {
  const query = new URLSearchParams(search);

  const requested = query.get("report");

  const kind = allowed.includes(requested as ReportKind)
    ? (requested as ReportKind)
    : (allowed[0] ?? "payments");

  const fallback = defaultReportFilters();

  const filters: ReportFilters = {
    dateFrom: query.get("dateFrom") ?? fallback.dateFrom,
    dateTo: query.get("dateTo") ?? fallback.dateTo,
    batchId: query.get("batchId") ?? "",
    status: kind === "payments" ? (query.get("status") ?? "") : "",
  };

  const parsed = reportFilterQuery(kind, filters);

  return {
    kind,
    filters: parsed.params ? filters : fallback,
    page: financePage(query.get("page")),
    earnings: requested === "earnings" && allowed.includes("collections"),
    error: parsed.error,
  };
}

export function financePaymentHref({
  id,
  kind = "payments",
  filters,
  batchId,
  returnTo,
}: {
  id?: string;
  kind?: ReportKind;
  filters?: ReportFilters;
  batchId?: string;
  returnTo?: string | null;
}) {
  const query = new URLSearchParams(id ? { payment: id } : { queue: "all" });

  if (!id && filters) {
    if (filters.dateFrom) {
      query.set("dateFrom", filters.dateFrom);
    }

    if (filters.dateTo) {
      query.set("dateTo", filters.dateTo);
    }

    const scope = batchId ?? filters.batchId;

    if (scope) {
      query.set(
        kind === "collections" ? "membershipBatchId" : "batchId",
        scope,
      );
    }

    const status =
      kind === "collections"
        ? "verified"
        : kind === "payments"
          ? filters.status.toLowerCase()
          : "";

    if (status) {
      query.set("status", status);
    }
  }

  const back = safeFinanceReturn(returnTo);

  if (back) {
    query.set("returnTo", back);
  }

  return `/system/payments?${query}`;
}

export function financeGcashHref(
  search: string,
  historyId: string,
  submissionId?: string,
  submissionPage = 1,
) {
  const current = new URLSearchParams(search);

  const query = new URLSearchParams({ history: historyId });

  for (const key of ["q", "status", "archived", "page"]) {
    const value = current.get(key);

    if (value) {
      query.set(key, value);
    }
  }

  if (submissionId) {
    query.set("submission", submissionId);

    query.set("submissionPage", String(submissionPage));
  }

  return `/system/gcash-history?${query}`;
}
