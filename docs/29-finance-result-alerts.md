# Finance verification-result alerts

Full Scope v6 §12 now includes in-app results for verified, rejected and clarification
decisions in the shared staff notification bell. The Results filter, unread-only view,
pagination and selected-type mark-all reuse the existing bell behavior.

## Recipients and access

Each successful Finance decision notifies all active Records employees and the employee
who recorded that payment, if the recorder still has staff payment recording and reading
access. Records currently has global payment access, so its whole active team receives
these results. A Records recorder receives one alert, and unrelated managers or Finance
reviewers are not added merely because they can view payments.

Recipients are captured at the time of the decision. Inactive accounts and accounts that
have lost payment access are excluded. Later hires and newly promoted staff do not receive
earlier decisions automatically. Previously delivered results require current staff
`PAYMENT_RECORD` and `PAYMENT_READ` access to list, open or acknowledge. Customers and
handlers cannot access them; another recipient cannot open someone else's result ID.

## Saved decisions and current payments

The Finance transaction writes the payment, audit entry, recipient snapshots and live
invalidations atomically. The existing verified-payment customer notification remains in
that transaction. A failed result insert rolls the decision back; retries and simultaneous
reviews cannot duplicate the decision, result or customer notification. A unique
recipient/payment/version key provides a database constraint.

Result snapshots retain decision, amount, client and batch names, Finance notes, reviewer
name and decision time. Corrections and subsequent decisions cannot rewrite earlier
results. Clarification followed by correction and re-verification produces a second
result with independent unread state, while the earlier clarification stays available.
Reading results leaves payment status, versions, audit records, balances and customer
delivery untouched. Only verified payments reduce the balance.

Each alert links to `/system/payments?payment=UUID&result=UUID`. A saved-decision dialog
shows the original Finance notes and the current payment status. If the payment has changed,
the dialog explains that this decision is historical and directs staff to the current
record before acting. Closing it keeps the exact payment in view. Same-page result links
and focus/reconnect updates retrieve authorized data; failed or revoked reads clear the
previous result and show a retryable error.

Alert previews omit Finance notes, receipt references, contact details and private files.
Those notes are fetched only through the recipient's result detail route. Result event
IDs reach only the corresponding recipient; reads invalidate only that employee's tabs.

## API and migration

| Endpoint | Behavior |
| --- | --- |
| `GET /api/staff/alerts?scope=results&page=1&unreadOnly=false` | Own results, 20 per page; total badge includes authorized tasks, pending Finance and results |
| `GET /api/staff/alerts/results/:id` | Own immutable result plus current payment status/version |
| `POST /api/staff/alerts/:id/read` | Strict `{ "entity": "payment-result" }`; idempotent, preserves original read time |
| `POST /api/staff/alerts/read-all` | Strict `{ "scope": "results" }`; all own results across pages, leaving task/pending receipts intact |

`20261006200000_payment_result_alerts` adds the snapshot table and recipient/payment/version
constraint, with cascading recipient/payment foreign keys and paging indexes. Apply it
with `pnpm db:migrate`. Existing payment and customer notification data is unchanged.
This increment starts capturing new decisions; historical decisions are not backfilled.

## Acceptance

Automated tests cover every role, cross-recipient access, current role/deactivation,
strict requests and origin checks, each Finance outcome, verified-only balances,
immutable clarification/correction/re-verification, duplicate recipients, inactive
recipients, pagination, selected-type marking, unchanged financial/customer data,
cross-instance event isolation, transactional rollback and concurrent decisions.

The production browser walkthrough with synthetic API responses passed recipient-scoped
Results access, 20-row pagination, read-history retention, selected-type mark-all, switching
filters during a delayed read request, exact payment and same-page result links, each outcome,
saved notes, the historical/current distinction, alert/detail failure and retry, Owner's four
filters, independent pending counts, 320/390-pixel widths, dark theme, keyboard dismissal and
foreign-link denial, with no browser runtime errors.

Verification passed 29 API unit tests, 43 PostgreSQL integration tests and 14 web tests
(86 total), workspace typechecks, the workspace production build and the final web build.
All 17 migrations applied successfully to a fresh test database with no Prisma schema
drift. The additive result-snapshot migration is also applied to the local preview database.

Named UAT should verify:

1. Records staff and the eligible recorder receive each decision once; unrelated staff
   and customers do not receive staff results.
2. Open verified, rejected and clarification results and review their saved notes. Correct
   a clarification payment and confirm the earlier result retains its notes and decision.
3. Mark Results read and confirm Tasks and pending Finance unread counts stay intact.
   Another recipient's results remain unread.
4. Open two results while already on Payments; check exact payment selection and the
   historical/current distinction. Repeat on mobile, dark theme and API failure/retry.

Staff email delivery and configurable templates are now implemented in
[30-staff-email-delivery.md](30-staff-email-delivery.md). Production provisioning and named
client acceptance remain open.
