CREATE TABLE "AssistantConversation" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "title" VARCHAR(100) NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "state" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AssistantConversation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AssistantConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "AssistantConversation_userId_updatedAt_idx" ON "AssistantConversation"("userId", "updatedAt");
