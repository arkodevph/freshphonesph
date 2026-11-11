# Batch Handler — implementation progress

**Last updated: 2026-11-11.** Baseline audit: `469b3e1`.
Current feature branch: `feature/batch-handler-workspace`.
Local integration: `020aa4c` on 2026-11-11 includes both requested remote heads,
`chore/nodejs-security-types` (`729d83f`) and `feature/operations-monitor`
(`92d2c6a`). The first contains the second, so one merge includes both histories.
Incoming changes cover public landing testimonials/spacing and Node type
dependencies. Existing Handler work was backed up and restored without conflicts.
Jaycee authorized committing and pushing this feature branch on 2026-11-11.
Final Handler QA/sign-off and receipt extraction QA6 remain deferred.

**Status: All four planned phases implemented. Phases 1–2 complete, confirmed by Jaycee; Phases 3–4 implemented and verified locally on 2026-11-10.**

## Manual QA follow-up — 2026-11-10–11

Jaycee requested working through these findings separately. **Items 1–4 and 7 are built locally and ready for Jaycee’s manual QA.**
**Final Handler QA/sign-off is deferred by Jaycee, 2026-11-11**, while the
requested remote branches are integrated locally. Implemented work is retained.

Item 3 covers the entire Handler portal. Item 5 has no separate issue, and item 6
is explicitly deferred by Jaycee. Resume it only when selected again.

- [x] **1. Notifications — implemented locally, ready for Jaycee QA:** the bell
  previews three recent updates with one View all notifications link. The full
  page at `/system/notifications` holds category filters, unread-only view, read
  controls and pagination when needed. It uses the current light/dark theme,
  aligned to the workspace’s left gutter and full available width. The initial
  centered width cap was removed at Jaycee’s screenshot correction.
  Handler notifications are now saved until personally deleted: reading or
  completing the related task does not remove them. Delete is available on the
  full page with a themed modal confirmation; it removes only the recipient’s
  inbox copy. Hover/focus highlights the entire row, including the trash area.
  Refresh does not recreate deleted items. Saved messages retain their received
  text for reference. A record that is no longer in scope is redacted/unlinked;
  privacy erasure still removes its related saved copies.
- [x] **2. Member schedules — implemented locally, ready for Jaycee QA:** open
  Members & schedules → member row menu → View schedule. A themed modal shows
  member/batch/unit information and installment cards with due dates, complete
  expected amounts and original/released amounts when applicable. No schedule
  table appears below the main list. Loading, retry, empty/access-loss, live
  refresh, keyboard/phone support and focus return stay inside the modal.
- [x] **3. Dropdown full text — portal-wide, ready for Jaycee QA:** all
  current Batch Handler selection controls use the same full-text behavior.
  My batches and Members & schedules: status/handler/agent filters. Payments:
  client and balance-client pickers, receipt type and method. GCash history:
  assigned batch/model, review status, queue view, reading version and PDF page/
  zoom. My tasks: status. Notifications: type. Home/account/navigation/row-action
  menus already show complete action labels; no clipped selection fields there.
  Search a choice, then hover a clipped label or navigate with arrow keys for its
  full text; clipped selected values also reveal on hover/focus. Escape closes
  the popup first, including inside dialogs. Touch labels wrap. Menu placement,
  opaque theme and list-only scrolling keep controls usable on small screens.
  Original values, required/disabled behavior, scoped options and role access
  are preserved. Other roles retain native/standard controls.
- [x] **4. Record first, attach proof later — ready for Jaycee QA:** Jaycee chose
  option 1. Receipt proof and scanning are explicitly optional when recording.
  A Handler confirms the client/amount/date/method before saving without proof;
  Cancel, Escape or backdrop leave the draft intact and create nothing. A saved
  claim stays pending, with a persistent Attach proof action. The same action
  is available from an eligible payment’s row menu and Transaction details.
  Failed initial uploads retain the image for retry against the saved payment
  ID. Retry refreshes the current scoped claim first and recognizes proof that
  was already attached despite a lost response; it does not create another
  payment or silently replace existing proof. Invalid files, access loss and
  terminal states are handled inside the attachment dialog. Existing-proof
  corrections keep their proof. Attaching proof to a clarification claim still
  requires correction/resubmission. Records/Manager/Finance approval continues
  to require proof; only Finance verification affects balances. No new missing-
  receipt reason requirement, status, permission or proof column was added.
- **5. No separate issue:** intentionally blank; PDF text extraction exists.
- [ ] **6. Receipt extraction — deferred by Jaycee, 2026-11-11:**
  Maya and the generic Bank transfer scanner passed controlled synthetic text,
  image OCR, actual Handler scan API and Payments form checks. Fixed missing time
  extraction beside a labeled `YYYY-MM-DD` date, with 24-hour/AM-PM/no-time tests.
  The bank amount test separates the transferred amount from its fee and total.
  MariBank currently uses Bank transfer; no dedicated MariBank layout has been
  verified. No actual Maya/MariBank/other-bank receipt files are available in the
  repository or assigned preview payment proofs. Jaycee explicitly deferred
  this task. Retain the baseline checks and ISO-time fix; resume actual layout
  testing when Jaycee reopens it and provides samples or a local folder path.
- [x] **7. Payment records — ready for Jaycee QA:** the Handler Payments table
  now includes a Proof column after Method. Green With proof and amber No proof
  badges reflect the current receipt attachment, with visible text and a small
  dot in both themes. A reference number or verification
  status does not substitute for proof. The column updates after a successful
  attachment and refresh; existing View proof / Attach proof row actions remain.
  It follows the existing alignment, density, sticky identity and light/dark
  theme. No new action buttons, filters, status or backend changes.

