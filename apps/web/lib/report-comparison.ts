import type { ReportFilters } from "./report-filters";

const day = 86_400_000;

export function previousReportPeriod(
  filters: ReportFilters,
): ReportFilters | null {
  const from = Date.parse(`${filters.dateFrom}T00:00:00Z`);

  const to = Date.parse(`${filters.dateTo}T00:00:00Z`);

  if (
    !Number.isFinite(from) ||
    !Number.isFinite(to) ||
    from > to ||
    new Date(from).toISOString().slice(0, 10) !== filters.dateFrom ||
    new Date(to).toISOString().slice(0, 10) !== filters.dateTo
  ) {
    return null;
  }

  const start = new Date(from - (to - from + day)).toISOString().slice(0, 10);

  const end = new Date(from - day).toISOString().slice(0, 10);

  return /^\d{4}-/.test(start)
    ? { ...filters, dateFrom: start, dateTo: end }
    : null;
}

export type ReportChange = {
  direction: "up" | "down" | "flat" | "unavailable";
  label: string;
  explanation: string;
};

export function reportChange(
  current: number | string | undefined,
  previous: number | string | undefined,
): ReportChange {
  if (current === undefined) {
    return {
      direction: "unavailable",
      label: "No history",
      explanation:
        "This current total has no historical snapshot for a period comparison.",
    };
  }

  const value = Number(current);

  const baseline = previous === undefined ? NaN : Number(previous);

  if (!Number.isFinite(value) || !Number.isFinite(baseline)) {
    return {
      direction: "unavailable",
      label: "Unavailable",
      explanation: "A comparable previous-period value is unavailable.",
    };
  }

  if (baseline < 0) {
    return {
      direction: "unavailable",
      label: "No baseline",
      explanation:
        "A negative previous-period value does not provide a meaningful percentage baseline.",
    };
  }

  if (value === baseline) {
    return {
      direction: "flat",
      label: "0.00%",
      explanation: "Unchanged from the previous period.",
    };
  }

  const direction = value > baseline ? "up" : "down";

  if (baseline === 0) {
    return {
      direction,
      label: "New",
      explanation:
        "The previous period was zero, so a percentage change is undefined.",
    };
  }

  const percent = Math.abs((value - baseline) / baseline) * 100;

  const label =
    percent < 0.01
      ? "<0.01%"
      : `${percent.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

  return {
    direction,
    label,
    explanation: `${direction === "up" ? "Increased" : "Decreased"} by ${label} compared with the previous period.`,
  };
}
