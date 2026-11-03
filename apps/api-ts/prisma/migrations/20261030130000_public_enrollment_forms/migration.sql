ALTER TYPE "RetentionScope" ADD VALUE 'PUBLIC_ENROLLMENT' BEFORE 'APPLICANT';

CREATE TYPE "PublicEnrollmentStatus" AS ENUM ('RECEIVED', 'FORWARDED', 'CLOSED');

CREATE TABLE "EnrollmentFormConfig" (
  "id" VARCHAR(20) NOT NULL DEFAULT 'singleton',
  "version" INTEGER NOT NULL DEFAULT 1,
  "definition" JSONB NOT NULL,
  "receivingAgentId" UUID,
  "publishedRevisionId" UUID,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EnrollmentFormConfig_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EnrollmentFormConfig_singleton" CHECK ("id" = 'singleton' AND "version" > 0)
);

CREATE TABLE "EnrollmentFormRevision" (
  "id" UUID NOT NULL,
  "number" INTEGER NOT NULL,
  "definition" JSONB NOT NULL,
  "receivingAgentId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EnrollmentFormRevision_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EnrollmentFormRevision_number_check" CHECK ("number" > 0)
);

CREATE TABLE "PublicEnrollmentApplication" (
  "id" UUID NOT NULL,
  "submissionId" UUID NOT NULL,
  "revisionId" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "email" VARCHAR(254) NOT NULL,
  "phone" VARCHAR(25) NOT NULL,
  "answers" JSONB NOT NULL,
  "assignedAgentId" UUID NOT NULL,
  "status" "PublicEnrollmentStatus" NOT NULL DEFAULT 'RECEIVED',
  "version" INTEGER NOT NULL DEFAULT 1,
  "enrollmentRequestId" UUID,
  "reviewedContact" JSONB,
  "closeReason" VARCHAR(1000) NOT NULL DEFAULT '',
  "retentionErasedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PublicEnrollmentApplication_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PublicEnrollmentApplication_version_check" CHECK ("version" > 0),
  CONSTRAINT "PublicEnrollmentApplication_link_check" CHECK (("status" = 'FORWARDED') = ("enrollmentRequestId" IS NOT NULL)),
  CONSTRAINT "PublicEnrollmentApplication_closed_check" CHECK ("status" <> 'CLOSED' OR "retentionErasedAt" IS NOT NULL OR LENGTH(TRIM("closeReason")) >= 3)
);

CREATE UNIQUE INDEX "EnrollmentFormConfig_publishedRevisionId_key" ON "EnrollmentFormConfig"("publishedRevisionId");
CREATE UNIQUE INDEX "EnrollmentFormRevision_number_key" ON "EnrollmentFormRevision"("number");
CREATE UNIQUE INDEX "PublicEnrollmentApplication_submissionId_key" ON "PublicEnrollmentApplication"("submissionId");
CREATE UNIQUE INDEX "PublicEnrollmentApplication_enrollmentRequestId_key" ON "PublicEnrollmentApplication"("enrollmentRequestId");
CREATE INDEX "PublicEnrollmentApplication_agent_status_created_idx" ON "PublicEnrollmentApplication"("assignedAgentId", "status", "createdAt", "id");
CREATE INDEX "PublicEnrollmentApplication_status_createdAt_id_idx" ON "PublicEnrollmentApplication"("status", "createdAt", "id");
CREATE INDEX "PublicEnrollmentApplication_revisionId_idx" ON "PublicEnrollmentApplication"("revisionId");

ALTER TABLE "EnrollmentFormConfig" ADD CONSTRAINT "EnrollmentFormConfig_receivingAgentId_fkey" FOREIGN KEY ("receivingAgentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EnrollmentFormConfig" ADD CONSTRAINT "EnrollmentFormConfig_publishedRevisionId_fkey" FOREIGN KEY ("publishedRevisionId") REFERENCES "EnrollmentFormRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EnrollmentFormRevision" ADD CONSTRAINT "EnrollmentFormRevision_receivingAgentId_fkey" FOREIGN KEY ("receivingAgentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PublicEnrollmentApplication" ADD CONSTRAINT "PublicEnrollmentApplication_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "EnrollmentFormRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PublicEnrollmentApplication" ADD CONSTRAINT "PublicEnrollmentApplication_assignedAgentId_fkey" FOREIGN KEY ("assignedAgentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PublicEnrollmentApplication" ADD CONSTRAINT "PublicEnrollmentApplication_enrollmentRequestId_fkey" FOREIGN KEY ("enrollmentRequestId") REFERENCES "EnrollmentRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION guard_enrollment_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Published enrollment form revisions are immutable' USING ERRCODE = '23514';
END;
$$;
CREATE TRIGGER "EnrollmentFormRevision_immutable" BEFORE UPDATE OR DELETE ON "EnrollmentFormRevision" FOR EACH ROW EXECUTE FUNCTION guard_enrollment_revision();

CREATE FUNCTION guard_public_enrollment_application() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Use approved retention erasure for public enrollment applications' USING ERRCODE = '23514';
  END IF;
  IF OLD."retentionErasedAt" IS NOT NULL THEN
    RAISE EXCEPTION 'An erased enrollment application cannot be changed or restored' USING ERRCODE = '23514';
  END IF;
  IF NEW."retentionErasedAt" IS NOT NULL THEN
    IF OLD."status" <> 'CLOSED' OR OLD."enrollmentRequestId" IS NOT NULL OR
      NOT EXISTS (SELECT 1 FROM "RetentionRequest" WHERE "scope" = 'PUBLIC_ENROLLMENT' AND "subjectId" = OLD."id" AND "status" = 'APPROVED') THEN
      RAISE EXCEPTION 'Approved erasure of a closed, unlinked application is required' USING ERRCODE = '23514';
    END IF;
    IF NEW."name" <> 'Erased enrollment applicant' OR NEW."email" <> '' OR NEW."phone" <> '' OR NEW."answers" <> '{}'::jsonb OR NEW."reviewedContact" IS NOT NULL OR NEW."closeReason" <> '' OR
      ROW(NEW."id",NEW."submissionId",NEW."revisionId",NEW."assignedAgentId",NEW."status",NEW."enrollmentRequestId",NEW."createdAt") IS DISTINCT FROM
      ROW(OLD."id",OLD."submissionId",OLD."revisionId",OLD."assignedAgentId",OLD."status",OLD."enrollmentRequestId",OLD."createdAt") THEN
      RAISE EXCEPTION 'The approved erasure must preserve enrollment routing and history' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;
  IF OLD."status" <> 'RECEIVED' THEN
    RAISE EXCEPTION 'Forwarded or closed enrollment applications are immutable' USING ERRCODE = '23514';
  END IF;
  IF ROW(NEW."id",NEW."submissionId",NEW."revisionId",NEW."name",NEW."email",NEW."phone",NEW."answers",NEW."createdAt") IS DISTINCT FROM
    ROW(OLD."id",OLD."submissionId",OLD."revisionId",OLD."name",OLD."email",OLD."phone",OLD."answers",OLD."createdAt") THEN
    RAISE EXCEPTION 'Original public enrollment answers are immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "PublicEnrollmentApplication_immutable" BEFORE UPDATE OR DELETE ON "PublicEnrollmentApplication" FOR EACH ROW EXECUTE FUNCTION guard_public_enrollment_application();