**Item 7 color follow-up — 2026-11-11:** Jaycee requested instant visual
recognition. Proof now uses compact green With proof and amber No proof badges,
with text retained alongside the decorative dot. Separate light/dark palettes
match the table. Six compiled browser groups passed, including the existing
attachment update and actions, all densities, phones/landscape and no label
clipping. Measured text/background contrast is at least 6.37:1 across
both proof states and themes. No page exceptions or real financial writes; the
new QA login was logged out (401). Web types, scoped format/whitespace and the
70-page optimized build passed. Evidence: `.local/handler-proof-color-20261111/`.
Item6 remains deferred; presence still does not imply payment verification.

**Item 7 verification — 2026-11-11:** six compiled browser groups passed with
no page exceptions. Actual assigned rows match API receipt presence. Synthetic
pending/verified/rejected/clarification rows confirm that Proof is independent of
payment status/reference; missing proof on a legacy verified record stays clear.
A mocked attachment updates No proof to With proof without creating a payment.
Existing row actions, refresh, all three densities, both themes and 320/393px/
short landscape passed, with table-only horizontal scrolling and pinned identity.
One new QA login was logged out (401); no existing sessions or financial records
changed. Web types, five existing Handler/workspace tests, scoped formatting/
whitespace and the 70-page optimized build passed. Evidence:
`.local/handler-payment-proof-column-20261111/`. No API, schema, permission,
verification-policy or dependency changes. Manual acceptance remains pending.

**Item 6 baseline verification — 2026-11-11:** six focused receipt tests and all
36 API unit tests passed. Four controlled synthetic PNG images (Maya labels,
Bank transfer with fee/total, alternate bank labels, GCash control) passed direct
Tesseract OCR and the actual Handler scan endpoint with exact expected amount,
reference, date and time. Eight browser groups passed on the existing optimized
preview: real scan requests populate editable fields, manual corrections and
file-picker focus survive, changing receipt type clears extracted candidates,
invalid small images show inline feedback, and phone layout stays readable.
No page exceptions; no financial writes and payment count unchanged. Each new
QA login was logged out (401); existing sessions were untouched. API types,
Python compile, scoped formatting and whitespace passed. Evidence:
`.local/handler-receipt-extraction-20261111/`. Synthetic fixtures do not certify
actual bank layouts. The parser fix is live without a frontend rebuild; the
optimized web preview remains item 4’s build. Actual receipt QA is still pending.

| Item 6 coverage | Controlled synthetic checks | Actual receipt layout |
| --- | --- | --- |
| Maya | Text + image + API + Payments form passed | Awaiting sample |
| MariBank | Generic bank baseline only | Awaiting sample; not yet verified |
| Other banks | Generic labels, transferred amount vs fee/total, date/time passed | Awaiting named-bank samples |
| GCash | Existing receipt regressions and synthetic control passed | No new actual receipt claimed in this task |

**Item 4 verification — 2026-11-11:** ten backend workflow tests passed in a
fresh isolated `_test` database, including Handler API recording without proof,
unchanged verified credit/balance, and blocked approval until proof exists.
The test database was removed. Nine development and ten compiled browser groups
passed with no page exceptions. Covers confirmation/cancel/Escape/backdrop,
create-once, attach later from saved notice/row/details, file validation, busy
locking, initial/ambiguous upload failures and retry of the exact existing ID,
create failure/draft retention, clarification/access loss/terminal states,
existing-proof correction, both themes, 320/393px/short landscape and touch.
Browser business writes were mocked; only each run’s own new logins were logged
out (401). Web types, two existing workspace-policy tests, scoped formatting/
whitespace and the 70-page optimized build passed. Evidence:
`.local/handler-optional-proof-20261111/`. No backend runtime, schema, permission,
review/verification policy or dependency changes. Manual acceptance is pending.

