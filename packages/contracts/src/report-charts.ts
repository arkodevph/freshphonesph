import { z } from "zod";

export const executiveChartQuerySchema = z
  .object({
    months: z.coerce
      .number()
      .pipe(z.union([z.literal(3), z.literal(6), z.literal(12)]))
      .default(6),
  })
  .strict();

export type ChartMonths = z.infer<typeof executiveChartQuerySchema>["months"];

export type MonthlyCollectionPoint = {
  month: string;
  verifiedAmount: string;
  pendingAmount: string;
  verifiedPayments: number;
  pendingPayments: number;
  clarificationPayments: number;
  rejectedPayments: number;
};

export type ExecutiveChartData = {
  dateFrom: string;
  dateTo: string;
  months: MonthlyCollectionPoint[];
  verifiedAmount: string;
  pendingAmount: string;
  paymentCounts: {
    verified: number;
    pending: number;
    clarification: number;
    rejected: number;
  };
  batches: {
    total: number;
    items: { code: string; remainingBalance: string }[];
  };
};
