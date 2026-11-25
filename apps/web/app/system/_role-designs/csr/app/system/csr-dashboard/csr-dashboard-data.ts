export type ReportPeriod = "month" | "30days" | "all";

export function supportPeriodQuery(
  period: ReportPeriod,
  now = new Date(),
): Record<string, string> {
  if (period === "all") {
    return {};
  }

  const end = now.toISOString().slice(0, 10);

  const start = new Date(now);

  if (period === "month") {
    start.setUTCDate(1);
  } else {
    start.setUTCDate(start.getUTCDate() - 29);
  }

  return { dateFrom: start.toISOString().slice(0, 10), dateTo: end };
}
