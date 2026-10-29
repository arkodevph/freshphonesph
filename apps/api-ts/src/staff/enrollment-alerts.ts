import { Prisma } from "../generated/prisma/client";
import { utcTimestamp } from "./alert-queries";

export const enrollmentAlertTitles = {
  ENROLLMENT_PENDING: "Enrollment request awaiting review",
  ENROLLMENT_APPROVED: "Enrollment request approved",
  ENROLLMENT_REJECTED: "Enrollment request rejected",
} as const;

/** Read current requests and assignments, including requests predating this feature.
 * Existing StaffNotification rows serve as receipts; they never confer access.
 */
export function enrollmentAlertRows(userId: string) {
  return Prisma.sql`
    SELECT e.id, NULL::uuid AS "paymentId", NULL::uuid AS "caseId", NULL::uuid AS "accountId",
      e.version, 'enrollment'::text AS entity,
      CASE e.status WHEN 'PENDING' THEN 'ENROLLMENT_PENDING'
        WHEN 'APPROVED' THEN 'ENROLLMENT_APPROVED' ELSE 'ENROLLMENT_REJECTED' END AS kind,
      NULL::text AS amount, NULL::text AS "clientName", b.code AS "batchCode",
      NULL::text AS "taskTitle", NULL::timestamp AS deadline,
      e."createdAt", COALESCE(e."reviewedAt", e."createdAt") AS "updatedAt", n."readAt",
      CASE e.status WHEN 'PENDING' THEN e."createdAt"
        ELSE COALESCE(e."reviewedAt", e."createdAt") END AS "occurredAt"
    FROM "EnrollmentRequest" e JOIN "Batch" b ON b.id = e."batchId"
    JOIN "User" u ON u.id = ${userId}::uuid AND u.active
    LEFT JOIN "StaffNotification" n ON n."recipientId" = u.id
      AND n."dedupeKey" = CASE e.status WHEN 'PENDING'
        THEN 'enrollment:' || e.id::text || ':' || u.id::text
        ELSE 'enrollment-review:' || e.id::text END
    WHERE (e.status = 'PENDING' AND e."submittedById" <> u.id
      AND (u.role IN ('SYSTEM_ADMIN', 'COO')
        OR (u.role IN ('BATCH_MANAGER', 'GENERAL_MANAGER') AND b."managerId" = u.id)))
      OR (e.status IN ('APPROVED', 'REJECTED') AND u.role = 'AGENT' AND e."submittedById" = u.id)
  `;
}

export async function markEnrollmentAlertsRead(
  tx: Prisma.TransactionClient,
  userId: string,
  now: Date,
  id?: string,
) {
  return tx.$executeRaw`
    INSERT INTO "StaffNotification" (id, "recipientId", "eventKey", title, body, link, "dedupeKey", "readAt", "createdAt")
    SELECT gen_random_uuid(), ${userId}::uuid,
      CASE a.kind WHEN 'ENROLLMENT_PENDING' THEN 'enrollment.submitted' ELSE 'enrollment.reviewed' END,
      CASE a.kind WHEN 'ENROLLMENT_PENDING' THEN 'Enrollment request awaiting review'
        WHEN 'ENROLLMENT_APPROVED' THEN 'Enrollment request approved' ELSE 'Enrollment request rejected' END,
      'Open the enrollment request for its current status.',
      '/system/enrollments?request=' || a.id::text,
      CASE a.kind WHEN 'ENROLLMENT_PENDING' THEN 'enrollment:' || a.id::text || ':' || ${userId}::text
        ELSE 'enrollment-review:' || a.id::text END,
      ${utcTimestamp(now)}::timestamp, a."occurredAt"
    FROM (${enrollmentAlertRows(userId)}) a
    WHERE a."readAt" IS NULL ${id ? Prisma.sql`AND a.id = ${id}::uuid` : Prisma.empty}
    ON CONFLICT ("dedupeKey") DO UPDATE SET "readAt" = EXCLUDED."readAt"
      WHERE "StaffNotification"."readAt" IS NULL AND "StaffNotification"."recipientId" = EXCLUDED."recipientId"
  `;
}

/** Apply the same enrollment visibility to the older generic notification API. */
export function notificationVisibilitySql(userId: string) {
  return Prisma.sql`n."recipientId" = ${userId}::uuid AND (
    n."eventKey" NOT IN ('enrollment.submitted', 'enrollment.reviewed')
    OR EXISTS (SELECT 1 FROM (${enrollmentAlertRows(userId)}) a
      WHERE n."dedupeKey" = CASE a.kind WHEN 'ENROLLMENT_PENDING'
        THEN 'enrollment:' || a.id::text || ':' || ${userId}::text
        ELSE 'enrollment-review:' || a.id::text END))`;
}
