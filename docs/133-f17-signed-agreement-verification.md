# F17 signed agreement upload verification

On November 10, 2026, the user selected **Upload a signed PDF/image** and confirmed that an approved agreement template is **not available for now**. The selected upload/review workflow already exists. No new agreement text, signature-drawing UI or template publication was added.

## Existing workflow

1. Records provides the approved agreement outside the app when available. The customer signs it and prepares a PDF, JPG, PNG or WebP copy, up to 5 MB.
2. In **My documents**, the customer uploads **Signed client agreement**. The server checks the allowed file type, header signature and size, then stores the file privately with a submission audit record.
3. Records opens the document through the existing client document review flow and approves it or requests clarification. A pending or approved upload cannot be overwritten.
4. After clarification, the customer uploads a corrected copy. Both revisions remain available; approval uses optimistic version checks and creates review audit/history and a customer notification.

This is a client-level document requirement, not an agreement bound to a particular membership or template revision. File validation checks file signatures, not handwritten/digital signature authenticity. Records must inspect the actual pages and signature. The printable application summary remains separate and is not a signed contract. The public intake retains its immutable published revision and answers, with assigned Agent forwarding and assigned Manager approval.

## Verified in this session

Added a dedicated synthetic signed-agreement regression in `apps/api-ts/test/integration.test.ts` without changing production behavior. It verifies PDF bytes/private retrieval, rejected fake PDF, customer/anonymous access boundaries, denial of customer review, duplicate-upload conflict, Records clarification, corrected PNG upload, approval, stale-review conflict, retained original/replacement bytes and four submission/review audit records. File-header fixtures do not prove rendering or authenticity of a real signed agreement.

- **2 document integration scenarios pass**, including the existing photo-ID lifecycle and new signed PDF → corrected image lifecycle.
- **31 application-summary/public-intake integration scenarios pass**, including selected membership ownership, original issued plan, unchanged financial rows, editor permissions, immutable revisions, Agent forwarding, Manager approval and retention boundaries.
- **22 web checks pass** for printable PDF generation, captured membership selection, document file normalization/limits and public application state/recovery.
- API TypeScript checking, scoped repository formatting and scoped whitespace checks pass.

All integration writes used the dedicated migrated `freshphones_f17_test` database on local PostgreSQL port 5549. Logs: `/tmp/freshphones-f03-20261110/f17-signed-agreement.log`, `f17-application-intake.log`, and `f17-web.log`. No new browser walkthrough or real agreement acceptance was performed in this session; earlier browser evidence remains in docs/79 and docs/81.

## Remaining acceptance

The approved agreement wording/template, required signature fields and any membership/template-revision binding remain unknown. Obtain those inputs when available before declaring the agreement-content requirement accepted. The implemented upload workflow can be used once Records has an approved document. Google Forms synchronization remains deferred. Changes remain local; no commit, push or deployment was performed in this session.
