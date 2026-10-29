# GCash PDF reading and password uploads

Jaycee requested reading uploaded GCash statements and adding a PDF-password field. This extends the integrated GCash history workspace in the main local demo.

## Planned review workspace improvements — deferred

**Recorded October 29, 2026. Status: plan only; implementation deferred at Jaycee's explicit request.** Jaycee said he is content with the current iteration and asked to save the next improvements in Markdown. The screenshot of the current submission queue is the starting point. This plan does not authorize building these additions now.

### 1. Expand the review design

- Develop the submission cards and detail workspace with clearer batch/date metadata, review/read status, action placement, spacing and visual hierarchy.
- Keep search, filters and the current upload/password feedback easy to find. Make opening a submission lead into a fuller review workspace.
- Design desktop and mobile views together; retain the current role-based access.

### 2. Show the original PDF for comparison

- Display the actual uploaded PDF inside the review workspace so staff can double-check the extracted rows while reading the source.
- Proposed desktop layout: original PDF beside the transaction table, with page/zoom controls and source-page navigation from a transaction row.
- Proposed narrow-screen layout: clear **Original PDF** / **Transactions** tabs or a stacked view that keeps the selected revision and page context.
- Pair the original file and extracted data from the same revision, including older revisions. Preserve authenticated private access and no-store behavior.
- Plan a temporary unlock/viewing flow for password-protected originals without saving the password. The exact rendering/unlock approach remains to be chosen when implementation resumes.

### 3. Allow transaction corrections

- Add an editing mode for the extracted transaction history: date/time, description, reference number, debit, credit and balance, with Save/Cancel and validation.
- Preserve the uploaded PDF and original extraction. Store manual corrections as a separate, auditable interpretation with editor, timestamp, reason and before/after values.
- Recalculate reconciliation warnings after edits and keep unresolved differences visible. Handle stale/concurrent edits explicitly.
- Confirm which roles can edit, whether Records approval is required, and whether reviewed periods must be reopened before correction. These are proposed workflow choices, not new permission grants.
- Edits apply to the app's interpretation of the statement. Financial posting and Finance verification remain their existing separate workflow.

### 4. Add deletion/removal controls

**Proposed placement:** a three-dot **More actions** menu on each submission card and the matching detail-view toolbar. Keep destructive actions separate from the primary PDF/review buttons.

- Include the requested deletion/removal capability in the future design, with a confirmation showing the batch, covered dates and affected submission/revision.
- Recommended behavior for submitted evidence: **Archive/Remove from active queue** with a reason, audit history and an authorized recovery path. Preserve the original PDF, extraction, corrections and prior reviews.
- Permanent file/record deletion belongs to the controlled retention/disposition workflow already protecting submitted GCash evidence. Confirm eligible statuses, permitted roles, approval requirements and retention rules before implementation.
- Decide whether removal affects a whole period or one revision, how historical evidence remains accessible, and how archived periods interact with duplicate checks and replacement uploads.

### Decisions and checks for the later implementation

- [ ] Agree the expanded layout and original-PDF viewing/unlock behavior.
- [ ] Confirm editable fields, editor/reviewer permissions and the correction approval flow.
- [ ] Confirm deletion versus archival semantics, eligibility, recovery and approval rules.
- [ ] Implement only after Jaycee explicitly resumes this plan.
- [ ] Verify same-revision PDF comparison, password handling, mobile access, edit validation/history, stale edits, removal/restore behavior, duplicate handling and unchanged financial balances.

All four additions are unimplemented future work. The existing PDF upload/reading, password eye, feedback and Records review behavior remain the current completed baseline.

## Use the main demo

