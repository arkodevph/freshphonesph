CREATE TABLE "ReportAnalysis" (
  "id" UUID NOT NULL,
  "snapshotId" UUID NOT NULL,
  "body" TEXT NOT NULL,
  "submittedById" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReportAnalysis_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ReportAnalysis_body_length" CHECK (length(btrim("body")) BETWEEN 20 AND 4000)
);

CREATE UNIQUE INDEX "ReportAnalysis_snapshotId_key" ON "ReportAnalysis"("snapshotId");
CREATE INDEX "ReportAnalysis_submittedById_createdAt_idx" ON "ReportAnalysis"("submittedById", "createdAt");

ALTER TABLE "ReportAnalysis" ADD CONSTRAINT "ReportAnalysis_snapshotId_fkey"
  FOREIGN KEY ("snapshotId") REFERENCES "ReportSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReportAnalysis" ADD CONSTRAINT "ReportAnalysis_submittedById_fkey"
  FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION prevent_report_analysis_rewrite() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Submitted report analysis is immutable';
END;
$$;

CREATE TRIGGER "ReportAnalysis_immutable"
BEFORE UPDATE OR DELETE ON "ReportAnalysis" FOR EACH ROW EXECUTE FUNCTION prevent_report_analysis_rewrite();
