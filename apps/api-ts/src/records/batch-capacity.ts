import { ConflictException } from "@nestjs/common";
import { batchCapacity } from "@freshphones/contracts";
import type { Prisma } from "../generated/prisma/client";

/** Historical memberships release their position only after replacement admission. */
export const currentBatchPositionWhere = {
  replacementCompletedAt: null,
} as const;

/** Shared authoritative occupancy for capacity writes and customer reads. */
export async function countBatchMembers(
  tx: Pick<Prisma.TransactionClient, "client">,
  batchId: string,
) {
  return tx.client.count({ where: { batchId, ...currentBatchPositionWhere } });
}

/** Called under the shared records/enrollment transaction advisory lock. */
export async function requireBatchVacancy(
  tx: Prisma.TransactionClient,
  batchId: string,
) {
  // Retained, held and completed memberships still own their original position.
  const occupied = await countBatchMembers(tx, batchId);

  const capacity = batchCapacity(occupied);

  if (capacity.full) {
    throw new ConflictException(
      "This batch already has eight real members. Choose another batch; internal placeholders are not enrollment positions.",
    );
  }

  return capacity;
}
