# Privacy notices and portal terms — review draft

Implemented locally on `feature/reports-page`, 2026-10-09. **This is a review draft, not an approved privacy or legal publication.** Fresh Phones PH has not yet supplied its formal privacy workflow, exact controller identity/contact, retention schedule, recipients or final terms. The business remains responsible for approving the wording before release; see [Full Scope v6 §14](source/Full-Scope-v6.pdf).

## Reviewable screens

- `/privacy` lists the four documents.
- `/privacy/customer` describes customer records, payments, documents and support.
- `/privacy/employee` describes staff accounts, tasks, KPI and human HR review.
- `/privacy/applicant` describes recruitment fields, attachments and human review.
- `/terms` describes portal use and identifies the customer rules still to approve.

The public footer, Careers application, login, customer Settings and staff account menu link to the relevant text. Each draft displays its version, an **unapproved draft** banner and the business decisions needed before publication. Draft pages include a `noindex` directive. The text lives in `packages/contracts/src/legal.ts`, shared by the web app and API. The drafts are deliberately not eligible for acceptance, and the API rejects an attempt to acknowledge them.

The drafts follow the National Privacy Commission's [right-to-be-informed fields and data-subject rights](https://privacy.gov.ph/implementing-rules-regulations-data-privacy-act-%202012/) without inventing the controller's unconfirmed lawful bases, recipients, contact or retention periods. Displaying a notice or recording that it was read is **not** treated as blanket consent. The portal terms use a separate affirmative **I agree** action when an approved version exists.

## Approved-version behavior

To activate a document after signed business/legal approval, replace its draft text and review items in `packages/contracts/src/legal.ts`; assign a new non-draft `version`, set `status: 'PUBLISHED'`, and set its approved effective `publishedAt`. A published entry with missing effective date or unresolved review items fails closed. Changing approved wording requires a new version; never overwrite an old version identifier.

Production API startup also refuses to run while any of the four documents remains a draft. This prevents accidentally launching personal-data collection with review copy. Local preview remains available for business review.

When a current customer privacy notice or portal terms version is published, a customer must acknowledge the notice and separately accept the terms before using protected portal APIs. Staff must acknowledge a published employee notice before using protected staff APIs. `GET /api/auth/me`, sign-out and the legal routes remain available so people can review or decline. The web gate shows the full current text and preserves access only after the API saves the response. The API returns HTTP 428 for other protected routes while a current publication is pending.

When an applicant notice is published, the Careers application at `/careers/apply` requires a separate read acknowledgment. `POST /api/careers/apply` checks its exact current version and stores the application and acknowledgment in one transaction. A stale or absent version is rejected without retaining an application or attachment. Before publication, the form links to the draft but does not claim a draft acceptance.

Migration `20261009010000_legal_notices` adds immutable `LegalDocumentVersion` snapshots and append-only `LegalAcknowledgement` records. Each decision identifies the subject, exact version, action, time and a SHA-256 hash of the stored document snapshot. Database constraints require one subject and reject edits; user actions also write an audit entry. Approved profile erasure in [the retention workflow](51-retention-deletion.md) removes linked acknowledgement rows under its configured policy while retaining published document versions. Existing users and applicants are **not** backfilled as if they had read a notice.

## Business decisions required

1. Exact registered personal information controller name, address and privacy/DPO contact.
2. Approved purpose and lawful basis for each customer, employee and applicant data use; separate optional choices where appropriate.
3. Actual recipient categories, service providers, hosting locations and any data sharing or transfer rules.
4. Record-by-record retention periods and how access, correction, objection, erasure or blocking requests are handled.
5. Final portal account, correction, suspension, dispute and signed-agreement rules; effective dates and change-notice method.
6. Whether a published applicant notice may cover future-role consideration or whether that needs an optional separate choice.

The separate DPA, DPO appointment, privacy impact assessment, NPC registration/exemption review and incident procedure remain in §14 and the [scope matrix](18-scope-traceability-matrix.md). Retention/deletion controls now exist locally in [51-retention-deletion.md](51-retention-deletion.md); activating policies requires approved business periods and disposition instructions.

## Verification

The migration applies to a fresh dedicated PostgreSQL test database and to the backed-up local preview (30 active migrations). Verification passed 59 API unit tests, 132 PostgreSQL integration tests, 55 web tests, API typecheck and the Next.js production build. `test/legal.integration.test.ts` covers draft rejection, customer/staff role gates, separate notice/terms actions, concurrent idempotent acknowledgment, version changes, update protection and applicant submission atomicity. `apps/web/test/legal-api.test.ts` covers the client adapter's exact version and applicant evidence. Run web tests with `NEXT_PUBLIC_API_BACKEND=typescript`.
