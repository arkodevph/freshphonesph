CREATE TYPE "Cadence" AS ENUM ('WEEKLY', 'SEMIMONTHLY', 'MONTHLY');
ALTER TABLE "Batch" ADD COLUMN "contractPrice" DECIMAL(12,2),
  ADD COLUMN "installmentCount" INTEGER, ADD COLUMN "cadence" "Cadence";
-- Existing records have no agreed terms; leave them unset until reviewed.
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_plan_check" CHECK (
  ("contractPrice" IS NULL AND "installmentCount" IS NULL AND "cadence" IS NULL) OR
  ("contractPrice" IS NOT NULL AND "installmentCount" IS NOT NULL AND "cadence" IS NOT NULL
    AND "contractPrice" > 0 AND "installmentCount" BETWEEN 1 AND 600
    AND "contractPrice" * 100 >= "installmentCount")
);
ALTER TABLE "Client" ADD COLUMN "joinedAt" DATE,
  ADD COLUMN "unitModel" VARCHAR(100) NOT NULL DEFAULT '';
CREATE TABLE "ScheduleItem" (
  "id" UUID NOT NULL,
  "clientId" UUID NOT NULL,
  "sequenceNo" INTEGER NOT NULL CHECK ("sequenceNo" > 0),
  "dueDate" DATE NOT NULL,
  "expectedAmount" DECIMAL(12,2) NOT NULL CHECK ("expectedAmount" > 0),
  CONSTRAINT "ScheduleItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ScheduleItem_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ScheduleItem_clientId_sequenceNo_key" ON "ScheduleItem"("clientId", "sequenceNo");
