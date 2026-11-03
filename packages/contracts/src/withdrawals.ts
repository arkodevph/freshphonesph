import { z } from "zod";
import { previewInstallments } from "./installment-schedule";

export const withdrawalStatuses = [
  "AWAITING_AGENT",
  "AWAITING_COO",
  "CHANGES_REQUESTED",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
  "REPLACED",
] as const;

export type WithdrawalStatus = (typeof withdrawalStatuses)[number];

export type WithdrawalRefundStatus = "PENDING" | "APPROVED" | "DECLINED";

export type WithdrawalReplacementMode = "CONTINUE_UNPAID" | "RESTART";

const note = z.string().trim().min(3).max(2000);

const money = z
  .string()
  .regex(/^(0|[1-9]\d{0,9})\.\d{2}$/)
  .refine((v) => {
    return Number(v) > 0;
  }, "Enter a positive amount with two decimal places.");

const version = z.number().int().positive();

export const withdrawalCreateSchema = z
  .object({
    submissionId: z.string().uuid(),
    clientId: z.string().uuid(),
    reason: z.string().trim().min(10).max(5000),
  })
  .strict();

export const withdrawalResubmitSchema = z
  .object({
    version,
    reason: z.string().trim().min(10).max(5000),
  })
  .strict();

export const withdrawalNoteSchema = z.object({ version, note }).strict();

export const withdrawalDecisionSchema = z
  .object({
    version,
    decision: z.enum(["APPROVED", "REJECTED", "CHANGES_REQUESTED"]),
    note,
  })
  .strict();

export const withdrawalRefundSchema = z
  .object({
    version,
    decision: z.enum(["PENDING", "APPROVED", "DECLINED"]),
    amount: money.nullable(),
    targetDate: z.string().date().nullable(),
    note,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.decision === "APPROVED" && !value.amount) {
      context.addIssue({
        code: "custom",
        path: ["amount"],
        message: "Enter the approved refund amount.",
      });
    }

    if (
      value.decision !== "APPROVED" &&
      (value.amount !== null || value.targetDate !== null)
    ) {
      context.addIssue({
        code: "custom",
        path: ["amount"],
        message: "Only an approved refund can have an amount or payment date.",
      });
    }
  });

export const withdrawalPolicySchema = z
  .object({
    version,
    mode: z.enum(["CONTINUE_UNPAID", "RESTART"]),
    consultationNote: note,
    note,
    contractPrice: money.optional(),
    installmentCount: z.number().int().min(1).max(600).optional(),
    cadence: z.enum(["WEEKLY", "SEMIMONTHLY", "MONTHLY"]).optional(),
    startDate: z.string().date().optional(),
    firstDueDate: z.string().date().optional(),
    monthEnd: z.boolean().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.mode === "RESTART") {
      if (
        !value.contractPrice ||
        !value.installmentCount ||
        !value.cadence ||
        !value.startDate ||
        !value.firstDueDate
      ) {
        context.addIssue({
          code: "custom",
          path: ["contractPrice"],
          message: "Set the full new plan, including its first due date.",
        });

        return;
      }

      try {
        previewInstallments({
          contractPrice: value.contractPrice,
          installmentCount: value.installmentCount,
          cadence: value.cadence,
          startDate: value.startDate,
          firstDueDate: value.firstDueDate,
          monthEnd: value.monthEnd ?? false,
        });
      } catch (error) {
        context.addIssue({
          code: "custom",
          path: ["firstDueDate"],
          message:
            error instanceof Error
              ? error.message
              : "Review the new plan dates.",
        });
      }
    }
  });

export const withdrawalReplacementSchema = z
  .object({
    version,
    submissionId: z.string().uuid(),
    memberId: z.string().uuid().optional(),
    name: z.string().trim().min(2).max(100),
    email: z.union([z.string().email(), z.literal("")]),
    phone: z
      .string()
      .trim()
      .regex(/^$|^[+0-9 ()-]{7,25}$/),
  })
  .strict()
  .refine(
    (value) => {
      return Boolean(value.memberId) || Boolean(value.phone);
    },
    { path: ["phone"], message: "Enter a contact number for a new member." },
  );

