# Member withdrawals, replacement and refund records

Implementation guide for checklist #3 and the linked replacement path in #4.
The business rules were confirmed in the
[withdrawal plan](76-member-withdrawal-review-plan.md). This guide records the
implemented behavior and its verification separately from client acceptance.

## Member and review workflow

Use the normal accounts at [main login](http://localhost:3000/login).

1. **Customer → Withdrawals:** select the intended batch membership, explain the
   withdrawal context and submit the form. The form explains that installments
   continue and a refund is not promised by submission.
2. **Agent → Member withdrawals:** open the assigned member's case, review the
   explanation and forward it with notes. Agent review does not approve the case.
3. **COO → Member withdrawals:** review the member explanation and Agent review,
   then approve, reject or request more information. A member can update the
   explanation when clarification is requested.
4. An approved case remains **awaiting replacement**. The original membership
   keeps its current dues and occupies its batch position until the replacement
   enrollment is approved. Approval does not stop installments or pay a refund.

The workflow is specific to one membership. A shared customer login retains its
other memberships and the old membership's historical records. Current Agent
assignment and role permissions are checked by the API on reads and writes.
Members see their own case/status and member-facing decisions; internal review
and CEO-consultation notes and the replacement's identity are not disclosed.

## Replacement decision and admission

The COO records the decision after discussion with the CEO. Consultation is
recorded by the COO; the report-only CEO account gains no operational actions.

- **Continue unpaid installments:** the replacement receives the actual unpaid
  remainder and agreed dates. If the old member has paid part of an installment,
  only its unpaid portion transfers as an obligation. The replacement receives
  zero payment credit from the old member.
- **Start a fresh plan:** the COO explicitly records its price, number of
  installments, frequency and first due date. The shared calendar calculator
  previews the actual schedule. This plan belongs to the replacement membership;
  other members' batch terms remain unchanged.

The Agent proposes a replacement under those terms. The assigned Manager's
existing enrollment review is the actual admission boundary. Approval performs
the position swap and financial handover together, including on a full batch.
Pending proposals and withdrawal approval do not reserve a ninth position or
release the old position. Existing capacity rules still apply to ordinary joins.

If incoming claims need verification/clarification, or the old member pays after
the COO's financial review, admission requires an updated review rather than
silently accepting stale figures. Historical membership and payment rows stay
intact. Released unpaid obligations are recorded separately from original
scheduled amounts so balances, schedules and expected-collection reports do not
count the same obligation for both people.

## Refund decision and external payment

Refund resolution is independent of withdrawal and replacement.

- **Pending** means the amount/date are not settled. Unknown is not zero.
- The COO can record a discretionary approved amount or a declined refund with
  a reason. No refund formula, percentage or automatic eligibility calculation is
  inferred from payments or the business's financial position.
- An approved amount is not a payment. Finance records a refund that has already
  been paid outside the system, with the actual amount, date, method, reference
  and note. Partial payments retain the approved remainder.
- Duplicate references, retries, stale versions and amounts beyond the remaining
  approval are checked. The app does not send money.

Outbound refund records do not become negative installment payments or payment
adjustments. Original incoming receipts and verified credits retain their
meaning. Financial statements distinguish installment obligations from the
separate refund settlement rather than quietly treating gross collections as
net cash after refunds.

## History, access and lifecycle

Decisions and financial handover create retained events with actor and time.
Current-assignment reads, version checks and the shared records/Finance lock
protect against conflicting decisions and concurrent payment changes. After
handover, incoming-payment writes on the old membership are closed while its
records remain readable. Customer and staff notifications link to the exact
case; those links do not themselves grant access.

The member's account and other batch memberships remain separate. Private
evidence and unresolved refund/replacement records are protected from generic
retention cleanup. Due reminders must recheck current collectible amounts and
membership state so a handed-over obligation does not produce a new old-member
reminder.

## Verification and release state

Verified October 30, 2026 in the main local demo:

- **531 distinct automated checks pass:** 88 API unit/reader checks, 143 web
  checks and 300 real PostgreSQL/API scenarios across 26 isolated suites.
  Contracts/API builds, API TypeScript, optimized web build/TypeScript and scoped
  formatting/whitespace checks pass.
- **Nine withdrawal browser groups pass with zero page errors**, using normal
  Customer, Agent, COO, Manager and Finance one-click logins. They cover the
  form/review/confirmation flow, pending refund, Manager admission, separate
  external payout and 320/390px layouts. The live main-API walkthrough also
  verifies both continuation and restart, a partly paid installment, leap-year
  dates, retained credit, eight current positions, customer redaction and CEO
  denial. Clearly synthetic new memberships were used for financial walkthroughs.
- YELYAH independently passed five isolated PostgreSQL review groups covering
  reminder send/requeue races, retained sent evidence, retention holds, future
  payout rejection and database append-only protection.
- Rehearsal and actual migration preserved every existing value in **65 business
  tables / 4,121 rows**. A final comparison against the pre-feature private backup
  preserved all **875 original rows and original columns across 17 identity,
  assignment, schedule, payment, enrollment and GCash evidence tables**.
- The shared customer batch-count addition also passed seven read-only main
  browser groups; see [My membership batch participation](78-customer-batch-participation.md).

Private logs/screenshots/backups remain in ignored `.local/withdrawal/`. The main
API and worker are healthy at port 4100 and the optimized web preview runs at
[localhost:3000/login](http://localhost:3000/login). Source is local/uncommitted
on `feature/gcash-review-workspace`; user/client acceptance, remote publication,
release-branch merge and production deployment remain separate.
