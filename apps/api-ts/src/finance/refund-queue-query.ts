import { ForbiddenException } from "@nestjs/common";
import type { User, WithdrawalQuery } from "@freshphones/contracts";
import { allowed } from "../auth/access";
import { Prisma } from "../generated/prisma/client";

export function refundRemainingSql() {
  return Prisma.sql`w."refundAmount" - COALESCE((SELECT SUM(p.amount) FROM "WithdrawalPayout" p WHERE p."withdrawalId" = w.id), 0)`;
}

export function outstandingRefundSql() {
  return Prisma.sql`w.status IN ('APPROVED', 'REPLACED') AND w."refundStatus" = 'APPROVED' AND (${refundRemainingSql()}) > 0`;
}

export async function refundQueuePage(
  tx: Prisma.TransactionClient,
  user: User,
  query: WithdrawalQuery,
): Promise<[{ id: string }[], number]> {
  if (
    user.role !== "FINANCE_OFFICER" ||
    !allowed(user, "WITHDRAWAL_REFUND_PAY")
  ) {
    throw new ForbiddenException("Finance refund queue access required.");
  }

  const clauses = [outstandingRefundSql()];

  if (query.status) {
    clauses.push(Prisma.sql`w.status = ${query.status}`);
  }

  if (query.clientId) {
    clauses.push(Prisma.sql`w."clientId" = ${query.clientId}::uuid`);
  }

  if (query.q) {
    const term = `%${query.q.replace(/[\\%_]/g, "\\$&")}%`;

    clauses.push(Prisma.sql`(c.name ILIKE ${term} OR b.code ILIKE ${term})`);
  }

  const from = Prisma.sql`FROM "WithdrawalRequest" w JOIN "Client" c ON c.id = w."clientId" JOIN "Batch" b ON b.id = c."batchId" WHERE ${Prisma.join(clauses, " AND ")}`;

  const rows = await tx.$queryRaw<
    { id: string }[]
  >`SELECT w.id ${from} ORDER BY w."createdAt" DESC, w.id DESC LIMIT 20 OFFSET ${(query.page - 1) * 20}`;

  const [count] = await tx.$queryRaw<
    { total: bigint }[]
  >`SELECT COUNT(*) AS total ${from}`;

  return [rows, Number(count.total)];
}
