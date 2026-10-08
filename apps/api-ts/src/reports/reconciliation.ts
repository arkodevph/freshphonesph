import type { Page, ReconciliationException, ReconciliationReport } from '@freshphones/contracts';
import { Prisma } from '../generated/prisma/client';

type Query = { dateFrom?: string; dateTo?: string; batchId?: string; page?: number };
export const reconciliationColumns = [
  ['payments', 'Recorded payments'], ['recordedAmount', 'Recorded claims (PHP)'],
  ['verifiedPayments', 'Verified payments'], ['verifiedAmount', 'Verified (PHP)'],
  ['pendingPayments', 'Pending payments'], ['pendingAmount', 'Pending (PHP)'],
  ['clarificationPayments', 'Clarification payments'], ['clarificationAmount', 'Clarification (PHP)'],
  ['rejectedPayments', 'Rejected payments'], ['rejectedAmount', 'Rejected (PHP)'],
  ['auditedVerifiedPayments', 'Verified with matching audit'], ['auditedVerifiedAmount', 'Verified with matching audit (PHP)'],
  ['unmatchedVerifiedPayments', 'Verified without matching audit'], ['unmatchedVerifiedAmount', 'Audit evidence gap (PHP)'],
  ['paymentsWithFlags', 'Payments with review flags'], ['duplicateReferencePayments', 'Possible duplicate references'],
  ['scheduleMismatchPayments', 'Schedule belongs to another client'], ['batchMismatchPayments', 'Recorded/current batch differ'],
  ['verifiedWithoutSchedulePayments', 'Verified without issued schedule'],
  ['originalVerifiedAmount', 'Original verified claims (PHP)'], ['adjustmentAmount', 'Finance adjustments (PHP)'],
  ['adjustments', 'Adjustment entries'], ['adjustmentAuditGapPayments', 'Payments with adjustment audit gaps'],
  ['adjustmentAuditGapAmount', 'Adjustment audit gap magnitude (PHP)'],
] as const;
const flagColumns = [
  ['duplicateReferencePayments', 'DUPLICATE_REFERENCE'], ['scheduleMismatchPayments', 'SCHEDULE_CLIENT_MISMATCH'],
  ['batchMismatchPayments', 'BATCH_MEMBERSHIP_MISMATCH'], ['verifiedWithoutSchedulePayments', 'VERIFIED_WITHOUT_SCHEDULE'],
  ['adjustmentAuditGapPayments', 'UNMATCHED_ADJUSTMENT_AUDIT'],
] as const;

