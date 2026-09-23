CREATE TABLE "StoredFile" (
    "id" UUID NOT NULL,
    "storageKey" VARCHAR(120) NOT NULL,
    "originalName" VARCHAR(255) NOT NULL,
    "mimeType" VARCHAR(80) NOT NULL,
    "size" INTEGER NOT NULL,
    "uploadedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StoredFile_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "StoredFile_size_positive" CHECK ("size" > 0 AND "size" <= 5242880)
);

ALTER TABLE "Payment" ADD COLUMN "proofFileId" UUID;
CREATE UNIQUE INDEX "StoredFile_storageKey_key" ON "StoredFile"("storageKey");
CREATE INDEX "StoredFile_createdAt_idx" ON "StoredFile"("createdAt");
CREATE UNIQUE INDEX "Payment_proofFileId_key" ON "Payment"("proofFileId");
ALTER TABLE "StoredFile" ADD CONSTRAINT "StoredFile_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_proofFileId_fkey" FOREIGN KEY ("proofFileId") REFERENCES "StoredFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
