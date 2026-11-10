-- Owner and CEO are the same report-only business role. Retain legacy enum values
-- in immutable history, but new/current accounts use CEO. Never merge identities.
BEGIN;
CREATE TEMP TABLE owner_ceo_alignment ON COMMIT DROP AS
SELECT id, role, version, "hrConfidentialAccess"
FROM "User" WHERE role = 'OWNER';
UPDATE "User" SET role = 'CEO', "hrConfidentialAccess" = false,
 version = version + 1, "updatedAt" = CURRENT_TIMESTAMP
WHERE id IN (SELECT id FROM owner_ceo_alignment);
DELETE FROM "AuthSession" WHERE "userId" IN (SELECT id FROM owner_ceo_alignment);
UPDATE "Session" SET "revokedAt" = CURRENT_TIMESTAMP
WHERE "userId" IN (SELECT id FROM owner_ceo_alignment) AND "revokedAt" IS NULL;
INSERT INTO "AuditEntry" (id, "actorId", action, entity, "recordId", before, after, "createdAt")
SELECT gen_random_uuid(), id, 'account.owner_ceo_aligned', 'account', id,
 jsonb_build_object('role', role, 'version', version, 'hrConfidentialAccess', "hrConfidentialAccess"),
 jsonb_build_object('role', 'CEO', 'version', version + 1, 'hrConfidentialAccess', false,
 'source', '20261028050000_merge_owner_ceo', 'reason', 'Owner and CEO are one report-only business role'), CURRENT_TIMESTAMP
FROM owner_ceo_alignment;
ALTER TABLE "User" ADD CONSTRAINT "User_owner_ceo_canonical" CHECK (role <> 'OWNER');
COMMIT;
