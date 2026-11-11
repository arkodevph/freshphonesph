# F19 operational handoff notifications

Implemented locally on 9 November 2026. The existing staff bell includes a
**Workflow** filter; the existing Finance filter covers Finance-ready payments.
This extends [71](71-workflow-in-app-notifications.md), the
[payment review chain](123-payment-operational-review-chain.md) and the
[operations monitor](125-operations-monitor.md).

## Recipients and links

| Current work | Recipient | Destination |
| --- | --- | --- |
| Recorded payment missing receipt proof | Current assigned active Handler | Exact payment |
| Payment evidence awaiting completeness review | Active Records staff, excluding the recorder | Exact payment |
| Records-approved evidence awaiting cross-check | Current assigned active Manager, excluding the recorder | Exact payment |
| Returned payment evidence or GCash statement | Current assigned active Handler | Exact payment or statement |
| Submitted GCash statement/revision | Active Records staff, excluding its current uploader | Exact statement |
| Finance-ready payment | Finance, through its existing Finance alerts | Exact payment |
| Open operational follow-up | Responsible staff at the current stage; COO/system administrator; Moderator within its active Agent/Pioneer network | Exact authorized source, or exact monitor item for monitoring roles |

Finance alert counts, paging, read and read-all use the current proof and both
valid operational approvals. Reassignment, changed evidence, inactive reviewers,
self-review and stale Manager batch versions invalidate readiness. A correction
returns to operational review before the Finance alert reappears. The Finance
verification and balance rules are unchanged.

Current source state produces workflow alerts without recipient snapshots or a
backfill. Reassignment removes former recipients and makes current work available
to replacement staff. Completed review work and resolved follow-ups leave the
queue. Reopening a follow-up or changing its/source/batch version produces fresh
unread state. No new deadline, escalation timing or package-completeness rule is
assumed.

## Reads, privacy and live refresh

Workflow receipts use recipient/source-kind/version dedupe keys in the existing
`StaffNotification` table. Concurrent and repeated reads are idempotent; a stale
version is rejected. Read-all covers all pages of the selected category and leaves
other categories, recipients and operational records unchanged. Internal
`workflow.read` receipts are excluded from generic notifications and live notice
visibility. They create no delivery rows.

Workflow alert copy contains the batch code and action/status only: no customer,
payment amount, receipt file identifier/content, or follow-up note. Existing
Finance alerts retain their Finance-only content. Moderator links go to the
scoped monitor, never financial source pages.

The migration `20261109140000_workflow_followup_alerts` adds SELECT access to open
follow-ups for active operational staff under transaction-local actor context.
Handlers and Managers are batch-assigned; Records and Finance have their existing
business-wide operational scope. API recipient queries further limit alerts to
the responsible current stage. Follow-up writes, history reads/inserts and policy
changes remain restricted to monitoring roles. No actor context yields no rows.

Follow-up writes publish existing payment/statement invalidations plus a
network-authorized monitor invalidation. The bell retains live refresh,
visible-page polling every 30 seconds, manual refresh and retry.

## UI direction and evidence

Nami owns this contained extension of the existing staff bell. The primary
reference is [Untitled UI activity feeds](https://www.untitledui.com/react/components/activity-feeds),
opened through OpenCLI and visually inspected on 9 November 2026:
`/home/nami/.agent-reach/design-references/nami-f19-20261109/activity-feed.png`. Its compact stacked title/message/time
hierarchy and restrained separators govern the notification rows. Untitled UI's
notification page was inspected as a candidate; its toast composition was not
used for this persistent inbox.

The adaptation keeps Freshphones' neutral light/dark surfaces and blue action
accent. Explicit Read/Unread text and pressed filter states supplement color.
The negative pattern checked was repeated bordered cards with equal emphasis:
rows stay within one list, and the header reports unread/current-view totals
rather than repeating every category count. No new UI package was installed.

Opening an alert waits for its read request. A conflict or failed request remains
visible in the open panel; successful reads navigate to the exact source. Escape
from the panel returns focus to the bell. Narrow layouts retain a bounded,
scrollable list and visible controls.

Actual preview: `http://localhost:3000`, `.next-preview-b`, build
`n9hk5x7o1ZEq3Llw3bvaW`. Browser script:
`/tmp/freshphones-f19-browser.cjs`; screenshots:
`.local/workflow-handoffs-20261109/`. Inspected light/dark 1440px Records views and
390px Handler views against the reference: compact hierarchy, continuous rows,
readable wrapping, no viewport overflow. Browser checks passed six operational
roles, exact stage links, read-conflict recovery, unread filtering, read-all,
Escape focus return and reduced motion, with no page errors. Refresh failure/retry also passed. Sampled text and filter
contrast measured 5.22:1 or better in both themes; approximate protanopia,
deuteranopia and tritanopia screenshots retained readable text/state labels.
A separate 200% text-size simulation with long copy also retained a scrollable
list and bounded controls at 390px. These simulations do not replace testing with
affected users or native browser zoom acceptance.

## Verification and remaining acceptance

- 34 targeted PostgreSQL integration checks pass across handoffs, existing
  enrollment notifications, payment review and monitoring, using a dedicated
  migrated database and a non-superuser principal without RLS bypass.
- All 77 main API regression checks pass, including existing Finance, task,
  Support, account, result, privacy, email and live-event behaviors. Existing
  fixtures now explicitly prepare current approvals, preserve immutable review
  history, isolate ready-payment setup and account for Workflow unread counts.
- The six handoff checks also pass with an additional direct RLS history-forgery
  assertion for ordinary staff.
- 197 existing web tests pass; API/web TypeScript and optimized preview build pass.
- Scoped repository formatting and whitespace checks pass.

Logs: `/tmp/freshphones-f19-tests.log`, `/tmp/freshphones-f19-regression-tests.log`,
`/tmp/freshphones-f19-security-tests.log`, `/tmp/freshphones-f19-web-tests.log`,
`/tmp/freshphones-f19-browser.log` and `/tmp/freshphones-f19-accessibility.log`.
Synthetic local walkthrough data uses `HANDOFF-DEMO-1109`.
Named-client acceptance, production load and non-Chromium browsers remain
unverified. External delivery and unapproved
escalation/package policies remain deferred. No commit, push or deployment was
performed.
