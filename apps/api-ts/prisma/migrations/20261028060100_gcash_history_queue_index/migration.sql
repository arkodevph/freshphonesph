-- Support the default cross-batch Records queue as well as status/batch-filtered queues.
CREATE INDEX "GcashHistory_createdAt_id_idx" ON "GcashHistory"("createdAt", "id");
