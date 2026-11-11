import { allowed } from "../auth/access";
import type {
  Permission,
  User,
  WorkflowAlertKind,
} from "@freshphones/contracts";
import { Prisma } from "../generated/prisma/client";
import { utcTimestamp } from "./alert-queries";
import { monitorRows } from "../operations-monitor/monitor-query";

export const workflowAlertTitles: Record<WorkflowAlertKind, string> = {
  PAYMENT_RECORDS_PENDING: "Payment evidence ready for Records",
  PAYMENT_MANAGER_PENDING: "Payment ready for your cross-check",
  PAYMENT_PROOF_REQUIRED: "Payment receipt proof is missing",
  PAYMENT_RETURNED: "Payment evidence returned for correction",
  STATEMENT_RECORDS_PENDING: "GCash statement ready for Records",
  STATEMENT_RETURNED: "GCash statement returned for correction",
  OPERATIONS_FOLLOW_UP: "Operational follow-up remains open",
};

export function canReadWorkflowAlerts(user: Pick<User, "role">) {
  const permissions: Permission[] = [
    "PAYMENT_COMPLETENESS_REVIEW",
    "PAYMENT_MANAGER_REVIEW",
    "PAYMENT_RECORD",
    "PAYMENT_VERIFY",
    "GCASH_HISTORY_REVIEW",
    "OPERATIONS_MONITOR",
  ];

  return permissions.some((permission) => {
    return allowed(user, permission);
  });
}

/** Derive current work rather than save recipient snapshots that survive reassignment. */
export function workflowAlertRows(user: User, now: Date) {
  const current = monitorRows(user, now, null);

  const responsible = Prisma.sql`(
    (o.stage = 'HANDLER' AND b."handlerId" = u.id AND u.role IN ('BATCH_HANDLER', 'CORE_HANDLER'))
    OR (o.stage = 'RECORDS' AND u.role = 'RECORDS'
      AND COALESCE(p."recordedById", submission."uploadedById") IS DISTINCT FROM u.id)
    OR (o.stage = 'MANAGER' AND b."managerId" = u.id AND u.role IN ('BATCH_MANAGER', 'GENERAL_MANAGER')
      AND p."recordedById" <> u.id)
  )`;

  return Prisma.sql`WITH work AS (${current} SELECT * FROM observed), candidates AS (
    SELECT o.id, o.id AS "sourceId", o.source AS "sourceType", o."sourceVersion" + b.version AS version,
      CASE WHEN o.source = 'PAYMENT' THEN CASE o.stage
        WHEN 'RECORDS' THEN 'PAYMENT_RECORDS_PENDING' WHEN 'MANAGER' THEN 'PAYMENT_MANAGER_PENDING'
        ELSE CASE WHEN o.returned THEN 'PAYMENT_RETURNED' ELSE 'PAYMENT_PROOF_REQUIRED' END END
        ELSE CASE WHEN o.returned THEN 'STATEMENT_RETURNED' ELSE 'STATEMENT_RECORDS_PENDING' END END AS kind,
      o."batchCode", o."waitingSince" AS "occurredAt"
    FROM work o JOIN "Batch" b ON b.id = o."batchId"
    JOIN "User" u ON u.id = ${user.id}::uuid AND u.active
    LEFT JOIN "Payment" p ON o.source = 'PAYMENT' AND p.id = o.id
    LEFT JOIN LATERAL (SELECT s."uploadedById" FROM "GcashHistorySubmission" s
      WHERE o.source = 'STATEMENT' AND s."historyId" = o.id ORDER BY s.revision DESC LIMIT 1) submission ON TRUE
    WHERE ${responsible}
    UNION ALL
    SELECT o."followUpId", o.id, o.source, o."followUpVersion" + o."sourceVersion" + b.version,
      'OPERATIONS_FOLLOW_UP', o."batchCode", f."updatedAt"
    FROM work o JOIN "Batch" b ON b.id = o."batchId"
    JOIN "OperationsFollowUp" f ON f.id = o."followUpId" AND f.status = 'OPEN'
    JOIN "User" u ON u.id = ${user.id}::uuid AND u.active
    LEFT JOIN "Payment" p ON o.source = 'PAYMENT' AND p.id = o.id
    LEFT JOIN LATERAL (SELECT s."uploadedById" FROM "GcashHistorySubmission" s
      WHERE o.source = 'STATEMENT' AND s."historyId" = o.id ORDER BY s.revision DESC LIMIT 1) submission ON TRUE
    WHERE ${responsible}
      OR u.role IN ('COO', 'SYSTEM_ADMIN', 'OPERATIONS_COORDINATOR')
      OR (o.stage = 'FINANCE' AND u.role = 'FINANCE_OFFICER')
      OR (o.stage = 'COMPLETE' AND b."handlerId" = u.id AND u.role IN ('BATCH_HANDLER', 'CORE_HANDLER'))
  ) SELECT a.id, NULL::uuid AS "paymentId", NULL::uuid AS "caseId", NULL::uuid AS "accountId",
    a."sourceId", a."sourceType", a.version, 'workflow'::text AS entity, a.kind,
    NULL::text AS amount, NULL::text AS "clientName", a."batchCode", NULL::text AS "taskTitle", NULL::timestamp AS deadline,
    a."occurredAt" AS "createdAt", a."occurredAt" AS "updatedAt", n."readAt", a."occurredAt"
  FROM candidates a LEFT JOIN "StaffNotification" n ON n."recipientId" = ${user.id}::uuid
    AND n."dedupeKey" = ${workflowReadKey(user.id)}`;
}

function workflowReadKey(userId: string) {
  return Prisma.sql`'workflow:' || a.id::text || ':' || a.kind || ':' || a.version::text || ':' || ${userId}::text`;
}

export async function markWorkflowAlertsRead(
  tx: Prisma.TransactionClient,
  user: User,
  now: Date,
  id?: string,
  kind?: WorkflowAlertKind,
) {
  return tx.$executeRaw`INSERT INTO "StaffNotification" (id, "recipientId", "eventKey", title, body, link, "dedupeKey", "readAt", "createdAt")
    SELECT gen_random_uuid(), ${user.id}::uuid, 'workflow.read', 'Workflow alert read', 'Read receipt for current operational work.',
      NULL, ${workflowReadKey(user.id)}, ${utcTimestamp(now)}::timestamp, a."occurredAt"
    FROM (${workflowAlertRows(user, now)}) a WHERE a."readAt" IS NULL ${id ? Prisma.sql`AND a.id = ${id}::uuid` : Prisma.empty} ${kind ? Prisma.sql`AND a.kind = ${kind}` : Prisma.empty}
    ON CONFLICT ("dedupeKey") DO NOTHING`;
}
