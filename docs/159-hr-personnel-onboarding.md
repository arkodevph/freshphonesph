# HR training submission and COO personnel enrollment

On 2026-11-19 the user selected: **“HR records training and submits enrollment; COO creates the account.”** This resolves the HR provisioning question for this slice and supersedes G30's proposal to give HR direct account/role writes. Existing confidential grants still apply. Payroll/commission inputs, calculations and approvals remain undecided and external.

This increment implements the API, persistence and typed web client. It does **not** complete the HR or COO screen integration or browser acceptance. G30–G32 and the hiring journey stay open until those surfaces and their checks are finished.

## Workflow and access

1. An active HR & Payroll officer with a confidential HR grant submits the person's name, sign-in email, requested operational role, supervisor, external orientation/training completion timestamps, confirmer name and a short evidence note. Training stays on Facebook/Messenger; the system does not request transcripts, identity documents or payroll details. Submission creates no account.
2. COO with a confidential HR grant and account-management permission reviews the pending evidence. COO either rejects with a reason or creates the account using a password meeting the existing policy. Account identity, role and supervisor come from the submitted record. The API does not accept overrides of those fields at enrollment.
3. Enrollment creates the account, assigns its supervisor, links the immutable evidence, records separate account/onboarding audits and queues the existing account notification, all in one transaction. Agent enrollment also requires an active, unlinked Agent profile. HR cannot grant roles, activate accounts or access the general account-write endpoint.
4. Rejection preserves the submitted evidence and decision. HR may submit corrected evidence with a new submission ID. There is no edit/delete endpoint for submitted evidence. A former HR submitter cannot approve their own request after promotion to COO.

Only the ten current operational personnel roles are accepted. CEO/COO executives, technical administrators, legacy roles and customers use their existing separately controlled account flows. This change does not impose training requirements retroactively on existing accounts or remove authorized COO/administrator account maintenance.

Confidential HR/COO and the existing internal administrator can read the onboarding directory, options and dated history. Only HR submits; only COO enrolls/rejects. The minimal `/staff/directory` projection remains separate. Current access is rechecked inside writes under the same ordering lock as account/role changes. Losing a grant invalidates the current session according to the existing authentication policy.

## API and files

All routes below are under `/api/personnel/onboarding`:

| Method/path | Purpose |
|---|---|
| `GET /` | Server search by name/email, status filter and 20-row paging |
| `GET /options` | Allowed roles, supervisor requirements and current supervisors; available Agent profiles for COO |
| `GET /:id/history` | Dated submission/decision evidence and actors |
| `POST /` | HR submits completed external training evidence |
| `POST /:id/enroll` | COO creates and links the account with captured version |
| `POST /:id/reject` | COO rejects with captured version and reason |

HR's submission ID provides retry deduplication: an identical retry returns the original record; changed evidence using the same ID conflicts. A database partial unique index also prevents two pending submissions for the same case-insensitive email. An existing account email blocks both submission and later enrollment. Completion dates cannot be in the future. Supervisor eligibility is checked at submission and enrollment.

COO decisions use the existing `Idempotency-Key` replay mechanism. The typed web client requires the key; callers must keep it stable for a retry. Unkeyed duplicate/stale decisions return 409. Competing decisions serialize; an enrollment cannot create two accounts. Passwords/hashes never enter onboarding responses, history or audit snapshots.

Implementation: `src/personnel/` in the API; shared `packages/contracts/src/personnel.ts`; `apps/web/lib/personnel-api.ts`, re-exported by the API facade. The additive migration is `20261119090000_personnel_onboarding`. It adds no wages, automatic deductions, payouts or financial permissions.

## Verification and remaining work

Validation passed: **36 tests** (11 onboarding/contract integration, 15 existing confidential-HR/HR-action integration, six existing HR/recruitment unit checks and four web API adapter tests). Contracts build, API typecheck/build, web typecheck, scoped repository formatting and whitespace checks pass. The client credential scan reports zero findings across 1,764 source files. Validation results and local evidence are recorded in `.local/hr-*.log`. The new migration was applied as part of all 65 migrations to the isolated `freshphones_hr_20261119_test` PostgreSQL database. The local preview database and production were not migrated.

The captured pending-queue plan uses the `(status, createdAt, id)` index backward for the requested order. This verifies the predicate/order match on the small synthetic test dataset, not production capacity. See `.local/hr-query-plan.log`.

The focused integration suite covers contract restrictions; HR submission and denied direct account creation; COO enrollment and first login; all stored roles plus anonymous denial; duplicate/stale/conflicting submissions; concurrent decisions; rejection/resubmission; changed supervisors; Agent links; intervening account creation; self-approval after promotion; server search/paging; field privacy; grant revocation and inactive accounts. Web adapter tests cover filters, history/options, session/no-store behavior, captured versions, retry keys and denied/stale responses.

Remaining:

- Integrate training submission, submitted requests and dated history into the independently owned HR personnel workspace.
- Integrate COO review/rejection/account creation into the COO workspace, with password handling, retained drafts, stable retry keys and stale-decision recovery.
- Inspect the existing controlling references and test desktop/mobile, keyboard, motion/reduced-motion, loading, error and denied states. No visual completion is claimed.
- Apply/rehearse the migration on a backed-up local preview, then perform the named HR → COO → first-login acceptance walkthrough.
- Confirm training evidence wording, retention handling and real personnel/supervisor assignments with the business. No real personnel roster was invented.
- Resolve payroll/commission preparation (G33) before G34. No payroll implementation is included.

The required Obsidian workflow/profile reads and `brain projects` failed because `/mnt/storage` returned **“No such device.”** Nami's canonical profile and design principles could not be read, so visual work was deferred under `/home/nami/DESIGNAGENT.md`. The vault project identifier, resumed context freshness and brain persistence remain unknown/unverified. Session progress is recorded locally for later brain save; no successful brain save is claimed.
