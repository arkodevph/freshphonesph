# 52 — Better Auth migration and MFA

Implemented locally on 2026-10-09 for scope item #10. The approved
[architecture decision](20-v6-architecture-decision.md) supersedes the original
Supabase Auth choice with **Better Auth + PostgreSQL**. Neon production provisioning
remains separate; no client cloud services have been changed.

## Implemented behavior

- Better Auth 1.7.7, with its Prisma PostgreSQL adapter, owns credential sign-in,
  sessions, password changes/recovery, authenticator TOTP and recovery codes.
- The existing NestJS endpoints form a validated facade. The general Better Auth
  handler, public signup, social/passwordless login, arbitrary user updates/deletion,
  secret/code inspection and the internal demo endpoint are not mounted publicly.
- Account UUIDs, roles, client links, confidential HR grants and existing scrypt
  hashes are preserved. The configured password verifier supports the exact existing
  salt/hash encoding. SQL copies credentials and synchronizes future provisioning
  and password updates atomically; no plaintext password migration is needed.
- Migration `20261009030000_better_auth_mfa` invalidates legacy JWT/refresh sessions
  and password-reset links. Users sign in again. Legacy tables remain for recovery
  evidence; their tokens are no longer authenticated by the TypeScript API.
- A signed HTTP-only `fp_session` cookie replaces JWT access/refresh cookies.
  Production uses `__Secure-fp_session`, HTTPS and the same web origin through the
  `/api` reverse proxy. Cookies use `SameSite=Lax`, path `/api`; unsafe requests
  enforce the configured Origin. Never put tokens in localStorage.
- Sessions have an absolute seven-day expiry. Cookie caching and rolling renewal
  are disabled. Each API read and SSE tick checks the database session, active
  account, current role/grants and completed MFA. The compatibility `/auth/refresh`
  endpoint checks the managed session; it does not mint or rotate legacy tokens.
- Password/role/active/confidential-grant changes invalidate sessions and pending
  reset/MFA challenges at the database boundary. Password changes issue a new
  current session; reset ends every session and leaves MFA enabled.
- Reset codes are stored as SHA-256 identifiers, expire after 30 minutes, are
  single use, and are sent through the existing Resend/local-mail mechanism.
  Public recovery responses remain generic. Tokens stay in URL fragments in the
  web flow. Saved development mail is included in the retention copy inventory.
- Authenticator enrollment requires the password, saving recovery codes and a
  valid authenticator code. Secrets and recovery codes are encrypted by Better
  Auth using the configured secret. QR rendering happens locally in the browser.
- Enabled accounts receive an expiring challenge at password sign-in and have no
  authenticated access until TOTP or a recovery code succeeds. Recovery codes and
  challenge consumption are atomic across replicas. Trusted-device bypass is not
  exposed. PostgreSQL facade limits and the plugin's account lockout are retained.
- `/security` provides enrollment, code regeneration, optional MFA disable,
  session listings and revocation. It is linked from the staff account menu and
  customer Settings. Required staff MFA cannot be disabled. Account holders who
  lose both their authenticator and recovery codes must use the existing support
  contact; an administrative bypass/recovery workflow needs business approval.
- Production requires MFA for every staff role. Password-only staff sessions can
  access their account security flow but receive HTTP 412 from business/file/SSE
  routes until enrollment completes. Customers may enable MFA voluntarily.
- Identity writes and their audit entries use the same transaction and advisory
  fence as account decisions and retention. Expected failed verification commits
  failure counters. A database audit failure rolls back credential/MFA mutations.
- Retention deletes credentials, sessions, MFA secrets/codes and verification
  records, clears auth profile fields and prevents erased-account resurrection.

## Configuration and deployment boundary

```dotenv
BETTER_AUTH_SECRET=<generated random secret, at least 32 characters>
BETTER_AUTH_URL=http://localhost:4101/api/auth
AUTH_REQUIRE_STAFF_MFA=false
```

Use `AUTH_REQUIRE_STAFF_MFA=true` locally to rehearse mandatory enrollment.
Production requires an explicit generated Better Auth secret, an HTTPS auth URL
on the `WEB_ORIGIN`, and staff enforcement. `JWT_SECRET` is accepted only as a
local migration fallback; it cannot satisfy production configuration.

