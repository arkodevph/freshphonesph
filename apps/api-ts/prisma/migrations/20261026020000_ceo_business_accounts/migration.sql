-- Existing OWNER accounts represent the business executive in the legacy model.
-- Preserve identities and history while separating them from technical administration.
BEGIN;

CREATE TEMP TABLE ceo_business_accounts ON COMMIT DROP AS
SELECT "id", "role", "version", "hrConfidentialAccess"
FROM "User"
WHERE "role" = 'OWNER';

UPDATE "User"
SET "role" = 'CEO', "hrConfidentialAccess" = false, "version" = "version" + 1,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" IN (SELECT "id" FROM ceo_business_accounts);

INSERT INTO "AuditEntry" ("id", "actorId", "action", "entity", "recordId", "before", "after", "createdAt")
SELECT gen_random_uuid(), "id", 'account.ceo_role_migrated', 'account', "id",
       jsonb_build_object('role', "role", 'version', "version", 'hrConfidentialAccess', "hrConfidentialAccess"),
       jsonb_build_object('role', 'CEO', 'version', "version" + 1, 'hrConfidentialAccess', false,
                          'source', '20261026020000_ceo_business_accounts',
                          'reason', 'Client-agreed report-only CEO; legacy business Owner mapping'),
       CURRENT_TIMESTAMP
FROM ceo_business_accounts;

-- AuthService rechecks the current database role on every request, including existing sessions.
-- The legacy OWNER code is reserved for separately provisioned technical administration;
-- this migration does not grant or create a replacement administrator account.
COMMIT;
