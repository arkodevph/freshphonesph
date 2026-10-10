# Retention and deletion controls

Implemented locally on `feature/reports-page`, 2026-10-09, for scope item #9 / Full Scope v6 §14. Open the Owner workspace at `/system/retention`.

**Activation is pending the business’s approved retention schedule and workflow.** There are no seeded periods or active policies. Every erasure requires an active approved policy, an eligible record, a request, an Owner decision and typed confirmation. No timer automatically deletes records.

## Workflow

1. Create an inactive, versioned policy for a category. Supply days after final activity, the business purpose/basis, backup expiry/restore instructions and external copy/provider instructions. Activate it with the business approval reference. New approvals retire the prior revision; earlier deletion requests then need fresh review.
2. Search and page through records. Preview eligibility, linked private files, retained operational facts and blockers. The preview captures a content fingerprint without storing the person’s name/email in the deletion request manifest.
3. Place a legal or operational hold when records must be preserved. Parent holds protect attachments; a file hold also protects profile erasure. Releasing a hold records the actor, date and reason. Hold history invalidates earlier previews.
4. Request deletion with a case reference/reason. Review the current record preview, then approve or reject with a reason. Each mutation checks the current active Owner in the API transaction.
5. Execute an approved request by typing the full record UUID. The API recomputes eligibility, policy, holds and fingerprint under the shared write lock. Changes require rejection and a fresh request.
6. Application record cleanup commits with durable private file/local mail jobs. Queued files cannot be downloaded or attached elsewhere. Successful storage removal is confirmed before metadata is removed. Failed jobs remain visible, retain a retry key, and can be resumed from another API process. Jobs use leases and fencing tokens.
7. Complete the policy’s backup/provider/exported-copy follow up. Record the evidence reference and Owner confirmation after the application reports completion. This confirmation is separate from application erasure status.
8. Export the deletion ledger and store it privately outside the database’s backup history. The ledger contains identifiers, policy and decision evidence, and cleanup manifests. Free text can still contain personal information if an operator enters it: use case references in reasons and protect the export.

## Categories and safeguards

| Category | Eligible state | Application cleanup | Preserved facts / blockers |
|---|---|---|---|
| Finalized applications | `REJECTED` or `HIRED`; final activity older than policy | Name, contact, message, reviewer notes, linked notice acknowledgements, attachments and related audit details | Pseudonymous record/status/time references; open applications and holds block erasure |
| Completed customers | `COMPLETED`, unit `RELEASED`, portal inactive, all cases `CLOSED`, no unresolved claims, exact schedule/verified balance zero | Customer and account identity, credentials/sessions, requirements/private documents/receipt proofs, payment personal fields, support conversation/resolution, release notes and linked copies | Payment amounts, verification actors/time/status, issued schedules, aggregates and audit action/time/IDs remain. Financial adjustment evidence blocks profile erasure pending its separately approved disposition |
| Inactive employees | Another inactive staff account, finished assigned work, no active handled batches/open assigned cases | Account identity/credentials/sessions, assigned completed task descriptions/reports/attachments and KPI narrative, linked account notices/copies | Task timing/status, actor/event references remain. HR action evidence and authored submitted report analysis block profile erasure pending their separately approved disposition |
| Private files | Orphan file, or parent application/customer/task satisfies finality checks; policy elapsed | Blob versions, retained local migration copy, filename metadata and download references | Public catalog images and unfinished parent work are protected. Every linked parent hold is checked |

The retention clock uses the latest relevant record/file/work activity, including linked review and conversation timestamps. Customer financial arithmetic uses Prisma Decimal, including Finance adjustments. Profile erasure leaves a tombstone because operational foreign keys still refer to the record. These retained records are pseudonymous and must continue to be access controlled; this workflow does not claim complete dataset anonymization.

Audit cleanup retains actions, dates, identifiers, enums and monetary values while erasing descriptive personal strings in identified record snapshots. Explicit foreign keys, record IDs in snapshots, notification links and dedupe keys identify linked copies. Independently authored free text about another person, immutable decisions, untracked exports and third party copies require the business’s review process. Submitted report analysis and financial/HR decision bodies are protected from rewriting.

## Redis worker integration — 2026-10-09

When Redis is configured, typed execution commits erasure and durable file jobs,
then returns `FILES_PENDING`. Separate BullMQ workers remove those copies with
fenced leases and up to five storage attempts. Owner-authorized execution remains
required. Failed jobs can be reset through the existing audited retry action. The
retention screen refreshes on Owner-only events and preserves review drafts.
See [53-redis-events-workers.md](53-redis-events-workers.md).

