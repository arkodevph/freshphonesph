# 17 - Full Scope v6 Implementation Workflow

This is the execution workflow for **Full Scope v6, Revision 1.5 (September 2026)**. It turns
the signed scope into ordered delivery work, evidence, review gates, and change control.
Use it with the [scope traceability matrix](18-scope-traceability-matrix.md) and
[build status](BUILD_STATUS.md).

## Outcome

The target is a mobile-responsive operations platform with:

- a Next.js TypeScript frontend on a client-owned VPS;
- a separate NestJS TypeScript API on Railway;
- PostgreSQL and private S3-compatible storage on Supabase;
- Redis for cross-instance events, queues, and rate limiting;
- email through Resend;
- server-enforced role permissions and audited sensitive actions; and
- no direct website payment processing, official BIR invoice generation, or automatic wage
  decisions in Version 1.

The repository currently contains a working Django API. That code is the behavioral baseline
for the TypeScript migration, not the target backend. Do not remove it until the corresponding
NestJS slice passes parity tests and its cutover gate.

## Source-of-truth order

When two documents disagree, use this order:

1. The signed Full Scope v6 revision and approved change requests.
2. The non-negotiable safeguards in `AGENTS.md`.
3. This workflow and the traceability matrix.
4. Current implementation evidence in code, migrations, and tests.
5. Older design drafts in `docs/11` through `docs/15`.

The project deliberately applies one stricter rule than the PDF's optional AI wording:
the system does **not** compute, recommend, or apply salary deductions. It records objective
task facts; an authorized human enters any KPI or HR recommendation.

## Target TypeScript architecture

```text
Customer / employee browser
            |
            v
Next.js 16 web (VPS)
            |
            v
NestJS API (Railway, two replicas)
   |          |          |          |
   v          v          v          v
PostgreSQL  private S3  Redis      Resend
(Supabase)  storage     events/jobs email
```

| Concern | Target | Rule |
|---|---|---|
| Web | Next.js 16, React 19, TypeScript, Tailwind CSS v4 | UI is not a trusted authorization boundary |
| API | NestJS, TypeScript, REST | Controllers stay thin; services own writes and business rules |
| Data | PostgreSQL through Prisma migrations | Money uses decimal types; balances stay derived |
| Auth | Supabase Auth JWTs validated by the API | Supabase owns identity/session recovery; every protected route authenticates server-side |
| Authorization | Stable permission keys plus NestJS guards | Each route declares the permission it requires |
| Validation | DTO validation at the API boundary | Reject invalid money, state transitions, and file metadata |
| Files | Private Supabase Storage through S3-compatible signed URLs | No public customer, payment-proof, employee, or applicant files |
| Email | Resend from the API | Use approved templates and recipients only |
| Live updates | Authenticated SSE; Redis fan-out after a successful commit | Events carry only refresh identifiers; clients refetch authorized data after reconnecting |
| Background work | Redis-backed workers | Retries cover email, notifications, exports, document processing, reminders, and AI work; payment verification remains transactional |
| Tests | Unit, API integration, authorization matrix, and end-to-end tests | Every scope row needs repeatable evidence |

## Non-negotiable acceptance rules

These rules block a merge or release even when the screen appears to work:

1. Only a Finance-authorized, atomic verification changes the derived paid amount.
2. `remaining_balance = total_due - verified_paid`; it is never a mutable source column.
3. Task lateness is an objective timestamp comparison only. The system performs no wage action.
4. Statements and confirmations carry `not_official_bir_invoice`; no V1 document claims to be
   an official BIR invoice.
5. Public agent verification returns only name, masked code, and active status.
6. Permissions run in the API. Hidden navigation or buttons are never the only control.
7. Secrets stay in environment variables. Sensitive files stay private and use short-lived URLs.
8. Sensitive writes create an audit record with actor, action, target, timestamp, and relevant
   before/after facts.

## Status vocabulary

Use one status in the traceability matrix and implementation issues:

