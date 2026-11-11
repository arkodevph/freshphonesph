import { ConflictException } from "@nestjs/common";
import type { ChecklistState } from "@freshphones/contracts";
import type { Prisma } from "../generated/prisma/client";

export function receiptState(
  payment: { proofFileId: string | null; status: string } | null,
): ChecklistState {
  if (!payment || payment.status === "REJECTED" || !payment.proofFileId) {
    return "MISSING";
  }

  return payment.status === "NEEDS_CLARIFICATION" ? "RETURNED" : "COMPLETE";
}

export const statementInclude = {
  submissions: {
    orderBy: { revision: "desc" as const },
    take: 1,
    include: { reviewedBy: { select: { active: true, role: true } } },
  },
} as const;

type Statement = Prisma.GcashHistoryGetPayload<{
  include: typeof statementInclude;
}>;

export function statementState(history: Statement | null): ChecklistState {
  if (!history || history.archivedAt) {
    return "MISSING";
  }

  if (history.status === "NEEDS_CLARIFICATION") {
    return "RETURNED";
  }

  const submission = history.submissions[0];

  return history.status === "REVIEWED" &&
    submission?.revision === history.revision &&
    submission.status === "REVIEWED" &&
    submission.reviewedBy?.active &&
    submission.reviewedBy.role === "RECORDS" &&
    submission.reviewedById !== submission.uploadedById
    ? "COMPLETE"
    : "RECEIVED";
}

export async function submissionReady(
  tx: Prisma.TransactionClient,
  batchId: string,
  date: Date,
) {
  const [result] = await tx.$queryRaw<{ ready: boolean }[]>`
    SELECT NOT EXISTS (SELECT 1 FROM submission_evidence_blockers(${batchId}::uuid, ${date}::date)) AS ready`;

  return result.ready;
}

export async function requireCompleteSubmission(
  tx: Prisma.TransactionClient,
  batchId: string,
  date: Date,
) {
  if (!(await submissionReady(tx, batchId, date))) {
    throw new ConflictException(
      "The submission checklist has missing or returned evidence. Complete the required receipts and Records-reviewed statements before approval or verification.",
    );
  }
}
