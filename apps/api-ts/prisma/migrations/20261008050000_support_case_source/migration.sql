CREATE TYPE "SupportSource" AS ENUM (
  'UNRECORDED', 'CUSTOMER_PORTAL', 'MESSENGER', 'FACEBOOK', 'PHONE', 'WALK_IN', 'OTHER'
);

-- Existing cases have no reliable origin. Preserve that uncertainty.
ALTER TABLE "SupportCase" ADD COLUMN "source" "SupportSource" NOT NULL DEFAULT 'UNRECORDED';
CREATE INDEX "SupportCase_source_updatedAt_id_idx" ON "SupportCase"("source", "updatedAt", "id");

CREATE FUNCTION prevent_support_source_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."source" IS DISTINCT FROM OLD."source" THEN
    RAISE EXCEPTION 'Support case source cannot be changed after creation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "SupportCase_source_immutable"
BEFORE UPDATE ON "SupportCase" FOR EACH ROW EXECUTE FUNCTION prevent_support_source_change();