| Status | Meaning |
|---|---|
| `Not started` | No implementation evidence exists |
| `Skeleton` | Module or data contract exists but the user workflow is not usable |
| `Partial` | A working slice exists, but one or more scope acceptance items are missing |
| `Built` | The scoped behavior works locally and has automated evidence |
| `Accepted` | Fresh Phones PH passed UAT and signed off the scope row |
| `Blocked - client` | The next step requires client content, policy, account, or approval |

Do not mark a row `Built` from a model, route, or mock screen alone. It needs the user path,
server authorization, negative-path tests, and documented verification evidence.

## Delivery workflow

### Gate 0 - Confirm scope and migration rules

Complete before changing backend behavior:

1. Confirm the role matrix, customer document list, KPI workflow, reporting outputs, and
   retention requirements with Fresh Phones PH.
2. Record unresolved client decisions as `Blocked - client`; do not invent legal, tax, HR, or
   privacy policy.
3. Freeze stable public API paths where practical so the current frontend can move slice by
   slice from Django to NestJS.
4. Capture the current Django response contracts and the 80 discovered backend tests as
   migration evidence.
5. Approve the TypeScript stack and this workflow.

**Exit evidence:** approved matrix, named owners, resolved architecture decision, and no
unrecorded scope conflict.

### Gate 1 - Build the TypeScript foundation

Create the NestJS service under `apps/api-ts/` while the Django API remains available for
comparison.

1. Add NestJS, Prisma, PostgreSQL configuration, structured environment validation, and health
   checks.
2. Integrate Supabase Auth and individual employee/customer account linkage; validate its JWTs in the API.
3. Port stable permission keys and enforce them through API guards.
4. Add audit logging and private-storage signing as shared services.
5. Establish unit, integration, and authorization-matrix test helpers.

**Exit evidence:** migrations apply to a clean database, health/auth tests pass, an
under-privileged account receives `403`, and audit/private-storage tests pass.

### Gate 2 - Port the records spine

Port the data that every downstream module depends on:

1. batches, clients, and installment schedules;
2. customer portal account linkage;
3. requirements checklist and customer-document metadata;
4. private upload/download authorization; and
5. record search, filtering, and audit history.

Do not port payments before batch/client identifiers and schedule totals are stable.

**Exit evidence:** create batch, enroll client, generate schedule, attach a private document,
deny cross-client access, and verify an edit audit entry.

### Gate 3 - Port Finance and payment records

Implement the payment state machine as one vertical slice:

```text
external payment -> staff records pending claim -> Finance decision
                                             |-> verified -> derived balance changes
                                             |-> rejected -> balance unchanged
                                             `-> needs clarification -> balance unchanged
