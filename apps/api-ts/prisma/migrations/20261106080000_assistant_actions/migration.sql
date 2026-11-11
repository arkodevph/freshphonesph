CREATE TABLE "AssistantAction" (
  "id" UUID NOT NULL,
  "actorId" UUID NOT NULL,
  "sessionHash" VARCHAR(64) NOT NULL,
  "operation" VARCHAR(100) NOT NULL,
  "input" JSONB NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "finishedAt" TIMESTAMP(3),
  "message" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssistantAction_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AssistantAction_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AssistantAction_status_check" CHECK ("status" IN ('pending','executing','succeeded','failed','cancelled'))
);
CREATE INDEX "AssistantAction_actorId_createdAt_idx" ON "AssistantAction"("actorId", "createdAt");
CREATE INDEX "AssistantAction_expiresAt_status_idx" ON "AssistantAction"("expiresAt", "status");