// Both aggregate and authorized exception reads use these exact checks.
// Duplicate detection compares the full ledger, even if the other record is outside the chosen period/batch.
function ledger(query: Query) {
  return Prisma.sql`
    WITH normalized_references AS (
      SELECT id, lower(method) AS method, upper(regexp_replace(COALESCE("referenceNumber", ''), '[^[:alnum:]]', '', 'g')) AS reference
      FROM "Payment"
    ), reference_keys AS (
      SELECT *, COUNT(*) OVER (PARTITION BY method, reference) AS matches FROM normalized_references
    ), adjustment_evidence AS (
      SELECT j.*, EXISTS (
        SELECT 1 FROM "AuditEntry" a WHERE a.entity = 'payment_adjustment' AND a."recordId" = j.id AND a.action = 'payment.adjusted'
          AND a."actorId" = j."actorId" AND a.after->>'id' = j.id::text AND a.after->>'paymentId' = j."paymentId"::text
          AND a.after->>'actorId' = j."actorId"::text AND a.after->>'requestId' = j."requestId"::text
          AND a.after->>'sequence' = j.sequence::text AND a.after->>'paymentVersion' = j."paymentVersion"::text
          AND a.after->>'reason' = j.reason AND a.after->>'createdAt' = to_char(j."createdAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
          AND a.before->>'paymentId' = j."paymentId"::text AND a.before->>'revision' = (j.sequence - 1)::text
          AND CASE WHEN a.before->>'amount' ~ '^[0-9]+([.][0-9]+)?$' THEN (a.before->>'amount')::numeric END = j."beforeAmount"
          AND CASE WHEN a.after->>'amount' ~ '^-?[0-9]+([.][0-9]+)?$' THEN (a.after->>'amount')::numeric END = j.amount
          AND CASE WHEN a.after->>'beforeAmount' ~ '^[0-9]+([.][0-9]+)?$' THEN (a.after->>'beforeAmount')::numeric END = j."beforeAmount"
          AND CASE WHEN a.after->>'afterAmount' ~ '^[0-9]+([.][0-9]+)?$' THEN (a.after->>'afterAmount')::numeric END = j."afterAmount"
      ) AS audited FROM "PaymentAdjustment" j
    ), adjustments AS (
      SELECT "paymentId", SUM(amount) AS amount, COUNT(*) AS count,
        COUNT(*) FILTER (WHERE NOT audited) > 0 AS audit_gap,
        COALESCE(SUM(abs(amount)) FILTER (WHERE NOT audited), 0) AS gap_amount
      FROM adjustment_evidence GROUP BY "paymentId"
    ), checked AS (
      SELECT p.id, p."batchId", b.code AS "batchCode", current_batch.code AS "currentBatchCode", p.method,
        p."paymentDate", p.amount, p.status,
        CASE WHEN p.status = 'VERIFIED' THEN p.amount + COALESCE(j.amount, 0) ELSE p.amount END AS effective_amount,
        COALESCE(j.amount, 0) AS adjustment_amount, COALESCE(j.count, 0) AS adjustment_count,
        COALESCE(j.audit_gap, false) AS adjustment_audit_gap, COALESCE(j.gap_amount, 0) AS adjustment_gap_amount,
        r.reference <> '' AND r.matches > 1 AS duplicate,
        s.id IS NOT NULL AND s."clientId" <> p."clientId" AS schedule_mismatch,
        p."batchId" <> c."batchId" AS batch_mismatch,
        p.status = 'VERIFIED' AND NOT EXISTS (SELECT 1 FROM "ScheduleItem" issued WHERE issued."clientId" = p."clientId") AS without_schedule,
        p.status = 'VERIFIED' AND EXISTS (
          SELECT 1 FROM "AuditEntry" a WHERE a.entity = 'payment' AND a."recordId" = p.id AND a.action = 'payment.verified'
            AND a."actorId" = p."verifierId" AND a.after->>'id' = p.id::text AND a.after->>'status' = 'VERIFIED'
            AND a.after->>'version' = p.version::text AND a.after->>'clientId' = p."clientId"::text
            AND a.after->>'batchId' = p."batchId"::text AND a.after->>'verifierId' = p."verifierId"::text
            AND a.after->>'verifiedAt' = to_char(p."verifiedAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
            AND left(a.after->>'paymentDate', 10) = p."paymentDate"::text AND a.after->>'method' = p.method
            AND COALESCE(a.after->>'referenceNumber', '') = COALESCE(p."referenceNumber", '')
            AND COALESCE(a.after->>'scheduleItemId', '') = COALESCE(p."scheduleItemId"::text, '')
            AND CASE WHEN a.after->>'amount' ~ '^[0-9]+([.][0-9]+)?$' THEN (a.after->>'amount')::numeric END = p.amount
        ) AS audited
      FROM "Payment" p JOIN reference_keys r ON r.id = p.id JOIN "Batch" b ON b.id = p."batchId" JOIN "Client" c ON c.id = p."clientId"
        JOIN "Batch" current_batch ON current_batch.id = c."batchId" LEFT JOIN "ScheduleItem" s ON s.id = p."scheduleItemId"
        LEFT JOIN adjustments j ON j."paymentId" = p.id
      WHERE ${query.batchId ? Prisma.sql`p."batchId" = ${query.batchId}::uuid` : Prisma.sql`TRUE`}
        AND ${query.dateFrom ? Prisma.sql`p."paymentDate" >= ${query.dateFrom}::date` : Prisma.sql`TRUE`}
        AND ${query.dateTo ? Prisma.sql`p."paymentDate" <= ${query.dateTo}::date` : Prisma.sql`TRUE`}
    ), ledger AS (
      SELECT *, array_remove(ARRAY[
        CASE WHEN duplicate THEN 'DUPLICATE_REFERENCE' END,
        CASE WHEN schedule_mismatch THEN 'SCHEDULE_CLIENT_MISMATCH' END,
        CASE WHEN batch_mismatch THEN 'BATCH_MEMBERSHIP_MISMATCH' END,
        CASE WHEN without_schedule THEN 'VERIFIED_WITHOUT_SCHEDULE' END,
        CASE WHEN status = 'VERIFIED' AND NOT audited THEN 'UNMATCHED_VERIFICATION_AUDIT' END,
        CASE WHEN adjustment_audit_gap THEN 'UNMATCHED_ADJUSTMENT_AUDIT' END
      ], NULL) AS flags FROM checked
    )
  `;
}

