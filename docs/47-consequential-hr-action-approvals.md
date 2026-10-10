# Consequential HR action approvals

Implemented locally on `feature/reports-page`, 2026-10-08, for the user's decision:
**Owner decides; explicitly approved HR / Payroll and COO staff submit requests.**
The private workspace is `/system/hr-actions`.

## Workflow

1. A person with confidential HR access records a human KPI review of a submitted task.
   Only a review marked **Action recommended** can support an action request.
2. An HR / Payroll or COO account with an individual Owner grant chooses that review,
   describes a proposed action and records its reason and context. The request is
   submitted as **Pending** and cannot be edited afterward.
3. The Owner reads the recorded task fact, human evaluation, recommendation, proposed
   action and reason. The Owner records **Approved** or **Rejected** with a separate
   reason. A stale or repeated decision is rejected; the first decision is final.
4. A rejection permits a new, separately recorded proposal for the same review.
   A pending or approved proposal prevents another request for that review. History
   remains visible; it is not overwritten.

Approved HR / COO staff see their own requests and all KPI reviews eligible for a
request. The Owner sees all requests and decisions. Other roles and customers have
no access. Removing the individual confidential grant removes access immediately,
including from existing sessions. The page clears private state when identity or
permission changes. Lists are paged at 20 records and may be filtered by status.

**Approval records the Owner's decision only.** It does not update a task, KPI review,
employee account, wage or payroll amount, and does not notify an employee or execute
the proposed action. Any subsequent human employment process needs an approved
written policy and separate business/legal review. The Philippine Department of
Labor and Employment's [Labor Code, Book III, Article 113](https://dole.gov.ph/book-3-conditions-of-employment/)
restricts wage deductions; this workflow does not determine whether a particular
action is legally permissible.

## API and records

- `GET /api/hr-actions?page=&status=` returns all requests to the Owner and only the
  caller's requests to approved HR / COO staff.
- `GET /api/hr-actions/eligible-reviews?page=` returns recommended KPI reviews without
  a pending or approved request to approved HR / COO staff.
- `POST /api/hr-actions` accepts a KPI review ID, a 3–500 character proposed action,
  and a 10–5,000 character rationale.
- `POST /api/hr-actions/:id/decision` accepts the captured positive version, an
  `APPROVED` or `REJECTED` decision, and a 10–5,000 character Owner reason.

All requests use the existing cookie/session and origin protection. Server-side
permission checks and a fresh database role/grant check run inside serialized write
transactions. The `20261008040000_hr_action_approvals` migration adds the request
and status records. Database checks require complete decision fields, a partial
unique index prevents overlapping pending/approved requests, and triggers reject
proposal rewrites, final-decision edits and deletion. Submission and decision each
write an audit entry and change event in the same transaction. No data backfill is
needed; existing KPI reviews remain unchanged and eligible by their recorded decision.
Live event identifiers are sent only to the Owner and the request's proposer while
their current confidential access remains valid. The page also offers a manual
refresh so another eligible proposer can check whether a review is still available.
All **27 migrations** apply to both a fresh isolated test database and the local
preview; a local preview backup was taken before the additive migration.

## Verification and acceptance

The isolated PostgreSQL integration suite covers role and anonymous access, strict
request validation, non-recommended reviews, rejection and resubmission, competing
Owner decisions across API instances, immutable final records, audit entries,
revocation and deactivation, recipient-scoped live identifiers, and no task/KPI
mutation. Verification passes **59 API unit, 126 broad PostgreSQL integration, and
52 web tests**, plus the final **four-case focused HR integration suite**, API/web
typechecks and production builds. Three live browser groups pass using synthetic
accounts: approved HR proposal, reasoned Owner approval and proposer history,
unauthorized staff denial, 320/390px layouts and no page errors.

Named Owner/HR/COO business
UAT, HR policy review, retention approval and production deployment remain open.
