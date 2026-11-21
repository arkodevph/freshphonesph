import type {
  FinancePaymentQueue,
  PaymentSortField,
} from "@freshphones/contracts";
import { Prisma } from "../generated/prisma/client";
import { financeQueueSql } from "./payment-workflow-query";

export interface FinancePaymentQuery {
  page: number;
  q: string;
  financeQueue: FinancePaymentQueue;
  membershipBatchId?: string;
  id?: string;
  proof?: "missing";
  status?: string;
  batchId?: string;
  clientId?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: PaymentSortField;
  sortDirection?: "asc" | "desc";
}

export const financePaymentFrom = Prisma.sql`FROM "Payment" p
  JOIN "Batch" b ON b.id = p."batchId" JOIN "Client" c ON c.id = p."clientId"`;

export function financePaymentWhere(query: FinancePaymentQuery) {
  const clauses = [financeQueueSql(query.financeQueue)];

  if (query.id) {
    clauses.push(Prisma.sql`p.id = ${query.id}::uuid`);
  }

  if (query.membershipBatchId) {
    clauses.push(Prisma.sql`c."batchId" = ${query.membershipBatchId}::uuid`);
  }

  if (query.clientId) {
    clauses.push(Prisma.sql`p."clientId" = ${query.clientId}::uuid`);
  }

  if (query.batchId) {
    clauses.push(Prisma.sql`p."batchId" = ${query.batchId}::uuid`);
  }

  if (query.proof) {
    clauses.push(Prisma.sql`p."proofFileId" IS NULL`);
  }

  if (query.status) {
    clauses.push(Prisma.sql`p.status::text = ${query.status}`);
  }

  if (query.dateFrom) {
    clauses.push(Prisma.sql`p."paymentDate" >= ${query.dateFrom}::date`);
  }

  if (query.dateTo) {
    clauses.push(Prisma.sql`p."paymentDate" <= ${query.dateTo}::date`);
  }

  if (query.q) {
    const term = `%${query.q.replace(/[\\%_]/g, "\\$&")}%`;

    clauses.push(
      Prisma.sql`(p."referenceNumber" ILIKE ${term} OR c.name ILIKE ${term} OR b.code ILIKE ${term})`,
    );
  }

  return Prisma.sql`WHERE ${Prisma.join(clauses, " AND ")}`;
}

export function financePaymentOrder(query: FinancePaymentQuery) {
  const field =
    query.sortBy === "clientName"
      ? Prisma.sql`c.name`
      : query.sortBy === "paymentDate"
        ? Prisma.sql`p."paymentDate"`
        : Prisma.sql`p."createdAt"`;

  const direction =
    query.sortDirection === "asc" ? Prisma.sql`ASC` : Prisma.sql`DESC`;

  return Prisma.sql`ORDER BY ${field} ${direction}, p.id ${direction}`;
}
