import { businessRole, type User } from "@freshphones/contracts";
import { allowed } from "../auth/access";
import { Prisma } from "../generated/prisma/client";
import { utcTimestamp } from "./alert-queries";

export const paymentReviewTitles = {
  RECORDS_APPROVED: "Records approved payment evidence",
  RECORDS_RETURNED: "Records returned a payment",
  MANAGER_APPROVED: "Manager approved the payment cross-check",
  MANAGER_RETURNED: "Manager returned a payment",
} as const;

export const canReadPaymentReviews = (user: Pick<User, "role">) => {
  return (
    businessRole(user.role) === "BATCH_HANDLER" && allowed(user, "PAYMENT_READ")
  );
};

/** Saved decisions are history, not a claim that this evidence is still approved.
 * Current assignment controls visibility, including reviews created before this UI.
 * StaffNotification rows hold per-review/per-recipient read receipts only.
 */
export function paymentReviewAlertRows(userId: string) {
  return Prisma.sql`
    SELECT r.id, p.id AS "paymentId", NULL::uuid AS "caseId", NULL::uuid AS "accountId", NULL::uuid AS "sourceId", NULL::text AS "sourceType",
      r."paymentVersion" AS version, 'payment-review'::text AS entity,
      r.stage || '_' || r.decision AS kind, p.amount::text AS amount,
      c.name AS "clientName", b.code AS "batchCode", NULL::text AS "taskTitle", NULL::timestamp AS deadline,
      r."createdAt", r."createdAt" AS "updatedAt", n."readAt", r."createdAt" AS "occurredAt"
    FROM "User" u JOIN "Batch" b ON b."handlerId" = u.id
    JOIN "Payment" p ON p."batchId" = b.id JOIN "Client" c ON c.id = p."clientId"
    JOIN "PaymentOperationalReview" r ON r."paymentId" = p.id
    LEFT JOIN "StaffNotification" n ON n."recipientId" = u.id
      AND n."dedupeKey" = 'payment-review:' || r.id::text || ':' || u.id::text
    WHERE u.id = ${userId}::uuid AND u.active AND u.role IN ('BATCH_HANDLER', 'CORE_HANDLER')
      AND r.stage IN ('RECORDS', 'MANAGER') AND r.decision IN ('APPROVED', 'RETURNED')
  `;
}

export async function markPaymentReviewsRead(
  tx: Prisma.TransactionClient,
  userId: string,
  now: Date,
  id?: string,
) {
  return tx.$executeRaw`
    INSERT INTO "StaffNotification" (id, "recipientId", "eventKey", title, body, link, "dedupeKey", "readAt", "createdAt")
    SELECT gen_random_uuid(), ${userId}::uuid, 'payment.reviewed',
      CASE a.kind WHEN 'RECORDS_APPROVED' THEN 'Records approved payment evidence'
        WHEN 'RECORDS_RETURNED' THEN 'Records returned a payment'
        WHEN 'MANAGER_APPROVED' THEN 'Manager approved the payment cross-check'
        ELSE 'Manager returned a payment' END,
      'Open the payment for its current status and saved review note.',
      '/system/payments?payment=' || a."paymentId"::text || '&review=' || a.id::text,
      'payment-review:' || a.id::text || ':' || ${userId}::text,
      ${utcTimestamp(now)}::timestamp, a."occurredAt"
    FROM (${paymentReviewAlertRows(userId)}) a
    WHERE a."readAt" IS NULL ${id ? Prisma.sql`AND a.id = ${id}::uuid` : Prisma.empty}
    ON CONFLICT ("dedupeKey") DO UPDATE SET "readAt" = EXCLUDED."readAt"
      WHERE "StaffNotification"."readAt" IS NULL AND "StaffNotification"."recipientId" = EXCLUDED."recipientId"
  `;
}

export function paymentReviewReceiptVisibility(userId: string) {
  return Prisma.sql`(n."eventKey" <> 'payment.reviewed' OR EXISTS (
    SELECT 1 FROM (${paymentReviewAlertRows(userId)}) a
    WHERE n."dedupeKey" = 'payment-review:' || a.id::text || ':' || ${userId}::text
  ))`;
}
