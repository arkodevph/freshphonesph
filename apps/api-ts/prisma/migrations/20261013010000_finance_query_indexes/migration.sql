-- Match payment pagination: equality filters first, then stable ordering keys.
CREATE INDEX "Payment_createdAt_id_idx" ON "Payment"("createdAt", "id");
CREATE INDEX "Payment_clientId_status_createdAt_id_idx" ON "Payment"("clientId", "status", "createdAt", "id");
CREATE INDEX "Payment_status_createdAt_id_idx" ON "Payment"("status", "createdAt", "id");

-- Match batch/date and status/date report predicates before aggregation.
CREATE INDEX "Payment_batchId_paymentDate_id_idx" ON "Payment"("batchId", "paymentDate", "id");
CREATE INDEX "Payment_status_paymentDate_id_idx" ON "Payment"("status", "paymentDate", "id");

-- The replacement indexes cover these leftmost prefixes; avoid duplicate write cost.
DROP INDEX "Payment_clientId_status_idx";
DROP INDEX "Payment_status_createdAt_idx";
