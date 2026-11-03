import { ConflictException, ForbiddenException } from "@nestjs/common";
import { businessRole, type User } from "@freshphones/contracts";
import { Prisma } from "../generated/prisma/client";
import { safeUser } from "../auth/auth.service";
import { batchScope } from "../records/scope";
import { requireBatchVacancy } from "../records/batch-capacity";
import { replacementItems, withdrawalFinancials } from "./withdrawal-tools";
import { withdrawalEvent, withdrawalNotify } from "./withdrawals.service";

export type ReplacementApplicant = {
  name: string;
  email: string;
  phone: string;
  memberId?: string;
  withdrawalId: string;
  policyVersion: number;
  fingerprint: string;
};

/** Called only from assigned enrollment review while holding shared lock 740015. */
export async function completeReplacement(
  tx: Prisma.TransactionClient,
  current: User,
  request: { id: string; batchId: string; submittedById: string },
  applicant: ReplacementApplicant,
  identity: { name: string; email: string; phone: string },
) {
  if (!["COO", "BATCH_MANAGER"].includes(businessRole(current.role))) {
    throw new ForbiddenException(
      "Only the assigned Manager or COO may admit a replacement.",
    );
  }

  const row = await tx.withdrawalRequest.findUnique({
    where: { id: applicant.withdrawalId },
    include: { client: { include: { batch: true } } },
  });

  if (
    !row ||
    row.status !== "APPROVED" ||
    row.client.replacementCompletedAt ||
    row.client.batchId !== request.batchId ||
    row.replacementEnrollmentId !== request.id ||
    row.policyVersion !== applicant.policyVersion
  ) {
    throw new ConflictException(
      "This replacement approval no longer matches the approved withdrawal terms. Ask the Agent to submit a new request.",
    );
  }

  if (
    row.requesterId === current.id ||
    row.agentReviewedById === current.id ||
    request.submittedById === current.id
  ) {
    throw new ForbiddenException(
      "A different authorized reviewer must approve the replacement.",
    );
  }

  const submitter = await tx.user.findUnique({
    where: { id: request.submittedById },
  });

  if (
    !submitter?.active ||
    submitter.role !== "AGENT" ||
    !(await tx.batch.findFirst({
      where: { id: request.batchId, ...batchScope(safeUser(submitter)) },
      select: { id: true },
    }))
  ) {
    throw new ConflictException(
      "The proposing Agent no longer has access to this batch. Submit a new request through its current Agent.",
    );
  }

  if (
    !["PLANNED", "ACTIVE"].includes(row.client.batch.status) ||
    row.client.releaseStatus === "RELEASED" ||
    row.client.retentionErasedAt
  ) {
    throw new ConflictException(
      "The source membership or batch is no longer eligible for replacement.",
    );
  }

  const financial = await withdrawalFinancials(tx, row.clientId);

  if (
    financial.pendingClaims ||
    financial.fingerprint !== row.policyFingerprint ||
    financial.fingerprint !== applicant.fingerprint
  ) {
    throw new ConflictException(
      "The source financial record changed. The COO must review and save the replacement terms again.",
    );
  }

  const items = replacementItems(
    row.replacementMode,
    row.restartPlan,
    financial,
  );

  if (!items.length) {
    throw new ConflictException(
      "The replacement has no agreed installment plan.",
    );
  }

  const now = new Date();

  await tx.client.update({
    where: { id: row.clientId },
    data: { replacementCompletedAt: now, version: { increment: 1 } },
  });

  await requireBatchVacancy(tx, row.client.batchId);

  const total = items
    .reduce((sum, x) => {
      return sum.add(x.expectedAmount);
    }, new Prisma.Decimal(0))
    .toFixed(2);

  const plan =
    row.replacementMode === "RESTART"
      ? {
          ...(row.restartPlan as Record<string, unknown>),
          endDate: items.at(-1)!.dueDate,
        }
      : {
          contractPrice: total,
          installmentCount: items.length,
          cadence:
            (row.client.membershipPlan as Record<string, unknown> | null)
              ?.cadence ??
            row.client.batch.cadence ??
            "MONTHLY",
          startDate: items[0].dueDate,
          firstDueDate: items[0].dueDate,
          endDate: items.at(-1)!.dueDate,
          monthEnd:
            (row.client.membershipPlan as Record<string, unknown> | null)
              ?.monthEnd ?? row.client.batch.monthEnd,
        };

  const replacement = await tx.client.create({
    data: {
      ...identity,
      ...(applicant.memberId ? { memberId: applicant.memberId } : {}),
      batchId: row.client.batchId,
      status: "ACTIVE",
      releaseStatus: "NOT_READY",
      joinedAt: now,
      unitModel: row.client.unitModel || row.client.batch.model,
      membershipPlan: plan as Prisma.InputJsonValue,
      schedule: {
        create: items.map((x) => {
          return {
            sequenceNo: x.sequenceNo,
            dueDate: new Date(x.dueDate),
            expectedAmount: x.expectedAmount,
          };
        }),
      },
    },
    include: { schedule: { orderBy: { sequenceNo: "asc" } } },
  });

  for (let index = 0; index < financial.unpaid.length; index++) {
    const source = financial.unpaid[index];

    await tx.scheduleItem.update({
      where: { id: source.id },
      data: { releasedAmount: { increment: source.expectedAmount } },
    });

    await tx.withdrawalScheduleRelease.create({
      data: {
        withdrawalId: row.id,
        scheduleItemId: source.id,
        destinationScheduleItemId:
          row.replacementMode === "CONTINUE_UNPAID"
            ? replacement.schedule[index].id
            : null,
        amount: source.expectedAmount,
        originalExpectedAmount: source.originalExpectedAmount,
        paidAtCutover: source.paidAtCutover,
      },
    });
  }

  await tx.withdrawalRequest.update({
    where: { id: row.id },
    data: {
      status: "REPLACED",
      replacementClientId: replacement.id,
      replacedAt: now,
      version: { increment: 1 },
    },
  });

  await withdrawalEvent(
    tx,
    current,
    row.id,
    "replaced",
    "The replacement joined through approved enrollment. The departing membership's unpaid obligations were released; historical receipts remain unchanged.",
    false,
    { mode: row.replacementMode, released: financial.remaining },
  );

  await tx.auditEntry.create({
    data: {
      actorId: current.id,
      action: "client.replacement_enrolled",
      entity: "client",
      recordId: replacement.id,
      after: {
        sourceClientId: row.clientId,
        withdrawalId: row.id,
        plan,
        schedule: items,
      },
    },
  });

  await tx.notification.updateMany({
    where: {
      kind: "installment",
      emailStatus: { in: ["PENDING", "SENDING"] },
      dedupeKey: { startsWith: "installment:" },
      OR: financial.unpaid.map((x) => {
        return { dedupeKey: { startsWith: `installment:${x.id}:` } };
      }),
    },
    data: { emailStatus: "SKIPPED", emailAttemptId: null },
  });

  await tx.changeEvent.createMany({
    data: [
      { entity: "client", recordId: row.clientId },
      { entity: "client", recordId: replacement.id },
      { entity: "batch", recordId: row.client.batchId },
    ],
  });

  await withdrawalNotify(tx, row.id);

  return replacement.id;
}
