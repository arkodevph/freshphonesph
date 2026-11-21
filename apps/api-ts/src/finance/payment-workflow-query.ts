import type { FinancePaymentQueue } from "@freshphones/contracts";
import { Prisma } from "../generated/prisma/client";

/** All fragments use Payment p and Batch b. Keep current-evidence checks with the decision gate. */
function recordsApprovedSql() {
  return Prisma.sql`EXISTS (
    SELECT 1 FROM LATERAL (
      SELECT * FROM "PaymentOperationalReview" r
      WHERE r."paymentId" = p.id AND r.stage = 'RECORDS' AND r."evidenceVersion" = p."evidenceVersion"
      ORDER BY r."paymentVersion" DESC LIMIT 1
    ) r JOIN "User" ru ON ru.id = r."reviewerId" AND ru.active AND ru.role = 'RECORDS'
    WHERE r.decision = 'APPROVED' AND r."reviewerId" <> p."recordedById"
  )`;
}

function managerApprovedSql() {
  return Prisma.sql`EXISTS (
    SELECT 1 FROM LATERAL (
      SELECT * FROM "PaymentOperationalReview" r
      WHERE r."paymentId" = p.id AND r.stage = 'RECORDS' AND r."evidenceVersion" = p."evidenceVersion"
      ORDER BY r."paymentVersion" DESC LIMIT 1
    ) r JOIN LATERAL (
      SELECT * FROM "PaymentOperationalReview" m
      WHERE m."paymentId" = p.id AND m.stage = 'MANAGER' AND m."evidenceVersion" = p."evidenceVersion"
      ORDER BY m."paymentVersion" DESC LIMIT 1
    ) m ON TRUE
    JOIN "User" mu ON mu.id = m."reviewerId" AND mu.active AND mu.role IN ('BATCH_MANAGER', 'GENERAL_MANAGER')
    WHERE m.decision = 'APPROVED' AND m."reviewerId" = b."managerId" AND m."batchVersion" = b.version
      AND m."reviewerId" <> p."recordedById" AND m."reviewerId" <> r."reviewerId"
  )`;
}

export function financeStageSql() {
  return Prisma.sql`CASE
    WHEN p.status = 'NEEDS_CLARIFICATION' THEN 'clarification'
    WHEN p.status <> 'PENDING' THEN NULL
    WHEN EXISTS (SELECT 1 FROM "Client" member WHERE member.id = p."clientId" AND member."replacementCompletedAt" IS NOT NULL) THEN 'membership_closed'
    WHEN p."proofFileId" IS NULL OR NOT (${recordsApprovedSql()}) THEN 'waiting_records'
    WHEN NOT (${managerApprovedSql()}) THEN 'waiting_manager'
    WHEN EXISTS (SELECT 1 FROM submission_evidence_blockers(p."batchId", p."paymentDate")) THEN 'waiting_evidence'
    ELSE 'ready' END`;
}

export function financeQueueSql(queue: FinancePaymentQueue) {
  if (queue === "clarification") {
    return Prisma.sql`p.status = 'NEEDS_CLARIFICATION'`;
  }

  return queue === "waiting"
    ? Prisma.sql`p.status = 'PENDING' AND (${financeStageSql()}) <> 'ready'`
    : Prisma.sql`p.status = 'PENDING' AND (${financeStageSql()}) = ${queue}`;
}

export function financeReadySql() {
  return financeQueueSql("ready");
}
