import { businessRole, type User } from "@freshphones/contracts";
import { Prisma } from "../generated/prisma/client";

export function monitorScope(user: User) {
  if (businessRole(user.role) !== "OPERATIONS_COORDINATOR") {
    return Prisma.sql`TRUE`;
  }

  return Prisma.sql`EXISTS (
    SELECT 1 FROM "Agent" agent
    JOIN "User" account ON account."agentProfileId" = agent.id
    JOIN "User" pioneer ON pioneer.id = account."supervisorId"
    WHERE agent.id = b."agentId" AND agent.active AND account.active AND pioneer.active
      AND account.role = 'AGENT' AND pioneer.role = 'PIONEER_AGENT'
      AND pioneer."supervisorId" = ${user.id}::uuid
  )`;
}

/** Filters precede the union/count/page; no receipt contents or financial amounts are selected. */
export function monitorRows(
  user: User,
  now: Date,
  reviewDueHours: number | null,
  target?: { source: string; id: string },
) {
  const scope = monitorScope(user);

  const payments = target
    ? target.source === "PAYMENT"
      ? Prisma.sql`p.id = ${target.id}::uuid`
      : Prisma.sql`FALSE`
    : Prisma.sql`(p.status IN ('PENDING', 'NEEDS_CLARIFICATION') OR EXISTS (SELECT 1 FROM "OperationsFollowUp" f WHERE f."paymentId" = p.id))`;

  const statements = target
    ? target.source === "STATEMENT"
      ? Prisma.sql`h.id = ${target.id}::uuid`
      : Prisma.sql`FALSE`
    : Prisma.sql`((h."archivedAt" IS NULL AND h.status <> 'REVIEWED') OR EXISTS (SELECT 1 FROM "OperationsFollowUp" f WHERE f."historyId" = h.id))`;

  return Prisma.sql`
    WITH payment_evidence AS (
      SELECT p.id, p.version, p.status, p."batchId", b.code, b."managerId", b."handlerId",
        NOT EXISTS (SELECT 1 FROM submission_evidence_blockers(p."batchId", p."paymentDate")) AS "submissionComplete",
        p."proofFileId" IS NULL AS missing, p."updatedAt", b."updatedAt" AS "batchUpdatedAt",
        r."createdAt" AS "recordsAt", m."createdAt" AS "managerAt",
        COALESCE(r.decision = 'APPROVED' AND ru.active AND ru.role = 'RECORDS' AND r."reviewerId" <> p."recordedById", FALSE) AS "recordsApproved",
        COALESCE(m.decision = 'APPROVED' AND mu.active AND mu.role IN ('BATCH_MANAGER', 'GENERAL_MANAGER')
          AND m."reviewerId" = b."managerId" AND m."batchVersion" = b.version
          AND m."reviewerId" <> p."recordedById" AND m."reviewerId" <> r."reviewerId", FALSE) AS "managerApproved"
      FROM "Payment" p JOIN "Batch" b ON b.id = p."batchId"
      LEFT JOIN LATERAL (SELECT * FROM "PaymentOperationalReview" r WHERE r."paymentId" = p.id AND r.stage = 'RECORDS' AND r."evidenceVersion" = p."evidenceVersion" ORDER BY r."paymentVersion" DESC LIMIT 1) r ON TRUE
      LEFT JOIN "User" ru ON ru.id = r."reviewerId"
      LEFT JOIN LATERAL (SELECT * FROM "PaymentOperationalReview" m WHERE m."paymentId" = p.id AND m.stage = 'MANAGER' AND m."evidenceVersion" = p."evidenceVersion" ORDER BY m."paymentVersion" DESC LIMIT 1) m ON TRUE
      LEFT JOIN "User" mu ON mu.id = m."reviewerId"
      WHERE ${scope} AND ${payments}
    ), sources AS (
      SELECT id, 'PAYMENT'::text AS source, version AS "sourceVersion", "batchId", code AS "batchCode", status::text AS status,
        CASE WHEN status NOT IN ('PENDING', 'NEEDS_CLARIFICATION') THEN 'COMPLETE'
          WHEN status = 'NEEDS_CLARIFICATION' OR missing THEN 'HANDLER'
          WHEN NOT "recordsApproved" OR NOT "submissionComplete" THEN 'RECORDS' WHEN NOT "managerApproved" THEN 'MANAGER' ELSE 'FINANCE' END AS stage,
        CASE WHEN status = 'PENDING' AND NOT missing AND "recordsApproved" AND "managerApproved" AND "submissionComplete" THEN "managerAt"
          WHEN status = 'PENDING' AND NOT missing AND "recordsApproved" AND "submissionComplete" THEN GREATEST("recordsAt", "batchUpdatedAt")
          ELSE "updatedAt" END AS "waitingSince",
        CASE WHEN status NOT IN ('PENDING', 'NEEDS_CLARIFICATION') THEN NULL WHEN status = 'NEEDS_CLARIFICATION' OR missing THEN "handlerId" WHEN "recordsApproved" AND "submissionComplete" AND NOT "managerApproved" THEN "managerId" ELSE NULL END AS "responsibleId",
        (missing AND status IN ('PENDING', 'NEEDS_CLARIFICATION')) AS "missingReceipt", status = 'NEEDS_CLARIFICATION' AS returned
      FROM payment_evidence
      UNION ALL
      SELECT h.id, 'STATEMENT', h.version, h."batchId", b.code, CASE WHEN h."archivedAt" IS NOT NULL THEN 'ARCHIVED' ELSE h.status::text END,
        CASE WHEN h."archivedAt" IS NOT NULL OR h.status = 'REVIEWED' THEN 'COMPLETE' WHEN h.status = 'NEEDS_CLARIFICATION' THEN 'HANDLER' ELSE 'RECORDS' END,
        h."updatedAt", CASE WHEN h.status = 'NEEDS_CLARIFICATION' THEN b."handlerId" ELSE NULL END, FALSE, h.status = 'NEEDS_CLARIFICATION'
      FROM "GcashHistory" h JOIN "Batch" b ON b.id = h."batchId"
      WHERE ${scope} AND ${statements}
    ), observed AS (
      SELECT s.*, u.name AS "staffName", u.active AS "staffActive", u.role::text AS "staffRole",
        f.id AS "followUpId", f.version AS "followUpVersion", f.status AS "followUpStatus", f.note AS "followUpNote", f."dueAt",
        s.stage IN ('HANDLER', 'RECORDS') AS incomplete,
        (${reviewDueHours}::int IS NOT NULL AND s.stage IN ('RECORDS', 'MANAGER', 'FINANCE') AND s."waitingSince" < ${now}::timestamp - ${reviewDueHours}::int * INTERVAL '1 hour')
          OR COALESCE(f.status = 'OPEN' AND f."dueAt" < ${now}::timestamp, FALSE) AS overdue
      FROM sources s LEFT JOIN "User" u ON u.id = s."responsibleId"
      LEFT JOIN "OperationsFollowUp" f ON (s.source = 'PAYMENT' AND f."paymentId" = s.id) OR (s.source = 'STATEMENT' AND f."historyId" = s.id)
    )`;
}
