import { z } from "zod";

export const gcashHistoryStatuses = [
  "SUBMITTED",
  "REVIEWED",
  "NEEDS_CLARIFICATION",
] as const;

export const gcashHistoryUploadSchema = z
  .object({
    batchId: z.string().uuid(),
    periodStart: z.string().date(),
    periodEnd: z.string().date(),
    expectedVersion: z.coerce.number().int().min(0),
    note: z.string().trim().max(1000).default(""),
    password: z.string().max(128).optional(),
  })
  .strict()
  .refine(
    (value) => {
      return value.periodEnd >= value.periodStart;
    },
    {
      path: ["periodEnd"],
      message: "End date must be on or after start date.",
    },
  );

export const gcashHistoryReviewSchema = z
  .object({
    version: z.number().int().positive(),
    status: z.enum(["REVIEWED", "NEEDS_CLARIFICATION"]),
    note: z.string().trim().min(1, "Add a review note.").max(2000),
  })
  .strict();

export const gcashHistoryQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(100000).default(1),
    status: z.enum(gcashHistoryStatuses).optional(),
    batchId: z.string().uuid().optional(),
    q: z.string().trim().max(100).default(""),
    archived: z.enum(["active", "archived"]).default("active"),
  })
  .strict();

export type GcashHistoryUpload = z.infer<typeof gcashHistoryUploadSchema>;

export type GcashHistoryReview = z.infer<typeof gcashHistoryReviewSchema>;

export type GcashHistoryQuery = z.infer<typeof gcashHistoryQuerySchema>;

export type GcashHistoryStatus = (typeof gcashHistoryStatuses)[number];

export interface GcashSubmission {
  reading?: GcashReadingSummary | null;
  id: string;
  revision: number;
  status: GcashHistoryStatus;
  fileName: string;
  size: number;
  note: string;
  reviewNote: string;
  uploadedBy: { id: string; name: string };
  submittedAt: string;
  reviewedBy: { id: string; name: string } | null;
  reviewedAt: string | null;
}

export interface GcashHistory {
  id: string;
  batch: { id: string; code: string };
  periodStart: string;
  periodEnd: string;
  status: GcashHistoryStatus;
  version: number;
  revision: number;
  current: GcashSubmission;
  archivedAt: string | null;
  archiveReason: string;
  archivedBy: { id: string; name: string } | null;
}

const extractedMoney = z.string().regex(/^(0|[1-9]\d{0,11})\.\d{2}$/);

export const gcashReadingSchema = z
  .object({
    version: z.literal(1),
    status: z.enum(["PARSED", "PARTIAL", "UNSUPPORTED"]),
    method: z.enum(["TEXT", "OCR", "MIXED"]),
    pages: z.number().int().min(1).max(20),
    transactionCount: z.number().int().min(0).max(1000),
    rows: z
      .array(
        z
          .object({
            page: z.number().int().min(1).max(20),
            date: z.string().max(32),
            time: z.string().max(20),
            description: z.string().max(1500),
            reference: z.string().max(100),
            debit: extractedMoney.nullable(),
            credit: extractedMoney.nullable(),
            balance: extractedMoney.nullable(),
            warnings: z.array(z.string().max(300)).max(10),
          })
          .strict(),
      )
      .max(1000),
    openingBalance: extractedMoney.nullable(),
    closingBalance: extractedMoney.nullable(),
    totalDebit: extractedMoney.nullable(),
    totalCredit: extractedMoney.nullable(),
    calculatedDebit: extractedMoney,
    calculatedCredit: extractedMoney,
    checks: z
      .object({
        debitTotalMatches: z.boolean().nullable(),
        creditTotalMatches: z.boolean().nullable(),
        runningBalancesMatch: z.boolean().nullable(),
        closingBalanceMatches: z.boolean().nullable(),
      })
      .strict(),
    warnings: z.array(z.string().max(300)).max(50),
  })
  .strict()
  .refine((value) => {
    return value.transactionCount === value.rows.length;
  });

export type GcashReading = z.infer<typeof gcashReadingSchema>;

export type GcashReadingSummary = Pick<
  GcashReading,
  "status" | "method" | "pages" | "transactionCount"
> & { warningCount: number };

export type GcashReadingPage = Omit<GcashReading, "rows"> & {
  items: GcashReading["rows"];
  page: number;
  pageSize: number;
  total: number;
  correctionVersion: number;
  historyVersion: number;
  editable: boolean;
};

export const gcashCorrectionSchema = z
  .object({
    version: z.number().int().positive(),
    correctionVersion: z.number().int().min(0),
    rowIndex: z.number().int().min(0).max(999),
    reason: z.string().trim().min(1, "Explain the correction.").max(1000),
    row: z
      .object({
        date: z.string().date(),
        time: z
          .string()
          .regex(
            /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$|^$/,
            "Use 24-hour time, for example 14:30.",
          ),
        description: z.string().trim().min(1).max(1500),
        reference: z.string().trim().max(100),
        debit: extractedMoney.nullable(),
        credit: extractedMoney.nullable(),
        balance: extractedMoney.nullable(),
      })
      .strict()
      .refine(
        (row) => {
          return !(
            row.debit &&
            row.credit &&
            row.debit !== "0.00" &&
            row.credit !== "0.00"
          );
        },
        { message: "Enter an amount in either debit or credit, not both." },
      ),
  })
  .strict();

export const gcashArchiveSchema = z
  .object({
    version: z.number().int().positive(),
    reason: z.string().trim().min(1, "Add a reason.").max(1000),
    archived: z.boolean(),
  })
  .strict();

export type GcashCorrection = z.infer<typeof gcashCorrectionSchema>;

export type GcashArchive = z.infer<typeof gcashArchiveSchema>;

export interface GcashCorrectionEntry {
  id: string;
  version: number;
  rowIndex: number;
  reason: string;
  before: GcashReading["rows"][number];
  after: GcashReading["rows"][number];
  editor: { id: string; name: string };
  createdAt: string;
}

export interface GcashActivityEntry {
  id: string;
  action: string;
  actor: { id: string; name: string };
  createdAt: string;
  revision: number | null;
  reason: string;
  previousReview: {
    note: string;
    reviewer: string;
    reviewedAt: string | null;
  } | null;
}

export function gcashTimeForEdit(value: string) {
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i.exec(
    value.trim(),
  );

  if (!match) {
    return value;
  }

  let hour = Number(match[1]);

  if (match[4]) {
    if (hour < 1 || hour > 12) {
      return value;
    }

    hour = (hour % 12) + (match[4].toUpperCase() === "PM" ? 12 : 0);
  }

  return `${String(hour).padStart(2, "0")}:${match[2]}${match[3] ? `:${match[3]}` : ""}`;
}