export const withdrawalPayoutSchema = z
  .object({
    version,
    requestId: z.string().uuid(),
    amount: money,
    paymentDate: z.string().date(),
    method: z.string().trim().min(2).max(40),
    reference: z.string().trim().min(3).max(120),
    note,
  })
  .strict();

export const withdrawalQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(100000).default(1),
    status: z.enum(withdrawalStatuses).optional(),
    clientId: z.string().uuid().optional(),
    q: z.string().trim().max(100).default(""),
  })
  .strict();

export type WithdrawalCreateInput = z.infer<typeof withdrawalCreateSchema>;

export type WithdrawalResubmitInput = z.infer<typeof withdrawalResubmitSchema>;

export type WithdrawalNoteInput = z.infer<typeof withdrawalNoteSchema>;

export type WithdrawalDecisionInput = z.infer<typeof withdrawalDecisionSchema>;

export type WithdrawalRefundInput = z.infer<typeof withdrawalRefundSchema>;

export type WithdrawalPolicyInput = z.infer<typeof withdrawalPolicySchema>;

export type WithdrawalReplacementInput = z.infer<
  typeof withdrawalReplacementSchema
>;

export type WithdrawalPayoutInput = z.infer<typeof withdrawalPayoutSchema>;

export type WithdrawalQuery = z.infer<typeof withdrawalQuerySchema>;

export interface WithdrawalActions {
  forward: boolean;
  decide: boolean;
  refund: boolean;
  policy: boolean;
  proposeReplacement: boolean;
  payout: boolean;
  resubmit: boolean;
  cancel: boolean;
}

export interface WithdrawalEvent {
  id: string;
  action: string;
  note: string;
  actor: { id: string; name: string };
  createdAt: string;
}

export interface WithdrawalPayout {
  id: string;
  amount: string;
  paymentDate: string;
  method: string;
  reference: string;
  note: string;
  recordedBy: { id: string; name: string };
  createdAt: string;
}

export interface WithdrawalCase {
  id: string;
  clientId: string;
  memberName: string;
  batch: { id: string; code: string; model: string };
  reason: string;
  status: WithdrawalStatus;
  version: number;
  agentNote: string | null;
  decisionNote: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  decidedAt: string | null;
  replacedAt: string | null;
  replacementClientId: string | null;
  replacementEnrollmentId: string | null;
  replacementMode: WithdrawalReplacementMode | null;
  consultationNote: string | null;
  replacementNote: string | null;
  restartPlan: {
    contractPrice: string;
    installmentCount: number;
    cadence: "WEEKLY" | "SEMIMONTHLY" | "MONTHLY";
    startDate: string;
    firstDueDate: string;
    monthEnd: boolean;
  } | null;
  refundStatus: WithdrawalRefundStatus;
  refundAmount: string | null;
  refundTargetDate: string | null;
  refundNote: string | null;
  refundPaid: string;
  refundRemaining: string | null;
  duesContinue: boolean;
  financial: {
    originalDue: string;
    releasedDue: string;
    totalDue: string;
    verifiedPaid: string;
    remaining: string;
  };
  actions: WithdrawalActions;
  events: WithdrawalEvent[];
  payouts: WithdrawalPayout[];
}

export interface WithdrawalPage {
  items: WithdrawalCase[];
  total: number;
  page: number;
  pageSize: number;
}

export interface WithdrawalEligibility {
  clientId: string;
  memberName: string;
  batchCode: string;
  eligible: boolean;
  reason: string | null;
  activeRequestId: string | null;
}

export interface WithdrawalReplacementPreview {
  version: number;
  mode: WithdrawalReplacementMode | null;
  totalDue: string;
  items: { sequenceNo: number; dueDate: string; expectedAmount: string }[];
  verifiedPaid: string;
  pendingClaims: number;
  needsPolicyRefresh: boolean;
  blockedReason: string | null;
}
