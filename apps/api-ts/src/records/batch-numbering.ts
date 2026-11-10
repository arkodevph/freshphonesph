import { BadRequestException, ConflictException } from "@nestjs/common";
import type { Prisma } from "../generated/prisma/client";

// Called inside RecordsService.write's transaction and shared advisory lock.
export async function allocateBatchNumber(
  tx: Prisma.TransactionClient,
  agentId: string,
) {
  const agent = await tx.agent.findUnique({ where: { id: agentId } });

  if (!agent?.active) {
    throw new BadRequestException(
      "Choose an active agent to number this batch.",
    );
  }

  const prefix = agent.code.toUpperCase();

  const [existing] = await tx.$queryRaw<{ maximum: string }[]>`
    SELECT COALESCE(MAX(substring(code from ${prefix.length + 2}::integer)::numeric), 0)::text AS maximum
    FROM "Batch"
    WHERE upper(code) LIKE ${`${prefix}-%`}
      AND substring(code from ${prefix.length + 2}::integer) ~ '^[0-9]+$'
  `;

  const counter = await tx.batchNumberCounter.findUnique({
    where: { agentId },
  });

  const maximum = BigInt(existing.maximum);

  const lastNumber = BigInt(counter?.lastNumber ?? 0);

  const next = (maximum > lastNumber ? maximum : lastNumber) + 1n;

  if (next > 2147483647n) {
    throw new ConflictException(
      "This agent's batch number sequence is exhausted.",
    );
  }

  const numberSequence = Number(next);

  await tx.batchNumberCounter.upsert({
    where: { agentId },
    create: { agentId, lastNumber: numberSequence },
    update: { lastNumber: numberSequence },
  });

  return {
    code: `${prefix}-${String(numberSequence).padStart(3, "0")}`,
    agentId,
    numberingAgentId: agentId,
    numberSequence,
  };
}
