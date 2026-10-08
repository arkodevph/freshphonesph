import type { CollectionReport } from '@freshphones/contracts';
import { Prisma } from '../generated/prisma/client';

type Query = { dateFrom?: string; dateTo?: string; batchId?: string; page?: number };
const counts = ['clients', 'scheduledClients', 'clientsWithoutSchedule', 'verifiedPaymentsInPeriod', 'pendingPaymentsInPeriod'];
const money = ['agreedAmount', 'verifiedAmount', 'pendingAmount', 'remainingBalance', 'overpaidAmount', 'collectedInPeriod', 'pendingInPeriod', 'adjustmentAmount', 'adjustmentsInPeriod'];

// Identifiers come only from fixed lists. User filters remain bound parameters.
function figures(total: boolean) {
  return Prisma.join([...counts, ...money].map((field) => {
    const column = Prisma.raw(`"${field}"`);
    const value = total ? Prisma.sql`COALESCE(SUM(${column}), 0)` : column;
    return Prisma.sql`${field}::text, ${counts.includes(field) ? Prisma.sql`${value}::int` : Prisma.sql`${value}::numeric(30,2)::text`}`;
  }));
}

/** A single statement keeps totals and page rows consistent without loading private client fields.
 * Current client membership groups schedules and payments, matching Finance's client balance.
 * Clamp each client's balance before summing so overpayments cannot cancel another client's debt.
 */
export async function collections(db: Prisma.TransactionClient, query: Query, fullScope = false): Promise<CollectionReport> {
  const page = query.page ?? 1;
  const period = Prisma.sql`${query.dateFrom ? Prisma.sql`p."paymentDate" >= ${query.dateFrom}::date` : Prisma.sql`TRUE`}
    AND ${query.dateTo ? Prisma.sql`p."paymentDate" <= ${query.dateTo}::date` : Prisma.sql`TRUE`}`;
  const [result] = await db.$queryRaw<{ report: CollectionReport }[]>(Prisma.sql`
    WITH scope AS (
      SELECT id, code, status FROM "Batch"
      WHERE ${query.batchId ? Prisma.sql`id = ${query.batchId}::uuid` : Prisma.sql`TRUE`}
    ), clients AS (
      SELECT c.id, c."batchId" FROM "Client" c JOIN scope b ON b.id = c."batchId"
    ), schedules AS (
      SELECT s."clientId", SUM(s."expectedAmount") AS due
      FROM "ScheduleItem" s JOIN clients c ON c.id = s."clientId" GROUP BY s."clientId"
    ), adjustments AS (
      SELECT "paymentId", SUM(amount) AS amount FROM "PaymentAdjustment" GROUP BY "paymentId"
    ), payments AS (
      SELECT p."clientId",
        COALESCE(SUM(p.amount + COALESCE(a.amount, 0)) FILTER (WHERE p.status = 'VERIFIED'), 0) AS verified,
        COALESCE(SUM(a.amount) FILTER (WHERE p.status = 'VERIFIED'), 0) AS adjustments,
        COALESCE(SUM(a.amount) FILTER (WHERE p.status = 'VERIFIED' AND ${period}), 0) AS period_adjustments,
        COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'PENDING'), 0) AS pending,
        COALESCE(SUM(p.amount + COALESCE(a.amount, 0)) FILTER (WHERE p.status = 'VERIFIED' AND ${period}), 0) AS collected,
        COUNT(*) FILTER (WHERE p.status = 'VERIFIED' AND ${period}) AS verified_count,
        COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'PENDING' AND ${period}), 0) AS period_pending,
        COUNT(*) FILTER (WHERE p.status = 'PENDING' AND ${period}) AS pending_count
      FROM "Payment" p JOIN clients c ON c.id = p."clientId" LEFT JOIN adjustments a ON a."paymentId" = p.id GROUP BY p."clientId"
    ), balances AS (
      SELECT c.id, c."batchId", s."clientId" IS NOT NULL AS scheduled,
        COALESCE(s.due, 0) AS due, COALESCE(p.verified, 0) AS verified,
        COALESCE(p.pending, 0) AS pending,
        COALESCE(p.adjustments, 0) AS adjustments, COALESCE(p.period_adjustments, 0) AS period_adjustments,
        GREATEST(COALESCE(s.due, 0) - COALESCE(p.verified, 0), 0) AS remaining,
        GREATEST(COALESCE(p.verified, 0) - COALESCE(s.due, 0), 0) AS overpaid,
        COALESCE(p.collected, 0) AS collected, COALESCE(p.verified_count, 0) AS verified_count,
        COALESCE(p.period_pending, 0) AS period_pending, COALESCE(p.pending_count, 0) AS pending_count
      FROM clients c LEFT JOIN schedules s ON s."clientId" = c.id LEFT JOIN payments p ON p."clientId" = c.id
    ), batches AS (
      SELECT b.id, b.code, b.status,
        COUNT(c.id) AS "clients", COUNT(c.id) FILTER (WHERE c.scheduled) AS "scheduledClients",
        COUNT(c.id) FILTER (WHERE NOT c.scheduled) AS "clientsWithoutSchedule",
        COALESCE(SUM(c.due), 0) AS "agreedAmount", COALESCE(SUM(c.verified), 0) AS "verifiedAmount",
        COALESCE(SUM(c.pending), 0) AS "pendingAmount", COALESCE(SUM(c.remaining), 0) AS "remainingBalance",
        COALESCE(SUM(c.overpaid), 0) AS "overpaidAmount", COALESCE(SUM(c.collected), 0) AS "collectedInPeriod",
        COALESCE(SUM(c.verified_count), 0) AS "verifiedPaymentsInPeriod",
        COALESCE(SUM(c.period_pending), 0) AS "pendingInPeriod",
        COALESCE(SUM(c.pending_count), 0) AS "pendingPaymentsInPeriod",
        COALESCE(SUM(c.adjustments), 0) AS "adjustmentAmount", COALESCE(SUM(c.period_adjustments), 0) AS "adjustmentsInPeriod"
      FROM scope b LEFT JOIN balances c ON c."batchId" = b.id GROUP BY b.id, b.code, b.status
    ), selected AS (
      SELECT * FROM batches ORDER BY code, id
      ${fullScope ? Prisma.empty : Prisma.sql`LIMIT 20 OFFSET ${(page - 1) * 20}`}
    )
    SELECT jsonb_build_object(
      'totals', (SELECT jsonb_build_object(${figures(true)}) FROM batches),
      'items', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'code', code, 'status', status,
        ${figures(false)}) ORDER BY code, id), '[]'::jsonb) FROM selected),
      'total', (SELECT COUNT(*)::int FROM batches), 'page', ${page}::int, 'pageSize', 20
    ) AS report
  `);
  return result.report;
}
