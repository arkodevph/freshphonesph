CREATE TABLE "EvidenceRequirement" (
  id UUID PRIMARY KEY,
  "batchId" UUID NOT NULL REFERENCES "Batch"(id) ON DELETE RESTRICT,
  "clientId" UUID REFERENCES "Client"(id) ON DELETE RESTRICT,
  kind VARCHAR(16) NOT NULL CHECK (kind IN ('RECEIPT', 'STATEMENT')),
  description VARCHAR(500) NOT NULL CHECK (length(trim(description)) >= 3),
  "periodStart" DATE NOT NULL,
  "periodEnd" DATE NOT NULL CHECK ("periodEnd" >= "periodStart"),
  "paymentId" UUID REFERENCES "Payment"(id) ON DELETE RESTRICT,
  "historyId" UUID REFERENCES "GcashHistory"(id) ON DELETE RESTRICT,
  cancelled BOOLEAN NOT NULL DEFAULT FALSE,
  reason VARCHAR(1000) NOT NULL CHECK (length(trim(reason)) >= 3),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK ((kind = 'RECEIPT' AND "clientId" IS NOT NULL AND "historyId" IS NULL)
    OR (kind = 'STATEMENT' AND "clientId" IS NULL AND "paymentId" IS NULL))
);
CREATE INDEX "EvidenceRequirement_batchId_cancelled_periodStart_periodEnd_idx"
  ON "EvidenceRequirement" ("batchId", cancelled, "periodStart", "periodEnd");

CREATE UNIQUE INDEX "EvidenceRequirement_active_payment_key" ON "EvidenceRequirement" ("paymentId")
  WHERE NOT cancelled AND "paymentId" IS NOT NULL;

-- One company-wide rule. Periods come from explicit evidence requests or uploaded
-- statements, never from an assumed statement frequency or unpaid installments.
CREATE FUNCTION submission_evidence_blockers(batch_id UUID, on_date DATE)
RETURNS TABLE (kind TEXT, id UUID) LANGUAGE SQL STABLE AS $$
  WITH periods AS (
    SELECT "periodStart" AS start_date, "periodEnd" AS end_date
    FROM "EvidenceRequirement"
    WHERE "batchId" = batch_id AND NOT cancelled AND on_date BETWEEN "periodStart" AND "periodEnd"
    UNION
    SELECT "periodStart", "periodEnd" FROM "GcashHistory"
    WHERE "batchId" = batch_id AND "archivedAt" IS NULL AND on_date BETWEEN "periodStart" AND "periodEnd"
  )
  SELECT 'RECEIPT'::text, p.id FROM "Payment" p
  WHERE p."batchId" = batch_id AND p.status <> 'REJECTED'
    AND EXISTS (SELECT 1 FROM periods t WHERE p."paymentDate" BETWEEN t.start_date AND t.end_date)
    AND (p."proofFileId" IS NULL OR p.status = 'NEEDS_CLARIFICATION')
  UNION ALL
  SELECT 'STATEMENT', h.id FROM "GcashHistory" h
  WHERE h."batchId" = batch_id AND h."archivedAt" IS NULL
    AND on_date BETWEEN h."periodStart" AND h."periodEnd"
    AND NOT EXISTS (SELECT 1 FROM "GcashHistorySubmission" s
      JOIN "User" reviewer ON reviewer.id = s."reviewedById" AND reviewer.active AND reviewer.role = 'RECORDS'
      WHERE s."historyId" = h.id AND s.revision = h.revision AND s.status = 'REVIEWED'
        AND h.status = 'REVIEWED' AND s."reviewedById" <> s."uploadedById")
  UNION ALL
  SELECT 'EXPECTED', r.id FROM "EvidenceRequirement" r
  LEFT JOIN "Payment" p ON p.id = r."paymentId" AND p."batchId" = r."batchId" AND p."clientId" = r."clientId"
    AND p."paymentDate" BETWEEN r."periodStart" AND r."periodEnd" AND p.status IN ('PENDING', 'VERIFIED') AND p."proofFileId" IS NOT NULL
  LEFT JOIN "GcashHistory" h ON h.id = r."historyId" AND h."batchId" = r."batchId" AND h."archivedAt" IS NULL
    AND h."periodStart" <= r."periodStart" AND h."periodEnd" >= r."periodEnd" AND h.status = 'REVIEWED'
  WHERE r."batchId" = batch_id AND NOT r.cancelled AND on_date BETWEEN r."periodStart" AND r."periodEnd"
    AND ((r.kind = 'RECEIPT' AND p.id IS NULL) OR (r.kind = 'STATEMENT' AND (h.id IS NULL OR NOT EXISTS (
      SELECT 1 FROM "GcashHistorySubmission" s JOIN "User" reviewer ON reviewer.id = s."reviewedById"
      WHERE s."historyId" = h.id AND s.revision = h.revision AND s.status = 'REVIEWED'
        AND reviewer.active AND reviewer.role = 'RECORDS' AND s."reviewedById" <> s."uploadedById"))))
$$;
