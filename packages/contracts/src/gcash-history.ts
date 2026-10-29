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
};
