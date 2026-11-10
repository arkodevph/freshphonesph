-- AlterTable
ALTER TABLE "Batch" ADD COLUMN     "managerId" UUID;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "agentProfileId" UUID,
ADD COLUMN     "supervisorId" UUID;

-- CreateTable
CREATE TABLE "EnrollmentRequest" (
    "id" UUID NOT NULL,
    "submissionId" UUID NOT NULL,
    "batchId" UUID NOT NULL,
    "submittedById" UUID NOT NULL,
    "reviewedById" UUID,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "applicant" JSONB NOT NULL,
    "reason" VARCHAR(1000) NOT NULL DEFAULT '',
    "clientId" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "EnrollmentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EnrollmentRequest_submissionId_key" ON "EnrollmentRequest"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "EnrollmentRequest_clientId_key" ON "EnrollmentRequest"("clientId");

-- CreateIndex
CREATE INDEX "EnrollmentRequest_submittedById_createdAt_id_idx" ON "EnrollmentRequest"("submittedById", "createdAt", "id");

-- CreateIndex
CREATE INDEX "EnrollmentRequest_status_batchId_createdAt_idx" ON "EnrollmentRequest"("status", "batchId", "createdAt");

-- CreateIndex
CREATE INDEX "Batch_managerId_createdAt_id_idx" ON "Batch"("managerId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "User_agentProfileId_key" ON "User"("agentProfileId");

-- CreateIndex
CREATE INDEX "User_supervisorId_active_role_idx" ON "User"("supervisorId", "active", "role");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_agentProfileId_fkey" FOREIGN KEY ("agentProfileId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentRequest" ADD CONSTRAINT "EnrollmentRequest_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentRequest" ADD CONSTRAINT "EnrollmentRequest_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentRequest" ADD CONSTRAINT "EnrollmentRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE "EnrollmentRequest" ADD CONSTRAINT "EnrollmentRequest_status_check" CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'));
ALTER TABLE "EnrollmentRequest" ADD CONSTRAINT "EnrollmentRequest_approval_check" CHECK ((status = 'APPROVED') = ("clientId" IS NOT NULL));
