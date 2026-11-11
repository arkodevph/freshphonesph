CREATE TABLE "StaffInboxNotification" (
  "id" UUID NOT NULL,
  "recipientId" UUID NOT NULL,
  "sourceKey" VARCHAR(240) NOT NULL,
  "entity" VARCHAR(30) NOT NULL,
  "sourceId" UUID NOT NULL,
  "kind" VARCHAR(60) NOT NULL,
  "payload" JSONB NOT NULL,
  "taskId" UUID,
  "paymentId" UUID,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "readAt" TIMESTAMP(3),
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StaffInboxNotification_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StaffInboxNotification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "StaffInboxNotification_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "StaffInboxNotification_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "StaffInboxNotification_recipientId_sourceKey_key" ON "StaffInboxNotification"("recipientId", "sourceKey");
CREATE INDEX "StaffInboxNotification_recipientId_deletedAt_occurredAt_id_idx" ON "StaffInboxNotification"("recipientId", "deletedAt", "occurredAt", "id");
CREATE INDEX "StaffInboxNotification_taskId_idx" ON "StaffInboxNotification"("taskId");
CREATE INDEX "StaffInboxNotification_paymentId_idx" ON "StaffInboxNotification"("paymentId");
