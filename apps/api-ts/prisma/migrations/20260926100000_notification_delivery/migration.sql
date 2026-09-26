ALTER TABLE "Notification" ADD COLUMN "emailStatus" VARCHAR(20) NOT NULL DEFAULT 'SENT';
ALTER TABLE "Notification" ALTER COLUMN "emailStatus" SET DEFAULT 'PENDING';
ALTER TABLE "Notification" ADD COLUMN "emailAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Notification" ADD COLUMN "emailNextAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Notification" ADD COLUMN "emailSentAt" TIMESTAMP(3);
ALTER TABLE "Notification" ADD COLUMN "emailError" VARCHAR(250);
ALTER TABLE "Notification" ADD COLUMN "dedupeKey" VARCHAR(180);
CREATE INDEX "Notification_emailStatus_emailNextAt_idx" ON "Notification"("emailStatus", "emailNextAt");
CREATE UNIQUE INDEX "Notification_dedupeKey_key" ON "Notification"("dedupeKey");
