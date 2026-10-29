ALTER TABLE "GcashHistorySubmission" ADD COLUMN "readingSummary" JSONB;
CREATE TABLE "GcashPdfReading" (
  "submissionId" UUID NOT NULL PRIMARY KEY REFERENCES "GcashHistorySubmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "data" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GcashPdfReading_version_check" CHECK ("data"->>'version' = '1'),
  CONSTRAINT "GcashPdfReading_rows_check" CHECK (jsonb_typeof("data"->'rows') = 'array' AND jsonb_array_length("data"->'rows') <= 1000)
);
