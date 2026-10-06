-- CreateEnum
CREATE TYPE "SupportAlertKind" AS ENUM ('SUPPORT_NEW_CASE', 'SUPPORT_ASSIGNED', 'SUPPORT_CUSTOMER_REPLY');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "StaffEmailKind" ADD VALUE 'SUPPORT_NEW_CASE';
ALTER TYPE "StaffEmailKind" ADD VALUE 'SUPPORT_ASSIGNED';
ALTER TYPE "StaffEmailKind" ADD VALUE 'SUPPORT_CUSTOMER_REPLY';

-- AlterTable
ALTER TABLE "StaffEmail" ADD COLUMN     "supportAlertId" UUID;

-- CreateTable
CREATE TABLE "SupportAlert" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "caseVersion" INTEGER NOT NULL,
    "kind" "SupportAlertKind" NOT NULL,
    "readAt" TIMESTAMP(3),
    "handledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupportAlert_userId_createdAt_id_idx" ON "SupportAlert"("userId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "SupportAlert_caseId_kind_handledAt_idx" ON "SupportAlert"("caseId", "kind", "handledAt");

-- CreateIndex
CREATE UNIQUE INDEX "SupportAlert_userId_caseId_caseVersion_kind_key" ON "SupportAlert"("userId", "caseId", "caseVersion", "kind");

-- CreateIndex
CREATE INDEX "StaffEmail_supportAlertId_idx" ON "StaffEmail"("supportAlertId");

-- AddForeignKey
ALTER TABLE "SupportAlert" ADD CONSTRAINT "SupportAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportAlert" ADD CONSTRAINT "SupportAlert_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "SupportCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffEmail" ADD CONSTRAINT "StaffEmail_supportAlertId_fkey" FOREIGN KEY ("supportAlertId") REFERENCES "SupportAlert"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SupportAlert" ADD CONSTRAINT "SupportAlert_version_check" CHECK ("caseVersion" > 0);
ALTER TABLE "StaffEmail" DROP CONSTRAINT "StaffEmail_source_check";
-- Text comparisons allow the new enum values within this migration transaction.
ALTER TABLE "StaffEmail" ADD CONSTRAINT "StaffEmail_source_check" CHECK (
  ("kind"::text IN ('TASK_ASSIGNED', 'TASK_DUE_SOON', 'TASK_OVERDUE') AND "taskId" IS NOT NULL AND "deadline" IS NOT NULL
    AND "paymentId" IS NULL AND "paymentVersion" IS NULL AND "resultId" IS NULL AND "supportAlertId" IS NULL)
  OR ("kind"::text = 'FINANCE_PENDING' AND "taskId" IS NULL AND "deadline" IS NULL
    AND "paymentId" IS NOT NULL AND "paymentVersion" IS NOT NULL AND "paymentVersion" > 0 AND "resultId" IS NULL AND "supportAlertId" IS NULL)
  OR ("kind"::text IN ('PAYMENT_VERIFIED', 'PAYMENT_REJECTED', 'PAYMENT_CLARIFICATION') AND "taskId" IS NULL AND "deadline" IS NULL
    AND "paymentId" IS NOT NULL AND "paymentVersion" IS NOT NULL AND "paymentVersion" > 0 AND "resultId" IS NOT NULL AND "supportAlertId" IS NULL)
  OR ("kind"::text IN ('SUPPORT_NEW_CASE', 'SUPPORT_ASSIGNED', 'SUPPORT_CUSTOMER_REPLY') AND "supportAlertId" IS NOT NULL
    AND "taskId" IS NULL AND "deadline" IS NULL AND "paymentId" IS NULL AND "paymentVersion" IS NULL AND "resultId" IS NULL)
);
