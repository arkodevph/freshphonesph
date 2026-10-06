-- Existing batches remain unassigned until Records explicitly assigns them.
CREATE TABLE "Agent" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "code" VARCHAR(60) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Agent_code_key" ON "Agent"("code");
CREATE INDEX "Agent_active_name_id_idx" ON "Agent"("active", "name", "id");
ALTER TABLE "Batch" ADD COLUMN "handlerId" UUID, ADD COLUMN "agentId" UUID;
CREATE INDEX "Batch_handlerId_createdAt_id_idx" ON "Batch"("handlerId", "createdAt", "id");
CREATE INDEX "Batch_agentId_createdAt_id_idx" ON "Batch"("agentId", "createdAt", "id");
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_handlerId_fkey" FOREIGN KEY ("handlerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
