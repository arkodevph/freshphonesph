ALTER TABLE "Batch"
  ADD CONSTRAINT "Batch_date_order" CHECK ("endDate" >= "startDate");

ALTER TABLE "User"
  ADD CONSTRAINT "User_customer_link" CHECK (
    ("role" = 'CUSTOMER' AND "clientId" IS NOT NULL)
    OR ("role" <> 'CUSTOMER' AND "clientId" IS NULL)
  );
