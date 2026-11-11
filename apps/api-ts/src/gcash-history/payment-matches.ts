import type { GcashPaymentMatch, GcashReading } from "@freshphones/contracts";
import { Prisma } from "../generated/prisma/client";

type Evidence = {
  rowIndex: number;
  references: number;
  exact: number;
  paymentId: string | null;
};

export function classifyMatches(
  rows: GcashReading["rows"],
  evidence: Evidence[],
  period: { from: string; to: string },
): GcashPaymentMatch[] {
  const occurrences = new Map<string, number>();

  for (const row of rows) {
    if (row.reference) {
      occurrences.set(row.reference, (occurrences.get(row.reference) ?? 0) + 1);
    }
  }

  const byIndex = new Map(
    evidence.map((item) => {
      return [item.rowIndex, item];
    }),
  );

  return rows.map((row, rowIndex) => {
    const item = byIndex.get(rowIndex);

    let status: GcashPaymentMatch["status"];

    if (
      !row.credit ||
      BigInt(row.credit.replace(".", "")) <= 0n ||
      (row.debit && BigInt(row.debit.replace(".", "")) > 0n)
    ) {
      status = "NOT_INCOMING";
    } else if (!row.reference.trim()) {
      status = "MISSING_REFERENCE";
    } else if (
      !/^\d{4}-\d{2}-\d{2}$/.test(row.date) ||
      !Number.isFinite(Date.parse(row.date)) ||
      new Date(row.date).toISOString().slice(0, 10) !== row.date ||
      row.date < period.from ||
      row.date > period.to
    ) {
      status = "CHECK_DATE";
    } else if (
      (occurrences.get(row.reference) ?? 0) > 1 ||
      (item?.references ?? 0) > 1
    ) {
      status = "AMBIGUOUS";
    } else {
      status = item?.exact === 1 ? "SUGGESTED" : "UNMATCHED";
    }

    return {
      rowIndex,
      status,
      paymentId: status === "SUGGESTED" ? item!.paymentId : null,
    };
  });
}

/** One batch-filtered aggregation; duplicates are checked across its entire payment history. */
export function paymentMatchSql(batchId: string, rows: GcashReading["rows"]) {
  const input = rows.map((row, rowIndex) => {
    return {
      rowIndex,
      reference: row.reference,
      date: row.date,
      amount: row.credit,
    };
  });

  return Prisma.sql`
    WITH input AS (
      SELECT * FROM jsonb_to_recordset(${JSON.stringify(input)}::jsonb)
        AS r("rowIndex" int, reference text, date text, amount text)
    ), payments AS (
      SELECT p.id, p."referenceNumber", p."paymentDate", p.amount, p.status
      FROM "Payment" p
      WHERE p."batchId" = ${batchId}::uuid
        AND lower(p.method) = 'gcash'
        AND p."referenceNumber" IN (SELECT reference FROM input WHERE reference <> '')
    )
    SELECT r."rowIndex", count(p.id)::int AS "references",
      count(p.id) FILTER (WHERE p.status <> 'REJECTED' AND p."paymentDate"::text = r.date AND p.amount = r.amount::numeric)::int AS exact,
      min(p.id::text) FILTER (WHERE p.status <> 'REJECTED' AND p."paymentDate"::text = r.date AND p.amount = r.amount::numeric) AS "paymentId"
    FROM input r LEFT JOIN payments p ON p."referenceNumber" = r.reference
    GROUP BY r."rowIndex" ORDER BY r."rowIndex"`;
}

export async function paymentMatches(
  tx: Prisma.TransactionClient,
  batchId: string,
  rows: GcashReading["rows"],
  period: { from: string; to: string },
) {
  const evidence = rows.length
    ? await tx.$queryRaw<Evidence[]>(paymentMatchSql(batchId, rows))
    : [];

  const matches = classifyMatches(rows, evidence, period);

  const [missing] = await tx.$queryRaw<{ count: number }[]>`
    SELECT count(*)::int AS count FROM "Payment" p
    WHERE p."batchId" = ${batchId}::uuid AND p.status <> 'REJECTED' AND lower(p.method) = 'gcash'
      AND p."paymentDate" BETWEEN ${period.from}::date AND ${period.to}::date
      AND NOT EXISTS (
        SELECT 1 FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb)
          AS r(reference text, date text, credit text, debit text)
        WHERE r.reference <> '' AND r.reference = p."referenceNumber" AND r.date = p."paymentDate"::text
          AND r.credit::numeric = p.amount AND r.credit::numeric > 0 AND coalesce(r.debit::numeric, 0) = 0
      )`;

  return { matches, unmatchedPayments: missing.count };
}
