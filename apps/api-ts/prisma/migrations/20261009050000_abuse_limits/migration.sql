CREATE TABLE "AbuseBucket" (
  "key" TEXT NOT NULL,
  "count" INTEGER NOT NULL,
  "resetsAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AbuseBucket_pkey" PRIMARY KEY ("key")
);
CREATE INDEX "AbuseBucket_resetsAt_idx" ON "AbuseBucket"("resetsAt");
CREATE TABLE "AbuseStreamLease" (
  "id" UUID NOT NULL,
  "accountKey" TEXT NOT NULL,
  "addressKey" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AbuseStreamLease_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AbuseStreamLease_accountKey_expiresAt_idx" ON "AbuseStreamLease"("accountKey", "expiresAt");
CREATE INDEX "AbuseStreamLease_addressKey_expiresAt_idx" ON "AbuseStreamLease"("addressKey", "expiresAt");
CREATE INDEX "AbuseStreamLease_expiresAt_idx" ON "AbuseStreamLease"("expiresAt");
