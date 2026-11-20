CREATE TYPE "PersonnelOnboardingStatus" AS ENUM ('PENDING', 'ENROLLED', 'REJECTED');

CREATE TABLE "PersonnelOnboarding" (
  "id" UUID NOT NULL,
  "submissionId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "role" "Role" NOT NULL,
  "supervisorId" UUID NOT NULL,
  "orientationCompletedAt" TIMESTAMP(3) NOT NULL,
  "trainingCompletedAt" TIMESTAMP(3) NOT NULL,
  "confirmedBy" TEXT NOT NULL,
  "evidenceNote" TEXT NOT NULL,
  "status" "PersonnelOnboardingStatus" NOT NULL DEFAULT 'PENDING',
  "submittedById" UUID NOT NULL,
  "decidedById" UUID,
  "accountId" UUID,
  "decisionReason" TEXT,
  "decidedAt" TIMESTAMP(3),
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PersonnelOnboarding_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PersonnelOnboarding_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PersonnelOnboarding_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PersonnelOnboarding_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PersonnelOnboarding_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PersonnelOnboarding_role_check" CHECK ("role" IN ('BATCH_MANAGER', 'HR_PAYROLL', 'FINANCE_OFFICER', 'RECORDS', 'KPI_OFFICER', 'OPERATIONS_COORDINATOR', 'CSR', 'PIONEER_AGENT', 'AGENT', 'BATCH_HANDLER')),
  CONSTRAINT "PersonnelOnboarding_decision_check" CHECK (
    ("status" = 'PENDING' AND "accountId" IS NULL AND "decidedById" IS NULL AND "decidedAt" IS NULL AND "decisionReason" IS NULL)
    OR ("status" = 'ENROLLED' AND "accountId" IS NOT NULL AND "decidedById" IS NOT NULL AND "decidedAt" IS NOT NULL)
    OR ("status" = 'REJECTED' AND "accountId" IS NULL AND "decidedById" IS NOT NULL AND "decidedAt" IS NOT NULL AND "decisionReason" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX "PersonnelOnboarding_submissionId_key" ON "PersonnelOnboarding"("submissionId");
CREATE UNIQUE INDEX "PersonnelOnboarding_accountId_key" ON "PersonnelOnboarding"("accountId");
CREATE UNIQUE INDEX "PersonnelOnboarding_pending_email_key" ON "PersonnelOnboarding"(lower("email")) WHERE "status" = 'PENDING';
CREATE INDEX "PersonnelOnboarding_status_createdAt_id_idx" ON "PersonnelOnboarding"("status", "createdAt", "id");
CREATE INDEX "PersonnelOnboarding_createdAt_id_idx" ON "PersonnelOnboarding"("createdAt", "id");
