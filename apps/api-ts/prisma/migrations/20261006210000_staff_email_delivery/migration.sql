-- CreateEnum
CREATE TYPE "StaffEmailKind" AS ENUM ('TASK_ASSIGNED', 'TASK_DUE_SOON', 'TASK_OVERDUE', 'FINANCE_PENDING', 'PAYMENT_VERIFIED', 'PAYMENT_REJECTED', 'PAYMENT_CLARIFICATION');

-- CreateEnum
CREATE TYPE "StaffEmailStatus" AS ENUM ('PENDING', 'SENDING', 'SENT', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "StaffEmailTemplate" (
    "kind" "StaffEmailKind" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "subject" VARCHAR(180) NOT NULL,
    "body" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffEmailTemplate_pkey" PRIMARY KEY ("kind")
);

-- CreateTable
CREATE TABLE "StaffNotificationConfig" (
    "key" VARCHAR(40) NOT NULL,
    "dueSoonHours" INTEGER NOT NULL DEFAULT 24,
    "overdueHours" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffNotificationConfig_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "StaffEmail" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "kind" "StaffEmailKind" NOT NULL,
    "taskId" UUID,
    "deadline" TIMESTAMP(3),
    "paymentId" UUID,
    "paymentVersion" INTEGER,
    "resultId" UUID,
    "dedupeKey" VARCHAR(240) NOT NULL,
    "recipientEmail" VARCHAR(254) NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "message" VARCHAR(1000) NOT NULL,
    "targetPath" VARCHAR(300) NOT NULL,
    "subjectTemplate" VARCHAR(180) NOT NULL,
    "bodyTemplate" TEXT NOT NULL,
    "renderedSubject" TEXT,
    "renderedBody" TEXT,
    "sender" VARCHAR(254),
    "status" "StaffEmailStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "totalAttempts" INTEGER NOT NULL DEFAULT 0,
    "nextAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "error" VARCHAR(250),
    "attemptId" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffEmail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StaffEmail_dedupeKey_key" ON "StaffEmail"("dedupeKey");

-- CreateIndex
CREATE INDEX "StaffEmail_status_nextAt_idx" ON "StaffEmail"("status", "nextAt");

-- CreateIndex
CREATE INDEX "StaffEmail_createdAt_id_idx" ON "StaffEmail"("createdAt", "id");

-- CreateIndex
CREATE INDEX "StaffEmail_userId_createdAt_idx" ON "StaffEmail"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "StaffEmail_taskId_idx" ON "StaffEmail"("taskId");

-- CreateIndex
CREATE INDEX "StaffEmail_paymentId_idx" ON "StaffEmail"("paymentId");

-- CreateIndex
CREATE INDEX "StaffEmail_resultId_idx" ON "StaffEmail"("resultId");

-- AddForeignKey
ALTER TABLE "StaffEmail" ADD CONSTRAINT "StaffEmail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffEmail" ADD CONSTRAINT "StaffEmail_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffEmail" ADD CONSTRAINT "StaffEmail_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffEmail" ADD CONSTRAINT "StaffEmail_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "PaymentResultAlert"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StaffNotificationConfig" ADD CONSTRAINT "StaffNotificationConfig_timing_check"
  CHECK ("dueSoonHours" BETWEEN 1 AND 168 AND "overdueHours" BETWEEN 0 AND 168 AND "version" > 0);
ALTER TABLE "StaffEmail" ADD CONSTRAINT "StaffEmail_attempts_check"
  CHECK ("attempts" >= 0 AND "totalAttempts" >= "attempts" AND "version" > 0);
ALTER TABLE "StaffEmail" ADD CONSTRAINT "StaffEmail_source_check" CHECK (
  ("kind" IN ('TASK_ASSIGNED', 'TASK_DUE_SOON', 'TASK_OVERDUE') AND "taskId" IS NOT NULL AND "deadline" IS NOT NULL
    AND "paymentId" IS NULL AND "paymentVersion" IS NULL AND "resultId" IS NULL)
  OR ("kind" = 'FINANCE_PENDING' AND "taskId" IS NULL AND "deadline" IS NULL
    AND "paymentId" IS NOT NULL AND "paymentVersion" IS NOT NULL AND "paymentVersion" > 0 AND "resultId" IS NULL)
  OR ("kind" IN ('PAYMENT_VERIFIED', 'PAYMENT_REJECTED', 'PAYMENT_CLARIFICATION') AND "taskId" IS NULL AND "deadline" IS NULL
    AND "paymentId" IS NOT NULL AND "paymentVersion" IS NOT NULL AND "paymentVersion" > 0 AND "resultId" IS NOT NULL)
);
