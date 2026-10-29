BEGIN;
CREATE TEMP TABLE role_alignment ON COMMIT DROP AS
SELECT id, role AS old_role, version,
 CASE role::text WHEN 'GENERAL_MANAGER' THEN 'BATCH_MANAGER' WHEN 'CORE_HANDLER' THEN 'BATCH_HANDLER' ELSE 'CSR' END AS next_role
FROM "User" WHERE role IN ('GENERAL_MANAGER', 'CORE_HANDLER', 'CS_HEAD', 'CS_TEAM');
UPDATE "User" u SET role = r.next_role::"Role", version = u.version + 1, "updatedAt" = CURRENT_TIMESTAMP
FROM role_alignment r WHERE r.id = u.id;
DELETE FROM "AuthSession" WHERE "userId" IN (SELECT id FROM role_alignment);
UPDATE "Session" SET "revokedAt" = CURRENT_TIMESTAMP WHERE "userId" IN (SELECT id FROM role_alignment) AND "revokedAt" IS NULL;
INSERT INTO "AuditEntry" (id, "actorId", action, entity, "recordId", before, after, "createdAt")
SELECT gen_random_uuid(), id, 'account.business_role_aligned', 'account', id,
 jsonb_build_object('role', old_role, 'version', version),
 jsonb_build_object('role', next_role, 'version', version + 1, 'source', '20261028030000_align_legacy_business_roles'), CURRENT_TIMESTAMP
FROM role_alignment;
COMMIT;
