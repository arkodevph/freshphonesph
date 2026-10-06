CREATE TABLE "PaymentResultAlert" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "paymentVersion" INTEGER NOT NULL,
    "decision" "PaymentStatus" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "clientName" VARCHAR(200) NOT NULL,
    "batchCode" VARCHAR(30) NOT NULL,
    "notes" VARCHAR(1000) NOT NULL,
    "verifierName" VARCHAR(100) NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentResultAlert_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PaymentResultAlert_decision_check" CHECK ("decision" <> 'PENDING'),
    CONSTRAINT "PaymentResultAlert_version_check" CHECK ("paymentVersion" > 0)
);
CREATE UNIQUE INDEX "PaymentResultAlert_userId_paymentId_paymentVersion_key" ON "PaymentResultAlert"("userId", "paymentId", "paymentVersion");
CREATE INDEX "PaymentResultAlert_userId_createdAt_id_idx" ON "PaymentResultAlert"("userId", "createdAt", "id");
CREATE INDEX "PaymentResultAlert_paymentId_idx" ON "PaymentResultAlert"("paymentId");
ALTER TABLE "PaymentResultAlert" ADD CONSTRAINT "PaymentResultAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentResultAlert" ADD CONSTRAINT "PaymentResultAlert_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
