# 13 — Authentication, Roles & Account Schema

Better Auth owns identity, sessions, password recovery and MFA in the NestJS API.
Implementation: `apps/api-ts/src/auth/`; schema: `apps/api-ts/prisma/schema.prisma`.

`User` owns email, display name, active state, role and optional unique client link.
Customer accounts require a linked client; employee accounts do not link to a client.
`AuthAccount`, `AuthSession`, `AuthVerification` and `AuthTwoFactor` hold identity records.
Passwords use the application's scrypt encoding and never appear in responses or audits.

The API issues HTTP-only session cookies. The frontend caches display identity only and
checks `/api/auth/me` before using account permissions. Logout, revocation, account state
changes and retention erasure invalidate access. Staff MFA is enforced according to the
validated environment configuration; production requires the approved MFA policy.

Shared role/permission keys live in `packages/contracts/`. NestJS guards enforce permissions
and scope before services read or mutate records. Hidden sidebar items are only interface
convenience. Confidential HR access is separately granted and audited; a staff role alone
does not expose private applicant or employee records.

Provision accounts through `POST /api/accounts`. Development previews can seed all 11 roles
with `seed:demo`; the one-click preview route is disabled in production.

See [04-roles-access.md](04-roles-access.md), [42-confidential-hr-access.md](42-confidential-hr-access.md)
and [52-authentication-mfa.md](52-authentication-mfa.md).
