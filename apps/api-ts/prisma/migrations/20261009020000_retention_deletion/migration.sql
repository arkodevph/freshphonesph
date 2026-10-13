-- CreateEnum
CREATE TYPE "RetentionScope" AS ENUM ('APPLICANT', 'CUSTOMER', 'EMPLOYEE', 'PRIVATE_FILE');

-- CreateEnum
CREATE TYPE "RetentionPolicyStatus" AS ENUM ('DRAFT', 'ACTIVE', 'RETIRED');

-- CreateEnum
CREATE TYPE "RetentionRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'FILES_PENDING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "RetentionFileStatus" AS ENUM ('PENDING', 'RUNNING', 'FAILED', 'DELETED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "retentionErasedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "retentionErasedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "StoredFile" ADD COLUMN     "purgePending" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Applicant" ADD COLUMN     "retentionErasedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "RetentionPolicy" (
    "id" UUID NOT NULL,
    "scope" "RetentionScope" NOT NULL,
    "version" INTEGER NOT NULL,
    "days" INTEGER NOT NULL,
    "status" "RetentionPolicyStatus" NOT NULL DEFAULT 'DRAFT',
    "basis" TEXT NOT NULL,
    "backupInstructions" TEXT NOT NULL,
    "externalCopyInstructions" TEXT NOT NULL,
    "approvalReference" TEXT,
    "approvedById" UUID,
    "approvedAt" TIMESTAMP(3),
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RetentionPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetentionHold" (
    "id" UUID NOT NULL,
    "scope" "RetentionScope" NOT NULL,
    "subjectId" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedById" UUID,
    "releasedAt" TIMESTAMP(3),
    "releaseReason" TEXT,

    CONSTRAINT "RetentionHold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetentionRequest" (
    "id" UUID NOT NULL,
    "scope" "RetentionScope" NOT NULL,
    "subjectId" UUID NOT NULL,
    "policyId" UUID NOT NULL,
    "previewHash" VARCHAR(64) NOT NULL,
    "manifest" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "RetentionRequestStatus" NOT NULL DEFAULT 'PENDING',
    "version" INTEGER NOT NULL DEFAULT 1,
    "requestedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedById" UUID,
    "decidedAt" TIMESTAMP(3),
    "decisionReason" TEXT,
    "completedAt" TIMESTAMP(3),
    "followupById" UUID,
    "followupAt" TIMESTAMP(3),
    "followupReference" TEXT,

    CONSTRAINT "RetentionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetentionFileJob" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "fileId" UUID NOT NULL,
    "kind" VARCHAR(20) NOT NULL DEFAULT 'PRIVATE_FILE',
    "storageKey" VARCHAR(120),
    "status" "RetentionFileStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "leaseId" UUID,
    "leaseUntil" TIMESTAMP(3),
    "error" VARCHAR(250),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RetentionFileJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RetentionPolicy_scope_status_idx" ON "RetentionPolicy"("scope", "status");

-- CreateIndex
CREATE UNIQUE INDEX "RetentionPolicy_scope_version_key" ON "RetentionPolicy"("scope", "version");

-- CreateIndex
CREATE INDEX "RetentionHold_scope_subjectId_releasedAt_idx" ON "RetentionHold"("scope", "subjectId", "releasedAt");

-- CreateIndex
CREATE INDEX "RetentionRequest_status_createdAt_idx" ON "RetentionRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "RetentionRequest_scope_subjectId_idx" ON "RetentionRequest"("scope", "subjectId");

-- CreateIndex
CREATE INDEX "RetentionFileJob_requestId_status_idx" ON "RetentionFileJob"("requestId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "RetentionFileJob_fileId_key" ON "RetentionFileJob"("fileId");

-- AddForeignKey
ALTER TABLE "RetentionRequest" ADD CONSTRAINT "RetentionRequest_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "RetentionPolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetentionFileJob" ADD CONSTRAINT "RetentionFileJob_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "RetentionRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- No periods are seeded: the controller must approve each category before any erasure.
CREATE UNIQUE INDEX "RetentionPolicy_one_active" ON "RetentionPolicy"("scope") WHERE "status" = 'ACTIVE';
CREATE UNIQUE INDEX "RetentionRequest_one_open" ON "RetentionRequest"("scope", "subjectId") WHERE "status" IN ('PENDING', 'APPROVED', 'FILES_PENDING');
ALTER TABLE "RetentionPolicy" ADD CONSTRAINT "RetentionPolicy_valid_days" CHECK ("days" BETWEEN 1 AND 36500);
ALTER TABLE "RetentionFileJob" ADD CONSTRAINT "RetentionFileJob_valid_kind" CHECK ("kind" IN ('PRIVATE_FILE', 'LOCAL_MAIL'));
ALTER TABLE "RetentionFileJob" ADD CONSTRAINT "RetentionFileJob_completion" CHECK (
  ("status" = 'DELETED' AND "storageKey" IS NULL AND "deletedAt" IS NOT NULL) OR
  ("status" <> 'DELETED' AND "storageKey" IS NOT NULL AND "deletedAt" IS NULL));

CREATE FUNCTION guard_retention_policy() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Retention policies form permanent approval evidence' USING ERRCODE = '23514'; END IF;
  IF (to_jsonb(NEW) - ARRAY['status','approvedById','approvedAt','approvalReference']) IS DISTINCT FROM
     (to_jsonb(OLD) - ARRAY['status','approvedById','approvedAt','approvalReference']) THEN
    RAISE EXCEPTION 'Create a new retention policy revision' USING ERRCODE = '23514';
  END IF;
  IF NOT ((OLD."status" = 'DRAFT' AND NEW."status" = 'ACTIVE' AND NEW."approvedById" IS NOT NULL AND NEW."approvedAt" IS NOT NULL AND length(NEW."approvalReference") >= 5)
     OR (OLD."status" = 'ACTIVE' AND NEW."status" = 'RETIRED' AND
       (to_jsonb(NEW) - 'status') = (to_jsonb(OLD) - 'status'))) THEN
    RAISE EXCEPTION 'Invalid retention policy transition' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "RetentionPolicy_immutable" BEFORE UPDATE OR DELETE ON "RetentionPolicy" FOR EACH ROW EXECUTE FUNCTION guard_retention_policy();

CREATE FUNCTION guard_retention_request() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Deletion approval evidence cannot be deleted' USING ERRCODE = '23514'; END IF;
  IF (to_jsonb(NEW) - ARRAY['status','version','decidedById','decidedAt','decisionReason','completedAt','manifest','followupById','followupAt','followupReference']) IS DISTINCT FROM
     (to_jsonb(OLD) - ARRAY['status','version','decidedById','decidedAt','decisionReason','completedAt','manifest','followupById','followupAt','followupReference'])
    OR NEW."version" <> OLD."version" + 1
    OR NOT ((OLD."status" = 'PENDING' AND NEW."status" IN ('APPROVED','REJECTED'))
      OR (OLD."status" = 'APPROVED' AND NEW."status" IN ('REJECTED','FILES_PENDING','COMPLETED'))
      OR (OLD."status" = 'FILES_PENDING' AND NEW."status" = 'COMPLETED')
      OR (OLD."status" = 'COMPLETED' AND NEW."status" = 'COMPLETED' AND OLD."followupAt" IS NULL AND NEW."followupAt" IS NOT NULL)) THEN
    RAISE EXCEPTION 'Invalid deletion request transition' USING ERRCODE = '23514';
  END IF;
  IF NEW."decidedAt" IS NULL OR NEW."decidedById" IS NULL OR length(NEW."decisionReason") < 5 THEN
    RAISE EXCEPTION 'Human approval evidence is required' USING ERRCODE = '23514';
  END IF;
  IF (NEW."status" = 'COMPLETED') <> (NEW."completedAt" IS NOT NULL) THEN
    RAISE EXCEPTION 'Deletion completion timestamp does not match status' USING ERRCODE = '23514';
  END IF;
  IF NEW."followupAt" IS NOT NULL AND (NEW."status" <> 'COMPLETED' OR NEW."followupById" IS NULL OR length(NEW."followupReference") < 5) THEN
    RAISE EXCEPTION 'Completed erasure and follow up evidence are required' USING ERRCODE = '23514';
  END IF;
  IF OLD."status" = 'COMPLETED' AND
    (to_jsonb(NEW) - ARRAY['version','followupById','followupAt','followupReference']) IS DISTINCT FROM
    (to_jsonb(OLD) - ARRAY['version','followupById','followupAt','followupReference']) THEN
    RAISE EXCEPTION 'Completed erasure evidence is immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "RetentionRequest_transitions" BEFORE UPDATE OR DELETE ON "RetentionRequest" FOR EACH ROW EXECUTE FUNCTION guard_retention_request();

CREATE FUNCTION guard_erased_profile() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE scope_value "RetentionScope";
BEGIN
  IF OLD."retentionErasedAt" IS NOT NULL THEN
    RAISE EXCEPTION 'This personal profile was erased and cannot be restored or changed' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  IF NEW."retentionErasedAt" IS NOT NULL THEN
    scope_value := CASE TG_TABLE_NAME WHEN 'Applicant' THEN 'APPLICANT' WHEN 'Client' THEN 'CUSTOMER' ELSE 'EMPLOYEE' END;
    IF TG_TABLE_NAME = 'User' AND to_jsonb(NEW)->>'role' = 'CUSTOMER' THEN
      IF NOT EXISTS (SELECT 1 FROM "RetentionRequest" WHERE "scope" = 'CUSTOMER' AND "subjectId" = (to_jsonb(NEW)->>'clientId')::uuid AND "status" = 'APPROVED') THEN
        RAISE EXCEPTION 'Approved customer erasure is required' USING ERRCODE = '23514';
      END IF;
    ELSIF NOT EXISTS (SELECT 1 FROM "RetentionRequest" WHERE "scope" = scope_value AND "subjectId" = NEW."id" AND "status" = 'APPROVED') THEN
      RAISE EXCEPTION 'Approved erasure is required' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "User_erasure_guard" BEFORE UPDATE OR DELETE ON "User" FOR EACH ROW EXECUTE FUNCTION guard_erased_profile();
CREATE TRIGGER "Client_erasure_guard" BEFORE UPDATE OR DELETE ON "Client" FOR EACH ROW EXECUTE FUNCTION guard_erased_profile();
CREATE TRIGGER "Applicant_erasure_guard" BEFORE UPDATE OR DELETE ON "Applicant" FOR EACH ROW EXECUTE FUNCTION guard_erased_profile();

CREATE FUNCTION guard_erased_links() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE data jsonb := to_jsonb(NEW); client_id uuid; applicant_id uuid; task_id uuid; file_id uuid; user_id uuid;
BEGIN
  client_id := NULLIF(data->>'clientId', '')::uuid;
  applicant_id := NULLIF(data->>'applicantId', '')::uuid;
  task_id := NULLIF(data->>'taskId', '')::uuid;
  IF TG_TABLE_NAME = 'SupportMessage' THEN SELECT "clientId" INTO client_id FROM "SupportCase" WHERE "id" = (data->>'caseId')::uuid; END IF;
  IF client_id IS NOT NULL THEN
    PERFORM 1 FROM "Client" WHERE "id" = client_id AND "retentionErasedAt" IS NOT NULL FOR UPDATE;
    IF FOUND THEN RAISE EXCEPTION 'The customer profile has been erased' USING ERRCODE = '23514'; END IF;
  END IF;
  IF applicant_id IS NOT NULL THEN
    PERFORM 1 FROM "Applicant" WHERE "id" = applicant_id AND "retentionErasedAt" IS NOT NULL FOR UPDATE;
    IF FOUND THEN RAISE EXCEPTION 'The application has been erased' USING ERRCODE = '23514'; END IF;
  END IF;
  IF TG_TABLE_NAME = 'Task' THEN task_id := NEW."id"; END IF;
  IF task_id IS NOT NULL THEN
    PERFORM 1 FROM "Task" t JOIN "User" u ON u."id" IN (t."assigneeId", t."creatorId") WHERE t."id" = task_id AND u."retentionErasedAt" IS NOT NULL;
    IF FOUND THEN RAISE EXCEPTION 'A task participant has been erased' USING ERRCODE = '23514'; END IF;
  END IF;
  IF TG_TABLE_NAME = 'Task' THEN
    PERFORM 1 FROM "User" WHERE "id" IN (NEW."assigneeId", NEW."creatorId") AND "retentionErasedAt" IS NOT NULL;
    IF FOUND THEN RAISE EXCEPTION 'An erased account cannot participate in new work' USING ERRCODE = '23514'; END IF;
  END IF;
  file_id := COALESCE(NULLIF(data->>'storedFileId',''), NULLIF(data->>'fileId',''), NULLIF(data->>'proofFileId',''), NULLIF(data->>'attachmentFileId',''), NULLIF(data->>'imageFileId',''))::uuid;
  IF file_id IS NOT NULL THEN
    PERFORM 1 FROM "StoredFile" WHERE "id" = file_id AND "purgePending" FOR UPDATE;
    IF FOUND THEN RAISE EXCEPTION 'This file is awaiting deletion' USING ERRCODE = '23514'; END IF;
  END IF;
  RETURN NEW;
END $$;
DO $$ DECLARE table_name text; BEGIN
  FOREACH table_name IN ARRAY ARRAY['User','CustomerDocument','SupportCase','SupportMessage','ReleaseUpdate','Payment','ScheduleItem','ClientRequirement','RequirementDocument','ApplicantAttachment','LegalAcknowledgement','Task','TaskAttachment','KpiReview','CatalogItem'] LOOP
    EXECUTE format('CREATE TRIGGER %I BEFORE INSERT OR UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION guard_erased_links()', table_name || '_retention_links', table_name);
  END LOOP;
END $$;

CREATE FUNCTION guard_purge_pending() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."purgePending" THEN RAISE EXCEPTION 'A queued file cannot be changed' USING ERRCODE = '23514'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "StoredFile_purge_guard" BEFORE UPDATE ON "StoredFile" FOR EACH ROW EXECUTE FUNCTION guard_purge_pending();
