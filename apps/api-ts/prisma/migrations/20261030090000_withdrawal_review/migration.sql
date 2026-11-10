-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "replacementCompletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ScheduleItem" ADD COLUMN     "releasedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "WithdrawalRequest" (
    "id" UUID NOT NULL,
    "submissionId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "requesterId" UUID NOT NULL,
    "reason" VARCHAR(5000) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'AWAITING_AGENT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "agentNote" VARCHAR(2000),
    "agentReviewedById" UUID,
    "reviewedAt" TIMESTAMP(3),
    "decisionNote" VARCHAR(2000),
    "decidedAt" TIMESTAMP(3),
    "replacedAt" TIMESTAMP(3),
    "replacementClientId" UUID,
    "replacementEnrollmentId" UUID,
    "replacementMode" VARCHAR(30),
    "replacementNote" VARCHAR(2000),
    "consultationNote" VARCHAR(2000),
    "restartPlan" JSONB,
    "policyFingerprint" VARCHAR(64),
    "policyVersion" INTEGER NOT NULL DEFAULT 0,
    "refundStatus" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "refundAmount" DECIMAL(12,2),
    "refundTargetDate" DATE,
    "refundNote" VARCHAR(2000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WithdrawalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WithdrawalEvent" (
    "id" UUID NOT NULL,
    "withdrawalId" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "action" VARCHAR(60) NOT NULL,
    "note" VARCHAR(5000) NOT NULL,
    "internal" BOOLEAN NOT NULL DEFAULT false,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WithdrawalEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WithdrawalPayout" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "withdrawalId" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paymentDate" DATE NOT NULL,
    "method" VARCHAR(40) NOT NULL,
    "reference" VARCHAR(120) NOT NULL,
    "note" VARCHAR(2000) NOT NULL,
    "recordedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WithdrawalPayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WithdrawalScheduleRelease" (
    "id" UUID NOT NULL,
    "withdrawalId" UUID NOT NULL,
    "scheduleItemId" UUID NOT NULL,
    "destinationScheduleItemId" UUID,
    "amount" DECIMAL(12,2) NOT NULL,
    "originalExpectedAmount" DECIMAL(12,2) NOT NULL,
    "paidAtCutover" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WithdrawalScheduleRelease_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WithdrawalRequest_submissionId_key" ON "WithdrawalRequest"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "WithdrawalRequest_replacementClientId_key" ON "WithdrawalRequest"("replacementClientId");

-- CreateIndex
CREATE INDEX "WithdrawalRequest_status_createdAt_id_idx" ON "WithdrawalRequest"("status", "createdAt", "id");

-- CreateIndex
CREATE INDEX "WithdrawalRequest_clientId_createdAt_id_idx" ON "WithdrawalRequest"("clientId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "WithdrawalEvent_withdrawalId_createdAt_id_idx" ON "WithdrawalEvent"("withdrawalId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "WithdrawalPayout_requestId_key" ON "WithdrawalPayout"("requestId");

-- CreateIndex
CREATE INDEX "WithdrawalPayout_withdrawalId_createdAt_id_idx" ON "WithdrawalPayout"("withdrawalId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "WithdrawalPayout_method_reference_key" ON "WithdrawalPayout"("method", "reference");

-- CreateIndex
CREATE UNIQUE INDEX "WithdrawalScheduleRelease_scheduleItemId_key" ON "WithdrawalScheduleRelease"("scheduleItemId");

-- CreateIndex
CREATE UNIQUE INDEX "WithdrawalScheduleRelease_destinationScheduleItemId_key" ON "WithdrawalScheduleRelease"("destinationScheduleItemId");

-- CreateIndex
CREATE INDEX "WithdrawalScheduleRelease_withdrawalId_idx" ON "WithdrawalScheduleRelease"("withdrawalId");

-- AddForeignKey
ALTER TABLE "WithdrawalRequest" ADD CONSTRAINT "WithdrawalRequest_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WithdrawalRequest" ADD CONSTRAINT "WithdrawalRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WithdrawalRequest" ADD CONSTRAINT "WithdrawalRequest_replacementClientId_fkey" FOREIGN KEY ("replacementClientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WithdrawalEvent" ADD CONSTRAINT "WithdrawalEvent_withdrawalId_fkey" FOREIGN KEY ("withdrawalId") REFERENCES "WithdrawalRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WithdrawalEvent" ADD CONSTRAINT "WithdrawalEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WithdrawalPayout" ADD CONSTRAINT "WithdrawalPayout_withdrawalId_fkey" FOREIGN KEY ("withdrawalId") REFERENCES "WithdrawalRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WithdrawalPayout" ADD CONSTRAINT "WithdrawalPayout_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WithdrawalScheduleRelease" ADD CONSTRAINT "WithdrawalScheduleRelease_withdrawalId_fkey" FOREIGN KEY ("withdrawalId") REFERENCES "WithdrawalRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WithdrawalScheduleRelease" ADD CONSTRAINT "WithdrawalScheduleRelease_scheduleItemId_fkey" FOREIGN KEY ("scheduleItemId") REFERENCES "ScheduleItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WithdrawalScheduleRelease" ADD CONSTRAINT "WithdrawalScheduleRelease_destinationScheduleItemId_fkey" FOREIGN KEY ("destinationScheduleItemId") REFERENCES "ScheduleItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Client" ADD COLUMN "membershipPlan" JSONB;
ALTER TABLE "ScheduleItem" ADD CONSTRAINT "ScheduleItem_release_bounds" CHECK ("releasedAmount" >= 0 AND "releasedAmount" <= "expectedAmount");
ALTER TABLE "WithdrawalRequest" ADD CONSTRAINT "WithdrawalRequest_status_check" CHECK ("status" IN ('AWAITING_AGENT','AWAITING_COO','CHANGES_REQUESTED','APPROVED','REJECTED','CANCELLED','REPLACED'));
ALTER TABLE "WithdrawalRequest" ADD CONSTRAINT "WithdrawalRequest_refund_check" CHECK (("refundStatus" = 'APPROVED' AND "refundAmount" > 0) OR ("refundStatus" IN ('PENDING','DECLINED') AND "refundAmount" IS NULL AND "refundTargetDate" IS NULL));
ALTER TABLE "WithdrawalPayout" ADD CONSTRAINT "WithdrawalPayout_amount_check" CHECK ("amount" > 0);
ALTER TABLE "WithdrawalScheduleRelease" ADD CONSTRAINT "WithdrawalScheduleRelease_amount_check" CHECK ("amount" > 0 AND "amount" <= "originalExpectedAmount" AND "paidAtCutover" >= 0);
CREATE UNIQUE INDEX "WithdrawalRequest_one_open_per_client" ON "WithdrawalRequest" ("clientId") WHERE "status" IN ('AWAITING_AGENT','AWAITING_COO','CHANGES_REQUESTED','APPROVED');

-- These rows are financial/audit evidence. Corrections must be a new explicit
-- workflow rather than changing the record of a completed transfer or payout.
ALTER TABLE "WithdrawalScheduleRelease" ADD CONSTRAINT "WithdrawalScheduleRelease_conservation_check"
  CHECK ("amount" + "paidAtCutover" = "originalExpectedAmount");
CREATE FUNCTION guard_withdrawal_evidence() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Withdrawal evidence is append-only; an approved disposition or compensating workflow is required';
END $$;
CREATE TRIGGER "WithdrawalEvent_append_only" BEFORE UPDATE OR DELETE ON "WithdrawalEvent"
  FOR EACH ROW EXECUTE FUNCTION guard_withdrawal_evidence();
CREATE TRIGGER "WithdrawalPayout_append_only" BEFORE UPDATE OR DELETE ON "WithdrawalPayout"
  FOR EACH ROW EXECUTE FUNCTION guard_withdrawal_evidence();
CREATE TRIGGER "WithdrawalScheduleRelease_append_only" BEFORE UPDATE OR DELETE ON "WithdrawalScheduleRelease"
  FOR EACH ROW EXECUTE FUNCTION guard_withdrawal_evidence();
