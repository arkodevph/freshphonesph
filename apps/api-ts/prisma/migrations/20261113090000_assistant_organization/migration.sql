CREATE TABLE "AssistantProject" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AssistantProject_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AssistantProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AssistantProject_id_userId_key" UNIQUE ("id", "userId")
);
CREATE INDEX "AssistantProject_userId_updatedAt_id_idx" ON "AssistantProject"("userId", "updatedAt", "id");
ALTER TABLE "AssistantConversation" ADD COLUMN "titleEdited" BOOLEAN NOT NULL DEFAULT false, ADD COLUMN "projectId" UUID;
ALTER TABLE "AssistantConversation" ADD CONSTRAINT "AssistantConversation_projectId_userId_fkey" FOREIGN KEY ("projectId", "userId") REFERENCES "AssistantProject"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "AssistantConversation_userId_projectId_updatedAt_id_idx" ON "AssistantConversation"("userId", "projectId", "updatedAt", "id");