1. Open [main login](http://localhost:3000/login) → **Preview a workspace → Batch handler → GCash history**.
2. Select the assigned batch and covered dates, then select the complete GCash PDF.
3. If the PDF is encrypted, enter **PDF password (if required)**. Submit the PDF to Records. A missing or incorrect password gives an actionable error and preserves the selected file and date draft. Re-enter the password after a failed attempt.
4. Select **View extracted transactions** on the submitted period. The reader displays date/time, description, reference number, debit, credit and balance, with source-page numbers and reading warnings.
5. Records opens the same extracted table from **Review submission** and compares it with the original PDF before choosing Reviewed or Needs clarification.
6. After correction, **PDF history → Read revision 1 / Read revision 2** opens each revision's own extraction. Earlier bytes, rows and review notes remain intact.

Finance and COO can read extracted evidence under their existing GCash permissions. Owner / CEO, customers, unrelated Handlers and other ungranted roles cannot read it. Current batch reassignment immediately changes access. Reading a PDF never creates payment claims, verifies funds or changes customer balances.

New uploads are read automatically. Older uploads without extraction remain downloadable and reviewable; they are not silently reprocessed and no password is retained for later use. If the layout cannot be recognized, the original PDF remains available with an explicit manual-review warning. OCR results and incomplete/mismatched totals are flagged for source comparison, never treated as proof of payment.

The limits are **10 MB, 20 pages and 1,000 extracted transactions**. Large or complex statements can time out with an actionable error. The original uploaded PDF, including its encryption, is retained unchanged.

## Password visibility and upload feedback

The password field has an eye button at its right edge. **Show PDF password** / **Hide PDF password** reveals or masks the current value without submitting the form. Selecting another file, clearing the draft or starting an upload clears/remasks it as appropriate; passwords remain transient.

The GCash workspace uses the same dismissible pop-up style as Payments:

- **PDF ready** confirms that a valid file was selected and still needs submitting.
- **Reading PDF** remains visible while the statement is being read and submitted.
- **PDF submitted** confirms that Records received the revision.
- **Already submitted** explains that the same batch and covered dates already have a submission. The selected file and dates remain available for correction; the existing server conflict rule prevents an extra period.
- Invalid files and failed actions display an actionable error. A stale correction is identified as **Submission changed** rather than reported as a new duplicate.

Rapid repeated submission is guarded while a request is in progress. The pop-up is fixed within the viewport so it remains visible when the form is scrolled, including on mobile. Users can dismiss it, and selecting a new file or clearing the draft replaces/removes stale feedback.

This feedback follow-up passed all 119 web tests, the optimized web build/typecheck, scoped formatting/whitespace and nine browser groups with zero page errors. Browser checks covered mouse/keyboard show-hide, masked resets, selected/progress/success/error pop-ups, guarded rapid resubmission, repeated real API duplicate conflicts, retained drafts and 390/320px dark layouts. Original financial/member/assignment data remains unchanged. Evidence: `.local/gcash-feedback/`.

## Reading pipeline

`gcash_pdf.py` opens/decrypts the PDF using `pypdf`, writes a temporary private decrypted working copy, and reads positioned text through Poppler. Image-only pages, or pages without a recognized text table, are rendered and read with Tesseract. A mixed statement can use both paths. The GCash parser reconstructs wrapped descriptions, preserves reference numbers as strings and calculates with decimal amounts.

The reader checks extracted debit/credit totals, running balances and closing balance against the printed statement when available. It records warnings for unknown layouts, uncertain OCR fields, missing checks, totals that do not reconcile and extracted dates outside the uploader's selected period. It does not learn automatically from uploaded customer data or claim universal support for all statement layouts.

Passwords pass to the helper over stdin and are absent from command arguments, stored extraction, audit records and API responses. The UI clears the password after each submission attempt, file change, correction reset or identity change. Temporary working files are private and are removed after success, failure and forced helper termination. The API bounds concurrent reading, input size, page/row counts, subprocess time and output size; the helper also bounds process memory, CPU time and file size. Subprocess diagnostic output is not returned or logged.

## Storage and API

Forward migration `20261028070000_gcash_pdf_reading` adds nullable `GcashHistorySubmission.readingSummary` and a one-to-one `GcashPdfReading` JSON record. Existing submissions remain valid with no extraction. The summary is returned in queues/history; full transaction rows stay outside those payloads.

- `POST /api/gcash-history`: existing multipart upload fields plus optional `password` (maximum 128 characters; exact characters are preserved).
- `GET /api/gcash-history/submissions/:id/reading?page=1`: authenticated, current-scope extraction read; 25 transaction rows per page and `Cache-Control: private, no-store`.

The extraction, submission, stored-file identity, audit and change event commit together. Failed writes roll them back and remove the uncommitted original object. Each corrected revision receives a new extraction. Existing GCash retention blockers protect the source PDF and authored review evidence; this feature does not invent a new retention period.

## Runtime setup

The API requires Python 3, Poppler (`pdftotext`/`pdftoppm`), Tesseract and English recognition data, plus the pinned dependency in `apps/api-ts/scripts/gcash_pdf_requirements.txt`. The API Docker image installs these dependencies and packages the helper and requirement file. It uses a dedicated Python virtual environment so the existing receipt scanner continues using its established runtime.

For local development, create a Python environment, install the requirement file, and set server-only `GCASH_PYTHON_BIN` in the private API environment to that interpreter's absolute path. The main local demo uses its ignored `.local/gcash-reading/venv`. Do not commit private passwords or customer statements. Synthetic text, encrypted, scanned, blank and page-limit fixtures live under `apps/api-ts/test/fixtures/gcash/`.

Verification evidence is under ignored `.local/gcash-reading/`. The user-provided encrypted statement was tested locally without copying its contents or password into source, fixtures, documentation or the shared demo database. It yielded 21 transactions and all four reconciliation checks passed. This establishes compatibility with that sample, not every possible GCash export.

## Verification completed

- **168 automated checks pass:** 29 PDF-reader/Gcash integration checks (7 reader unit, 22 PostgreSQL integration), 20 retention/role regression checks and 119 web checks. The initial extraction-access assertion was corrected to expect 404 for an unassigned legacy Handler, then the full reader/integration suite passed on a fresh database.
- Final API typecheck/build and optimized Next.js preview build/typecheck pass. Scoped repository formatting and Git whitespace checks pass.
- Eleven browser groups pass with no JavaScript page errors: missing/wrong passwords, retained drafts and password clearing, encrypted upload and table, Records clarification, scanned replacement/OCR warnings, per-revision readings, Finance evidence reads, CEO/customer denial, account-switch clearing, 390px dark and 320px nested history views.
- The migration preserved existing financial/member/source-PDF rows. Final browser testing also preserved the original payments, schedules, batches, memberships and assignments. Stored reading data contains no PDF password.
- The provided encrypted sample yields all 21 rows with debit total, credit total, running-balance and closing-balance checks passing. Its private contents/password were used only for local read-only validation, not copied into the seeded demo or tracked fixtures.

The main local API, worker and rebuilt web preview run on their usual ports 4100/3000. Synthetic October 1–31 examples under `ACCESS-DEMO-001` demonstrate text and scanned revision readings; the earlier November pending-review sample remains available.

This work is local and uncommitted. Manual user/client acceptance and production deployment remain separate.
