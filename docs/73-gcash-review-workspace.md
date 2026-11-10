# GCash review workspace

## Authorization and design rationale

On October 29 Jaycee resumed all four deferred improvements in docs/72: expanded review design, original PDF comparison, audited row corrections, and removal controls. Work is on `feature/gcash-review-workspace`, based on `0f0560d`.

Behavioral goal: Records can open a period, compare the matching PDF revision and extracted rows, correct an interpretation with a reason, then record a review. Handlers can inspect evidence and submit replacement PDFs through the existing clarification workflow. Finance/COO retain evidence reads.

Flow: queue → open submission → compare PDF/transactions → optionally correct a row → inspect recalculated checks and correction history → save Records decision. Removal: more actions → confirm period and reason → archive → archived queue → restore. Loading, failed unlock, missing extraction, stale edits and permission changes each need explicit feedback and a recovery route.

### Evidence ledger

| Evidence                                                                                                                     | Context and confidence                                                                                                    | Decision and limit                                                                                                | Verification                                                                                      |
| ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| [WCAG 3.3.4: error prevention](https://www.w3.org/WAI/WCAG22/Understanding/error-prevention-legal-financial-data.html)       | Strong normative accessibility guidance for changes to stored data; no measured productivity claim                        | Required reasons, validation, preserved before/after evidence and reversible archival                             | Invalid data rejected, Cancel leaves data intact, archive/restore retain files                    |
| [WCAG 1.4.10: reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)                                               | Strong accessibility guidance; the less-obvious exception allows a data table to scroll while surrounding controls reflow | Mobile switches PDF/transactions without losing revision/page; horizontal scrolling is contained inside table/PDF | 320px and 390px layouts, focus and keyboard checks; no page-level overflow                        |
| [W3C cognitive accessibility: minimize mistakes](https://www.w3.org/WAI/WCAG2/supplemental/objectives/o4-minimize-mistakes/) | Promising task analogy; supplemental guidance, not proof of a product outcome                                             | Persist batch/date/revision context next to decisions; visible save feedback, correction history and recovery     | Compare selected revision IDs, retained drafts after errors; usability with Records still pending |

UI route: `user-expi` → `ui-design-index` → dashboard/design-system surface. The router's referenced `ui-design-systems` package is unavailable locally; use the existing product tokens and primitives. Patterns: searchable work queue with status chips; document/detail split view; secondary actions in a disclosure menu. Relative text sizes, clear metadata, visible focus, native dialogs and named panels support keyboard use. No animation is needed.

### Open-source comparison before implementation

| Option inspected                                                                                                                                                                                              | Fit and reuse cost                                                                                                         | Choice                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Mozilla PDF.js source and learning example](https://github.com/mozilla/pdf.js/blob/master/examples/learning/helloworld.html), [API source](https://github.com/mozilla/pdf.js/blob/master/src/display/api.js) | Apache-2.0; page rendering, worker and password callbacks; a small React adapter fits authenticated bytes and this toolbar | Reuse PDF.js directly, pinned to 5.6.205 to retain the repo’s Node 20.19 compatibility (newer 5.7/6.x require Node 22.13+); bundle the matching worker locally; no CDN or external document service |
| [React-PDF Document source](https://github.com/wojtekmaj/react-pdf/blob/main/packages/react-pdf/src/Document.tsx)                                                                                             | Useful React wrapper, adds another abstraction and dependencies for a single-page comparison panel                         | Follow lifecycle/password lessons, use the underlying renderer directly                                                                                                                             |
| [React PDF Viewer](https://github.com/react-pdf-viewer/react-pdf-viewer)                                                                                                                                      | Rich toolbar but archived; its current license requires a commercial license                                               | Do not add                                                                                                                                                                                          |

### Implementation defaults

- Existing `GCASH_HISTORY_REVIEW` permission controls corrections and archival/restore; no role grants are added. Current batch scope is checked on every action. Existing own-upload review prohibition remains.
- Corrections affect only the latest, active PDF revision. Date/time, description, reference, debit, credit and balance are editable. The original extraction and PDF remain immutable. Each change stores editor/time/reason/before/after; saving reopens the period as awaiting review and preserves the previous decision in audit history.
- Reconciliation uses integer centavos across the full interpretation, retaining original parser warnings. Incomplete checks never become a payment confirmation.
- Archive applies to the entire period and its revisions. It is reversible and requires a reason and the current version. Archived evidence remains readable under current scope, and its batch/date unique key stays reserved. Replacement uploads require restoring the existing period and its usual clarification workflow.
- Password unlock occurs only in browser memory for the open PDF. Close, identity change or revision change destroys the renderer; no unlock password is sent to the server or retained in storage.
- Existing retention blockers continue to protect source and review evidence. Permanent deletion is outside this change.

These defaults are implementation choices under the resumed scope, pending Jaycee/client acceptance.

## Use the main local demo

Open [main login](http://localhost:3000/login) → **Preview a workspace → Records & monitoring officer → GCash history**.

1. Choose **Review submission** or **Open submission**. Desktop shows the matching original PDF and transaction interpretation together. On phones choose **Original PDF** or **Transactions**.
2. Unlock encrypted originals with **PDF viewing password**. It is temporary browser-only input. Use page selection, zoom or a row's **PDF page** button to inspect the source. **Download original** remains available.
3. Choose **Correct row**, change the fields, explain why, then **Save correction and reopen review**. **Cancel correction** discards the draft. Closing with a draft offers **Keep editing** or **Discard and close**. The full interpretation is reconciled again; mismatches remain visible.
4. Switch **Reading version** between **Current interpretation** and **Original extraction**. Open **Correction history** for per-row before/after values, editor, reason and time; **Review and archive history** retains prior decisions and recovery actions.
5. After comparison, choose **Reviewed** or **Needs clarification**, add the review note and save. Older PDF revisions and archived periods are read-only. A stale save preserves the draft and asks for an explicit reload. Archive/restore confirmation is owned outside the refreshed card list so a live update or focus refresh keeps its reason draft.
6. Use **••• → Archive submission** on a card or in the workspace. Confirm the named batch/date period and all revisions, with a reason. Find it under **Queue view → Archived submissions** and choose **••• → Restore submission** with a reason. Its review status and evidence survive both actions.
7. **PDF history → Open revision N** opens that revision's own PDF/extraction/corrections. Only the latest active revision accepts edits or a new Records decision.

Use the existing **Batch handler** preview for uploads/replacement PDFs and **Finance officer** or **Chief operating officer** for evidence reads. The clearly synthetic `ACCESS-DEMO-001` walkthrough includes encrypted, manually corrected, archived and multi-page text/scanned examples. These examples do not credit customer accounts.

## Storage and API

Forward migration `20261029080000_gcash_review_workspace` adds nullable archive metadata to each period, an optional corrected interpretation/version beside the original reading, and immutable `GcashReadingCorrection` entries. Existing unique period keys and source-file retention blockers remain. Original upload/extraction records are not rewritten by a correction. Audit and change events commit in the same transaction as each mutation. Generic employee retention also blocks erasing authors of GCash corrections/archive/review events.

- `GET /api/gcash-history?archived=active|archived`: scoped queue; default active.
- `GET /api/gcash-history/submissions/:id/reading?page=1&source=current|original`: selected revision, 25 rows/page, current correction/history versions and current edit eligibility.
- `POST /api/gcash-history/submissions/:id/corrections`: captured history/correction versions, row index, editable fields and required reason.
- `GET /api/gcash-history/submissions/:id/corrections?page=1`: authenticated immutable before/after history, 20/page.
- `POST /api/gcash-history/:id/archive`: captured version, required reason and `archived` boolean.
- `GET /api/gcash-history/:id/activity?page=1`: scoped review/archive/correction timeline, including superseded review notes, 20/page.

Evidence reads use authenticated private access. Reading/history endpoints set `private, no-store`. PDF rendering reuses the existing authenticated file download and a locally bundled PDF.js worker. No PDF service/CDN receives the evidence or viewing password.

## Validation

Final evidence is under ignored `.local/gcash-workspace/`. Automated checks: 79 API unit tests, 123 web tests and the complete 250-case PostgreSQL integration suite pass (452 checks total). A later focused rerun of all 30 GCash database scenarios also passes. API typecheck/build, optimized web build/typecheck, scoped formatting and whitespace checks pass.

The migration preserved every original value in all 63 existing tables. Final comparison against the private pre-migration backup confirms original rows/columns are unchanged in 14 financial, member/identity, assignment, document and GCash evidence tables. Synthetic walkthrough additions are separate from the original records; all superseded synthetic periods are archived rather than deleted.

Ten real-browser groups pass with zero JavaScript page errors: normal seeded Handler/Records/Finance logins; encrypted upload and password eye; same-revision rendering and wrong-password recovery without sending the viewing password to the server; deliberate draft cancel/close; reviewed-period correction/reconciliation/audit history; original extraction; stale-edit recovery; 390/320px dark comparison; card/detail archive/restore including a focus/live refresh while entering the restore reason; preserved historical encrypted revision; and Finance read-only text/scanned page navigation and zoom. Counts group related assertions, not individual clicks.

Browser testing caught and fixed AM/PM edit normalization, stable control labels, and a card-refresh issue that could dismiss an archive confirmation. Archive reasons now survive queue/focus refresh. Rendered desktop, mobile, dark, archive and scanned-page screenshots were visually inspected. The synthetic final walkthrough is `ACCESS-DEMO-001`, September 16–October 31, with two PDF revisions; earlier encrypted revision corrections and archive/restore/review history remain available. Mixed text/scanned pages intentionally retain reconciliation flags for source checking.

The main API, Redis worker and optimized web preview are running at ports 4100/3000. Source remains local/uncommitted on `feature/gcash-review-workspace`; no push, staging/main merge or production deployment. Manual user/client acceptance remains pending.

## Changed areas

- Contracts: `packages/contracts/src/gcash-history.ts`.
- API: GCash service/controller/reconciliation helper, additive Prisma migration and retention author blockers.
- Web: queue/page hook, comparison dialog/hook, original PDF viewer, correction form/history, decision/history and archive controls; PDF.js dependency and matching lockfile.
- Tests: GCash contracts/client, reconciliation units and real-database correction/archive/access/concurrency/rollback scenarios.
- Handoff: this guide, docs/68, docs/72 and the documentation index. Earlier Word/PDF exports remain historical snapshots.
