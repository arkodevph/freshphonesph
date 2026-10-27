# Sprint 1 V4 roles and access

Status: **S1 01 role specification complete; S1 05 financial-authority slice implemented for existing roles**. Created 2026-10-16. Full V4 role migration remains open.

**Goal:** establish the V4 role model and demonstrate that each role can access only its permitted actions and records, with financial verification exclusive to Finance. This provides the foundation for batch enrollment and payment review work in later sprints.

**Planning assumption:** two weeks, ten working days. Start/end dates and actual team availability are unconfirmed. Owner suggestions follow [the existing team split](10-team-roles.md); they are planning assignments, not messages or commitments from those people.

Sources: [missing features and required revisions](59-missing-features-and-required-revisions.md), [detailed workflow checklist](58-workflow-v4-implementation-checklist.md), and Organizational Structure V4 sections 1–4. This sprint implements selected parts of **G01–G05**, plus the role-related portion of **G50**. It does not close the complete hierarchy/scoping work in G04.

## Deliverable

An isolated local/staging demonstration with twelve V4 staff roles plus the existing customer role, an explicit migration path from current roles, aligned navigation, scoped Batch Manager/Handler record access and tested Finance-only financial decisions. Existing user IDs, customer links, issued schedules, monetary history and audit evidence remain intact.

Reuse the existing NestJS API, Prisma migrations, Better Auth sessions and Next.js interface. Account, batch and payment workflow changes must be enforced by the API; hiding buttons is only part of the interface work.

## Sprint backlog

Keep the gap-list IDs unchanged and log partial completion rather than marking a broad task complete prematurely. S1 01 is documented in [the V4 role and permission matrix](61-v4-role-and-permission-matrix.md); application stories remain unchecked.

### S1 01 Record the role and permission decisions

**Backlog:** G01, G02, G03; confidential access dependency from G35. **Suggested owner:** Tambong, with Finance review by Bacurin and operations review by Dela Rosa. **Status:** documentation complete from the supplied requirements; continue with S1 02.

- [x] Produce the twelve-role matrix from the V4 responsibility descriptions and access table. Distinguish viewing, creating/editing, operational approval and final financial verification.
- [x] Record the legacy-role migration specification for Owner, General Manager, Analytics and CS; separate business-role mappings from individual account migration and technical administration.
- [x] Specify HR personnel-provisioning authority and necessary KPI access separately from confidential payroll/HR/applicant data, retaining the existing individual confidential-access policy for those private records.
- [x] Record permitted task actions and minimum record scopes for Batch Manager, Records, Finance, Handler and customer. Future stage permissions remain unavailable until their workflows exist.

**Acceptance:** [the source-backed mapping and action matrix](61-v4-role-and-permission-matrix.md) is complete as a role specification. V4 answers the role requirements; individual migration exceptions and technical controls are handled in the implementation stories. No live role grants changed and business UAT is not claimed.

### S1 02 Add role contracts and rehearse account migration

**Backlog:** G01 and part of G50. **Suggested owner:** Tambong. **Depends on:** S1 01 role mapping.

- [ ] Update shared role types, labels, validation and Prisma role support for the approved V4 model, retaining the customer role.
- [ ] Build the explicit account mapping/migration procedure; identify accounts needing a human mapping decision instead of guessing.
- [ ] Rehearse migrations on an isolated copy or synthetic fixture database. Record before/after account counts, role counts, retained client links and unchanged monetary/audit records.
- [ ] Document rollback/recovery and session invalidation for changed roles; do not reuse stale grants after conversion.

**Acceptance:** fresh migrations and an existing-data upgrade both succeed on isolated databases. Unmapped accounts are reported and remain unmodified until resolved. Evidence includes counts, preserved links and recovery steps. No production migration is part of this sprint.

### S1 03 Enforce the approved action permissions

**Backlog:** G03 and authorization portion of G05. **Suggested owner:** Tambong, with Bacurin for Finance endpoints and Dela Rosa for task access. **Depends on:** S1 01–02.

