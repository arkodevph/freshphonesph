CREATE TYPE "GcashHistoryStatus" AS ENUM ('SUBMITTED', 'REVIEWED', 'NEEDS_CLARIFICATION');
CREATE TABLE "GcashHistory" (
  "id" UUID NOT NULL PRIMARY KEY,
  "batchId" UUID NOT NULL REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "periodStart" DATE NOT NULL,
  "periodEnd" DATE NOT NULL,
  "status" "GcashHistoryStatus" NOT NULL DEFAULT 'SUBMITTED',
  "revision" INTEGER NOT NULL DEFAULT 1 CHECK ("revision" > 0),
  "version" INTEGER NOT NULL DEFAULT 1 CHECK ("version" > 0),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GcashHistory_period_check" CHECK ("periodEnd" >= "periodStart")
);
CREATE UNIQUE INDEX "GcashHistory_batchId_periodStart_periodEnd_key" ON "GcashHistory"("batchId", "periodStart", "periodEnd");
CREATE INDEX "GcashHistory_status_createdAt_id_idx" ON "GcashHistory"("status", "createdAt", "id");
CREATE INDEX "GcashHistory_batchId_createdAt_id_idx" ON "GcashHistory"("batchId", "createdAt", "id");
CREATE TABLE "GcashHistorySubmission" (
  "id" UUID NOT NULL PRIMARY KEY,
  "historyId" UUID NOT NULL REFERENCES "GcashHistory"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "revision" INTEGER NOT NULL CHECK ("revision" > 0),
  "fileId" UUID NOT NULL REFERENCES "StoredFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "status" "GcashHistoryStatus" NOT NULL DEFAULT 'SUBMITTED',
  "note" VARCHAR(1000) NOT NULL DEFAULT '',
  "uploadedById" UUID NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewNote" VARCHAR(2000) NOT NULL DEFAULT '',
  "reviewedById" UUID REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "reviewedAt" TIMESTAMP(3),
  CONSTRAINT "GcashHistorySubmission_review_check" CHECK (
    ("status" = 'SUBMITTED' AND "reviewedById" IS NULL AND "reviewedAt" IS NULL) OR
    ("status" <> 'SUBMITTED' AND "reviewedById" IS NOT NULL AND "reviewedAt" IS NOT NULL AND length(trim("reviewNote")) > 0)
  )
);
CREATE UNIQUE INDEX "GcashHistorySubmission_fileId_key" ON "GcashHistorySubmission"("fileId");
CREATE UNIQUE INDEX "GcashHistorySubmission_historyId_revision_key" ON "GcashHistorySubmission"("historyId", "revision");
CREATE INDEX "GcashHistorySubmission_uploadedById_idx" ON "GcashHistorySubmission"("uploadedById");
CREATE INDEX "GcashHistorySubmission_reviewedById_idx" ON "GcashHistorySubmission"("reviewedById");
