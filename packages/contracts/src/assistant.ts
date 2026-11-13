import { z } from "zod";

export const assistantQuestionSchema = z
  .object({
    question: z.string().trim().min(1).max(2000),
    history: z
      .array(
        z
          .object({
            role: z.enum(["user", "assistant"]),
            content: z.string().trim().min(1).max(6000),
          })
          .strict(),
      )
      .max(12)
      .optional(),
    period: z.string().trim().min(1).max(120).optional(),
    reportRange: z
      .object({
        dateFrom: z.string().date(),
        dateTo: z.string().date(),
      })
      .strict()
      .refine((range) => {
        const days =
          (Date.parse(range.dateTo) - Date.parse(range.dateFrom)) / 86_400_000;

        return days >= 0 && days <= 366;
      }, "Choose an ordered reporting range of at most one year.")
      .optional(),
  })
  .strict();

export type AssistantQuestion = z.infer<typeof assistantQuestionSchema>;

export interface AssistantReply {
  mode: "knowledge-guide" | "report-summary";
  brief?: AssistantReportBrief;
  actions?: AssistantAction[];
  kind: "knowledge" | "change-request" | "out-of-scope";
  title: string;
  paragraphs: string[];
  sources: string[];
  links: { label: string; href: string }[];
  policy: {
    scope: "freshphones-only";
    providerConnected: boolean;
    canExecuteChanges: boolean;
    changesRequireConfirmation: true;
  };
}

export type AssistantReportBrief = {
  dateFrom: string;
  dateTo: string;
  generatedAt: string;
  payments: import("./index").PaymentReport;
  collections: import("./index").CollectionMetrics;
  reconciliation: import("./index").ReconciliationMetrics;
  tasks: import("./index").TaskReport;
  support: Pick<import("./index").SupportReport, "total" | "open" | "closed">;
  scheduled: import("./installment-earnings").InstallmentEarningsMetrics & {
    batches: number;
  };
};

export type AssistantStreamEvent =
  | { type: "status"; label: string }
  | { type: "delta"; text: string }
  | { type: "complete"; reply: AssistantReply }
  | { type: "error"; message: string };

export function isAssistantReportRequest(question: string) {
  return (
    /\b(summar(?:y|ize|ise)|overview|brief|snapshot|performance)\b/i.test(
      question,
    ) &&
    /\b(reports?|payments?|collections?|batches|balances?|earnings|company|business|operations|sales)\b/i.test(
      question,
    )
  );
}

export type AssistantAction = {
  id: string;
  operation: string;
  description: string;
  input: Record<string, unknown>;
  expiresAt: string;
  status: "pending" | "executing" | "succeeded" | "failed" | "cancelled";
  message?: string;
};

const storedBriefSchema = z
  .object({
    dateFrom: z.string().date(),
    dateTo: z.string().date(),
    generatedAt: z.string().datetime(),
    payments: z
      .object({
        total: z.number(),
        verifiedPayments: z.number(),
        pendingVerification: z.number(),
        needsClarification: z.number(),
        rejectedPayments: z.number(),
        verifiedAmount: z.string(),
        pendingAmount: z.string(),
      })
      .passthrough(),
    collections: z
      .object({
        clients: z.number(),
        clientsWithoutSchedule: z.number(),
        remainingBalance: z.string(),
      })
      .passthrough(),
    reconciliation: z
      .object({
        paymentsWithFlags: z.number(),
        unmatchedVerifiedPayments: z.number(),
      })
      .passthrough(),
    tasks: z
      .object({
        total: z.number(),
        late: z.number(),
        byStatus: z.record(z.number()),
      })
      .passthrough(),
    support: z.object({
      total: z.number(),
      open: z.number(),
      closed: z.number(),
    }),
    scheduled: z
      .object({ scheduledAmount: z.string(), installments: z.number() })
      .passthrough(),
  })
  .passthrough();

const storedReplySchema = z.object({
  mode: z.enum(["knowledge-guide", "report-summary"]),
  kind: z.enum(["knowledge", "change-request", "out-of-scope"]),
  title: z.string().max(500),
  paragraphs: z.array(z.string().max(60000)).max(100),
  sources: z.array(z.string().max(1000)).max(100),
  links: z
    .array(
      z.object({
        label: z.string().max(200),
        href: z
          .string()
          .max(2000)
          .regex(/^\/system(?:\/|$)/),
      }),
    )
    .max(100),
  policy: z.object({
    scope: z.literal("freshphones-only"),
    providerConnected: z.boolean(),
    canExecuteChanges: z.boolean(),
    changesRequireConfirmation: z.literal(true),
  }),
  brief: storedBriefSchema.optional(),
  actions: z
    .array(
      z.object({
        id: z.string().uuid(),
        operation: z.string().max(200),
        description: z.string().max(4000),
        input: z.record(z.unknown()),
        expiresAt: z.string().datetime(),
        status: z.enum([
          "pending",
          "executing",
          "succeeded",
          "failed",
          "cancelled",
        ]),
        message: z.string().max(4000).optional(),
      }),
    )
    .max(30)
    .optional(),
});

export const assistantStoredQuestionSchema = z
  .object({
    id: z.number().int().positive(),
    text: z.string().max(2000),
    context: z.string().max(120).nullable(),
    response: z
      .custom<AssistantReply>((value) => {
        return storedReplySchema.safeParse(value).success;
      })
      .nullable(),
    error: z.string().max(2000).nullable(),
    partial: z.string().max(60000),
    status: z.string().max(120),
  })
  .strict();

export const assistantConversationStateSchema = z
  .object({
    draft: z.string().max(2000),
    includeContext: z.boolean(),
    questions: z.array(assistantStoredQuestionSchema).max(200),
  })
  .strict()
  .refine((value) => {
    return new TextEncoder().encode(JSON.stringify(value)).length <= 500000;
  }, "Conversation is full. Start a new conversation to continue.");

export const assistantConversationWriteSchema = z
  .object({
    accountId: z.string().uuid(),
    revision: z.number().int().nonnegative(),
    state: assistantConversationStateSchema,
  })
  .strict();

export type AssistantStoredQuestion = z.infer<
  typeof assistantStoredQuestionSchema
>;

export type AssistantConversationState = z.infer<
  typeof assistantConversationStateSchema
>;

export const assistantConversationMetadataSchema = z
  .object({
    accountId: z.string().uuid(),
    revision: z.number().int().positive(),
    title: z.string().trim().min(1).max(100).optional(),
    projectId: z.string().uuid().nullable().optional(),
  })
  .strict()
  .refine((value) => {
    return value.title !== undefined || value.projectId !== undefined;
  }, "Choose a title or project.");

export const assistantProjectWriteSchema = z
  .object({
    accountId: z.string().uuid(),
    name: z.string().trim().min(1).max(100),
  })
  .strict();

export type AssistantProject = {
  id: string;
  name: string;
  revision: number;
  updatedAt: string;
};

export type AssistantConversationSummary = {
  projectId?: string | null;
  id: string;
  title: string;
  revision: number;
  updatedAt: string;
};

export type AssistantConversation = AssistantConversationSummary & {
  state: AssistantConversationState;
};