function figures(total: boolean) {
  return Prisma.join(reconciliationColumns.map(([field]) => {
    // Column names are fixed above; filter values remain bound parameters.
    const column = Prisma.raw(`"${field}"`);
    const value = total ? Prisma.sql`COALESCE(SUM(${column}), 0)` : column;
    return Prisma.sql`${field}::text, ${field.endsWith('Amount') ? Prisma.sql`${value}::numeric(30,2)::text` : Prisma.sql`${value}::int`}`;
  }));
}

export async function reconciliation(db: Prisma.TransactionClient, query: Query, fullScope = false): Promise<ReconciliationReport> {
  const page = query.page ?? 1;
  const statuses = [['verified', 'VERIFIED'], ['pending', 'PENDING'], ['clarification', 'NEEDS_CLARIFICATION'], ['rejected', 'REJECTED']] as const;
  const [result] = await db.$queryRaw<{ report: ReconciliationReport }[]>(Prisma.sql`
    ${ledger(query)}, groups AS (
      SELECT "batchId", "batchCode", method, COUNT(*) AS payments, SUM(amount) AS "recordedAmount",
        ${Prisma.join(statuses.map(([name, status]) => Prisma.sql`
          COUNT(*) FILTER (WHERE status = ${status}::"PaymentStatus") AS ${Prisma.raw(`"${name}Payments"`)},
          COALESCE(SUM(effective_amount) FILTER (WHERE status = ${status}::"PaymentStatus"), 0) AS ${Prisma.raw(`"${name}Amount"`)}
        `))},
        COUNT(*) FILTER (WHERE audited) AS "auditedVerifiedPayments",
        COALESCE(SUM(effective_amount) FILTER (WHERE audited), 0) AS "auditedVerifiedAmount",
        COUNT(*) FILTER (WHERE status = 'VERIFIED' AND NOT audited) AS "unmatchedVerifiedPayments",
        COALESCE(SUM(effective_amount) FILTER (WHERE status = 'VERIFIED' AND NOT audited), 0) AS "unmatchedVerifiedAmount",
        COALESCE(SUM(amount) FILTER (WHERE status = 'VERIFIED'), 0) AS "originalVerifiedAmount",
        SUM(adjustment_amount) AS "adjustmentAmount", SUM(adjustment_count) AS adjustments,
        SUM(adjustment_gap_amount) AS "adjustmentAuditGapAmount",
        COUNT(*) FILTER (WHERE cardinality(flags) > 0) AS "paymentsWithFlags",
        ${Prisma.join(flagColumns.map(([field, flag]) => Prisma.sql`COUNT(*) FILTER (WHERE ${flag}::text = ANY(flags)) AS ${Prisma.raw(`"${field}"`)}`))}
      FROM ledger GROUP BY "batchId", "batchCode", method
    ), selected AS (
      SELECT * FROM groups ORDER BY "batchCode", "batchId", method
      ${fullScope ? Prisma.empty : Prisma.sql`LIMIT 20 OFFSET ${(page - 1) * 20}`}
    ) SELECT jsonb_build_object(
      'totals', (SELECT jsonb_build_object(${figures(true)}) FROM groups),
      'items', (SELECT COALESCE(jsonb_agg(jsonb_build_object('batchId', "batchId", 'batchCode', "batchCode", 'method', method,
        ${figures(false)}) ORDER BY "batchCode", "batchId", method), '[]'::jsonb) FROM selected),
      'total', (SELECT COUNT(*)::int FROM groups), 'page', ${page}::int, 'pageSize', 20
    ) AS report
  `);
  return result.report;
}

export async function reconciliationExceptions(db: Prisma.TransactionClient, query: Query): Promise<Page<ReconciliationException>> {
  const page = query.page ?? 1;
  const [result] = await db.$queryRaw<{ report: Page<ReconciliationException> }[]>(Prisma.sql`
    ${ledger(query)}, exceptions AS (SELECT * FROM ledger WHERE cardinality(flags) > 0), selected AS (
      SELECT * FROM exceptions ORDER BY "paymentDate", id LIMIT 20 OFFSET ${(page - 1) * 20}
    ) SELECT jsonb_build_object(
      'items', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'batchCode', "batchCode", 'currentBatchCode', "currentBatchCode",
        'paymentDate', "paymentDate"::text, 'method', method, 'status', status, 'amount', amount::numeric(12,2)::text, 'flags', flags)
        ORDER BY "paymentDate", id), '[]'::jsonb) FROM selected),
      'total', (SELECT COUNT(*)::int FROM exceptions), 'page', ${page}::int, 'pageSize', 20
    ) AS report
  `);
  return result.report;
}
