# 21 — v6 Sprint 1: Records completeness and payment usability

Status: Active; not a production release commitment.
Prepared: 2026-09-22. Duration assumption: 10 working days, starting when capacity and prerequisites are confirmed.

## Goal

An authorized staff member can find a client, collect and review that client's private requirements, and record an external payment. The customer sees only their own permitted documents and review status. Finance can find and review claims without scrolling an unbounded list.

Extend the existing Fresh Phones PH application and NestJS migration. This sprint does not rebuild the application or attempt to finish all of v6 in two weeks.

## Basis and starting point

- [Full Scope v6, Revision 1.5](source/Full-Scope-v6.pdf), especially §§5–7 and Appendix A: customer documents, requirements checklist, private storage, history, search and Finance verification.
- [Delivery gates](17-full-scope-workflow.md): close the identified Gate 2 workflow gaps while protecting existing Gate 3 behavior.
- [Traceability matrix](18-scope-traceability-matrix.md): distinguish Django baseline coverage from TypeScript delivery.
- [Architecture decision](20-v6-architecture-decision.md): Neon/Better Auth are the revised production target. Better Auth/MFA and Redis Streams/BullMQ are implemented locally; production provisioning and private storage selection remain open.
- [TypeScript preview](19-records-typescript-preview.md) and [build status](BUILD_STATUS.md): existing enrollment/schedules, claims/decisions, private payment proofs, OCR and reporting are starting assets, not work to recreate.

The working tree already contains implementation changes. Preserve them and establish a fresh test baseline before extending behavior. Historical test counts are not new verification evidence. Custom cookie sessions, local proof storage and database-backed events do not demonstrate completion of the target production architecture.

## Scope and capacity

Proposed owners below follow the repository's existing module ownership; availability is unconfirmed. Estimates are relative planning sizes, not days or delivery promises. Core scope is 18 points; the 5-point payment-list slice is stretch. Re-estimate after the first baseline run. If core exceeds capacity, split the sprint rather than dropping privacy tests.

| ID | Vertical slice | Priority / size | Proposed owner | Blocked by |
| --- | --- | --- | --- | --- |
| S1-01 | Find the correct client and safely prefill a claim | Core / 3 | Bacurin | None; baseline first |
| S1-02 | Staff attaches a private client requirement | Core / 5 | Tambong | D1; D2 for staging acceptance |
| S1-03 | Staff reviews requirements with visible history | Core / 3 | Tambong | S1-02, D3 |
| S1-04 | Customer uploads and tracks own requirements | Core / 5 | Somontina | S1-02, S1-03, D1, D3 |
| S1-05 | Staff finds payment claims across pages | Stretch / 5 | Bacurin | S1-01 |
| S1-06 | Demonstrate and verify the complete sprint journey | Core / 2 | Module owners; named UAT reviewer required | S1-01–04; S1-05 if included |

These are draft ticket specifications, not published tracker issues. Configure the team's tracker before promoting them to executable issues; carry the IDs and blocking edges forward unchanged.

## Implementation progress — 2026-09-23

2026-09-25 update: The project owner delegated the initial D1 and D3 choices. The selected local workflow is recorded in [22-customer-portal-policy.md](22-customer-portal-policy.md). S1-02/03/04 now have a Records and customer journey with private local storage, API authorization, review history, and integration evidence. They remain **in review** pending authenticated staff/customer UAT and D2 production storage/privacy decisions. The 2026-09-23 table below remains the historical snapshot for that date.

2026-09-26 update: The customer portal now includes verified installment allocation, membership dates, password recovery pages, printable account documents, post-commit customer email, Owner-managed templates/reminder timing, and an S3-compatible private storage adapter. Unit/integration tests and local MinIO migration checks pass. The [customer launch/UAT checklist](23-customer-launch-uat.md) records the client-owned setup and sign-off still required.

| Ticket | State | Evidence / remaining work |
| --- | --- | --- |
| S1-01 | In review | Client and balance pickers now use deliberate search/selection with loading, empty and retry states; stale search/OCR responses are ignored; keyboard focus scrolls into view; receipt type/image changes invalidate an active scan; browser-side type/5 MB validation and explicit missing-date review are implemented. Integration coverage searches 1,000 clients. Authenticated light/dark/mobile browser walkthrough remains open. |
| S1-02 | Blocked - client | D1–D3 are still required before implementing real requirement types, review permissions and storage acceptance. No business policy was invented. |
| S1-03 | Blocked - client | Depends on S1-02 and D3. |
| S1-04 | Blocked - client | Depends on S1-02, S1-03 and D1/D3. |
| S1-05 | In review | Payment API/UI now compose client/batch/reference search, status, date range and bounded pagination. CSV uses the same filters while retaining privacy-trimmed columns. Integration coverage finds claims across a 1,000-row queue. Authenticated decision-flow browser regression remains open. |
| S1-06 | Blocked | Requires S1-02–04 and a named client UAT reviewer. |

