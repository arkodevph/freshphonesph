# Staff email setup and Owner acceptance

Prepared 2026-10-06. Staff bell/email implementation is locally verified; production service
setup, real-inbox delivery and named Owner acceptance are pending. The Owner confirmed that
the sending domain, Resend credentials, test inbox and staging URL are not yet available.
Production email setup and real-inbox testing are deferred at the Owner's request. Keep
the preparation tools available; provider delivery and named acceptance remain uncompleted.

## Provision the client-owned sender

1. Create a Resend account owned by Fresh Phones PH. Use a domain the business controls;
   choose the domain and DNS owner before buying or modifying anything. Add the chosen
   sending domain in Resend and copy its exact DNS records into that domain's DNS service.
   Wait for **Verified** in the Resend dashboard. A sending subdomain can separate email
   reputation from other business mail. [Resend verified domains](https://resend.com/docs/dashboard/domains/introduction).
2. Create a sending API key restricted to that domain. Keep the key in the API environment
   or ignored operator `.env`; retain account ownership with Fresh Phones PH.
   [Resend API keys](https://resend.com/docs/dashboard/api-keys/introduction).
3. Choose an explicit sender on that verified domain and a named, tester-owned inbox. Record
   the public HTTPS staging web/API origins and the named Owner reviewer. Only the
   non-secret sender, origins and evidence references belong in the sign-off record.
4. Supply `RESEND_API_KEY`, `EMAIL_FROM` and `WEB_ORIGIN` in the operator environment.
   For example, replace the placeholders below with the approved values:

   ```dotenv
   RESEND_API_KEY=YOUR_PRIVATE_SENDING_KEY
   EMAIL_FROM="Fresh Phones PH <updates@YOUR_VERIFIED_DOMAIN>"
   WEB_ORIGIN=https://YOUR_STAGING_WEB_HOST
   ```

The running application uses its deployment environment. Ordinary development/test worker
emails still save local previews. Production automatic delivery requires `NODE_ENV=production`
and the complete existing production configuration, including private S3 storage and HTTPS.
The isolated smoke command below checks only email prerequisites; it does not change API
mode, start workers, validate staging authentication or prove overall launch readiness.

## Check configuration and send one smoke email

Run from the repository root:

```bash
pnpm --filter @fresh/api-ts staff-email:check
```

The default command reads configuration and lists the fourteen supported staff email types.
It makes no provider request, creates no evidence files and changes no application records.
It reports missing key, example/malformed sender and invalid/local HTTP web origin without
printing values. Exit code 1 means an email prerequisite remains missing. A syntactically
valid sender/key is not proof of provider authentication or DNS verification; confirm the
domain in the client-owned dashboard.

After the approved sender, staging origin and test inbox exist, generate and retain a run ID:

```bash
pnpm --filter @fresh/api-ts exec node -e 'console.log(require("node:crypto").randomUUID())'
```

Replace the two quoted placeholders, then send the single approved message:

```bash
pnpm --filter @fresh/api-ts staff-email:check --send --to='APPROVED_TEST_INBOX' --run-id='UUID_FROM_PREVIOUS_COMMAND'
```

The message has a `TEST` subject, synthetic wording and a link to Owner notification settings.
It contains no account identity, payment data, password, attachment or extra recipient. This
operator command makes one provider send attempt and records the provider ID locally; it
never drains queues, creates accounts or updates templates, alerts or delivery history.
The separate named Owner walkthrough tests those actual application flows.

Private evidence is saved under ignored `apps/api-ts/.local/staff-email-smoke/UUID.json` with
directory/file modes 700/600. It captures the immutable payload, preparation time, provider
acceptance and pending inbox/link/UAT results. API keys and raw provider errors are excluded.
Provider acceptance requires a valid Resend email ID; the command does not claim delivery.
[Resend send-email API](https://resend.com/docs/api-reference/emails/send-email).

If a response times out, repeat the **same run ID, recipient, sender, web origin and Resend
account** within 23 hours. The payload and idempotency key stay fixed; changing a saved run's
recipient/sender/origin is rejected. An accepted local run is reused without another provider
call. Unknown runs stop at 23 hours; inspect provider history before creating a new run.
This window fits Resend's 24-hour idempotency retention.
[Resend idempotency keys](https://resend.com/docs/dashboard/emails/idempotency-keys).

The named reviewer checks inbox/spam placement, the displayed sender and the authenticated
link while signed in as Owner. Record the provider ID, arrival time, placement and link result
in [the staff sign-off template](uat/staff-notifications-signoff-template.md). Keep the full
private evidence and mailbox address in restricted operational records when sharing results.

## Owner walkthrough

Use a dedicated staging fixture and synthetic staff/customer records. Every enabled account
that can receive an email must use an approved tester-owned inbox. Starting the production
worker processes existing queued emails; review the fixture queues and approved recipients
before enabling it. Run the complete staging health/storage checker from
[23-customer-launch-uat.md](23-customer-launch-uat.md) after the deployment is configured.

| Email type | Expected recipients and behavior |
| --- | --- |
| `TASK_ASSIGNED` | Active assignee only; exact task link, no repeated assignment event for task start |
| `TASK_DUE_SOON` | Active assignee and current deadline stage; approved before-deadline timing |
| `TASK_OVERDUE` | Active assignee and current deadline stage; approved after-deadline timing |
| `FINANCE_PENDING` | Active Owner/Finance reviewers; exact current pending payment; reviewed payments leave the queue |
| `PAYMENT_VERIFIED` | Active Records staff and eligible recorder, deduplicated; immutable saved decision |
| `PAYMENT_REJECTED` | Same result policy; saved decision remains after a later correction |
| `PAYMENT_CLARIFICATION` | Same result policy; exact payment/result link and saved Finance notes behind login |
| `SUPPORT_NEW_CASE` | Active CS heads, or active Owners when no head is active |
| `SUPPORT_ASSIGNED` | Current active authorized assignee; reassignment retires old events |
| `SUPPORT_CUSTOMER_REPLY` | Current eligible assignee or triage; staff reply/resolution retires handled events |
| `ACCOUNT_CREATED` | Active Owners at commit, including a newly created active Owner; customer accounts excluded |
| `ACCOUNT_ROLE_CHANGED` | Active Owners at commit, including a newly promoted active Owner; actual changes only |
| `ACCOUNT_ACTIVATED` | Active Owners at commit; inactive-to-active staff access only |
| `ACCOUNT_DEACTIVATED` | Active Owners at commit; the deactivated Owner receives no new event |

Repeat bell and linked-record journeys at desktop and 390px mobile width, including dark
theme and keyboard navigation. Check another authorized recipient's independent unread state,
all-page scoped mark-read, unrelated roles, current access loss, paused emails, bounded retry
history and draft/version conflicts. A combined role/access edit produces two events; a no-op
produces none. Reading alerts or delivering emails must not change account access, case
status, tasks, Finance decisions, customer notices or derived verified-only balances.

Use the [staff sign-off template](uat/staff-notifications-signoff-template.md) to record
named results. Local automated/browser evidence is preparation evidence; human acceptance,
provider delivery and production rollout remain separate results.

## Local preparation evidence

The email launch tests cover explicit single-recipient commands, private/redacted checks,
missing configuration before network/file writes, synthetic payloads, private evidence,
accepted-run reuse, uncertain-response retries, immutable sender/recipient/origin, expiry,
provider failures, corrupt evidence and the default read-only CLI. They use a mocked provider;
no real email was sent. The current API unit suite, typecheck and API build pass. Existing
staff behavior evidence is recorded in [30](30-staff-email-delivery.md),
[31](31-support-staff-alerts.md) and [32](32-account-access-alerts.md).
