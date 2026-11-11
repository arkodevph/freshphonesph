import { z } from "zod";

export const monitorSourceSchema = z.enum(["PAYMENT", "STATEMENT"]);

export type MonitorSource = z.infer<typeof monitorSourceSchema>;

export const monitorStageSchema = z.enum([
  "HANDLER",
  "RECORDS",
  "MANAGER",
  "FINANCE",
  "COMPLETE",
]);

export const monitorKinds = [
  "all",
  "missing_receipt",
  "incomplete",
  "overdue",
  "returned",
  "follow_up",
] as const;

export type MonitorKind = (typeof monitorKinds)[number];

export const monitorQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(10000).default(1),
    q: z.string().trim().max(100).default(""),
    kind: z.enum(monitorKinds).default("all"),
    stage: monitorStageSchema.optional(),
    batchId: z.string().uuid().optional(),
    staffId: z.string().uuid().optional(),
    minAgeHours: z.coerce.number().int().min(0).max(87600).default(0),
    view: z.enum(["ACTIVE", "RESOLVED"]).default("ACTIVE"),
  })
  .strict();

export type MonitorQuery = z.infer<typeof monitorQuerySchema>;

export const monitorFollowUpSchema = z
  .object({
    version: z.number().int().min(0),
    sourceVersion: z.number().int().positive(),
    status: z.enum(["OPEN", "RESOLVED"]),
    note: z.string().trim().min(2).max(1000),
    dueAt: z.string().datetime({ offset: true }).nullable(),
  })
  .strict();

export type MonitorFollowUpInput = z.infer<typeof monitorFollowUpSchema>;

export const monitorPolicySchema = z
  .object({
    version: z.number().int().min(0),
    reviewDueHours: z.number().int().min(1).max(8760),
  })
  .strict();

export interface MonitorItem {
  id: string;
  source: MonitorSource;
  sourceVersion: number;
  batchId: string;
  batchCode: string;
  stage: z.infer<typeof monitorStageSchema>;
  status: string;
  waitingSince: string;
  responsibleId: string | null;
  responsibleName: string;
  missingReceipt: boolean;
  incomplete: boolean;
  returned: boolean;
  overdue: boolean;
  href: string | null;
  followUp: {
    version: number;
    status: "OPEN" | "RESOLVED";
    dueAt: string | null;
    note: string;
  } | null;
}

export interface MonitorHistoryEntry {
  id: string;
  actor: { id: string; name: string };
  note: string;
  status: string;
  dueAt: string | null;
  createdAt: string;
}

export interface MonitorDetail {
  item: MonitorItem;
  history: MonitorHistoryEntry[];
  historyPage: number;
  historyHasNext: boolean;
}

export interface MonitorPage {
  items: MonitorItem[];
  total: number;
  page: number;
  pageSize: number;
  counts: Record<MonitorKind, number>;
  policy: { reviewDueHours: number; version: number };
  batches: { id: string; code: string }[];
  staff: { id: string; name: string }[];
  asOf: string;
}
