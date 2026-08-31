# 06 — Developer Role & Responsibilities

Clarifies exactly what the **developer** builds vs. what **Fresh Phones PH** must own. Based on
§14 (Privacy split), §15 (architecture), §16 (security), and §21 (handover). This boundary
protects both sides — the developer implements technical controls but does **not** become the
client's legal/privacy officer (§14).

> For the **per-developer** split across our 4-person team (who owns which module), see
> [10-team-roles.md](10-team-roles.md). This doc covers the developer-vs-client boundary.

## Developer responsibilities (build & deliver)

**Technical implementation of the agreed scope:**
- Public website + customer/employee portal frontend (Vercel).
- NestJS TypeScript backend/API and server-side business logic (Railway).
- Database (Supabase PostgreSQL, schema via **Prisma migrations**), API-issued JWT auth,
  and private file storage (Supabase Storage).
- Transactional email wiring (Resend).
- All modules M1–M11 per [05-modules.md](05-modules.md) to their acceptance criteria.

**Security & privacy controls (technical) (§14, §16):**
- Secure authentication, sessions, password reset.
- **Server-side** role/permission checks in NestJS guards (not UI-only); optional
  database-policy hardening.
- Private file storage with authenticated, temporary access.
- HTTPS, input/file validation, rate limiting.
- Audit logs for sensitive changes.
- Managed backups & recovery approach.
- Secrets kept in server env vars only (never in the frontend or repo).
- Least-privilege access per role.
- Implement retention/deletion **capability** so the client's policy can be applied.

**Process & delivery (§17, §21):**
- Follow the SDLC phases and milestone acceptance.
- Wireframes/prototype for approval before deep build.
- Staging/UAT environment for client acceptance testing.
- Bug fixes against the signed scope during the warranty period.
- Handover: production deployment, repository/access arrangement, basic admin/user
  documentation, credential/account ownership transfer.

## Client (Fresh Phones PH) responsibilities — NOT dev scope

**Legal / privacy / compliance (§14) — the developer must NOT silently absorb these:**
- Determine lawful purposes/bases for processing personal data.
- Prepare & approve the Privacy Notice, Terms & Conditions, and employee/applicant notices
  (developer implements the screens/links; client provides the wording, reviewed by counsel).
- **Appoint the DPO / privacy owner.**
- Decide **NPC registration vs exemption** with legal counsel (a lawyer-reviewed policy does
  not automatically replace NPC registration requirements).
- Provide lawful HR/payroll rules; decide any wage actions (the system never auto-deducts).
- Own the official **BIR invoicing** process (outside this V1 system).
- Approve final retention periods and breach/incident response process.

**Commercial / operational (§20):**
- Own & pay for production domain, hosting, database, email, and other third-party accounts
  (grant the developer build/maintenance access).
- Provide content: catalog data, FAQs, requirements, message templates, brand assets.
- Perform UAT and sign off milestones.

## Shared / collaborative
- Confirm final workflows, role matrix, data fields, and acceptance criteria in Discovery
  (Month 1) before development proceeds.
- Agree change requests when new/materially different features arise (§21).

## The guardrail principle
> The developer delivers a system that **can** be operated compliantly. Deciding and owning the
> legal, privacy, tax, and HR policies remains with Fresh Phones PH and its professional
> advisers (§14, §B). This is a software scope, **not** legal/tax/accounting/labor advice.