**Item 3 portal-wide verification — 2026-11-11:** 21 development and 23 compiled
browser groups passed across the route inventory, modal controls and original
client-picker regression. No page exceptions. Checked long handler/agent names,
batch codes/models, selected labels, single-result keyboard navigation, hover
persistence, empty/clear, required validation, original query/selection IDs,
method logos and list-only scrolling. Both themes at 1440/393/320px and short
landscape, actual touch and COO native/standard regressions passed. Reading-version
Escape preserves the dialog. The clean compiled PDF viewer also passed page/zoom
selection and Escape/focus return. Its development loading error did not reproduce
in the clean optimized build. Generated PDF and mocked boundary data were used;
this is viewer UI verification, not the pending receipt-extractor tests (#6).
Only each run’s own new logins were logged out (401). Portal/modal business reads
were read-only; the payment regression POST was mocked. Web types, two existing
workspace-policy tests, scoped format/whitespace and the 70-page protected build
passed. No backend/schema/permission/payment-policy/dependency changes. Evidence:
`.local/handler-dropdown-portal-20261111/`. Manual acceptance remains pending.

PDF-toolbar screenshot follow-up: compact inline page/total and zoom controls
restore the toolbar spacing after replacing native selects. Only PDF-toolbar CSS
changed; all four compiled modal checks passed again, including one-row label
height and compact zoom width. The 70-page optimized preview was rebuilt. Broader
portal/client results above retain their original build provenance in the evidence.

**Item 3 initial Payments-only verification (superseded scope):** ten development
and ten compiled browser groups passed
with no page exceptions. Covers both pickers, actual assigned-client search,
synthetic long names/models/codes, short values, hover persistence, keyboard
focus/selection, selected-value reveal, Escape/blur/scroll/resize/query cleanup,
debounce/late responses, empty/error/retry states and client identity in balance/
payment requests. Checked both themes at 1440/393/320px and short landscape;
actual touch labels wrap and the menu fits the viewport. Business writes were
mocked. Each run logged out only its two new logins (401). Web types, two existing
workspace-policy tests, scoped format/whitespace and the 70-page optimized build
passed. Evidence: `.local/handler-dropdown-tooltips-20261111/`. No API, schema,
permission, payment-policy or dependency changes. Jaycee's manual QA is pending.

**Item 2 verification:** 11 existing web tests, 11 development and 12 compiled
browser groups passed, with no page exceptions. Real scoped dates/amounts match;
no second table or main-list layout shift. Covers Close/Done/Escape/backdrop and
focus, cancellation/late responses/member switching, error/retry, unissued/empty,
zero/missing/large values, released obligations, live updates/access loss, current
member removal, long context, 40 installments, both themes, phones/landscape,
200% text and touch. The COO legacy schedule and member row actions remain
available. All business interactions were read-only; synthetic responses were
used for boundary states. Only each run’s own new logins were logged out (401).
Web types, scoped format/whitespace and the 70-page optimized build passed.
Evidence: `.local/handler-member-schedule-modal-20261110/`. No backend, permission,
schema, payment-policy or dependency changes. Manual acceptance remains pending.

Earlier item 1 checkpoints follow; their test counts can overlap.

Item 1 passed five focused workspace tests, 11 development browser groups and
12 compiled browser groups, with no page exceptions. Checked preview limits,
original destinations, scoped read payloads, bell-count synchronization, filters,
paging, retry/empty/loading, keyboard, both themes and 320/393px/landscape. A real,
already-read Finance alert still opens its exact saved result and current payment.
Read-action tests used mocked alerts; no financial or credential writes. Only new
isolated QA sessions were logged out. Types, scoped format, whitespace and the
70-page optimized build passed. Evidence: `.local/handler-notification-qa-20261110/`.
Alignment follow-up: eight source-CSS and eight compiled layout checks passed
at 1920/1440/393/320px in both themes, including matching content gutters, full
width, no horizontal overflow and the unchanged bell preview. Optimized build
passed; only the Notifications page wrapper CSS changed. Evidence: `alignment-*`
files in the same folder. Each check logged out only its own new login (401).

Saved-inbox follow-up: **47 isolated backend regression tests, 11 development
and 13 compiled browser groups passed**, with no page exceptions. Covers task
completion with email disabled, concurrent personal read/delete, deletion
persistence, other-recipient isolation, current scope, privacy erasure, payment
review workflows, cancel/Escape, delete failure, page adjustment, final-item empty
state, references, both themes, responsive layouts and actual touch controls.
Empty inbox: **No notifications yet** / **New updates will appear here**. Reading
all notifications uses the separate caught-up unread-only state. The bell remains
a three-item preview. Actual existing Finance links checked without deletion.
Browser mutations used mocked alerts; each run cleaned only its own test logins.
The isolated test database was removed. Additive inbox migration applied only to
the guarded local preview. API/web types, scoped formatting, whitespace and the
70-page build passed. Evidence: `.local/handler-notification-retention-20261110/`.

Delete-UI screenshot correction: replaced the inline confirmation strip with a
centered modal card. It shows the selected notification, starts focus on Cancel,
handles Escape/Tab/focus return, keeps errors inside, and survives list refreshes.
Full-row hover/focus now includes the trash area; the shared theme’s secondary
link tint is disabled for these rows. Text/action background pixel samples match
in light and dark themes. Nine development and ten compiled browser groups pass,
including phone/short-height, touch, pending guards and last-item empty state;
no page exceptions. Browser deletions mocked; only each run’s own new logins
cleaned (401). Web types, scoped format/whitespace and 70-page build pass.
Evidence: `.local/handler-notification-delete-modal-20261110/`. No backend change;
the earlier saved-inbox regression evidence still applies.

**Findings 3, 4, 6 and 7 remain pending. Item 5 has no separate issue.**

## Latest delivery — 2026-11-10

- [x] **Member schedule modal:** themed information/installment cards replace
  the secondary table; read-only current scope, states and keyboard/phone support.
- [x] **Minimal notifications:** short bell preview and dedicated Notifications
  page; filters/read controls moved to the page. Saved Handler history and
  personal Delete modal/full-row hover are implemented. Ready for manual QA.
- [x] **Payment-method selectors:** GCash/Maya logos, bank/cash/other icons,
  compact receipt field and shared themed dropdowns with keyboard/phone support.
- [x] **Workspace search:** matching light/dark surface and borders, readable
  page results, blue hover/focus, comfortable input/rows and short-screen scrolling.
  Existing filtering, shortcuts and accessible destinations are preserved.
- [x] **Account menu:** dark-mode borders, metadata, blue links, logout color and
  hover/focus states match the workspace theme.
- [x] **Account security:** shared customer/Handler theme, real-logo toolbar,
  themed cards, fields and pill buttons; desktop columns and a phone layout.
- [x] **Session pagination:** five sessions per page, current session first,
  totals, Previous/Next controls and safe page adjustment after sign-out or
  password changes. Individual and all-other-session actions retain their scope.
- [x] **Employee Privacy Notice:** shared theme, existing cloud mascot, readable
  notice cards and an “On this page” menu. Notice wording, version, draft status
  and publication metadata are preserved.
- [x] **Return to workspace:** prominent notice-header button beside Privacy and
  terms, verified to open the signed-in Handler workspace at `/system`.

Find these through the account menu: **Account security** (`/security`) and
**Employee privacy notice** (`/privacy/employee`).

The earlier payment-method refinement passed **seven existing payment API tests
and 11 development plus 11 compiled browser groups**. Covers real logo loading,
all existing choices,keyboard/theme/phone behavior,receipt scan cancellation and
value clearing,request method values and default catalog/support dropdowns.
No page exceptions or live financial writes. Types,scoped formatting,whitespace
and the 69-page optimized build passed. Earlier checkpoints below can overlap.

**Current local preview:** http://localhost:3000 · build `JhArXcwhzDmM_I-jpqbVE`.
Latest integration evidence: `.local/branch-merge-20261111/`. Root type checks,
198 web and 36 API unit tests, both optimized builds, eight public browser groups
and six Handler regression groups passed after the merge.

All four implementation phases and the listed refinements are built locally.
Manual acceptance of Phases 3–4 and the business decisions below remain open.
Feature-branch publication was authorized on 2026-11-11. Earlier delivery
checkpoints below retain their original local/uncommitted status as history.

## Plan and approvals

Jaycee first requested findings and planning before implementation and saved this
summary in Markdown. He then explicitly authorized Phase 1 and directed copying
the customer portal's theme and layout. That direction is implemented using the
existing customer shell, glass materials, card styles and mascot artwork.
Jaycee confirmed Phase 1 is done after the home/navigation and three table
revisions, then authorized Phase 2. He has now confirmed Phase 2 complete after
reviewing the account documents and improved branded PDF format. He then
authorized Phases 3 and 4, which are now implemented and verified locally.
Manual acceptance of those two phases remains pending under the deferred final QA.

Current permissions and capabilities are documented separately in
[Batch Handler — role and portal access](batch-handler-role-and-access.md).

## What already exists

The Handler can view currently assigned batches and members, schedules and
balances; record and correct eligible payment claims; scan and attach receipt
proof; upload and resubmit eligible GCash PDFs; work on their own tasks; and
read review progress and Finance results.

Only Finance-verified payments affect the customer's balance. The Handler
cannot approve payments or administer batches and members.

## Audit findings at the baseline

The table records the initial audit. Phases 1–4 below resolve the Handler home,
navigation, account documents, Handler stage updates and staff password form.
Unagreed expected-receipt and overdue/escalation rules remain separate decisions.

| Area | Findings | Remaining work |
| --- | --- | --- |
| Handler home | The Handler uses the generic staff dashboard. Its workflow says “Record → Verify → Update,” skipping Records and Manager review. Some copy suggests verification authority the Handler does not have. | Build a home focused on the Handler's assignments and next actions; correct the workflow and labels. |
| Account documents | Assignment-scoped Statement of Account and verified Payment Confirmation APIs already work. The customer portal has PDF/print controls and a reusable PDF generator. | Add staff entry points for assigned members and verified payments. |
| Workflow notifications | Task alerts and Finance-result alerts exist. Records/Manager approvals and returns do not have complete handoff notifications. | Add relevant stage updates, reviewer-note access and links to the exact payment, checking current assignments. |
| Password change | The API supports changing your own password and ending other sessions. Staff security currently exposes MFA and session management. | Add the password-change form with validation, errors and success feedback. |

## Proposed Handler home priorities

1. **Needs your action:** returned claims and recorded payments missing receipt
   proof.
2. **Review progress:** recent claims awaiting Records, the assigned Manager or
   Finance.
3. **My assignments:** batch/member counts and links to their schedules.
4. **My tasks:** assigned work and deadlines.
5. **Quick actions:** record payment, upload a GCash PDF and open member
   statements.

The actual review flow is:

**Handler submission → Records completeness check → assigned Batch Manager
cross-check → Finance decision.**

Missing-proof totals must come from an assignment-scoped server query. Counting
only the first page of payments would give misleading totals. A recorded claim
without proof is identifiable; an expected receipt that was never submitted
requires an agreed source of expectations.

## Business decisions still needed

- What receipts or statement packages are **expected but never submitted**.
- When a Records, Manager or Finance review becomes **overdue**, and who receives
  escalation.
- Whether a Handler AI workspace is wanted; it is not confirmed existing access.

Do not invent receipt requirements, review deadlines or escalation rules while
building the confirmed work.

## Implementation sequence and status

Phase 1 was authorized after this plan was saved. The customer portal supplies
its design and layout; existing Handler permissions continue to define access.

- [x] **Phase 1 — Home and navigation — complete, confirmed 2026-11-10:** dedicated Handler home using the
      customer theme/layout, current assignment counts, returned claims and notes,
      complete missing-proof counts, recent review progress and own tasks.
      Sidebar/search/mobile navigation use Handler labels, and payment links
      open the appropriate record or filtered queue. The home shows all four
      review stages and the Finance-only balance rule. Includes the finished My
      batches, Payments and Members & schedules table design, names-only density
      controls, home pill-button corrections and optimized localhost preview.
- [x] **Phase 2 — Account documents — complete, confirmed 2026-11-10:** assigned-member
      statements and verified-payment confirmations with preview, PDF download
      and print. Includes the approved A4 format, actual Fresh Phones logo,
      aligned amounts, readable tables and complete adjustment/release context.
      Current assignment and eligibility checks remain enforced. The operational
      notice appears in every output; these are not official BIR invoices.
- [x] **Phase 3 — Stage notifications — implemented and verified locally, 2026-11-10:**
      current Handler sees Records/Manager approvals and returns through
      **bell → View all notifications → Payment reviews**. Each update opens the exact payment with its
      saved reviewer note and current payment status. Per-user unread tracking,
      selected-group reads, history pagination and live refresh follow current
      assignments. Overdue/escalation behavior stays pending its business rules.
- [x] **Phase 4 — Password form — implemented and verified locally, 2026-11-10:**
      profile menu → **Account security → Change password**. Current/new/confirmation
      fields, shared password-policy validation, optional visibility and clear
      feedback reuse the existing API. Success renews the current session, ends
      other sessions and refreshes the list; existing MFA remains enforced.

Verify permissions and mobile behavior at each phase. Include loading, empty,
error/retry and keyboard states; test assignment changes, document eligibility
and notification visibility where relevant. Keep the co-worker's COO work
separate and coordinate changes to shared files.

## Earlier Phase 1–2 progress — 2026-11-10

Jaycee confirmed “the first phase is done” and requested this status update,
then instructed moving to the second phase. Phase 1 includes the customer-theme
home/navigation plus the My batches, Payments and Members & schedules refinements.
At the Phase 1 table-delivery checkpoint, 213 tests, 27 browser groups and eight
optimized-preview checks passed; earlier home and batch-table verification is
recorded below. Work remains
local/uncommitted; completion does not mean published or deployed.

**Phase 2 is complete, confirmed by Jaycee on 2026-11-10.** After reviewing the
branded A4 documents, he said the result was better and explicitly requested
marking Phase 2 complete. Delivery includes assigned-member Statements of Account,
Finance-verified Payment Confirmations, preview/PDF/print and the actual Fresh
Phones logo. Verification and PDF-format details are recorded below. Phases 3–4
remain outside the completed Phase 2 work. Jaycee has now authorized Phase 3;
Handler stage notifications and the Phase 4 password form are now implemented
and verified locally; their delivery records follow below.

## Phase 1 verification — 2026-11-10

- 180 web tests, four new isolated Handler authorization/count tests and 24
  existing payment-workflow/adjustment/reconciliation tests pass: 208 total.
- Contracts, API, web and landing typechecks pass; repository formatting and Git
  whitespace checks pass.
- 21 browser groups pass, including 320–1440px, landscape, 200% text, dark mode,
  current assignment totals, returned notes, all review stages, exact payment
  links, missing-proof filter/clear, partial errors/retry, empty states, mobile
  navigation/focus/Escape, denied pages and COO/CEO/Finance/customer regressions.
  No page exceptions in the completed run.
- `proof=missing` is an optional server filter on the existing payment list;
  it intersects current batch scope. Its total covers every matching claim,
  including beyond the first page. No new permission or schema migration.
- Integration fixtures used a temporary local `_test` database, which was
  removed. Local preview payment records were not populated for these tests.
- Evidence and the living design notebook are in ignored
  `.local/batch-handler-portal-20261110/`. Changes are local and uncommitted.

## Handler My batches table — 2026-11-10

At Jaycee's table-reference request, applied the six patterns to the Handler's
`/system/records` table using the existing customer theme:

- Right-aligned tabular numeric columns; left-aligned, single-line text.
- Hairline row separators and shared hover/focus emphasis, including pinned cells.
- Compact 40px, Default 48px and Comfortable 56px density, remembered per user.
- Sticky header and Batch/Unit identity columns; phones pin Batch to retain room
  for the other columns. Table scrolling stays inside the page.
- Missing values use a dash; zero remains zero; monetary values stay complete.
  Long text truncates with full hover/focus tooltips, hoverable and Escape dismissible.
- One row menu with the existing View members action. Hover/focus reveals it on
  desktop; touch keeps the kebab visible. Only the active sort header shows an arrow.

Sorting runs in the scoped API query before pagination, with missing monetary
terms last. Other roles retain their existing table and controls. No access grant,
schema migration or new dependency. See the current phase status above.
Validation: 183 web tests, five isolated Handler integration tests, API/web types,
formatting and whitespace pass. Sixteen browser groups and seven optimized-preview
checks cover keyboard/touch, both themes, 320/393px, enlarged text, scroll behavior,
filter/sort and existing COO/Manager controls. Temporary test DB removed; no preview
financial fixtures written. Optimized localhost rebuilt. Evidence/notebook:
`.local/handler-batch-table-20261110/`.

## Handler Payments and Members tables — 2026-11-10

Jaycee extended the saved table design to the Payments and Members & schedules
screenshots. Both Handler lists now share a native table shell with the customer
theme, name pinning, hairline hover/focus rows, names-only density controls,
full hover/focus tooltips, viewport-contained scroll/states and contextual menus.
Payment details/proof/eligible edits and member schedules retain their existing
handlers. Adjusted/original values, receipt/duplicate context and review stages
remain available. Schedule disclosure sits below the data table, with aligned
numeric columns. Other staff views retain their existing table and controls.

Optional scoped server sorting covers Client/Date for payments and Name/Batch for
members before paging, with stable ID ties. No schema, role grant or financial
write change. 183 web tests, six isolated Handler integration tests and 24 payment
workflow/adjustment/reconciliation regressions pass, along with 27 browser groups,
API/web types and formatting. The isolated test DB was removed. Read-only local
query plans were captured; they do not establish production-load performance.
Eight final optimized-preview checks also pass, including proof URL, eligible
edit/cancel without saving, schedule access and the previous Batch table. No page
exceptions. Optimized localhost rebuilt; changes are local and uncommitted.
Evidence/notebook: `.local/handler-list-tables-20261110/`. This work is included in completed Phase 1.

## Phase 2 implementation and verification — 2026-11-10

- Member menus open **Statement of account**. Only verified-payment menus offer
  **Payment confirmation**. The preview retains the current list, filters and page.
- Shared document body and existing PDF generator preserve customer/batch identity,
  original/current adjusted credit, verified-payment history, replacement release
  meaning and the operational/non-BIR-invoice notice. Customer document UI reuses
  that body and retains its existing controls.
- PDF download and print fetch current scoped records. A confirmation derives its
  member from the payment, rather than the current list/selected membership.
  PDF preparation rechecks eligibility and unchanged values before saving. Closing,
  access changes or read invalidation cancel pending work; stale results are ignored.
- Modal keyboard focus, Escape, close/focus return, loading, error/retry, rate-limit
  feedback, font errors, empty statements and phone layouts are covered. Print
  isolates the paper from the dashboard; long tables retain complete amounts.
- 186 web tests, seven isolated Handler integration tests and 24 existing financial
  regressions pass: **217 total**. API/web types and scoped formatting/whitespace
  checks pass. Sixteen browser groups verify actual PDF/print output, multi-page
  statements, access/eligibility/reassignment, changed/canceled exports, both themes,
  320/393px, enlarged text and the existing customer flow. No page exceptions.
- Fixtures use a temporary `_test` database or browser-only read responses; no
  financial writes were made to the preview. The isolated test DB was removed.
  No new permission, schema migration, financial rule or dependency.
- Evidence/notebook and generated samples: `.local/handler-documents-20261110/`.
  Final optimized build generated 69 pages; eight preview checks pass with no
  page exceptions, including statement/confirmation, actual PDF download, keyboard
  print isolation, phone/dark preview, close/focus, prior home, customer and COO
  regressions. Localhost is running the rebuilt optimized preview. Browser print
  output was inspected as PDF; no physical printer was used. Changes stay local
  and uncommitted. At this Phase 2 delivery checkpoint, Phase 3 was the next planned phase; its
  completed implementation is recorded below.

## Branded A4 document format — implementation, 2026-11-10

Jaycee approved the reviewed two-page proposal with “lets do it then”, after
explicitly requiring the Fresh Phones logo. The shared Statement of Account and
Payment Confirmation now use that format in Handler/customer previews, downloaded
PDFs and print. The actual unmodified `public/brand/fresh-phones-logo.png` is
shown in full, with a readable business name alongside it.

The document family uses white A4 paper, navy text, restrained blue rules and
locally bundled Noto Sans. Plain two-column member details replace the form-like
boxes. Tables use hairline separators and complete right-aligned amounts;
statements show three balance summaries and confirmations emphasize current
verified credit. Full references, original/current amounts, adjustment history,
replacement-release context and the existing operational/non-BIR notice remain.
Generated timestamps explicitly use Philippine time. No invented receipt number,
taxes, signature, seal or financial rule was added.

Downloaded PDFs repeat brand/member context, table headings and the notice/page
count when content continues. Long values wrap; unusually long rows can continue
without dropping digits. Print isolates the paper, repeats table headings and
uses named A4 page margins. Printing waits for the actual logo to decode; missing
logo/font downloads remain recoverable. Existing scoped fresh reads, eligibility,
changed-record checks and export cancellation are retained.

Research and the original proposal remain in
`.local/pdf-template-research-20261110/`. Implementation notebook, checks and
sample outputs are in `.local/branded-account-documents-20261110/`.
Verification complete: **190 web tests pass**, including four new real-asset PDF
text/layout cases, rerun after the final footer correction. Sixteen broader browser
groups and twelve final optimized-preview checks pass with no page exceptions.
These cover actual statement/confirmation downloads, long tables, print isolation,
A4 margins, logo/font failure recovery, scope/content changes, cancellation,
keyboard, phones/themes and customer/COO regressions. Browser print was saved and
examined as PDF; a physical printer was not tested. Web types, scoped formatting
and Git whitespace checks pass. The optimized build generated 69 pages and is
running on localhost:3000, build `Wu5d00r0alviKHIFpe7eM`. Changes remain local and
uncommitted; subsequent Phases 3–4 delivery is recorded below.

## Phase 3 — Handler review updates, 2026-11-10

Jaycee authorized proceeding after confirming Phase 2 complete. The existing
notification bell initially included **Payment reviews** for four saved decisions
(the QA refinement moves this filter to the full Notifications page):
Records approval, Records return, Manager approval and Manager return.

- Events come from immutable payment review history in currently assigned batches,
  including existing history. The current active Handler can read that history;
  reassignment removes the old Handler's visibility and gives the new Handler
  independent unread tracking.
- Each alert opens the exact payment and a focused review view: reviewer, time,
  saved decision/note and **current** payment status. Historical approval is not
  presented as current approval. Return notes remain available after correction.
- Individual and selected-group reads are idempotent across pages. Existing
  notification rows hold per-review/per-user receipts, with current scope checks
  in the bell, detail route, reads, generic notification API and live hints.
  Existing payment live events refresh the bell and open view.
- Loading, empty, retry, rate-limit, wrong-link, access-loss and cancellation states
  are explicit. Close/Escape returns to the payment row; phone/dark/enlarged-text
  behavior reuses the current customer-themed staff controls.
- This is the Handler's in-app stage-update slice. It adds no role grant, schema,
  dependency, financial write or external delivery. Reviewer queue policies and
  payment overdue/escalation rules are separate business decisions. At this
  checkpoint Phase 4 had not started; its completed implementation follows below.

**Verification:** 194 web + 107 API unit + 12 new Handler-notification + 13 existing
notification + 7 Handler + 24 financial regression checks pass: **357 tests**.
Fifteen browser groups and seven final optimized-preview groups pass with no
page exceptions. Covers all four decisions, current role/assignment revocation,
legacy Handler alias, concurrent/per-recipient reads, read-all across pages,
rollback, immutable history, exact links beyond page one, saved/current status,
mobile/keyboard/errors and other-role/document regressions. SQL plans were
inspected on isolated populated fixtures and the read-only local preview; these
small fixtures do not establish production-scale performance. Both temporary
`_test` databases were removed. Browser financial data used read interceptions;
no preview financial records were changed.

Contracts/API/web types, scoped formatting, whitespace and the protected 69-page
optimized build pass. Localhost:3000 is running build `VWFBqy_PI99XP9-DULHhw`.
API/worker/website retain their development processes. Work remains local and
uncommitted. Evidence, living design notebook, query plans and screenshots:
`.local/handler-stage-notifications-20261110/`.

## Phase 4 — Staff password form, 2026-11-10

Jaycee authorized the final planned phase. Find it through the staff profile menu
→ **Account security → Change password**, or open `/security` while signed in
as staff. The card follows the customer's current/new/confirmation flow and
customer light/dark colors. Customer password changes remain in portal Settings.

- New passwords follow the existing shared **12–128 character** policy; current
  passwords retain the API's existing 1–128 limit. Values are never trimmed.
  Required, repeated-current and mismatched fields have inline errors and focus.
- Inputs start masked, support password managers/paste and offer **Show passwords**.
  Help/error text is described separately from each field's accessible label.
- Only current and new password are sent to the existing own-account API. A
  pending update prevents duplicate submission and overlapping MFA/session writes.
  Password changes wait for ongoing enrollment and unsaved recovery-code work.
- Success clears entered secrets and refreshes active sessions. The current
  session is renewed; all other sessions end. Mandatory/enabled MFA remains
  enforced, including second-factor requirements on a later sign-in.
- Wrong-password, rate-limit, network/server and expired-session states have
  explicit feedback. Focus returns to a wrong current-password field after it
  re-enables. A session-list refresh failure retains password-change success and
  offers **Retry security settings** without repeating the password mutation.
- No backend authentication-policy, permission, schema or dependency changes.
  The tests use an isolated temporary `_test` database and mocked browser writes;
  preview account passwords and MFA settings were not changed.

**Verification:** 198 web tests plus 15 isolated password/MFA integration tests
pass: **213 tests**. The four new web cases were rerun at final source. Seventeen
browser groups cover validation/focus, paste/autofill, show/hide, duplicate
submission, session refresh and errors, expired auth, MFA enrollment/recovery,
session revocation, staff/customer surfaces, light/dark, 320/393px, landscape,
200% text and keyboard navigation. No page exceptions. The temporary test database
was removed. API/web types, scoped formatting and Git whitespace checks pass.
Eight final optimized-preview groups pass with no page exceptions: real Handler
home/account-menu entry, retained Payment reviews, built form validation and
wrong-password focus, successful mocked update/session refresh, phone/themes/
keyboard, COO staff security and the existing customer password surface. Protected
69-page build `wDG7gHTo1tULhsoihNydh` passed TypeScript and is running on localhost:3000.
API/worker/website keep their development processes. No live preview credentials
were changed. Changes remain local/uncommitted/unpushed; no deployment performed.
Evidence and living design notebook: `.local/handler-password-20261110/`.

All four planned implementation phases are now built. User/client acceptance of
Phases 3–4 and production deployment are separate. Expected unsubmitted receipts,
overdue/escalation thresholds and any Handler AI workspace still need confirmed
business decisions.

## Handler account-menu dark-theme polish — 2026-11-10

After Phase4,Jaycee identified that the dark account dropdown lacked the light
version's finish. Updated only Handler dark-menu colors: customer blue links/role,
readable muted metadata,soft-red logout,subtle edge/dividers/shadow and matching
hover/focus states. The existing layout,light style values,COO menu,links and
permissions are retained. Eight rendered design checks and eight compiled-preview
groups pass with zero page errors;320/393px,the actual theme toggle,keyboard,
Escape/outside click and Security/privacy destinations checked. Dark small-text
contrast8.37–15.36:1. CSS formatting/whitespace and69page optimized build/TypeScript
pass. Localhost3000 restored at `G_KQGFdpsnj6NGm0jV8rj`. This cosmetic correction did not
rerun the previously recorded213-test phase suite. No business/credential writes.
Evidence/notebook: `.local/handler-account-menu-20261110/`. All four phases remain
implemented;no extra phase,commit,push or deployment.

## Account security uses the workspace theme — 2026-11-10

Jaycee requested the existing Handler/customer theme on `/security`. The page now
reuses the actual portal shell/dashboard and glass material/interaction styles:
real-logo toolbar, eligible workspace-return pill, shared cards/fields/buttons,
light/dark colors and typography. Desktop places password beside MFA and sessions;
phones stack in the existing task order. Security remains standalone and available
before mandatory MFA enrollment; its state/actions and account access are preserved.

Fixed two root theme selectors so dashboard layout CSS cannot override the shared
palette depending on route load order. Theme values themselves are unchanged.
Four password helper tests and37browser groups pass:17 security regressions,six
development visual,six compiled visual and eight prior account-menu checks. Zero
page errors. Exact workspace palette,logo,desktop/phones/landscape/200%text,
keyboard/errors,MFA/recovery/session controls and staff/customer views are covered.
Credential/MFA/session-revoke writes were mocked;demo credentials are unchanged.
No backend integration rerun for this presentation change. Scoped format/whitespace,
web types and69page protected build pass. Optimized3000 restored at `0C0XCthp0KimhlpVsZ9yz`.
Evidence/notebook: `.local/security-theme-20261110/`. No new permissions,API policy,
schema or dependencies. All four planned phases remain built;no extra phase,
commit,push or deployment.

## Active-session pagination — 2026-11-10

At Jaycee's request,Account security now shows **five sessions per page** with the
current session first,session totals/ranges and Previous/Next controls. Other
sessions keep API recency order. Pagination disables during security writes and
clamps when revocation shrinks the last page. Password change or bulk sign-out
refreshes to the remaining valid page;bulk action still covers all other sessions.
The feature is client-side rendering pagination over the existing own-session API.

Nine development+nine optimized-preview groups pass,zero exceptions,covering page
boundaries,0/1/5/6/many entries,exact later-page revoke IDs,failed/busy actions,
last-row clamping,password refresh,bulk scope,themes/320/393px/keyboard and customer
security. Web types,scoped format/whitespace and69page build pass;optimized3000
restored at `tK6ytN6UfxkK9qpeonHLT`. Browser revoke/password writes mocked;the four new
isolated test logins were each logged out through their own session only. No
existing user sessions automatically removed. No new auth policy,API contract,
permission,schema or dependency. Evidence/notebook:
`.local/security-session-pages-20261110/`. Local/uncommitted/unpushed.

## Employee Privacy Notice theme and cloud — 2026-11-10

Jaycee requested matching the current theme on `/privacy/employee` and adding the
cloud mascot. The employee page now opts into the shared workspace shell/materials,
real-logo toolbar, existing cloud-boy guidance art, themed reading cards and an
“On this page” section index. Phones stack the layout and retain the mascot.

The shared legal renderer preserves notice paragraphs, review items, version,
draft warning, noindex metadata and notice/support links. Customer/applicant/terms
and retained employee pages keep the default public appearance. Legal definitions
are byte-identical; no acknowledgement, publication or policy changes were made.
Two legal API tests and eighteen browser groups pass, with zero page errors,
including both themes, artwork, desktop/tablet/phones, enlarged text, keyboard,
anchors, public-variant regressions and reading without JavaScript. All checks
are anonymous, creating no login sessions. Types, scoped format/whitespace and
69-page optimized build pass. Localhost3000 restored at `VrVZKH6e3-qV5kHxFb-Te`.
Evidence/notebook: `.local/employee-privacy-theme-20261110/`. Local/uncommitted;
no new permission, dependency, asset generation, push or deployment.

## Employee notice return link — 2026-11-10

Jaycee caught the missing workspace-return action. Added **Return to workspace**
as a themed header pill alongside Privacy and terms,using the existing system-link
helper and normal route access checks. Phone controls stack. Legal content/status
and other legal variants retain their existing behavior. Two site-link tests and
four compiled browser groups pass,including actual Handler return,light/dark,
keyboard and320/393px. The new test login was individually logged out. Types,
scoped formatting/whitespace and69page build pass;optimized3000 `UMY9-HWONcLk_17EWcHYT`.
Evidence: `.local/employee-privacy-return-20261110/`. Local/uncommitted/unpushed.

## Workspace search theme — 2026-11-10

At Jaycee's screenshot request,the Handler search dropdown now follows the shared
customer/workspace palette:subtle edge and shadow,opaque panel base,readable result
and hint text,blue hover/focus and44px input/results. Short-height screens retain
scrolling within the popup. Existing six destination links,filtering,no-match copy,
Ctrl/Cmd-K,autofocus,Escape/outside click and navigation remain. Phones retain their
existing navigation/search visibility;COO styles remain outside the override.

Eight rendered design+eight compiled browser groups pass,zero page errors. Default
small-text contrast6.28–16.35:1;hover checks pass. Each run logged out only its own
two new isolated test sessions. CSS formatting/whitespace and69page optimized
build/TypeScript pass;localhost3000 `lsOayYmHxzGJ-9z8tuOIE`. CSS-only change,no API,permissions,
policy,schema or dependency changes. Evidence/notebook:
`.local/handler-search-menu-20261110/`. Local/uncommitted/unpushed,no deployment.

## Payment-method logos and dropdown — 2026-11-10

At Jaycee's screenshot request,both receipt type and payment Method use the shared
Select primitive with a label-render slot,local official GCash/Maya logos and
existing bank/cash/other icons. Text labels and selected check remain. The receipt
field has a compact height and start alignment;menus follow the shared palette,
remain opaque and fit phone/landscape bounds. Existing receipt choices and payment
values are retained. Source/rights: `apps/web/public/brand/payment-methods/README.md`.

Corrected active-option scrolling in shared Select to stay inside the listbox,
preventing whole-form scrolling from displacing the menu. Existing catalog/support
uses retain plain labels and keyboard behavior. Receipt-type changes retain scan
version invalidation,cancellation,extracted-value clearing and method synchronization.
Seven existing payment API tests and22browser groups pass,no page errors;scan and
payment requests mocked,so no real claims were created. Each run cleans up its own
two new login sessions. Types,scoped format/whitespace and69page build pass;
optimized3000 `etIBJNq44jBMPNT_W5Upg`. No payment integration,API policy,permission,schema or
dependency change. Evidence/notebook: `.local/payment-method-select-20261110/`.
Local/uncommitted/unpushed,no deployment.

## Source pointers

- [Payment-method selector](../apps/web/app/system/payments/PaymentMethodSelect.tsx),
  [selector styles](../apps/web/app/system/payments/payment-method-select.module.css),
  [shared Select](../apps/web/components/Select.tsx) and
  [brand-mark provenance](../apps/web/public/brand/payment-methods/README.md).

- [Employee notice route](../apps/web/app/privacy/employee/page.tsx),
  [shared legal renderer](../apps/web/components/LegalDocumentPage.tsx) and
  [workspace notice styles](../apps/web/components/workspace-legal-document.module.css).

- [Paginated own-session card](../apps/web/app/security/ActiveSessions.tsx).

- [Shared-theme security frame](../apps/web/app/security/SecurityPageShell.tsx),
  [security styles](../apps/web/app/security/security.module.css) and
  [shared portal materials](../apps/web/app/portal/portal-glass.module.css).
- [Staff security page](../apps/web/app/security/page.tsx),
  [password form](../apps/web/app/security/PasswordChangeForm.tsx),
  [form hook](../apps/web/app/security/usePasswordChange.ts) and
  [shared-policy validation/request helper](../apps/web/lib/password-change.ts).

- [Current staff home](../apps/web/app/system/page.tsx) and
  [navigation](../apps/web/app/system/layout.tsx).
- [Dedicated Handler home](../apps/web/app/system/handler/HandlerHome.tsx) and
  [home data hook](../apps/web/app/system/handler/useHandlerHome.ts).
- [Finance endpoints](../apps/api-ts/src/finance/finance.controller.ts),
  [Finance service](../apps/api-ts/src/finance/finance.service.ts),
  [customer document screen](../apps/web/app/portal/financial-document/page.tsx)
  and [existing PDF generator](../apps/web/lib/account-pdf.ts).
- [Payment review chain](123-payment-operational-review-chain.md),
  [Finance-result alerts](../apps/api-ts/src/staff/payment-results.ts) and
  [notification service](../apps/api-ts/src/notifications/notifications.service.ts).
- [Shared account document sheet](../apps/web/components/AccountDocumentSheet.tsx),
  [Handler document preview](../apps/web/components/HandlerAccountDocument.tsx) and
  [scoped document loader](../apps/web/lib/account-documents.ts).
- [Branded PDF renderer](../apps/web/lib/account-pdf-renderer.ts),
  [paper styles](../apps/web/components/account-document-sheet.module.css) and
  [print asset readiness](../apps/web/lib/account-document-print.ts).
- [Handler review alert source](../apps/api-ts/src/staff/payment-review-alerts.ts),
  [alert service](../apps/api-ts/src/staff/staff-alerts.service.ts),
  [focused review view](../apps/web/components/PaymentReviewDetails.tsx) and
  [scoped review loader](../apps/web/lib/payment-review.ts).
- [Own-password endpoint](../apps/api-ts/src/auth/auth.controller.ts) and
  [staff security screen](../apps/web/app/security/page.tsx).

No commit, push or deployment is included in this documentation request.
