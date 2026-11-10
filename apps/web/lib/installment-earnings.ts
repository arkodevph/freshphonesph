import {
  installmentEarningsQuerySchema,
  type EarningsFrequency,
} from "@freshphones/contracts";

export type EarningsFilters = {
  year: string;
  frequency: EarningsFrequency;
  period: string;
  groupBy: "batches" | "members";
  batchId: string;
};

export function defaultEarningsFilters(now = new Date()): EarningsFilters {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "numeric",
  }).formatToParts(now);

  return {
    year: parts.find((part) => {
      return part.type === "year";
    })!.value,
    frequency: "MONTHLY",
    period: parts.find((part) => {
      return part.type === "month";
    })!.value,
    groupBy: "batches",
    batchId: "",
  };
}

export function changeEarningsFrequency(
  filters: EarningsFilters,
  frequency: EarningsFrequency,
): EarningsFilters {
  const period = Number(filters.period);

  const month =
    filters.frequency === "MONTHLY"
      ? period
      : filters.frequency === "TWICE_MONTHLY"
        ? Math.ceil(period / 2)
        : period * 2 - 1;

  const next =
    frequency === "MONTHLY"
      ? month
      : frequency === "TWICE_MONTHLY"
        ? month * 2 - 1
        : Math.ceil(month / 2);

  return { ...filters, frequency, period: String(next) };
}

export function earningsFilterQuery(filters: EarningsFilters, page = 1) {
  const result = installmentEarningsQuerySchema.safeParse({
    year: filters.year,
    frequency: filters.frequency,
    period: filters.period,
    groupBy: filters.groupBy,
    ...(filters.batchId ? { batchId: filters.batchId } : {}),
    page,
  });

  if (!result.success) {
    return {
      params: null,
      error: result.error.issues
        .map((issue) => {
          return issue.message;
        })
        .join(" "),
    };
  }

  return {
    params: Object.fromEntries(
      Object.entries(result.data).map(([key, value]) => {
        return [key, String(value)];
      }),
    ),
    error: null,
  };
}
