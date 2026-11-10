# Printable application summary (#11)

Jaycee approved this addition on October 30, 2026: customers can print or download a summary of the selected membership's existing records alongside the current Google Forms workflow. It does not reproduce the original Google Form or create a new agreement/signing workflow.

## Customer flow

1. Sign in through the existing Customer account at <http://localhost:3000/login>.
2. Open **My documents** and select the relevant batch.
3. Choose **View application summary**.
4. Read the preview, **Download PDF**, or **Print**. **Back to documents** returns to the same batch.

The contextual action appears only in My documents. There is no new sidebar item or overview widget. The existing My documents / Client agreement upload flow remains available.

The preview URL captures the membership UUID. Requests, displayed fields, PDF downloads and the return link use that same membership. Missing, malformed or duplicate selections show an error instead of falling back to the primary membership. Another tab selecting a different batch cannot change an open summary.

## Contents and record meaning

- Customer's recorded name, email and phone; membership reference, status and joined date. Retained replacement history includes the replacement-completed date.
- Batch number, unit, batch status and batch dates.
- Recorded individual membership-plan dates/cadence where present, otherwise batch-plan dates/cadence.
- Actual issued schedule count, earliest/latest due dates and **Original scheduled amount**, calculated from original issued schedule rows using decimal arithmetic. This amount is not a payment balance; payment activity remains in the statement of account.

Missing details say **Not recorded**; an unissued schedule stays **No schedule issued**. No schedule, amount or due date is invented from draft batch defaults. Invalid stored individual-plan dates/cadence require review and return a conflict rather than silently substituting different terms.

Both HTML and PDF use the same field list. The document says: “A summary of your current membership record. Your application and signed agreement are handled separately.” There are no signature lines, new contractual terms or consent fields.

## Authorization and implementation

`GET /api/portal/application-summary` requires the existing payment-read permission, then independently requires an active CUSTOMER account owning the selected retained membership. Ownership and data are read inside a repeatable-read transaction. Staff roles, foreign/missing memberships, erased records and deactivated accounts cannot export the document. Responses are private, `no-store`, explicit projections.

The payload excludes raw enrollment applicant JSON, review reasons, staff identities, other members, internal positions, payment activity and verified/current balances. Exporting does not write membership, schedule, payment, payout or agreement records. Existing selected-membership authorization remains authoritative.

Source is concentrated in:

- `packages/contracts/src/application-summary.ts`.
- `apps/api-ts/src/records/portal-application-summary.ts`, with narrow Records controller/service delegates.
- `apps/web/lib/application-summary.ts` (captured selection, section data, cancel-safe loading).
- `apps/web/lib/application-summary-pdf.ts` (self-hosted fonts, wrapping, pagination and download).
- `apps/web/app/portal/application-summary/` and the My documents action.

No schema migration or new package dependency is required.

## Source comparison

DIO inspected the existing account PDF/print implementation and compared upstream [pdf-lib README/custom fonts](https://github.com/Hopding/pdf-lib/blob/93dd36e85aa659a3bca09867d2d8fac172501fbe/README.md), [PDFPage source](https://github.com/Hopding/pdf-lib/blob/93dd36e85aa659a3bca09867d2d8fac172501fbe/src/api/PDFPage.ts) and [React PDF download implementation](https://github.com/diegomura/react-pdf/blob/f765c957902eb1f0d15b1571d6f61e5818e8bc50/packages/renderer/src/dom/PDFDownloadLink.js). Both projects are MIT licensed. Reusing the installed pdf-lib/fontkit with existing Noto fonts avoids another renderer/dependency system and preserves the current app's PDF behavior.

ROSS applied user-expi then ui-design-index. The routed ui-design-systems skill is not installed; existing portal/document components supply the compatible visual patterns. YELYAH independently inspected authorization/privacy/selection and extracted maximum-length Unicode PDF text/bounds with no actionable findings.

## Verification

- 43 PostgreSQL/API scenarios pass across the new 11-case summary suite, existing 22-case multiple-membership suite and existing 10-case batch-summary suite.
- 150 web scenarios pass, including seven new query/formatting/stale-read/error/PDF cases. Focused tests additionally verify uppercase UUID normalization.
- Contracts/API builds, API/web types and scoped repository formatting pass.
- Optimized local web/API builds are running on ports 3000/4100. Nine read-only live browser groups pass with zero page errors: captured selection, another-tab isolation, 1440/390/320px light/dark reflow, A4 print, downloaded/printed PDF text, read failure/retry, font failure, invalid link/ownership boundaries and unchanged financial totals. PDF output was visually inspected; the normal demo summary fits one A4 page. User/client acceptance and deployment remain separate.

Private local evidence is under `.local/application-summary/` (ignored). Application data tests run only in a dedicated migrated database ending in `_test`; live browser validation uses existing Customer memberships without fixture writes. Source remains local and uncommitted.

## Placement correction — October 30, 2026

Jaycee corrected the entry point to **My documents**. This supersedes the initial My membership placement. The action sits above the existing document checklist, and the preview returns to My documents with the same captured membership. The earlier nine-group walkthrough is initial feature evidence; post-move placement/navigation checks are recorded separately.

Post-move verification: seven focused web checks, optimized web build/types, scoped formatting and three read-only live browser groups pass with zero page errors. My documents placement, removal from My membership, selected-batch changes, 1440/390/320px light/dark layout, captured PDF download and Back to documents were verified.
