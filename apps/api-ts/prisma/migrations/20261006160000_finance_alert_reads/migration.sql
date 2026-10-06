CREATE TABLE "FinanceAlertRead" (
    "userId" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "seenVersion" INTEGER NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinanceAlertRead_pkey" PRIMARY KEY ("userId", "paymentId"),
    CONSTRAINT "FinanceAlertRead_seenVersion_check" CHECK ("seenVersion" > 0)
);
CREATE INDEX "FinanceAlertRead_paymentId_idx" ON "FinanceAlertRead"("paymentId");
CREATE INDEX "Payment_status_updatedAt_id_idx" ON "Payment"("status", "updatedAt", "id");
ALTER TABLE "FinanceAlertRead" ADD CONSTRAINT "FinanceAlertRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinanceAlertRead" ADD CONSTRAINT "FinanceAlertRead_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
