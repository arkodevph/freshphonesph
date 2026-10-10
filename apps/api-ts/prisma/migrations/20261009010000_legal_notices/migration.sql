CREATE TABLE "LegalDocumentVersion" (
  "id" UUID NOT NULL,
  "key" VARCHAR(40) NOT NULL,
  "version" VARCHAR(60) NOT NULL,
  "title" VARCHAR(160) NOT NULL,
  "content" JSONB NOT NULL,
  "contentHash" CHAR(64) NOT NULL,
  "publishedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LegalDocumentVersion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LegalDocumentVersion_key_check" CHECK ("key" IN ('CUSTOMER_PRIVACY', 'EMPLOYEE_PRIVACY', 'APPLICANT_PRIVACY', 'PORTAL_TERMS')),
  CONSTRAINT "LegalDocumentVersion_hash_check" CHECK ("contentHash" ~ '^[0-9a-f]{64}$')
);

CREATE UNIQUE INDEX "LegalDocumentVersion_key_version_key" ON "LegalDocumentVersion"("key", "version");

CREATE TABLE "LegalAcknowledgement" (
  "id" UUID NOT NULL,
  "documentId" UUID NOT NULL,
  "userId" UUID,
  "applicantId" UUID,
  "action" VARCHAR(20) NOT NULL,
  "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LegalAcknowledgement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LegalAcknowledgement_one_subject_check" CHECK (("userId" IS NOT NULL) <> ("applicantId" IS NOT NULL)),
  CONSTRAINT "LegalAcknowledgement_action_check" CHECK ("action" IN ('ACKNOWLEDGED', 'ACCEPTED'))
);

CREATE UNIQUE INDEX "LegalAcknowledgement_documentId_userId_key" ON "LegalAcknowledgement"("documentId", "userId");
CREATE UNIQUE INDEX "LegalAcknowledgement_documentId_applicantId_key" ON "LegalAcknowledgement"("documentId", "applicantId");
CREATE INDEX "LegalAcknowledgement_userId_acknowledgedAt_idx" ON "LegalAcknowledgement"("userId", "acknowledgedAt");
CREATE INDEX "LegalAcknowledgement_applicantId_acknowledgedAt_idx" ON "LegalAcknowledgement"("applicantId", "acknowledgedAt");

ALTER TABLE "LegalAcknowledgement" ADD CONSTRAINT "LegalAcknowledgement_documentId_fkey"
  FOREIGN KEY ("documentId") REFERENCES "LegalDocumentVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LegalAcknowledgement" ADD CONSTRAINT "LegalAcknowledgement_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LegalAcknowledgement" ADD CONSTRAINT "LegalAcknowledgement_applicantId_fkey"
  FOREIGN KEY ("applicantId") REFERENCES "Applicant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION prevent_legal_record_rewrite() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Published legal records are immutable';
END;
$$;

CREATE TRIGGER "LegalDocumentVersion_immutable"
BEFORE UPDATE OR DELETE ON "LegalDocumentVersion" FOR EACH ROW EXECUTE FUNCTION prevent_legal_record_rewrite();
CREATE TRIGGER "LegalAcknowledgement_immutable"
BEFORE UPDATE ON "LegalAcknowledgement" FOR EACH ROW EXECUTE FUNCTION prevent_legal_record_rewrite();