Verification on this increment: 12 API unit tests, 15 PostgreSQL integration tests, 4 web client tests, workspace typechecking and the production build pass. The web and NestJS services run locally at ports 3000 and 4100. The browser fallback reached the sign-in screen; its rules require a human to establish the authenticated session before the remaining visual walkthrough.

## Draft tickets

### S1-01 — Find the correct client and safely prefill a claim

As payment staff, I can locate a client in a large dataset and review receipt suggestions without assigning a payment to the wrong client.

Acceptance:

- [ ] Establish and record the current relevant test baseline; distinguish pre-existing failures from new regressions.
- [ ] Client and balance search have visible input boundaries, accessible names, loading, empty and retry states in light/dark mode.
- [ ] Search a synthetic set of at least 1,000 clients; narrow by permitted identifying fields and batch, disambiguate duplicate names, and deliberately select a result. Searching alone never selects a client.
- [ ] Keyboard selection remains visible; stale search responses cannot replace a newer query or select an outdated result.
- [ ] Paste, drop and browse receipt input work. Extraction shows a busy state; changing the image/template cannot apply stale extraction results.
- [ ] Receipt fixtures cover amount, reference and date, including the reported GCash date beside the reference. Missing/ambiguous dates require explicit review instead of silently treating today's date as extracted.
- [ ] Errors appear in a lower-right toast on desktop, remain readable on mobile, announce accessibly, support dismissal and reduced motion, and preserve the draft. Field-specific errors also identify the field.
- [ ] OCR never records or verifies a payment. Private proof reads return image bytes, not a serialized stream object; unauthorized reads remain denied.

Evidence: targeted API/OCR regression tests and a browser walkthrough covering keyboard use, both themes and narrow width. UI improvements here are user-requested refinements, not additional claims about the PDF's exact UI specification.

### S1-02 — Staff attaches a private client requirement

As authorized Records staff, I can attach an approved requirement to the correct client and reopen it securely.

Acceptance:

- [ ] Use the client-approved requirement types and allowed formats/limits from D1; show missing versus submitted requirements on the client record.
- [ ] Upload UI, API validation, private storage and metadata persistence work as one journey; failed uploads do not mark a requirement submitted.
- [ ] Validate actual content as well as declared type and size. Rejected uploads give actionable feedback without losing other form values.
- [ ] Read access is checked server-side against role and client scope; anonymous, unrelated customer and unauthorized employee requests fail.
- [ ] Attachments use private keys and short-lived access as defined by the target architecture; logs and public responses expose no private links or document contents.
- [ ] Record actor, client, document identity and timestamp in the audit trail. Define and test failed-storage/failed-database cleanup without deleting unrelated files.
- [ ] Staging evidence uses the approved private storage service; local fixtures alone cannot close the production-storage requirement.

Evidence: upload/open/denial integration tests and staff browser flow. D1 can be represented by explicitly synthetic fixtures during development; real customer documents wait for approval.

### S1-03 — Review requirements and inspect history

As authorized Records staff, I can approve a submitted requirement or request clarification and understand who changed its status.

Acceptance:

- [ ] Display missing, submitted, approved and needs-clarification states with text, not color alone. Final labels/transitions follow D3.
- [ ] Authorized reviewers act on the current document version; stale decisions fail clearly and invite a refresh.
- [ ] Clarification captures an actionable customer-visible reason; internal notes remain separate and permission-scoped.
- [ ] Each decision is transactional with its audit entry, recording actor, timestamp and before/after status.
- [ ] Replacement submissions preserve prior review history and follow the approved re-review policy.
- [ ] Checklist completeness does not automatically verify money or authorize unit release.

Evidence: allowed/denied transition tests, concurrent-review test, and a staff history walkthrough.

### S1-04 — Customer submits and tracks own requirements

As a linked customer, I can see what I still need to submit, upload an allowed document, and understand a clarification request.

Acceptance:

- [ ] Portal lists only the signed-in customer's permitted requirements and files, including loading, empty, failure and submitted states.
- [ ] Upload and resubmission use the same validated storage/review workflow as Records; refreshing retains successful submissions.
- [ ] Display customer-visible review status and clarification text without internal staff notes or other customers' identifiers.
- [ ] Tampering with client/document identifiers cannot list, upload, replace or download another customer's documents.
- [ ] Existing membership, schedule and verified-payment views still work. A document action never changes the derived financial balance.
- [ ] Mobile and keyboard users can complete upload/review-status flows; errors preserve inputs and focus remains predictable.

Evidence: two-customer isolation tests and an end-to-end customer → Records reviewer → customer resubmission scenario.

### S1-05 — Find payment claims across pages (stretch)

As Finance staff, I can locate a historical claim by client/batch, date and status without loading or scrolling the entire dataset.

Acceptance:

