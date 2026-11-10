# GCash history in the main local demo

On October 28, 2026, Jaycee requested integrating the isolated GCash PDF task into the main demo so the usual seeded workspace buttons work without entering separate fixture credentials.

**PDF reading update:** new uploads accept an optional PDF password and produce an extracted transaction table using direct text or Tesseract. [Upload and review guide](72-gcash-pdf-reading.md).

## Test with the existing accounts

Open [main login](http://localhost:3000/login), expand **Preview a workspace**, and select:

- **Batch handler** → **GCash history**: select an assigned batch, covered dates and the complete PDF, then **Submit PDF to Records**. After a clarification request, use **Submit corrected PDF** on that period.
- **Records & monitoring officer** → **GCash history**: download the PDF, select **Review submission**, choose **Reviewed** or **Needs clarification**, add a note and save. **PDF history** retains original and corrected files and review notes.
- **Finance officer** or **Chief operating officer** → **GCash history**: read/download evidence. Records decisions remain unavailable.

These are the existing main-demo accounts. Their passwords, identities and assignments were retained. Use separate private windows/browser profiles to compare roles simultaneously.

The clearly synthetic **ACCESS-DEMO-001** batch is assigned to the existing seeded Batch Handler. Synthetic November periods demonstrate the correction/review flow and a pending review. The PDFs explicitly say they contain no real transactions and are not GCash exports. They do not introduce payment records or verified funds.

Direct workspace: [GCash history](http://localhost:3000/system/gcash-history).

## Current permissions

| Role                                                    | Read/download               | Upload/correct              | Records review                                   |
| ------------------------------------------------------- | --------------------------- | --------------------------- | ------------------------------------------------ |
| Current assigned `BATCH_HANDLER`                        | Assigned batches            | Assigned batches            | No                                               |
| `RECORDS`                                               | All batches                 | No                          | Yes, with a required note; no self-review        |
| `FINANCE_OFFICER`, `COO`                                | All batches                 | No                          | No                                               |
| Owner / CEO, Customer, Manager and other business roles | No                          | No                          | No                                               |
| Internal `SYSTEM_ADMIN`                                 | Existing maintenance policy | Existing maintenance policy | Existing maintenance policy, with no self-review |

The legacy `CORE_HANDLER` alias follows the canonical Batch Handler policy. Owner / CEO remains report-only. API guards, fresh assignment checks and private downloads enforce these permissions independently of navigation and direct-page rules.

## Integration details

The feature source is now in `/home/jaycee/Projects/freshphonesph-main-run`, alongside the current role/enrollment and earnings work. The isolated GCash checkout remains as historical implementation evidence; its separate accounts/database are unnecessary for testing this integrated feature.

Added `GCASH_HISTORY_READ`, `GCASH_HISTORY_UPLOAD` and `GCASH_HISTORY_REVIEW` to the current role map, registered the controller/service, integrated live-event visibility and retention protection, and added the sidebar, route availability and workspace access policy. Existing `batchScope` and business role mappings were preserved.

Main forward migrations are `20261028060000_gcash_history_reviews` and `20261028060100_gcash_history_queue_index`. They add private period/revision evidence and queue indexes. A concurrent membership migration in the shared checkout was also present during migration deployment; comparison against the pre-change backup confirmed all original rows/columns in 59 existing tables were preserved, with its new identity links checked separately.

The preview uses the existing private storage configuration, so older document files remain available. PDFs have a 10 MB limit, authenticated no-store downloads, immutable revisions, stale-version conflicts, audit records and assignment-based access. Generic retention cannot silently erase authored GCash evidence. Records review never verifies a payment or changes a member balance; Finance retains final financial verification.

Private backups and evidence are recorded in `.local/gcash-integration/`. Private configuration, credentials and browser fixtures are excluded from source control. Validation passed: **228 automated checks** (44 PostgreSQL integration, 68 API unit, 116 web), API types/build, optimized web build/types, original-row preservation, and browser upload/clarification/correction/review and role denial checks. The full web run initially exposed a concurrent membership-helper assumption about mocked browser locations; the small location guard was corrected and all 116 web checks passed. Browser/layout details and current runtime health are recorded there and in the [updated afternoon handoff](68-2026-10-28-afternoon-handoff.md).

This is a local demo integration. User/client acceptance, committing, pushing and production deployment remain separate.