The production gateway must forward `/api/*`, cookies and Origin to NestJS, handle
SSE streaming and keep the private backend origin out of browser requests. Set
`NEXT_PUBLIC_API_URL` to the public web origin. Local development can continue
using the direct localhost API origin. Configure trusted proxy addresses/IP
handling only after the deployment topology is known; never accept arbitrary
forwarded IPs as authentication identity.

Keep the auth secret stable across replicas and restarts: it protects session
signatures and encrypted MFA material. Back it up privately with the approved
recovery procedure. Secret rotation requires an explicit tested migration; changing
it casually can make existing authenticators/recovery codes unreadable.

Use a maintained Node release supporting NodeNext/CommonJS-to-ESM interoperability
(Node 20.19+; local checks used Node 20.20.2). Prisma owns migrations; do not run a
second schema-migration system against the same database.

## Cutover and recovery

1. Freeze deployments and account writes; save a private database dump and private
   configuration backup. Keep previous code available and record the migration head.
2. Restore the dump to an isolated database, apply the migration and compare account,
   client, money, audit and file fingerprints. Check credential parity and revoked
   legacy sessions. Use dedicated synthetic records for auth/MFA tests.
3. Apply the migration to the intended environment; generate the Prisma client and
   start both API replicas with the same secret, trusted origin and required policy.
4. Verify every role, password recovery, session/SSE revocation, mandatory MFA,
   private-file access and retention.
5. If verification fails, stop traffic and investigate. Recover within maintenance
   using the tested backup/code/configuration pair or a reviewed forward fix. Never
   restore a stale database over later financial writes, or expose legacy auth as a
   live workaround for mandatory MFA. Capture any intervening writes before recovery.

Production rollout, client-owned sender/database/gateway provisioning, lost-both-factor
identity proofing, authenticator replacement policy, named UAT and production
load/two-replica recovery rehearsal remain open.

## Verification

- Real PostgreSQL auth/MFA integration tests cover migrated credentials, signed
  cookies/CSRF, mandatory staff gates, encryption/enrollment, challenge denial,
  code reuse/concurrency, expiry, regeneration/disable, recovery and access changes.
- A synthetic audit failure proves secret/code mutations roll back with the audit.
- An isolated restoration of the existing local database passed migration parity
  for identities/hashes, client records, payments/adjustments, audits and file metadata.
- Final full API regression: **152/152 passed** on a fresh, migrated PostgreSQL
  database, including all existing business modules and nine auth/MFA scenarios.
  Updated stale-session assertions expect immediate 401 revocation and reauthenticate
  before testing the changed role's permissions.
- API unit tests **62/62** and web tests **61/61** passed; run web tests with
  `NEXT_PUBLIC_API_BACKEND=typescript`. API typecheck/build and web production build
  passed. The initial web run without this backend selection exercised the legacy
  adapter and failed; the configured TypeScript run passed.

- Browser rehearsal on synthetic records passed: mandatory staff redirect, QR/TOTP
  enrollment, saved recovery-code sign-in, required-staff disable restriction,
  desktop/mobile rendering, no horizontal overflow and no page errors.
- Local database migration and private backup restoration passed. Production
  recovery/gateway evidence is still pending.
- A focused nine-scenario auth/MFA rerun passed after pinning Better Call's
  runtime Zod 4 dependency and asserting persisted failed-code counters. The full
  152-scenario run preceded the final Better Auth 1.7.7 version update. All nine
  authentication/MFA checks and API typecheck/build passed on that version.
- All four existing demo roles passed local sign-in, managed-session and security
  checks after cutover. They retain local optional MFA; production staff enforcement
  cannot be disabled.

Primary references: [Better Auth Prisma adapter](https://better-auth.com/docs/adapters/prisma),
[email/password](https://better-auth.com/docs/authentication/email-password),
[two-factor plugin](https://better-auth.com/docs/plugins/2fa) and
[session management](https://better-auth.com/docs/concepts/session-management).
The pinned package source and repository integration tests determine actual behavior.
