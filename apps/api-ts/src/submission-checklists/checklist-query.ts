import { BadRequestException } from "@nestjs/common";
import {
  businessRole,
  type ChecklistQuery,
  type EvidenceRequirementInput,
  type SubmissionChecklist,
  type User,
} from "@freshphones/contracts";
import type { Prisma } from "../generated/prisma/client";
import { receiptState, statementInclude, statementState } from "./evidence";

const include = {
  payment: true,
  history: { include: statementInclude },
} as const;

const date = (value: Date) => {
  return value.toISOString().slice(0, 10);
};

const canManage = (user: User) => {
  return ["COO", "RECORDS"].includes(businessRole(user.role));
};

export async function queryChecklist(
  tx: Prisma.TransactionClient,
  current: User,
  query: ChecklistQuery,
): Promise<SubmissionChecklist> {
  const from = new Date(query.from);

  const to = new Date(query.to);

  const [payments, statements, requirements, members] = await Promise.all([
    tx.payment.findMany({
      where: {
        batchId: query.batchId,
        status: { not: "REJECTED" },
        paymentDate: { gte: from, lte: to },
      },
      include: { client: { select: { name: true } } },
      orderBy: [{ paymentDate: "asc" }, { id: "asc" }],
      take: 1001,
    }),
    tx.gcashHistory.findMany({
      where: {
        batchId: query.batchId,
        archivedAt: null,
        periodStart: { lte: to },
        periodEnd: { gte: from },
      },
      include: statementInclude,
      orderBy: { periodStart: "asc" },
      take: 1001,
    }),
    tx.evidenceRequirement.findMany({
      where: {
        batchId: query.batchId,
        periodStart: { lte: to },
        periodEnd: { gte: from },
      },
      include,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: 1001,
    }),
    tx.client.findMany({
      where: { batchId: query.batchId, retentionErasedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
      take: 1001,
    }),
  ]);

  if (
    [payments, statements, requirements, members].some((rows) => {
      return rows.length > 1000;
    })
  ) {
    throw new BadRequestException(
      "Choose a smaller reporting period; this checklist exceeds 1,000 items.",
    );
  }

  const result = {
    canManage: canManage(current),
    payments: payments.map((payment) => {
      return {
        id: payment.id,
        clientId: payment.clientId,
        name: payment.client.name,
        date: date(payment.paymentDate),
        state: receiptState(payment),
      };
    }),
    statements: statements.map((history) => {
      return {
        id: history.id,
        label: history.submissions[0]?.note || "GCash statement",
        from: date(history.periodStart),
        to: date(history.periodEnd),
        state: statementState(history),
      };
    }),
    requirements: requirements.map((row) => {
      return {
        id: row.id,
        batchId: row.batchId,
        kind: row.kind as EvidenceRequirementInput["kind"],
        description: row.description,
        periodStart: date(row.periodStart),
        periodEnd: date(row.periodEnd),
        clientId: row.clientId,
        paymentId: row.paymentId,
        historyId: row.historyId,
        cancelled: row.cancelled,
        reason: row.reason,
        version: row.version,
        state: row.cancelled
          ? ("CANCELLED" as const)
          : row.kind === "RECEIPT"
            ? receiptState(
                row.payment &&
                  row.payment.batchId === row.batchId &&
                  row.payment.clientId === row.clientId &&
                  row.payment.paymentDate >= row.periodStart &&
                  row.payment.paymentDate <= row.periodEnd
                  ? row.payment
                  : null,
              )
            : statementState(row.history),
      };
    }),
    members,
  };

  return {
    ...result,
    complete: [
      ...result.payments,
      ...result.statements,
      ...result.requirements,
    ].every((row) => {
      return ["COMPLETE", "CANCELLED"].includes(row.state);
    }),
  };
}