```

Required work:

1. Record positive decimal amounts against matching client and batch records.
2. Attach optional private proof and preserve its access restrictions.
3. Lock the payment row during a Finance decision and reject repeated decisions.
4. Derive balances from verified records only.
5. Generate Statement of Account and Payment Confirmation documents with the BIR disclaimer.
6. Notify the customer only after successful verification.

**Exit evidence:** concurrency, double-verification, rejected, clarification, partial-payment,
overpayment, statement, confirmation, proof-access, notification, and audit tests pass.

### Gate 4 - Port customer and operations workflows

Port complete user journeys, not isolated tables:

- customer portal: membership, schedule, verified history, balance, documents, release status,
  support, and notifications;
- tasks and KPI: assignment, submission timestamp, objective late flag, human review, and audit;
- customer service: create, assign, track, resolve, close, and report turnaround time; and
- recruitment/agents: public careers, minimized application data, internal review, and
  privacy-limited agent verification.

**Exit evidence:** own-record isolation tests, role-negative tests, full lifecycle tests, and
responsive UI checks for each journey.

### Gate 5 - Finish public site, reporting, and notifications

1. Complete catalog, payment breakdown, process, requirements, FAQs, careers, verification,
   login, and support entry points.
2. Add role-scoped dashboards, date filters, batch/payment reports, task/KPI reports, customer
   service metrics, required exports, and historical periods.
3. Add the in-app notification center, Finance alerts, customer status alerts, deadline
   reminders, read state, and approved templates.

**Exit evidence:** public pages are responsive and accessible; report exports contain only
authorized fields; notification retries do not duplicate records.

### Gate 6 - Add the assistive AI layer last

**Deferred — API funding unavailable (2026-10-08 user decision).** Skip this gate
for current delivery and continue with the remaining non-AI work. Resume only when
paid AI API funding is available and the user requests it; retain the requirements
below for that future work.

AI work starts only after role permissions and core records are stable.

Allowed behavior:

- answer workflow questions from approved knowledge;
- explain assigned tasks;
- summarize overdue tasks and submitted reports; and
- draft approved notification text for an authorized human workflow.

Disallowed behavior:

- writing or approving finance records;
- computing, recommending, or applying wage deductions;
- reassigning/completing tasks;
- accessing data outside the caller's permission scope; or
- autonomous outreach to unapproved recipients.

**Exit evidence:** prompt-injection, role-boundary, sensitive-data, no-write, and human-review
tests pass. Log model/provider, requesting user, approved data sources, and generated output
metadata without logging unnecessary private content.

### Gate 7 - Security, privacy, and production readiness

1. Validate file type/size, rate limits, CORS, HTTPS, secure headers, token expiry, and secret
   handling.
2. Complete backup/restore rehearsal and incident contacts.
3. Implement client-approved retention/deletion rules and notice/version acceptance.
4. Run the permission matrix against every protected endpoint.
5. Provision the client-owned VPS, Railway, Supabase, Redis, Cloudflare, and Resend accounts.

**Exit evidence:** security checklist, restore record, privacy checklist, production account
ownership record, and no high-severity release blocker.

### Gate 8 - UAT, cutover, and handover

1. Deploy a production-like staging environment.
2. Run UAT scenarios from the traceability matrix with named client reviewers.
3. Record defects separately from change requests.
4. Freeze writes during the final data migration, reconcile counts and money totals, then route
   traffic to NestJS.
5. Keep a tested rollback path until reconciliation and smoke tests pass.
6. Deliver admin/user guides, repository access, environment ownership, deployment notes, and
   the three-month warranty start record.

**Exit evidence:** signed UAT, reconciliation report, production smoke test, rollback record,
handover checklist, and acceptance date.

## Pull request workflow

Each implementation PR must identify:

- scope rows changed;
- API and UI behavior changed;
- permission keys used;
- migration and rollback impact;
- automated tests added or updated;
- privacy, money, BIR, HR, and public-data boundary impact; and
- traceability evidence to update after merge.

A reviewer checks the invariant tests before style or polish. Merge one usable vertical slice at
a time. Do not combine unrelated modules or silently remove behavior during migration.

## Change control

If a request is outside Full Scope v6 or changes an accepted workflow:

1. record the request and affected scope rows;
2. classify it as defect, clarification, or change request;
3. document timeline, cost, privacy, security, and migration impact;
4. obtain approval before implementation; and
5. update the matrix and acceptance tests with the approved decision.

Online checkout, official BIR invoicing, native mobile apps, automatic wage actions, full
payroll, paid Messenger/SMS integration, advanced BI, and unlimited post-sign-off revisions
remain out of scope unless separately approved.

## How to run a scope review

1. Open [18-scope-traceability-matrix.md](18-scope-traceability-matrix.md).
2. Pick the next row whose dependencies are `Built` or `Accepted`.
3. Open or update its implementation issue with the acceptance evidence listed here.
4. Implement and test the smallest complete vertical slice.
5. Update the row's status and evidence links in the same PR.
6. Request UAT only after every automated gate for that row passes.

## Related

- [Scope traceability matrix](18-scope-traceability-matrix.md)
- [Build status](BUILD_STATUS.md)
- [Modules](05-modules.md)
- [Roles and access](04-roles-access.md)
- [Compliance and security](07-compliance-security.md)
- [Commercial boundaries and handover](08-commercials-boundaries.md)
