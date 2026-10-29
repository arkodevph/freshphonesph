import { z } from "zod";

export const earningsFrequencies = [
  "MONTHLY",
  "TWICE_MONTHLY",
  "EVERY_TWO_MONTHS",
] as const;

export type EarningsFrequency = (typeof earningsFrequencies)[number];

export const earningsFrequencyLabels: Record<EarningsFrequency, string> = {
  MONTHLY: "Monthly",
  TWICE_MONTHLY: "Bi-monthly",
  EVERY_TWO_MONTHS: "Every two months",
};

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function earningsPeriodCount(frequency: EarningsFrequency) {
  return frequency === "MONTHLY" ? 12 : frequency === "TWICE_MONTHLY" ? 24 : 6;
}

export function earningsPeriods(year: number, frequency: EarningsFrequency) {
  if (!Number.isInteger(year) || year < 1 || year > 9999) {
    throw new RangeError("Choose a year from 1 to 9999.");
  }

  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);

  const monthDays = [
    31,
    leap ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];

  const date = (month: number, day: number) => {
    return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };

  return Array.from({ length: earningsPeriodCount(frequency) }, (_, index) => {
    const startMonth =
      frequency === "MONTHLY"
        ? index + 1
        : frequency === "TWICE_MONTHLY"
          ? Math.floor(index / 2) + 1
          : index * 2 + 1;

    const endMonth =
      frequency === "EVERY_TWO_MONTHS" ? startMonth + 1 : startMonth;

    const startDay = frequency === "TWICE_MONTHLY" && index % 2 === 1 ? 16 : 1;

    const endDay =
      frequency === "TWICE_MONTHLY" && index % 2 === 0
        ? 15
        : monthDays[endMonth - 1];

    const label =
      frequency === "MONTHLY"
        ? months[startMonth - 1]
        : frequency === "EVERY_TWO_MONTHS"
          ? `${months[startMonth - 1]}–${months[endMonth - 1]}`
          : `${months[startMonth - 1]} ${startDay}–${endDay}`;

    return {
      period: index + 1,
      dateFrom: date(startMonth, startDay),
      dateTo: date(endMonth, endDay),
      label,
    };
  });
}

const fields = {
  year: z.coerce.number().int().min(1).max(9999),
  frequency: z.enum(earningsFrequencies).default("MONTHLY"),
  period: z.coerce.number().int().min(1).max(24).default(1),
  groupBy: z.enum(["batches", "members"]).default("batches"),
  batchId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
};

function validPeriod(value: { frequency: EarningsFrequency; period: number }) {
  return value.period <= earningsPeriodCount(value.frequency);
}

const periodError = {
  path: ["period"],
  message: "Choose a valid period for this frequency.",
};

export const installmentEarningsQuerySchema = z
  .object(fields)
  .strict()
  .refine(validPeriod, periodError);

export const installmentEarningsExportSchema = z
  .object({
    ...fields,
    format: z.enum(["csv", "xlsx"]).default("csv"),
  })
  .strict()
  .refine(validPeriod, periodError);

export type InstallmentEarningsQuery = z.infer<
  typeof installmentEarningsQuerySchema
>;

export interface InstallmentEarningsMetrics {
  scheduledAmount: string;
  installments: number;
  members: number;
  membersWithoutSchedule: number;
}

export interface InstallmentEarningsRow extends InstallmentEarningsMetrics {
  id: string;
  batchId: string;
  batchCode: string;
  memberName: string | null;
}

export interface InstallmentEarningsReport {
  basis: "issued_schedule_due_dates";
  dateFrom: string;
  dateTo: string;
  year: number;
  frequency: EarningsFrequency;
  period: number;
  groupBy: "batches" | "members";
  totals: InstallmentEarningsMetrics & { batches: number };
  items: InstallmentEarningsRow[];
  total: number;
  page: number;
  pageSize: number;
}
