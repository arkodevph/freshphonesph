-- Preserve existing batch codes. Numbering metadata is populated only for new batches.
ALTER TABLE "Batch" ALTER COLUMN "code" TYPE VARCHAR(71);
ALTER TABLE "Batch" ADD COLUMN "numberingAgentId" UUID,
  ADD COLUMN "numberSequence" INTEGER;

CREATE TABLE "BatchNumberCounter" (
  "agentId" UUID NOT NULL PRIMARY KEY,
  "lastNumber" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "BatchNumberCounter_lastNumber_check" CHECK ("lastNumber" >= 0),
  CONSTRAINT "BatchNumberCounter_agentId_fkey" FOREIGN KEY ("agentId")
    REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

ALTER TABLE "Batch" ADD CONSTRAINT "Batch_numberingAgentId_fkey"
  FOREIGN KEY ("numberingAgentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_numbering_metadata_check" CHECK (
  ("numberingAgentId" IS NULL AND "numberSequence" IS NULL) OR
  ("numberingAgentId" IS NOT NULL AND "numberSequence" IS NOT NULL AND "numberSequence" > 0)
);
CREATE UNIQUE INDEX "Batch_numberingAgentId_numberSequence_key"
  ON "Batch"("numberingAgentId", "numberSequence");

-- Prefix lookup also covers historical mixed-case codes without scanning every batch.
CREATE INDEX "Batch_code_upper_pattern_idx" ON "Batch" (upper("code") text_pattern_ops);
