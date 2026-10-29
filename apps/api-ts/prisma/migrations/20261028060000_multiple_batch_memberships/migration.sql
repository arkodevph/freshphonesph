-- Client IDs remain membership IDs. Every existing identity starts separately;
-- equal names, phone numbers and email addresses never merge people implicitly.
CREATE TABLE "Member" (
  "id" UUID NOT NULL PRIMARY KEY,
  "name" VARCHAR(100) NOT NULL,
  "email" VARCHAR(254) NOT NULL,
  "phone" VARCHAR(25) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE "Client" ADD COLUMN "memberId" UUID;
INSERT INTO "Member" ("id", "name", "email", "phone", "createdAt", "updatedAt")
SELECT "id", "name", "email", "phone", "createdAt", "updatedAt" FROM "Client";
UPDATE "Client" SET "memberId" = "id";
ALTER TABLE "Client" ALTER COLUMN "memberId" SET NOT NULL;
ALTER TABLE "Client" ADD CONSTRAINT "Client_memberId_fkey"
  FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT;
CREATE UNIQUE INDEX "Client_memberId_batchId_key" ON "Client"("memberId", "batchId");

ALTER TABLE "User" ADD COLUMN "memberId" UUID;
UPDATE "User" u SET "memberId" = c."memberId"
FROM "Client" c WHERE u."clientId" = c."id";
ALTER TABLE "User" ADD CONSTRAINT "User_memberId_fkey"
  FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT;
CREATE UNIQUE INDEX "User_memberId_key" ON "User"("memberId");

-- Compatibility fields mirror the shared profile. Financial foreign keys and
-- membership dates/statuses remain unchanged. Direct legacy inserts also work.
CREATE FUNCTION sync_membership_identity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE profile "Member"%ROWTYPE; previous_context TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW."memberId" <> OLD."memberId" THEN
    RAISE EXCEPTION 'A membership cannot be relinked to another member' USING ERRCODE = '23514';
  END IF;
  IF NEW."retentionErasedAt" IS NOT NULL THEN RETURN NEW; END IF;
  SELECT * INTO profile FROM "Member" WHERE "id" = NEW."memberId" FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO "Member" ("id", "name", "email", "phone")
    VALUES (NEW."memberId", NEW."name", NEW."email", NEW."phone");
  ELSIF TG_OP = 'UPDATE' AND pg_trigger_depth() = 1
    AND (NEW."name", NEW."email", NEW."phone") IS DISTINCT FROM (OLD."name", OLD."email", OLD."phone") THEN
    previous_context := current_setting('freshphones.identity_membership', true);
    PERFORM set_config('freshphones.identity_membership', NEW."id"::text, true);
    UPDATE "Member" SET "name" = NEW."name", "email" = NEW."email", "phone" = NEW."phone", "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = NEW."memberId";
    PERFORM set_config('freshphones.identity_membership', coalesce(previous_context, ''), true);
  ELSE
    NEW."name" := profile."name"; NEW."email" := profile."email"; NEW."phone" := profile."phone";
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "Client_sync_member" BEFORE INSERT OR UPDATE ON "Client"
FOR EACH ROW EXECUTE FUNCTION sync_membership_identity();

CREATE FUNCTION sync_member_memberships() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE "Client" SET "name" = NEW."name", "email" = NEW."email", "phone" = NEW."phone",
    "version" = "version" + 1, "updatedAt" = CURRENT_TIMESTAMP
  WHERE "memberId" = NEW."id" AND "retentionErasedAt" IS NULL
    AND "id" <> coalesce(nullif(current_setting('freshphones.identity_membership', true), '')::uuid, '00000000-0000-0000-0000-000000000000'::uuid)
    AND ("name", "email", "phone") IS DISTINCT FROM (NEW."name", NEW."email", NEW."phone");
  RETURN NEW;
END $$;
CREATE TRIGGER "Member_sync_memberships" AFTER UPDATE OF "name", "email", "phone" ON "Member"
FOR EACH ROW EXECUTE FUNCTION sync_member_memberships();

CREATE FUNCTION link_member_account() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE linked UUID;
BEGIN
  IF NEW."clientId" IS NULL THEN
    NEW."memberId" := NULL;
  ELSE
    SELECT "memberId" INTO linked FROM "Client" WHERE "id" = NEW."clientId" AND "retentionErasedAt" IS NULL;
    IF linked IS NULL THEN RAISE EXCEPTION 'A live membership is required' USING ERRCODE = '23514'; END IF;
    IF NEW."memberId" IS NOT NULL AND NEW."memberId" <> linked THEN
      RAISE EXCEPTION 'Account and membership must belong to the same member' USING ERRCODE = '23514';
    END IF;
    NEW."memberId" := linked;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "User_link_member" BEFORE INSERT OR UPDATE OF "clientId", "memberId" ON "User"
FOR EACH ROW EXECUTE FUNCTION link_member_account();
