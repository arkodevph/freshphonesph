import {
  earningsPeriods,
  type InstallmentEarningsQuery,
  type InstallmentEarningsReport,
} from "@freshphones/contracts";
import { Prisma } from "../generated/prisma/client";

/** Expected amounts are grouped by issued due dates, independently of payment state.
 * Aggregate schedules once per member before grouping batches to avoid multiplying amounts.
 * Include zero-due members and batches; totals always cover the entire filtered scope.
 */
export async function installmentEarnings(
  db: Prisma.TransactionClient,
  query: InstallmentEarningsQuery,
  fullScope = false,
): Promise<InstallmentEarningsReport> {
  const range = earningsPeriods(query.year, query.frequency)[query.period - 1];

  const [result] = await db.$queryRaw<
    { report: Pick<InstallmentEarningsReport, "totals" | "items" | "total"> }[]
  >(Prisma.sql`
    WITH scope AS (
      SELECT id, code FROM "Batch"
      WHERE ${query.batchId ? Prisma.sql`id = ${query.batchId}::uuid` : Prisma.sql`TRUE`}
    ), clients AS (
      SELECT c.id, c.name, c."batchId", b.code FROM "Client" c
      JOIN scope b ON b.id = c."batchId"
    ), schedules AS (
      SELECT s."clientId", COUNT(*) AS issued,
        COUNT(*) FILTER (WHERE s."dueDate" BETWEEN ${range.dateFrom}::date AND ${range.dateTo}::date)::int AS installments,
        COALESCE(SUM(s."expectedAmount") FILTER (WHERE s."dueDate" BETWEEN ${range.dateFrom}::date AND ${range.dateTo}::date), 0) AS amount
      FROM "ScheduleItem" s JOIN clients c ON c.id = s."clientId"
      GROUP BY s."clientId"
    ), member_rows AS (
      SELECT c.id, c."batchId", c.code AS "batchCode", c.name AS "memberName",
        1 AS members, CASE WHEN s.issued IS NULL THEN 1 ELSE 0 END AS "membersWithoutSchedule",
        COALESCE(s.installments, 0)::int AS installments,
        COALESCE(s.amount, 0)::numeric(30,2)::text AS "scheduledAmount"
      FROM clients c LEFT JOIN schedules s ON s."clientId" = c.id
    ), batch_rows AS (
      SELECT b.id, b.id AS "batchId", b.code AS "batchCode", NULL::text AS "memberName",
        COUNT(c.id)::int AS members,
        COALESCE(SUM(c."membersWithoutSchedule"), 0)::int AS "membersWithoutSchedule",
        COALESCE(SUM(c.installments), 0)::int AS installments,
        COALESCE(SUM(c."scheduledAmount"::numeric), 0)::numeric(30,2)::text AS "scheduledAmount"
      FROM scope b LEFT JOIN member_rows c ON c."batchId" = b.id
      GROUP BY b.id, b.code
    ), rows AS (
      ${query.groupBy === "members" ? Prisma.sql`SELECT * FROM member_rows` : Prisma.sql`SELECT * FROM batch_rows`}
    ), selected AS (
      SELECT * FROM rows ORDER BY "batchCode", "memberName" NULLS FIRST, id
      ${fullScope ? Prisma.empty : Prisma.sql`LIMIT 20 OFFSET ${(query.page - 1) * 20}`}
    )
    SELECT jsonb_build_object(
      'totals', (SELECT jsonb_build_object(
        'scheduledAmount', COALESCE(SUM("scheduledAmount"::numeric), 0)::numeric(30,2)::text,
        'installments', COALESCE(SUM(installments), 0)::int,
        'members', COALESCE(SUM(members), 0)::int,
        'membersWithoutSchedule', COALESCE(SUM("membersWithoutSchedule"), 0)::int,
        'batches', COUNT(*)::int
      ) FROM batch_rows),
      'items', (SELECT COALESCE(jsonb_agg(to_jsonb(s) ORDER BY "batchCode", "memberName" NULLS FIRST, id), '[]'::jsonb) FROM selected s),
      'total', (SELECT COUNT(*)::int FROM rows)
    ) AS report
  `);

  return {
    ...result.report,
    basis: "issued_schedule_due_dates",
    dateFrom: range.dateFrom,
    dateTo: range.dateTo,
    year: query.year,
    frequency: query.frequency,
    period: query.period,
    groupBy: query.groupBy,
    page: query.page,
    pageSize: 20,
  };
}
