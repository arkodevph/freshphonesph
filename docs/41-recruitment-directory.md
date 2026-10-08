# Recruitment backlog search, paging and retained reviews

Implemented locally on `feature/reports-page`, **2026-10-07**. Named business UAT,
privacy/retention approval and production acceptance remain open. Local account seeds,
demo sign-in overlays, credentials and test databases are excluded from shared source.

## Staff workflow

Open `/system/recruitment`. Job and applicant searches now query the complete backlog,
with 20 records per page and matching counts. Search jobs by title, description,
location or employment type; filter open/closed openings. Search applicants by name,
email or role title, combine a hiring-status filter, or choose **View applicants** on
a job to scope the queue to that role. Applying or clearing filters returns to page one.
Refresh retains the applied scope and page; a vanished last page moves to the last
available page. Open-role, applicant and awaiting-review cards cover the whole backlog,
independently of directory filters. Awaiting review means Received or Reviewing.

Each selected applicant keeps their own unsaved status/notes and captured version in
the mounted page. Switching applicants, changing pages/filters and refreshing on window
focus preserve those drafts and the opening form. A selected applicant outside the
current results stays open with an explanatory message. Drafts are not stored in the
browser's persistent storage and do not survive a reload, navigation or loss of access.

Saving uses the version captured when the review began. A conflicting save returns 409
and retains the draft; there is no automatic version replacement or retry. A refresh that
finds a newer review also blocks saving. **Load latest review** fetches the exact applicant
for comparison. The reviewer explicitly chooses **Use latest review** to discard their
draft or **Keep my draft on latest review** to rebase it, then saves manually. Older read
responses cannot replace a newer comparison or saved review. Successful saves retain the
role title and private attachment metadata.

Counts and each directory have separate loading/error/retry states. Writes freeze the
submitted review/form and prevent duplicate clicks. Late responses are ignored after
selection/scope changes or unmounting; revoked recruitment access clears the private desk.
Job publication and versioned visibility changes remain available. The existing agent
preview/creation and full agent-directory link remain available under `AGENT_MANAGE`.

The subsequent [confidential HR increment](42-confidential-hr-access.md), implemented
on 2026-10-08, requires an explicit Owner grant for HR / Payroll or COO to read or
review applicants and their files. Owner access is automatic. Job management and
aggregate counts retain their existing permissions; loss of the confidential grant
removes private applicant drafts from the workspace.

## API and access

| Endpoint | Read scope |
| --- | --- |
| `GET /api/recruitment/jobs` | Optional `q` (trimmed, at most 100 characters), `status=OPEN\|CLOSED`, and `page` |
| `GET /api/recruitment/applicants` | Optional `q`, existing uppercase applicant `status`, UUID `jobId`, and `page` |
| `GET /api/recruitment/summary` | Unfiltered jobs, open jobs, applicants and awaiting-review counts |
| `GET /api/recruitment/jobs/:id` | Exact UUID opening and applicant count |
| `GET /api/recruitment/applicants/:id` | Exact UUID applicant, role title, reviewer and private attachment metadata |

Pages are integers from 1 to 100,000. Unknown keys, invalid statuses/UUIDs, oversized
searches and malformed pages return 400. Missing exact records return 404. Empty or
beyond-last-page queries retain their matching total. Both lists use deterministic
`createdAt DESC, id DESC` ordering; their rows/counts share a repeatable-read transaction.
Summary counts also share one consistent transaction. Offset pages describe the current
backlog; concurrent insertions can shift records between separate page requests.

Every directory, summary, exact detail, job/review write and attachment-content endpoint
keeps the existing server-enforced `RECRUITMENT_MANAGE` grant. Applicant list/detail,
review writes and attachment contents now also require `HR_CONFIDENTIAL`. Writes recheck the actor's
active status and current grant inside the existing serialized transaction, enforce the
captured version and audit successful human actions. This increment adds no role grants,
automated hiring decisions, payroll behavior or schema migration.

Attachment responses expose file ID/name/type/size, never storage keys. Bytes remain behind
the authenticated attachment endpoint. Applicant notes/messages/phone are not search fields.
Public careers still return only approved open-job fields; application and masked agent
verification behavior remain unchanged. The TypeScript workspace is selected by
`NEXT_PUBLIC_API_BACKEND=typescript`; Django remains a migration reference and its existing
frontend fallback is preserved.

## Verification and coworker acceptance

Verification passes **194 shared tests**: 50 API unit, 104 real PostgreSQL integration
and 40 web tests. Workspace typechecks and a clean production build pass. All 23
existing migrations apply successfully to a fresh test database. **Six production-browser
check groups** pass for full-backlog controls, retained drafts, conflict comparison and
explicit rebase/discard, independent retry/stale-response recovery, vanished-page recovery,
job visibility writes, mobile/dark keyboard access and revocation during an in-flight write.
All seven private overlays match their original backup byte for byte. A shadow Git index
passes the seed guard, and the real index remains empty.
The new tests cover query validation, full tied-timestamp backlogs, combined facets,
unfiltered totals, the complete role/anonymous matrix, private metadata/content access,
competing reviews, captured versions, audit evidence and actor revocation inside writes.
Client tests cover query/payload mapping, retained drafts, explicit conflict resolution
and stale responses. Browser checks use synthetic responses; PostgreSQL checks use a
dedicated fresh database ending in `_test`, with the seven local overlays excluded.

```bash
pnpm --filter @freshphones/contracts build
pnpm db:generate
DATABASE_URL="$TEST_DATABASE_URL" pnpm db:migrate
pnpm typecheck
pnpm test:api-ts
pnpm test:api-ts:integration
NEXT_PUBLIC_API_BACKEND=typescript pnpm --filter @fresh/web test
NEXT_PUBLIC_API_BACKEND=typescript pnpm build
```

For named Owner/HR UAT, use realistic staging backlogs over 20 jobs/applicants. Confirm
search/status/role combinations, counts, draft retention, two-reviewer conflicts, private
attachment access, keyboard/mobile usability and revocation. Record the approved human
review procedure. Applicant notices/retention, any legacy import and named UAT for
the implemented confidential grants remain open in
[36-scope-handoff.md](36-scope-handoff.md).
The implementation is packaged on `feature/reports-page` for review; deployment
and business acceptance remain separate tasks.
