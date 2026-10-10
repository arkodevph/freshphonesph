ALTER TABLE "ChangeEvent" ADD COLUMN "publishedAt" TIMESTAMP(3);
CREATE INDEX "ChangeEvent_publishedAt_id_idx" ON "ChangeEvent"("publishedAt", "id");
ALTER TABLE "Notification" ADD COLUMN "emailAttemptId" UUID;
ALTER TABLE "Notification" ADD COLUMN "emailSubject" TEXT, ADD COLUMN "emailBody" TEXT,
  ADD COLUMN "emailSender" TEXT, ADD COLUMN "emailRecipient" TEXT;
ALTER TABLE "RetentionFileJob" ADD COLUMN "nextAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX "RetentionFileJob_status_nextAt_idx" ON "RetentionFileJob"("status", "nextAt");
