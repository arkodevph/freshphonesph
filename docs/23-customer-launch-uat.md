# Customer portal launch and UAT checklist

Prepared 2026-09-26. The code and local test evidence below are ready for review. Production collection of real IDs and customer email remain gated on Fresh Phones PH decisions and client-owned services.

## Local evidence

- API unit suite: verified installment waterfall including partial, overdue, upcoming and overpayment cases.
- API integration suite: customer record isolation, Finance-only verification, schedule allocation, private document review/download, support and notifications, statement/confirmation, reset, and local email delivery.
- Web and API production builds: pass.
- Customer journey follow-up: support reply ownership and privacy, pending payment visibility, release milestones, reminder wording and record links pass API integration tests; mobile screens and a downloaded account PDF have been checked locally.
- Staff follow-up queue: role-scoped support, Records document review, and Finance verification lists show oldest waiting items, counts, and links to the exact records. API integration verifies access and that reviewed items leave the queue. The work queue renders at desktop and 390 px mobile widths.
- Private S3-compatible storage: upload/read/delete verified against local MinIO; migration dry run and copy verified 14/14 local fixture files by SHA-256. Local originals remain.
- The 2026-09-30 local launch check passed the login page, API/database health, and a synthetic private-file upload/read/delete. It reported the client-owned bucket, verified sender, policy approvals, and named UAT as outstanding; it did not send email or use real customer files.

## Customer walkthrough

Use synthetic records and two separate customer accounts. Repeat at a narrow mobile width and a desktop width.

| Check | Expected result | Reviewer / result |
| --- | --- | --- |
| Sign in and recover password | Sign-in uses the approved split layout. Account access help is reachable from login. Reset email contains a single-use 30-minute link; use revokes prior sessions. Unknown email receives the same response. | Pending |
| Membership and key dates | Correct assigned batch and unit/model, joined date, batch start, and planned end are visible. Correction requests show their status and outcome. | Pending |
| Installment plan | Verified funds fill due installments in order. Payment state and due timing are separate; each remainder and the total currently due agree with Finance records. | Pending |
| Payments and account documents | Pending staff-recorded payments are visible separately and never change the verified balance. Verified history remains isolated. Statement and confirmation download directly as PDFs with a clear non-BIR notice. | Pending |
| Documents | Customer can preview a selected file, upload their own permitted file, see the result and review status, replace after clarification, and download only their own files. HEIC guidance is clear. | Pending |
| Release and support | Staff-entered milestones, last update time, and confirmed collection details reach only the linked customer. Customer and staff can reply on a case; a customer reply moves Waiting for client back to In progress. | Pending |
| Notifications and email | In-app and email updates link to the exact payment, release milestone, support case, document or installment. Reminders acknowledge a staff-recorded payment awaiting Finance review. No unrelated customer receives them. | Pending |
| Reminders | If approved offsets are configured, due reminders are sent once per configured offset and omit fully paid installments. | Pending |
| Navigation and accessibility | Pages work with keyboard, readable focus, mobile navigation, zoom and reduced motion. | Pending |
| Staff follow-up | Customer Service, Records, and Finance see only their permitted queues. Links open the exact case, document, or payment; actioning it removes it from the queue. Check the oldest items with a realistic backlog. | Pending |

## Production setup

1. Fresh Phones PH provisions a **private** bucket in its own Supabase project and enables S3 access. Use server-only keys and the direct storage S3 endpoint. The API requires `PRIVATE_STORAGE_PROVIDER=s3`, endpoint, region, bucket, access key, secret key, and HTTPS. Keep the bucket private; the browser accesses files only through role-checked API endpoints. [Supabase S3 setup](https://supabase.com/docs/guides/storage/s3/authentication).
2. Before switching providers, back up the database and local private files. Run `pnpm --filter @fresh/api-ts storage:migrate` to count files, then `pnpm --filter @fresh/api-ts storage:migrate --apply` to copy and SHA-256 verify them. Keep originals until the rollback window ends. Test customer and staff downloads after switching.
3. Configure the Fresh Phones PH verified sending domain, `RESEND_API_KEY`, and an explicit `EMAIL_FROM` on that domain. Production startup rejects the example sender. Notifications are queued with the account change, delivered after commit, retried, and marked `FAILED` for manual review after repeated failures or the provider's 24-hour idempotency window. Existing notifications are not backfilled as new emails. [Resend idempotency keys](https://resend.com/docs/dashboard/emails/idempotency-keys).
4. The Owner reviews customer email templates and reminder timing at `/system/notification-settings`. The default reminder setting is blank. `CUSTOMER_REMINDER_DAYS_BEFORE` is an optional deployment fallback if no database setting exists; for example `3,0` for three days before and due day. Confirm recipient email addresses before enabling production email. Keep reset and notification messages free of private document contents.
   To check a real inbox from local development, create a Resend sending API key, set `RESEND_API_KEY` in the ignored `apps/api-ts/.env`, and set `EMAIL_FROM=Fresh Phones Test <onboarding@resend.dev>`. Restart the API and use **Send yourself a test reminder** on that page. Enter the same address used to sign up for Resend; its shared test sender cannot email other recipients. The button sends a clearly labeled sample through Resend and does not create a customer notification or alter a schedule. Ordinary development notifications still write to `.local/mail`. A provider acceptance response does not prove inbox delivery; check the inbox and spam folder. The test button allows three attempts per owner account every 15 minutes. Production still requires a verified Fresh Phones PH sending domain.
5. Run migrations and the API/web smoke tests in client-owned staging, restore a backup, and rehearse rollback before launch. No live credentials or real ID files belong in the local demo.

### Repeatable readiness checks

Run `pnpm --filter @fresh/api-ts launch:check` against the local demo. It checks the login page, API/database health, and a synthetic private-file upload/read/delete. It reports production dependencies as actions, never as completed checks.

Once client-owned staging is configured with `NODE_ENV=production`, the private bucket, and the verified sender, run `pnpm --filter @fresh/api-ts launch:check --staging --api-origin=https://STAGING_API_ORIGIN`. This performs the same checks against staging and rejects an anonymously readable synthetic S3 object; it cleans up that object afterward. Run it only against a dedicated staging environment. It does **not** send email, prove every bucket policy, approve reminder wording, or replace the named customer walkthrough.

Record the provider test email, mobile/desktop journey results, privacy decisions, backup/restore rehearsal, and reviewer approval in the [customer launch sign-off template](uat/customer-launch-signoff-template.md). Keep credentials and real identity files out of that record.

## Decisions and sign-off still required

| Decision | Owner | Recorded decision |
| --- | --- | --- |
| Required ID/agreement list, customer notice and consent text | Records and privacy owner | Pending |
| Retention/deletion periods for IDs, agreements, proofs, old versions, email logs and backups | Privacy owner | Pending |
| Support and incident contact, access review, export/deletion request process | Operations and privacy owner | Pending |
| Email template wording and reminder offsets | Operations and privacy owner | Pending |
| Client-owned Supabase bucket, domain, sender and production credentials | Client technical owner | Pending |
| Named mobile/desktop UAT pass and launch approval | Fresh Phones PH reviewer | Pending |

Do not record UAT as accepted or collect real identity documents until these entries are completed.
