# Customer portal implementation policy — 2026-09-25

The project owner delegated the initial customer document decisions during this implementation. These defaults support the local customer-to-Records workflow and should be checked during Fresh Phones PH UAT before collecting real customer IDs in a production environment.

## Required documents

| Requirement | Purpose | Customer guidance |
| --- | --- | --- |
| Valid photo ID | Link the enrollment to the customer | One clear government-issued photo ID, with all four corners visible. |
| Signed client agreement | Keep the agreed enrollment record | The signed Fresh Phones PH agreement supplied by Records. |

No proof of address, selfie, bank statement, or second ID is requested by default. Records can assist a customer who does not yet have the agreement; the portal does not generate or sign it.

## Upload and review

- PDF, JPG, PNG, and WebP are accepted, up to 5 MB per file. The API checks file signatures as well as declared media type and size. The filename does not determine document type.
- A linked customer may see and submit only their own checklist. Records or Owner may upload and review a client's requirements. Other employee roles have no document access.
- Statuses are **Missing**, **Submitted for review**, **Approved**, and **Needs clarification**. A Records or Owner reviewer must give a customer-visible correction reason when requesting clarification. There are no internal review notes in this initial workflow.
- A replacement is accepted only after a clarification request. The prior file, review result, and audit trail remain available to the customer and Records. Concurrent/stale reviews are rejected using the document version.
- Files are stored under random private keys; the API checks ownership before download and returns them as attachments. No raw storage path or public link is returned. Failed database writes remove only the newly uploaded file.
- Checklist completion does not verify a payment, change the financial balance, or authorize release. Records updates the release status separately.

Local development uses the API's private filesystem storage. A private S3-compatible provider and copy/verify migration command are implemented and tested with local MinIO. Production still requires a client-owned private bucket, approved privacy/retention rules, and client UAT. Do not upload real identity documents to the local demo environment. See [launch and UAT checklist](23-customer-launch-uat.md).

## Other customer updates

- Customer Service may move cases through Open, In progress, Waiting for client, Resolved, and Closed. A resolution is required before resolving or closing; Closed is final. The customer can view only their own case and customer-visible resolution.
- The portal shows in-app notifications for Finance-verified payments, release-status changes, support updates, and document review. Notifications are tied to the linked customer account and can be marked read. The NestJS service queues corresponding email for post-commit delivery with retries. Owner can edit audited customer email templates and reminder timing at `/system/notification-settings`; reminders start disabled. Staff notification workflows remain a separate notification infrastructure task.

Implementation: `apps/api-ts/src/portal`, `apps/web/components/DocumentChecklist.tsx`, `apps/web/app/portal/page.tsx`. Evidence: `apps/api-ts/test/integration.test.ts` customer document and support/notification tests.
