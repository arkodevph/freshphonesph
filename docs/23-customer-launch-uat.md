# Customer portal launch and UAT checklist

Prepared 2026-09-26. The code and local test evidence below are ready for review. Production collection of real IDs and customer email remain gated on Fresh Phones PH decisions and client-owned services.

## Local evidence

- API unit suite: verified installment waterfall including partial, overdue, upcoming and overpayment cases.
- API integration suite: customer record isolation, Finance-only verification, schedule allocation, private document review/download, support and notifications, statement/confirmation, reset, and local email delivery.
- Web and API production builds: pass.
- Private S3-compatible storage: upload/read/delete verified against local MinIO; migration dry run and copy verified 14/14 local fixture files by SHA-256. Local originals remain.

## Customer walkthrough

Use synthetic records and two separate customer accounts. Repeat at a narrow mobile width and a desktop width.

| Check | Expected result | Reviewer / result |
| --- | --- | --- |
| Sign in and recover password | Sign-in uses the approved split layout. Reset email contains a single-use 30-minute link; use revokes prior sessions. Unknown email receives the same response. | Pending |
| Membership and key dates | Correct assigned batch and unit/model, joined date, batch start, and planned end are visible. | Pending |
| Installment plan | Verified funds fill due installments in order. Paid, partial, overdue, and upcoming states and applied amounts agree with Finance records. | Pending |
| Payments and account documents | Only Finance-verified payments appear. Statement and payment confirmation print/save as PDF with a clear non-BIR notice. | Pending |
| Documents | Customer can upload their own permitted file, view review status and clarification, replace after clarification, and download only their own files. | Pending |
| Release and support | Release status updates reach the linked customer. Support cases show customer-visible resolution only. | Pending |
| Notifications and email | In-app and email updates match payment verification, release, support, and document review. No unrelated customer receives them. | Pending |
| Reminders | If approved offsets are configured, due reminders are sent once per configured offset and omit fully paid installments. | Pending |
| Navigation and accessibility | Pages work with keyboard, readable focus, mobile navigation, zoom and reduced motion. | Pending |

## Production setup

1. Fresh Phones PH provisions a **private** bucket in its own Supabase project and enables S3 access. Use server-only keys and the direct storage S3 endpoint. The API requires `PRIVATE_STORAGE_PROVIDER=s3`, endpoint, region, bucket, access key, secret key, and HTTPS. Keep the bucket private; the browser accesses files only through role-checked API endpoints. [Supabase S3 setup](https://supabase.com/docs/guides/storage/s3/authentication).
2. Before switching providers, back up the database and local private files. Run `pnpm --filter @fresh/api-ts storage:migrate` to count files, then `pnpm --filter @fresh/api-ts storage:migrate --apply` to copy and SHA-256 verify them. Keep originals until the rollback window ends. Test customer and staff downloads after switching.
3. Configure the Fresh Phones PH verified sending domain, `RESEND_API_KEY`, and `EMAIL_FROM`. Notifications are queued with the account change, delivered after commit, retried, and marked `FAILED` for manual review after repeated failures or the provider's 24-hour idempotency window. Existing notifications are not backfilled as new emails. [Resend idempotency keys](https://resend.com/docs/dashboard/emails/idempotency-keys).
4. The Owner reviews customer email templates and reminder timing at `/system/notification-settings`. The default reminder setting is blank. `CUSTOMER_REMINDER_DAYS_BEFORE` is an optional deployment fallback if no database setting exists; for example `3,0` for three days before and due day. Confirm recipient email addresses before enabling production email. Keep reset and notification messages free of private document contents.
5. Run migrations and the API/web smoke tests in client-owned staging, restore a backup, and rehearse rollback before launch. No live credentials or real ID files belong in the local demo.

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
