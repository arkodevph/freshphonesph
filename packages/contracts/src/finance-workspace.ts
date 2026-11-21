import { z } from "zod";

export const financePaymentQueues = [
  "ready",
  "waiting",
  "waiting_records",
  "waiting_manager",
  "waiting_evidence",
  "membership_closed",
  "clarification",
] as const;

export type FinancePaymentQueue = (typeof financePaymentQueues)[number];

export const financeOverviewQuerySchema = z.object({
  period: z
    .enum(["this_month", "last_month", "year_to_date"])
    .default("this_month"),
});

export type FinanceOverviewPeriod = z.infer<
  typeof financeOverviewQuerySchema
>["period"];

export interface FinanceOverview {
  queues: Record<FinancePaymentQueue, number>;
  collections: {
    from: string;
    to: string;
    amount: string;
    payments: number;
  };
  refunds: { count: number; remaining: string };
  tasks: {
    count: number;
    items: { id: string; title: string; deadline: string; status: string }[];
  };
  updatedAt: string;
}
