import { ForbiddenException, NotFoundException } from "@nestjs/common";
import {
  batchCapacity,
  type PortalBatchSummary,
  type User,
} from "@freshphones/contracts";
import type { Database } from "../database";
import { countBatchMembers } from "./batch-capacity";

export async function portalBatchSummary(
  db: Database,
  user: User,
): Promise<PortalBatchSummary> {
  if (user.role !== "CUSTOMER" || !user.clientId) {
    throw new ForbiddenException("A customer membership is required.");
  }

  const membershipId = user.clientId;

  return db.$transaction(
    async (tx) => {
      const membership = await tx.client.findFirst({
        where: {
          id: membershipId,
          retentionErasedAt: null,
          member: { account: { id: user.id, active: true, role: "CUSTOMER" } },
        },
        select: {
          id: true,
          batch: { select: { id: true, code: true, status: true } },
        },
      });

      if (!membership) {
        throw new NotFoundException(
          "Membership not found. Choose one of your batches.",
        );
      }

      const occupancy = batchCapacity(
        await countBatchMembers(tx, membership.batch.id),
      );

      return {
        membershipId: membership.id,
        batchId: membership.batch.id,
        batchNumber: membership.batch.code,
        approvedMembers: occupancy.realMembers,
        capacity: occupancy.capacity,
        remaining: occupancy.remaining,
        isFull: occupancy.full,
        batchStatus: membership.batch.status,
      };
    },
    { isolationLevel: "RepeatableRead" },
  );
}
