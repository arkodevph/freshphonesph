import { Prisma } from "../generated/prisma/client";

/** Uses Payment p and Batch b; mirrors the current-evidence Finance decision gate. */
export function financeReadySql() {
  return Prisma.sql`NOT EXISTS (SELECT 1 FROM submission_evidence_blockers(p."batchId", p."paymentDate")) AND p.status = 'PENDING' AND p."proofFileId" IS NOT NULL AND EXISTS (
    SELECT 1
    FROM LATERAL (SELECT * FROM "PaymentOperationalReview" r
      WHERE r."paymentId" = p.id AND r.stage = 'RECORDS' AND r."evidenceVersion" = p."evidenceVersion"
      ORDER BY r."paymentVersion" DESC LIMIT 1) r
    JOIN "User" ru ON ru.id = r."reviewerId" AND ru.active AND ru.role = 'RECORDS'
    JOIN LATERAL (SELECT * FROM "PaymentOperationalReview" m
      WHERE m."paymentId" = p.id AND m.stage = 'MANAGER' AND m."evidenceVersion" = p."evidenceVersion"
      ORDER BY m."paymentVersion" DESC LIMIT 1) m ON TRUE
    JOIN "User" mu ON mu.id = m."reviewerId" AND mu.active AND mu.role IN ('BATCH_MANAGER', 'GENERAL_MANAGER')
    WHERE r.decision = 'APPROVED' AND m.decision = 'APPROVED'
      AND r."reviewerId" <> p."recordedById" AND m."reviewerId" <> p."recordedById"
      AND m."reviewerId" <> r."reviewerId" AND m."reviewerId" = b."managerId" AND m."batchVersion" = b.version
  )`;
}
