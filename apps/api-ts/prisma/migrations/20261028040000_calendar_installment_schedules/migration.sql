ALTER TABLE "Batch"
  ADD COLUMN "firstDueDate" DATE,
  ADD COLUMN "monthEnd" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Batch" ADD CONSTRAINT "Batch_calendar_plan" CHECK (
  "firstDueDate" IS NULL OR (
    "contractPrice" IS NOT NULL AND "installmentCount" IS NOT NULL AND cadence IS NOT NULL
    AND "firstDueDate" >= "startDate" AND "firstDueDate" <= "endDate"
  )
);

ALTER TABLE "Batch" ADD CONSTRAINT "Batch_month_end_plan" CHECK (
  NOT "monthEnd" OR (
    "firstDueDate" IS NOT NULL AND cadence = 'MONTHLY'
    AND "firstDueDate" = (date_trunc('month', "firstDueDate") + interval '1 month - 1 day')::date
  )
);

ALTER TABLE "Batch" ADD CONSTRAINT "Batch_bi_monthly_start" CHECK (
  "firstDueDate" IS NULL OR cadence <> 'SEMIMONTHLY'
  OR EXTRACT(DAY FROM "firstDueDate") = 15
  OR "firstDueDate" = (date_trunc('month', "firstDueDate") + interval '1 month - 1 day')::date
);