## Storage and recovery

- Local files: unlink errors other than absence fail the job; absence is confirmed. Local saved email previews under `.local/mail` are queued for strict removal too. For account erasure, exact recipient headers identify older password reset previews with untracked filenames, including former addresses preserved in the account audit trail. Preview fingerprints include their content hashes. Reset email delivery is serialized with erasure; newer reset previews use the reset record ID as their filename.
- S3: query bucket versioning, remove every matching version/delete marker, then confirm no current object/version remains. Object lock, unsupported version APIs or missing permissions fail the job without claiming success. The chosen production provider needs capability/permission verification during UAT.
- The storage migration helper skips missing metadata and `purgePending` objects to prevent copying erased/orphan blobs back into the bucket. Retention also removes local originals retained by that helper. Keep the API offline while performing a storage migration or restore.
- `FILES_PENDING` means the profile is erased and downloads are blocked, while one or more physical copies await confirmed removal. Retry after repairing storage access. Active leases are respected; expired leases can be reclaimed. Completed job keys are cleared.
- Storage deletion is irreversible. Database rollback cannot restore a confirmed deleted object. Migration `20261009020000_retention_deletion` is additive and starts with zero policies/requests/jobs; existing accounts and files are preserved during rollout.

### Restore procedure

1. Restore into an isolated environment with API, email delivery and public/private downloads disabled.
2. Apply current migrations and obtain the newest deletion ledger from its separate private location. Treat the ledger as sensitive operational evidence.
3. Reconcile every erased target, linked record ID and file/mail ID against the restored data, including `FILES_PENDING` requests. Reapply approved erasures through the Owner workflow, using the approved policy and original case evidence. A restored active account must first be deactivated; resolve any blockers through the approved workflow. Importing a deletion ledger does **not** itself execute deletion.
4. Remove restored private blob versions/local originals/mail previews and verify that no erased profile or download is available. Include provider backups and externally restored exports under the recorded policy instructions.
5. Export the reconciled ledger, record restoration evidence, then reopen access. Do not reopen the restored system while reconciliation is incomplete.

Backups and files already delivered to recipients are governed by the separately recorded business instructions. Application completion and Owner follow up confirmation provide separate evidence; neither measures a third party’s actual deletion automatically.

## Implementation and verification

- Shared contracts: `packages/contracts/src/retention.ts`; `RETENTION_MANAGE` is Owner only.
- API: `apps/api-ts/src/retention/`; guarded policies, candidates, preview, holds, requests, decisions, execution, retries, follow up and deletion-ledger export.
- UI: `apps/web/app/system/retention/`; accessible forms, typed erasure confirmation, paging, dark/mobile styles and retained form contents on errors.
- PostgreSQL migration protects immutable policy revisions, request transitions, unique active policies/open requests, erased profile resurrection and file attachment to queued blobs.
- Dedicated PostgreSQL scenarios cover default inactivity, access, immutable revisions, finality/expiry, parent holds, concurrent duplicate requests, stale data/policy/holds, full application/customer/employee cleanup, preserved monetary/task facts, storage failure/retry across processes, leases and revocation.
- A separate explicit local MinIO test verifies unversioned/versioned object deletion and local migration copy cleanup. Run it with a dedicated `_test` database and `RETENTION_TEST_S3_ENDPOINT`, `RETENTION_TEST_S3_ACCESS_KEY`, `RETENTION_TEST_S3_SECRET_KEY` pointing to local test infrastructure; it creates and removes its own synthetic bucket.

Local evidence: API unit tests **61 passed**; web tests **61 passed**; retention PostgreSQL scenarios **9 passed**; real MinIO storage scenario **1 passed**; API and web production builds passed. The **143** API integration scenarios were covered by the full batch plus a focused **77/77** rerun of the core file after isolating test fixture login counters. The initial full batch had nine cascading login-throttle failures; production limits were kept intact. Password reset regression checks also passed after serializing reset email delivery with erasure. The Owner browser check passed for all categories, policies/requests/holds and desktop/mobile layouts, with no browser errors or mobile horizontal overflow. Localhost migration was backed up first, activated no policies and erased no preview records; all four seeded demo accounts still sign in.

## Business acceptance still required

Approve the periods and clock basis for each category; retained operational facts and statutory/decision evidence; hold placement/release rules; whether one Owner may request and approve the same case; data subject request handling; backup/provider/exported-copy disposition and restore rehearsal. Name the responsible privacy contact and UAT reviewers. Local policies remain inactive until those decisions are provided.
