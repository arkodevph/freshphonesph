CREATE TYPE "DocumentStatus" AS ENUM ('SUBMITTED', 'APPROVED', 'NEEDS_CLARIFICATION');
CREATE TABLE "CustomerDocument" (
    "id" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "requirementKey" VARCHAR(60) NOT NULL,
    "fileId" UUID NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'SUBMITTED',
    "clarification" TEXT NOT NULL DEFAULT '',
    "reviewedById" UUID,
    "reviewedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomerDocument_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CustomerDocument_fileId_key" ON "CustomerDocument"("fileId");
CREATE INDEX "CustomerDocument_clientId_requirementKey_createdAt_idx" ON "CustomerDocument"("clientId", "requirementKey", "createdAt");
ALTER TABLE "CustomerDocument" ADD CONSTRAINT "CustomerDocument_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerDocument" ADD CONSTRAINT "CustomerDocument_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "StoredFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerDocument" ADD CONSTRAINT "CustomerDocument_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
