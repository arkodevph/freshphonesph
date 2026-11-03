import { createHash } from "node:crypto";
import { ConflictException } from "@nestjs/common";
import {
  previewInstallments,
  type WithdrawalPolicyInput,
} from "@freshphones/contracts";
import { Prisma } from "../generated/prisma/client";
import { verifiedTotals } from "../finance/ledger";

export async function withdrawalFinancials(
  tx: Prisma.TransactionClient,
  clientId: string,
) {
  const schedule = await tx.scheduleItem.findMany({
    where: { clientId },
    orderBy: { sequenceNo: "asc" },
  });

  const verified = await verifiedTotals(tx, { clientId });

  const pendingClaims = await tx.payment.count({
    where: { clientId, status: { in: ["PENDING", "NEEDS_CLARIFICATION"] } },
  });

  let available = verified.effective;

  const unpaid = schedule
    .map((item) => {
      const collectible = item.expectedAmount.sub(item.releasedAmount);

      const applied = Prisma.Decimal.min(
        Prisma.Decimal.max(available, 0),
        collectible,
      );

      available = available.sub(applied);

      return {
        id: item.id,
        sequenceNo: item.sequenceNo,
        dueDate: item.dueDate.toISOString().slice(0, 10),
        expectedAmount: collectible.sub(applied).toFixed(2),
        originalExpectedAmount: item.expectedAmount.toFixed(2),
        paidAtCutover: applied.toFixed(2),
      };
    })
    .filter((item) => {
      return Number(item.expectedAmount) > 0;
    });

  const originalDue = schedule.reduce((sum, item) => {
    return sum.add(item.expectedAmount);
  }, new Prisma.Decimal(0));

  const releasedDue = schedule.reduce((sum, item) => {
    return sum.add(item.releasedAmount);
  }, new Prisma.Decimal(0));

  const totalDue = originalDue.sub(releasedDue);

  const fingerprint = createHash("sha256")
    .update(
      JSON.stringify({
        schedule: schedule.map((item) => {
          return [
            item.id,
            item.sequenceNo,
            item.dueDate.toISOString(),
            item.expectedAmount.toFixed(2),
            item.releasedAmount.toFixed(2),
          ];
        }),
        verified: verified.effective.toFixed(2),
        pendingClaims,
      }),
    )
    .digest("hex");

  return {
    originalDue: originalDue.toFixed(2),
    releasedDue: releasedDue.toFixed(2),
    totalDue: totalDue.toFixed(2),
    verifiedPaid: verified.effective.toFixed(2),
    remaining: Prisma.Decimal.max(totalDue.sub(verified.effective), 0).toFixed(
      2,
    ),
    unpaid,
    pendingClaims,
    fingerprint,
  };
}

export function restartPolicy(input: WithdrawalPolicyInput) {
  if (input.mode !== "RESTART") {
    return null;
  }

  return {
    contractPrice: input.contractPrice!,
    installmentCount: input.installmentCount!,
    cadence: input.cadence!,
    startDate: input.startDate!,
    firstDueDate: input.firstDueDate!,
    monthEnd: input.monthEnd ?? false,
  };
}

export function replacementItems(
  mode: string | null,
  plan: unknown,
  financial: Awaited<ReturnType<typeof withdrawalFinancials>>,
) {
  if (mode === "CONTINUE_UNPAID") {
    return financial.unpaid.map((item, index) => {
      return {
        sequenceNo: index + 1,
        dueDate: item.dueDate,
        expectedAmount: item.expectedAmount,
      };
    });
  }

  if (mode === "RESTART" && plan) {
    return previewInstallments(
      plan as Parameters<typeof previewInstallments>[0],
    );
  }

  return [];
}

export async function requireOpenMembership(
  tx: Prisma.TransactionClient,
  clientId: string,
) {
  const client = await tx.client.findUnique({
    where: { id: clientId },
    select: { replacementCompletedAt: true },
  });

  if (client?.replacementCompletedAt) {
    throw new ConflictException(
      "This membership was handed over to a replacement. Its payment history is read-only; use the replacement's own membership for new claims.",
    );
  }
}
