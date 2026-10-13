-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "image" TEXT,
ADD COLUMN     "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "AuthAccount" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "password" TEXT,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthSession" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "mfaVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthVerification" (
    "id" UUID NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "userId" UUID,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthTwoFactor" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "secret" TEXT NOT NULL,
    "backupCodes" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "failedVerificationCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),

    CONSTRAINT "AuthTwoFactor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuthAccount_userId_idx" ON "AuthAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthAccount_providerId_accountId_key" ON "AuthAccount"("providerId", "accountId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_token_key" ON "AuthSession"("token");

-- CreateIndex
CREATE INDEX "AuthSession_userId_idx" ON "AuthSession"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthVerification_identifier_key" ON "AuthVerification"("identifier");

-- CreateIndex
CREATE INDEX "AuthVerification_userId_idx" ON "AuthVerification"("userId");

-- CreateIndex
CREATE INDEX "AuthVerification_expiresAt_idx" ON "AuthVerification"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "AuthTwoFactor_userId_key" ON "AuthTwoFactor"("userId");

-- AddForeignKey
ALTER TABLE "AuthAccount" ADD CONSTRAINT "AuthAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthVerification" ADD CONSTRAINT "AuthVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthTwoFactor" ADD CONSTRAINT "AuthTwoFactor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- Preserve identity/role/client links and the existing scrypt encoding. No plaintext password is needed.
INSERT INTO "AuthAccount" (id, "userId", "accountId", "providerId", password, "createdAt", "updatedAt")
SELECT gen_random_uuid(), id, id::text, 'credential', "passwordHash", "createdAt", "updatedAt"
FROM "User" WHERE "retentionErasedAt" IS NULL;
UPDATE "Session" SET "revokedAt" = CURRENT_TIMESTAMP WHERE "revokedAt" IS NULL;
UPDATE "PasswordReset" SET "usedAt" = CURRENT_TIMESTAMP WHERE "usedAt" IS NULL;

-- Keep credential provisioning atomic for all existing account creation paths, including private seeds.
CREATE FUNCTION sync_auth_credential() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."retentionErasedAt" IS NULL THEN
    INSERT INTO "AuthAccount" (id, "userId", "accountId", "providerId", password, "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), NEW.id, NEW.id::text, 'credential', NEW."passwordHash", NEW."createdAt", CURRENT_TIMESTAMP)
    ON CONFLICT ("providerId", "accountId") DO UPDATE SET password = EXCLUDED.password, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "AuthAccount".password IS DISTINCT FROM EXCLUDED.password;
  END IF;
  IF TG_OP = 'UPDATE' AND (NEW.active IS DISTINCT FROM OLD.active OR NEW.role IS DISTINCT FROM OLD.role OR
      NEW."hrConfidentialAccess" IS DISTINCT FROM OLD."hrConfidentialAccess" OR NEW."passwordHash" IS DISTINCT FROM OLD."passwordHash") THEN
    DELETE FROM "AuthSession" WHERE "userId" = NEW.id;
    DELETE FROM "AuthVerification" WHERE "userId" = NEW.id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER user_auth_credential AFTER INSERT OR UPDATE OF "passwordHash", active, role, "hrConfidentialAccess" ON "User"
FOR EACH ROW EXECUTE FUNCTION sync_auth_credential();

CREATE FUNCTION sync_auth_password() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."providerId" = 'credential' AND NEW.password IS NOT NULL THEN
    UPDATE "User" SET "passwordHash" = NEW.password WHERE id = NEW."userId" AND "passwordHash" IS DISTINCT FROM NEW.password;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER account_auth_password AFTER UPDATE OF password ON "AuthAccount" FOR EACH ROW EXECUTE FUNCTION sync_auth_password();

-- Prevent credential/session/MFA resurrection after retention, and attach reset/challenge records to their subject.
CREATE FUNCTION guard_auth_subject() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME = 'AuthVerification' AND NEW."userId" IS NULL THEN
    SELECT id INTO NEW."userId" FROM "User" WHERE id::text = NEW.value;
    IF NEW."userId" IS NULL AND NEW.identifier LIKE '2fa-attempts-%' THEN
      SELECT "userId" INTO NEW."userId" FROM "AuthVerification" WHERE identifier = substring(NEW.identifier FROM 14);
    END IF;
  END IF;
  IF NEW."userId" IS NOT NULL AND EXISTS (SELECT 1 FROM "User" WHERE id = NEW."userId" AND (NOT active OR "retentionErasedAt" IS NOT NULL)) THEN
    -- Inactive accounts retain their credential for later explicitly authorized reactivation.
    IF TG_TABLE_NAME <> 'AuthAccount' OR EXISTS (SELECT 1 FROM "User" WHERE id = NEW."userId" AND "retentionErasedAt" IS NOT NULL) THEN
      RAISE EXCEPTION 'Authentication subject is not active' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER auth_account_subject BEFORE INSERT OR UPDATE ON "AuthAccount" FOR EACH ROW EXECUTE FUNCTION guard_auth_subject();
CREATE TRIGGER auth_session_subject BEFORE INSERT OR UPDATE ON "AuthSession" FOR EACH ROW EXECUTE FUNCTION guard_auth_subject();
CREATE TRIGGER auth_factor_subject BEFORE INSERT OR UPDATE ON "AuthTwoFactor" FOR EACH ROW EXECUTE FUNCTION guard_auth_subject();
CREATE TRIGGER auth_verification_subject BEFORE INSERT OR UPDATE ON "AuthVerification" FOR EACH ROW EXECUTE FUNCTION guard_auth_subject();
