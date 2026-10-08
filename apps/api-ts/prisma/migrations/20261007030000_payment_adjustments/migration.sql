CREATE TABLE "PaymentAdjustment" (
  "id" UUID NOT NULL,
  "paymentId" UUID NOT NULL,
  "actorId" UUID NOT NULL,
  "requestId" UUID NOT NULL,
  "sequence" INTEGER NOT NULL,
  "paymentVersion" INTEGER NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "beforeAmount" DECIMAL(12,2) NOT NULL,
  "afterAmount" DECIMAL(12,2) NOT NULL,
  "reason" VARCHAR(1000) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentAdjustment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PaymentAdjustment_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PaymentAdjustment_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PaymentAdjustment_amount_check" CHECK ("amount" <> 0 AND "beforeAmount" >= 0 AND "afterAmount" >= 0 AND "amount" = "afterAmount" - "beforeAmount"),
  CONSTRAINT "PaymentAdjustment_sequence_check" CHECK ("sequence" > 0 AND "paymentVersion" > 0),
  CONSTRAINT "PaymentAdjustment_reason_check" CHECK (length(btrim("reason")) >= 10)
);
CREATE UNIQUE INDEX "PaymentAdjustment_requestId_key" ON "PaymentAdjustment"("requestId");
CREATE UNIQUE INDEX "PaymentAdjustment_paymentId_sequence_key" ON "PaymentAdjustment"("paymentId", "sequence");
CREATE INDEX "PaymentAdjustment_createdAt_id_idx" ON "PaymentAdjustment"("createdAt", "id");

-- Protect append-only history and the credit chain even outside the API.
CREATE FUNCTION "enforce_payment_adjustment"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE payment "Payment"%ROWTYPE; previous "PaymentAdjustment"%ROWTYPE;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION 'Payment adjustments are immutable; append a new adjustment';
  END IF;
  PERFORM pg_advisory_xact_lock(740015);
  SELECT * INTO payment FROM "Payment" WHERE id = NEW."paymentId" FOR UPDATE;
  IF NOT FOUND OR payment.status <> 'VERIFIED' OR payment.version <> NEW."paymentVersion" THEN
    RAISE EXCEPTION 'Adjustments require the current verified payment';
  END IF;
  SELECT * INTO previous FROM "PaymentAdjustment" WHERE "paymentId" = NEW."paymentId" ORDER BY sequence DESC LIMIT 1;
  IF NEW.sequence <> COALESCE(previous.sequence, 0) + 1 OR NEW."beforeAmount" <> COALESCE(previous."afterAmount", payment.amount) THEN
    RAISE EXCEPTION 'Stale payment adjustment credit chain';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "PaymentAdjustment_append_only" BEFORE INSERT OR UPDATE OR DELETE ON "PaymentAdjustment"
  FOR EACH ROW EXECUTE FUNCTION "enforce_payment_adjustment"();