- [ ] Separate permissions for Batch ID creation, member enrollment, activation, handler assignment, payment recording and the two operational reviews.
- [ ] Apply approved grants to existing endpoints; leave future endpoints/actions unavailable until their business conditions are implemented in later sprints.
- [ ] Preserve protected technical administration, customer isolation, confidential grants, current-user rechecks and audited sensitive writes.
- [ ] Inventory alternate/compatibility routes so an older endpoint cannot bypass the new permission rules.

**Acceptance:** direct API checks enforce the matrix. Handlers/Agents cannot create Batch IDs or enroll members. Permission changes do not expose new payment writes, unrestricted HR data or an activation bypass.

### S1 04 Establish Batch Manager and Handler assignment scope

**Backlog:** first slice of G04. **Suggested owner:** Tambong. **Depends on:** S1 01–03.

- [ ] Add the minimum approved Batch Manager-to-batch relationship while reusing current Handler assignment support.
- [ ] Apply approved scopes to existing batch/client lists, exact reads, counts and related authorized document/history/live-event surfaces. Verify broad readers still have only their approved fields/actions.
- [ ] Recheck authorization on assignment changes and invalidate stale views/sessions where required.
- [ ] Create two-manager/two-handler fixtures with different batches plus unassigned cases.

**Acceptance:** one team cannot retrieve another team's restricted data through search, direct IDs, counts, files or live hints. A removed assignment loses access. **G04 stays open:** Agent/Pioneer/Coordinator hierarchy and the complete payment scoping work are later slices. Handler payment access remains disabled until G13 is complete.

### S1 05 Make financial decisions exclusive to Finance

**Backlog:** financial-authority portion of G05. **Suggested owner:** Bacurin, with Tambong reviewing shared grants. **Depends on:** S1 01–03.

- [x] Remove implicit financial-verification authority from the current Owner role; Finance Officer alone has this grant. New V4 role migration remains in S1 02.
- [x] Apply the same Finance-only grant to verification, adjustments/reversals, receipt-review queues and pending-review email eligibility.
- [ ] Keep final decisions atomic, audited and protected against stale/concurrent requests; retain verified-only derived balances.
- [ ] Preserve read-only executive reporting where approved without adding financial write authority.

**Acceptance:** Finance can perform the permitted decision; CEO, COO, Batch Manager, Records, HR, KPI, CSR, Coordinator, Pioneer Agent, Agent, Handler and customer receive denial for financial decisions. Denied and repeated requests do not create extra monetary effects. Records/Manager stage prerequisites remain part of the later review sprint.

### S1 06 Align account and navigation interfaces

**Backlog:** interface portions of G01/G05. **Suggested owners:** Tambong for staff account/navigation, Somontina for customer/public regression checks. **Depends on:** S1 02–05.

- [ ] Show approved role names in existing account administration, identity displays, role previews and navigation.
- [ ] Align available actions and role landing destinations with the API matrix. Do not expose unsupported future workflows as working screens.
- [ ] Preserve customer routing, session-expiry behavior, confidential access states and unsaved input during refresh.

**Acceptance:** each fixture role can sign in and reach its permitted existing workspace. Restricted actions are absent or denied consistently, and a direct URL/API request remains protected. Check narrow-screen and keyboard operation for changed interfaces.

### S1 07 Verify and demonstrate the role foundation

**Backlog:** verification of the selected G01–G05 work; partial G50. **Suggested owners:** each domain owner supplies evidence; Tambong coordinates the review. **Depends on:** S1 02–06.

