CREATE TABLE "CooRequestReplay" (
  "actorId" UUID NOT NULL,
  "keyHash" VARCHAR(64) NOT NULL,
  "fingerprint" VARCHAR(64) NOT NULL,
  "result" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CooRequestReplay_pkey" PRIMARY KEY ("actorId", "keyHash")
);

CREATE INDEX "CooRequestReplay_expiresAt_idx" ON "CooRequestReplay"("expiresAt");

-- Do not repeatedly scan expired tombstones while scrubbing response payloads.
CREATE INDEX "CooRequestReplay_pendingExpiry_idx" ON "CooRequestReplay"("expiresAt") WHERE result IS NOT NULL;
