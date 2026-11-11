import { z } from "zod";

export const checklistQuerySchema = z
  .object({
    batchId: z.string().uuid(),
    from: z.string().date(),
    to: z.string().date(),
  })
  .strict()
  .refine(
    (value) => {
      return value.from <= value.to;
    },
    { message: "End date must follow start date.", path: ["to"] },
  );

export const evidenceRequirementSchema = z
  .object({
    batchId: z.string().uuid(),
    kind: z.enum(["RECEIPT", "STATEMENT"]),
    description: z.string().trim().min(3).max(500),
    periodStart: z.string().date(),
    periodEnd: z.string().date(),
    clientId: z.string().uuid().nullable(),
    paymentId: z.string().uuid().nullable(),
    historyId: z.string().uuid().nullable(),
    cancelled: z.boolean(),
    reason: z.string().trim().min(3).max(1000),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.periodStart > value.periodEnd) {
      context.addIssue({
        code: "custom",
        path: ["periodEnd"],
        message: "End date must follow start date.",
      });
    }

    if (
      value.kind === "RECEIPT"
        ? !value.clientId || value.historyId !== null
        : value.clientId !== null || value.paymentId !== null
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Select a member for a receipt; statements cannot link a member or payment.",
      });
    }
  });

export const evidenceRequirementUpdateSchema = z
  .object({
    version: z.number().int().min(0),
    record: evidenceRequirementSchema,
  })
  .strict();

export type EvidenceRequirementInput = z.infer<
  typeof evidenceRequirementSchema
>;

export type ChecklistQuery = z.infer<typeof checklistQuerySchema>;

export type ChecklistState =
  "MISSING" | "RECEIVED" | "RETURNED" | "COMPLETE" | "CANCELLED";

export interface SubmissionChecklist {
  complete: boolean;
  canManage: boolean;
  payments: {
    id: string;
    clientId: string;
    name: string;
    date: string;
    state: ChecklistState;
  }[];
  statements: {
    id: string;
    label: string;
    from: string;
    to: string;
    state: ChecklistState;
  }[];
  requirements: (EvidenceRequirementInput & {
    id: string;
    version: number;
    state: ChecklistState;
  })[];
  members: { id: string; name: string }[];
}
