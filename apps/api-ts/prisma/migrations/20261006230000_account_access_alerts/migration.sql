-- CreateEnum
CREATE TYPE "AccountAlertKind" AS ENUM ('ACCOUNT_CREATED', 'ACCOUNT_ROLE_CHANGED', 'ACCOUNT_ACTIVATED', 'ACCOUNT_DEACTIVATED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "StaffEmailKind" ADD VALUE 'ACCOUNT_CREATED';
ALTER TYPE "StaffEmailKind" ADD VALUE 'ACCOUNT_ROLE_CHANGED';
ALTER TYPE "StaffEmailKind" ADD VALUE 'ACCOUNT_ACTIVATED';
ALTER TYPE "StaffEmailKind" ADD VALUE 'ACCOUNT_DEACTIVATED';

-- AlterTable
ALTER TABLE "StaffEmail" ADD COLUMN     "accountAlertId" UUID;

-- CreateTable
CREATE TABLE "AccountAlert" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "accountVersion" INTEGER NOT NULL,
    "kind" "AccountAlertKind" NOT NULL,
    "accountName" VARCHAR(100) NOT NULL,
    "actorName" VARCHAR(100) NOT NULL,
    "previousRole" "Role",
    "role" "Role" NOT NULL,
    "previousActive" BOOLEAN,
    "active" BOOLEAN NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AccountAlert_userId_createdAt_id_idx" ON "AccountAlert"("userId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "AccountAlert_accountId_idx" ON "AccountAlert"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountAlert_userId_accountId_accountVersion_kind_key" ON "AccountAlert"("userId", "accountId", "accountVersion", "kind");

-- CreateIndex
CREATE INDEX "StaffEmail_accountAlertId_idx" ON "StaffEmail"("accountAlertId");

-- AddForeignKey
ALTER TABLE "AccountAlert" ADD CONSTRAINT "AccountAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountAlert" ADD CONSTRAINT "AccountAlert_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffEmail" ADD CONSTRAINT "StaffEmail_accountAlertId_fkey" FOREIGN KEY ("accountAlertId") REFERENCES "AccountAlert"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AccountAlert" ADD CONSTRAINT "AccountAlert_snapshot_check" CHECK (
  "accountVersion" > 0 AND role <> 'CUSTOMER' AND ("previousRole" IS NULL OR "previousRole" <> 'CUSTOMER') AND (
    (kind = 'ACCOUNT_CREATED' AND "previousRole" IS NULL AND "previousActive" IS NULL)
    OR (kind = 'ACCOUNT_ROLE_CHANGED' AND "previousRole" IS NOT NULL AND "previousActive" IS NOT NULL AND "previousRole" <> role)
    OR (kind = 'ACCOUNT_ACTIVATED' AND "previousRole" IS NOT NULL AND "previousActive" IS NOT NULL AND "previousActive" = false AND active = true)
    OR (kind = 'ACCOUNT_DEACTIVATED' AND "previousRole" IS NOT NULL AND "previousActive" IS NOT NULL AND "previousActive" = true AND active = false)
  )
);
ALTER TABLE "StaffEmail" DROP CONSTRAINT "StaffEmail_source_check";
-- Text comparisons allow enum additions within this migration transaction.
ALTER TABLE "StaffEmail" ADD CONSTRAINT "StaffEmail_source_check" CHECK (
  ("kind"::text IN ('TASK_ASSIGNED', 'TASK_DUE_SOON', 'TASK_OVERDUE') AND "taskId" IS NOT NULL AND "deadline" IS NOT NULL
    AND "paymentId" IS NULL AND "paymentVersion" IS NULL AND "resultId" IS NULL AND "supportAlertId" IS NULL AND "accountAlertId" IS NULL)
  OR ("kind"::text = 'FINANCE_PENDING' AND "taskId" IS NULL AND "deadline" IS NULL
    AND "paymentId" IS NOT NULL AND "paymentVersion" IS NOT NULL AND "paymentVersion" > 0 AND "resultId" IS NULL AND "supportAlertId" IS NULL AND "accountAlertId" IS NULL)
  OR ("kind"::text IN ('PAYMENT_VERIFIED', 'PAYMENT_REJECTED', 'PAYMENT_CLARIFICATION') AND "taskId" IS NULL AND "deadline" IS NULL
    AND "paymentId" IS NOT NULL AND "paymentVersion" IS NOT NULL AND "paymentVersion" > 0 AND "resultId" IS NOT NULL AND "supportAlertId" IS NULL AND "accountAlertId" IS NULL)
  OR ("kind"::text IN ('SUPPORT_NEW_CASE', 'SUPPORT_ASSIGNED', 'SUPPORT_CUSTOMER_REPLY') AND "supportAlertId" IS NOT NULL
    AND "taskId" IS NULL AND "deadline" IS NULL AND "paymentId" IS NULL AND "paymentVersion" IS NULL AND "resultId" IS NULL AND "accountAlertId" IS NULL)
  OR ("kind"::text IN ('ACCOUNT_CREATED', 'ACCOUNT_ROLE_CHANGED', 'ACCOUNT_ACTIVATED', 'ACCOUNT_DEACTIVATED') AND "accountAlertId" IS NOT NULL
    AND "taskId" IS NULL AND "deadline" IS NULL AND "paymentId" IS NULL AND "paymentVersion" IS NULL AND "resultId" IS NULL AND "supportAlertId" IS NULL)
);
