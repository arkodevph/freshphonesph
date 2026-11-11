CREATE TABLE "OperationsMonitorPolicy" (
  id VARCHAR(20) PRIMARY KEY DEFAULT 'global',
  "reviewDueHours" INTEGER NOT NULL DEFAULT 24 CHECK ("reviewDueHours" BETWEEN 1 AND 8760),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0)
);
CREATE TABLE "OperationsFollowUp" (
  id UUID PRIMARY KEY,
  "paymentId" UUID UNIQUE REFERENCES "Payment"(id) ON DELETE RESTRICT,
  "historyId" UUID UNIQUE REFERENCES "GcashHistory"(id) ON DELETE RESTRICT,
  status VARCHAR(16) NOT NULL CHECK (status IN ('OPEN', 'RESOLVED')),
  note VARCHAR(1000) NOT NULL CHECK (length(btrim(note)) >= 2),
  "dueAt" TIMESTAMP(3),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CHECK (("paymentId" IS NOT NULL)::int + ("historyId" IS NOT NULL)::int = 1)
);
CREATE INDEX "OperationsFollowUp_status_dueAt_idx" ON "OperationsFollowUp"(status, "dueAt");
CREATE TABLE "OperationsFollowUpEvent" (
  id UUID PRIMARY KEY,
  "followUpId" UUID NOT NULL REFERENCES "OperationsFollowUp"(id) ON DELETE RESTRICT,
  "actorId" UUID NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT,
  status VARCHAR(16) NOT NULL CHECK (status IN ('OPEN', 'RESOLVED')),
  note VARCHAR(1000) NOT NULL CHECK (length(btrim(note)) >= 2),
  "dueAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "OperationsFollowUpEvent_followUpId_createdAt_id_idx" ON "OperationsFollowUpEvent"("followUpId", "createdAt", id);
CREATE FUNCTION guard_operations_followup_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Operations follow-up history is immutable'; END;
$$;
CREATE TRIGGER "OperationsFollowUpEvent_append_only" BEFORE UPDATE OR DELETE ON "OperationsFollowUpEvent"
  FOR EACH ROW EXECUTE FUNCTION guard_operations_followup_history();