- [ ] Search, filters and bounded pagination run server-side and compose consistently; changing filters resets pagination.
- [ ] Stable ordering avoids duplicate or omitted rows between unchanged pages; loading/error/empty states are explicit.
- [ ] With at least 1,000 synthetic claims, a known claim beyond the first page can be found through UI controls.
- [ ] Verification, rejection and clarification preserve filters and refresh the affected row and derived balance correctly.
- [ ] Only authorized Finance decisions change verified totals; repeated/concurrent decisions remain safe and audited.
- [ ] Export scope is clearly stated and enforced. Report permissions and field minimization remain intact.

Evidence: API filter/pagination tests and browser navigation/filter/decision regression tests.

### S1-06 — Verify the complete journey

As the reviewer, I can reproduce the sprint outcome and distinguish locally built functionality from client acceptance.

Acceptance:

- [ ] Run relevant unit, database integration, authorization and browser tests against the current changes; record commands, environment and results.
- [ ] Demonstrate: locate client → private requirement upload → clarification → own-customer resubmission → staff approval → receipt prefill → pending payment → Finance verification → correct customer balance.
- [ ] Exercise forbidden-role and cross-customer access, failed uploads, stale requests, duplicate decisions and refresh/retry recovery.
- [ ] Check payment and requirement journeys at narrow/mobile and desktop widths, in both themes, with keyboard navigation and reduced motion.
- [ ] Update traceability only for acceptance items actually evidenced. Mark `Built` only with repeatable evidence; reserve `Accepted` for named client UAT sign-off.
- [ ] Document remaining target-architecture gaps and migration/rollback implications. Demo success is not permission to deploy production.

## Decisions and external blockers

| ID | Needed input | Decision owner | Effect if unresolved |
| --- | --- | --- | --- |
| D1 | Required document list, permitted formats/limits, customer visibility and replacement policy | Fresh Phones PH Records + privacy owner | S1-02/04 can use synthetic fixtures only; live document collection blocked |
| D2 | Client-owned private S3-compatible storage environment/access (provider pending) and approved privacy/retention handling | Client account/privacy owners + technical lead | Provider-backed staging acceptance blocked; no invented retention/deletion policy |
| D3 | Requirement reviewer roles, review transitions, internal/customer note visibility | Fresh Phones PH operations owner | Review UI may be prototyped, but real review permissions and acceptance remain blocked |
| D4 | Sprint capacity, named reviewers and UAT availability | Team lead + Fresh Phones PH | Dates and ownership remain proposals, not commitments |

## Working sequence

1. Days 1–2: baseline, confirm D1–D4, start S1-01 and the staff upload journey.
2. Days 3–5: complete S1-02 and S1-03 with negative-access tests as each behavior is built.
3. Days 6–8: complete the customer journey. Take S1-05 only if core work is on track.
4. Days 9–10: integrated walkthrough, regressions, fixes, evidence and UAT review.

This sequence assumes the proposed owners are available. With one implementer, work blockers-first and reforecast after S1-01. If client inputs are unavailable, progress the independent payment slice and report document tickets as blocked; do not substitute invented policy.

## Boundaries and follow-on backlog

All existing safeguards still apply: server-side authorization, audited sensitive changes, Finance-verified-only derived balances, private documents, and operational statements that are not official BIR invoices. No payment gateway, payroll calculation, automatic wage recommendation or production deployment is added by this sprint.

Follow-on work is ordered by dependencies, not promised as one sprint per row:

| Next workstream | v6 coverage | Prerequisite / exit focus |
| --- | --- | --- |
| Production foundation and migration | §§3, 14–17; architecture decision | Neon/Better Auth migration, private storage and approved production event/worker design, client-owned environments; preserve existing data and test recovery before cutover |
| Records completeness and fulfillment | §§5–6, Appendix A | Remaining handler/agent fields, full record filters, release/status history and customer visibility; approved operational policy |
| Finance completion and notifications | §§7, 12 | Remaining adjustment/report/document gaps; authorized post-commit notifications with idempotent retries and approved templates |
| Tasks/KPI, support and recruitment | §§8, 10–11 | Port complete role-scoped lifecycles and private attachments; human-only KPI decisions; public agent data minimization |
| Public website and reporting | §§4, 9 | Approved catalog/content, role-scoped reporting families, periods and required exports |
| Assistive AI — deferred | §13, stricter project safeguards | Deferred at the user's request on 2026-10-08 because paid AI API funding is unavailable; resume only with funding and a user request, then verify stable core, approved knowledge, role-aware retrieval and guardrails; no wage decisions |
| Release and handover | §§16–17, 20–21 | Capacity/concurrency, two-instance behavior, outages, backup restore, rollback, security checks, client UAT and handover |

Reconcile the full traceability matrix at each sprint review. This plan closes a bounded portion of v6; it does not replace the full scope or silently mark earlier gates complete.
