-- Existing daily advertisements do not establish a total price or payment term.
-- Leave every existing listing without a plan until catalog staff enters its terms.
ALTER TABLE "CatalogItem"
  ADD COLUMN "planTotalAmount" DECIMAL(12,2),
  ADD COLUMN "planInstallmentCount" INTEGER,
  ADD COLUMN "planCadence" "Cadence",
  ADD CONSTRAINT "CatalogItem_plan_complete" CHECK (
    ("planTotalAmount" IS NULL AND "planInstallmentCount" IS NULL AND "planCadence" IS NULL)
    OR ("planTotalAmount" IS NOT NULL AND "planInstallmentCount" IS NOT NULL AND "planCadence" IS NOT NULL
      AND "planInstallmentCount" BETWEEN 1 AND 600
      AND "planTotalAmount" * 100 >= "planInstallmentCount")
  );
