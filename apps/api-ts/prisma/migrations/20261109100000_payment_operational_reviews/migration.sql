ALTER TABLE "Payment" ADD COLUMN "evidenceVersion" INTEGER NOT NULL DEFAULT 1;
CREATE TABLE "PaymentOperationalReview" (
  "id" UUID NOT NULL,
  "paymentId" UUID NOT NULL REFERENCES "Payment"("id") ON DELETE RESTRICT,
  "reviewerId" UUID NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
  "stage" VARCHAR(16) NOT NULL CHECK ("stage" IN ('RECORDS', 'MANAGER')),
  "decision" VARCHAR(16) NOT NULL CHECK ("decision" IN ('APPROVED', 'RETURNED')),
  "notes" VARCHAR(1000) NOT NULL,
  "evidenceVersion" INTEGER NOT NULL,
  "paymentVersion" INTEGER NOT NULL,
  "batchVersion" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentOperationalReview_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PaymentOperationalReview_paymentId_paymentVersion_stage_key"
  ON "PaymentOperationalReview"("paymentId", "paymentVersion", "stage");

CREATE FUNCTION guard_payment_review_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Payment operational review history is immutable';
END;
$$;
CREATE TRIGGER "PaymentOperationalReview_append_only"
  BEFORE UPDATE OR DELETE ON "PaymentOperationalReview"
  FOR EACH ROW EXECUTE FUNCTION guard_payment_review_history();