- [ ] Run meaningful authorization tests across twelve staff roles, customer, anonymous, inactive and revoked accounts. Include a minimum-permission role attempting every sensitive action it must not have.
- [ ] Cover cross-assignment access, guessed IDs, role changes, stale sessions, protected personnel fields and alternate routes.
- [ ] Run relevant API/PostgreSQL/web suites, workspace typechecks and the production build. Use dedicated test databases and record exact commands/results; run additional Redis checks if live authorization behavior changes.
- [ ] Demonstrate role mapping, assignment revocation and Finance-only decisions using synthetic data. Record business review feedback separately from automated results.
- [ ] Update [the gap list](59-missing-features-and-required-revisions.md), [detailed checklist](58-workflow-v4-implementation-checklist.md), [roles documentation](04-roles-access.md) and [build status](BUILD_STATUS.md) for the portions actually delivered.

**Acceptance:** relevant checks pass, migration evidence is attached, blocking access defects are fixed and the review record identifies any unaccepted policy cells. A document update alone does not complete an implementation task.

## Ten working day sequence

| Working days | Focus | Reviewable result |
|---|---|---|
| 1–2 | S1 01 and test/fixture preparation | Explicit role mapping and permission matrix; unresolved decisions identified |
| 3–4 | S1 02–03 | Isolated migration rehearsal and backend grants |
| 5–6 | S1 04–05 | Assignment isolation and Finance-only decision checks |
| 7–8 | S1 06 and integration verification | Aligned role interfaces and full fixture walkthrough |
| 9–10 | S1 07, fixes and review buffer | Evidence, demo and updated task statuses |

The sequence assumes dependencies are resolved in time; it is not a delivery guarantee. If capacity or a decision slips, reduce interface breadth before dropping authorization or migration checks. Report the reduced slice and carry unfinished work forward with its original task ID.

## Definition of done

- [ ] The selected role mapping and permissions are recorded, with any remaining policy decisions explicitly bounded.
- [ ] Shared contracts, database, backend and changed interfaces agree on the implemented roles and actions.
- [ ] Existing-data upgrade and fresh migrations are verified without losing links, history or money records.
- [ ] Finance is the sole financial decision-maker; restricted roles and revoked assignments fail direct API checks.
- [ ] Relevant tests, typechecks and production builds pass, with evidence paths in the sprint log.
- [ ] Changed interfaces pass the scoped mobile/keyboard walkthrough and business review results are recorded.
- [ ] Backlog progress describes completed slices accurately; unresolved G04/payment/KPI/HR work remains open.

## Dependencies for later sprints

| Next slice | Backlog | Prerequisite |
|---|---|---|
| Sprint 2 Batch ID enrollment and activation | G06–G12, relevant G50 migration | Sprint 1 role foundation; confirmed capacity, document and activation rules in G08 |
| Sprint 3 Handler payments and operational reviews | G13–G24 | Assigned batches; receipt/correction rules G15 and Finance routing rule G20. Split into smaller sprints after estimating the review workflow |
| Later dashboards and operational modules | G25–G49, remaining G04, G50–G51 | Stable batch/payment stages and each module's stated policy decisions |

These are sequencing suggestions rather than committed sprint schedules. This sprint does not implement the full eight-prospect batch gate, Handler payment entry, automatic review tasks, payroll, Agent hierarchy or customer purchases. Their existing backlog items remain the source of truth.

## Sprint execution log

| Date | Story | Status | Changed files and verification | Remaining dependency |
|---|---|---|---|---|
| 2026-10-16 | Planning | Planned | Created Sprint 1 from the document gap list and existing team ownership. No application changes or test runs. | Start date, available capacity and S1 01 mapping decisions |
| 2026-10-16 | S1 01 | Specification complete | Added docs/61 with the twelve-role matrix, action owners, legacy role mappings and separate CEO administration/KPI data boundaries, directly from the supplied requirements and labeled engineering interpretations. | S1 02 account migration and implementation; no application grants changed |
| 2026-10-16 | S1 05 partial | Implemented for current roles | Removed Owner's `PAYMENT_VERIFY` grant; added explicit Finance-only and forged-permission tests; retained financial-history/report reads and separate Finance-account concurrency checks. | Full V4 role migration and remaining workflow revisions stay open |
