ALTER TABLE "GcashHistory"
  ADD COLUMN "archivedAt" TIMESTAMP(3),
  ADD COLUMN "archiveReason" VARCHAR(1000) NOT NULL DEFAULT '',
  ADD COLUMN "archivedById" UUID;
ALTER TABLE "GcashHistory" ADD CONSTRAINT "GcashHistory_archivedById_fkey"
  FOREIGN KEY ("archivedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "GcashHistory_archivedAt_createdAt_id_idx" ON "GcashHistory"("archivedAt", "createdAt", "id");
ALTER TABLE "GcashPdfReading"
  ADD COLUMN "correctedData" JSONB,
  ADD COLUMN "correctionVersion" INTEGER NOT NULL DEFAULT 0;
CREATE TABLE "GcashReadingCorrection" (
  "id" UUID NOT NULL,
  "submissionId" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "rowIndex" INTEGER NOT NULL,
  "reason" VARCHAR(1000) NOT NULL,
  "before" JSONB NOT NULL,
  "after" JSONB NOT NULL,
  "editorId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GcashReadingCorrection_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "GcashReadingCorrection_reading_fkey" FOREIGN KEY ("submissionId") REFERENCES "GcashPdfReading"("submissionId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "GcashReadingCorrection_editorId_fkey" FOREIGN KEY ("editorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "GcashReadingCorrection_version_check" CHECK ("version" > 0 AND "rowIndex" BETWEEN 0 AND 999)
);
CREATE UNIQUE INDEX "GcashReadingCorrection_submissionId_version_key" ON "GcashReadingCorrection"("submissionId", "version");
CREATE INDEX "GcashReadingCorrection_editorId_idx" ON "GcashReadingCorrection"("editorId");
