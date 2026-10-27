CREATE TYPE "InquiryStatus" AS ENUM ('NEW', 'CONTACTED', 'CLOSED');
CREATE TABLE "DeviceInquiry" (
  "id" UUID NOT NULL,
  "submissionId" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "phone" VARCHAR(30) NOT NULL,
  "email" VARCHAR(254) NOT NULL DEFAULT '',
  "deviceName" VARCHAR(160) NOT NULL,
  "message" VARCHAR(2000) NOT NULL DEFAULT '',
  "contactAcknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" "InquiryStatus" NOT NULL DEFAULT 'NEW',
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DeviceInquiry_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DeviceInquiry_submissionId_key" ON "DeviceInquiry"("submissionId");
CREATE INDEX "DeviceInquiry_status_createdAt_id_idx" ON "DeviceInquiry"("status", "createdAt", "id");
CREATE INDEX "DeviceInquiry_createdAt_id_idx" ON "DeviceInquiry"("createdAt", "id");
