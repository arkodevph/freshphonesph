import type {
  ChartMonths,
  ExecutiveChartData,
  MonthlyCollectionPoint,
} from "@freshphones/contracts";
import type { Database } from "../database";
import { Prisma } from "../generated/prisma/client";
import { collections } from "./collections";

export function chartPeriod(months: ChartMonths, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const part = (type: Intl.DateTimeFormatPartTypes) => {
    return parts.find((value) => {
      return value.type === type;
    })!.value;
  };

  const dateTo = `${part("year")}-${part("month")}-${part("day")}`;

  const start = new Date(`${dateTo.slice(0, 7)}-01T00:00:00Z`);

  start.setUTCMonth(start.getUTCMonth() - months + 1);

  return { dateFrom: start.toISOString().slice(0, 10), dateTo };
}

/** Read-only company aggregates. Payment dates and signed Finance credits match Reports. */
export async function executiveCharts(
  db: Database,
  months: ChartMonths,
  now = new Date(),
): Promise<ExecutiveChartData> {
  const period = chartPeriod(months, now);

  return db.$transaction(
    async (tx) => {
      const points = await tx.$queryRaw<MonthlyCollectionPoint[]>(Prisma.sql`
      WITH scoped AS (
        SELECT id, status, amount, "paymentDate" FROM "Payment"
        WHERE "paymentDate" >= ${period.dateFrom}::date AND "paymentDate" <= ${period.dateTo}::date
      ), credits AS (
        SELECT a."paymentId", SUM(a.amount) AS amount FROM "PaymentAdjustment" a
        JOIN scoped p ON p.id = a."paymentId" WHERE p.status = 'VERIFIED'
        GROUP BY a."paymentId"
      ), monthly AS (
        SELECT date_trunc('month', p."paymentDate")::date AS month,
          SUM(p.amount + COALESCE(a.amount, 0)) FILTER (WHERE p.status = 'VERIFIED') AS verified,
          SUM(p.amount) FILTER (WHERE p.status = 'PENDING') AS pending,
          COUNT(*) FILTER (WHERE p.status = 'VERIFIED') AS verified_count,
          COUNT(*) FILTER (WHERE p.status = 'PENDING') AS pending_count,
          COUNT(*) FILTER (WHERE p.status = 'NEEDS_CLARIFICATION') AS clarification_count,
          COUNT(*) FILTER (WHERE p.status = 'REJECTED') AS rejected_count
        FROM scoped p LEFT JOIN credits a ON a."paymentId" = p.id
        GROUP BY date_trunc('month', p."paymentDate")::date
      )
      SELECT to_char(s.month, 'YYYY-MM') AS month,
        COALESCE(m.verified, 0)::numeric(30,2)::text AS "verifiedAmount",
        COALESCE(m.pending, 0)::numeric(30,2)::text AS "pendingAmount",
        COALESCE(m.verified_count, 0)::int AS "verifiedPayments",
        COALESCE(m.pending_count, 0)::int AS "pendingPayments",
        COALESCE(m.clarification_count, 0)::int AS "clarificationPayments",
        COALESCE(m.rejected_count, 0)::int AS "rejectedPayments"
      FROM generate_series(${period.dateFrom}::date,
        date_trunc('month', ${period.dateTo}::date), interval '1 month') AS s(month)
      LEFT JOIN monthly m ON m.month = s.month::date ORDER BY s.month
    `);

      const batches = await collections(tx, period, true);

      const sum = (field: "verifiedAmount" | "pendingAmount") => {
        return points
          .reduce((total, point) => {
            return total.add(point[field]);
          }, new Prisma.Decimal(0))
          .toFixed(2);
      };

      return {
        ...period,
        months: points,
        verifiedAmount: sum("verifiedAmount"),
        pendingAmount: sum("pendingAmount"),
        paymentCounts: points.reduce(
          (total, point) => {
            return {
              verified: total.verified + point.verifiedPayments,
              pending: total.pending + point.pendingPayments,
              clarification: total.clarification + point.clarificationPayments,
              rejected: total.rejected + point.rejectedPayments,
            };
          },
          { verified: 0, pending: 0, clarification: 0, rejected: 0 },
        ),
        batches: {
          total: batches.total,
          items: [...batches.items]
            .sort((left, right) => {
              return (
                new Prisma.Decimal(right.remainingBalance).comparedTo(
                  left.remainingBalance,
                ) || left.code.localeCompare(right.code)
              );
            })
            .slice(0, 6)
            .map((batch) => {
              return {
                code: batch.code,
                remainingBalance: batch.remainingBalance,
              };
            }),
        },
      };
    },
    { isolationLevel: "RepeatableRead" },
  );
}
