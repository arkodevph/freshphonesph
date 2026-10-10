CREATE TYPE "HrActionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "HrActionRequest" (
  "id" UUID NOT NULL,
  "reviewId" UUID NOT NULL,
  "proposedById" UUID NOT NULL,
  "proposedAction" VARCHAR(500) NOT NULL,
  "rationale" TEXT NOT NULL,
  "status" "HrActionStatus" NOT NULL DEFAULT 'PENDING',
  "decidedById" UUID,
  "decisionReason" TEXT,
  "decidedAt" TIMESTAMP(3),
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HrActionRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "HrActionRequest_decision_state" CHECK (
    ("status" = 'PENDING' AND "decidedById" IS NULL AND "decisionReason" IS NULL AND "decidedAt" IS NULL)
    OR ("status" IN ('APPROVED', 'REJECTED') AND "decidedById" IS NOT NULL AND "decisionReason" IS NOT NULL AND "decidedAt" IS NOT NULL AND "decidedById" <> "proposedById")
  ),
  CONSTRAINT "HrActionRequest_version_positive" CHECK ("version" > 0),
  CONSTRAINT "HrActionRequest_proposedAction_not_blank" CHECK (length(btrim("proposedAction")) > 0),
  CONSTRAINT "HrActionRequest_rationale_not_blank" CHECK (length(btrim("rationale")) > 0)
);

CREATE INDEX "HrActionRequest_reviewId_createdAt_idx" ON "HrActionRequest"("reviewId", "createdAt");
CREATE INDEX "HrActionRequest_status_createdAt_idx" ON "HrActionRequest"("status", "createdAt");
CREATE INDEX "HrActionRequest_proposedById_createdAt_idx" ON "HrActionRequest"("proposedById", "createdAt");
CREATE UNIQUE INDEX "HrActionRequest_one_live_or_approved_per_review" ON "HrActionRequest"("reviewId") WHERE "status" IN ('PENDING', 'APPROVED');

ALTER TABLE "HrActionRequest" ADD CONSTRAINT "HrActionRequest_reviewId_fkey"
  FOREIGN KEY ("reviewId") REFERENCES "KpiReview"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HrActionRequest" ADD CONSTRAINT "HrActionRequest_proposedById_fkey"
  FOREIGN KEY ("proposedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HrActionRequest" ADD CONSTRAINT "HrActionRequest_decidedById_fkey"
  FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION prevent_hr_action_rewrite() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."id" IS DISTINCT FROM OLD."id"
    OR NEW."reviewId" IS DISTINCT FROM OLD."reviewId"
    OR NEW."proposedById" IS DISTINCT FROM OLD."proposedById"
    OR NEW."proposedAction" IS DISTINCT FROM OLD."proposedAction"
    OR NEW."rationale" IS DISTINCT FROM OLD."rationale"
    OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt"
    OR OLD."status" <> 'PENDING'
    OR NEW."status" NOT IN ('APPROVED', 'REJECTED')
    OR NEW."version" <> OLD."version" + 1 THEN
    RAISE EXCEPTION 'HR action requests are immutable after submission and decision';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "HrActionRequest_immutable_decisions"
BEFORE UPDATE ON "HrActionRequest" FOR EACH ROW EXECUTE FUNCTION prevent_hr_action_rewrite();

CREATE FUNCTION prevent_hr_action_delete() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'HR action requests cannot be deleted';
END;
$$;

CREATE TRIGGER "HrActionRequest_no_delete"
BEFORE DELETE ON "HrActionRequest" FOR EACH ROW EXECUTE FUNCTION prevent_hr_action_delete();
