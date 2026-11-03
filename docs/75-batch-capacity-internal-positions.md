# Batch capacity and internal positions

October 26 item **#5**, authorized by Jaycee on October 30, 2026.

## Agreed behavior

Each batch has eight actual enrolled memberships and four additional visual positions available only in the staff interface. The customer portal continues to show the signed-in customer's own memberships, schedules, payments and balances. It does not show an invented roster, placeholder identities or an inflated member count.

The four internal positions are derived display elements, not stored Member, Client, User, ScheduleItem or Payment records. They cannot receive payments or contribute to reports, expected collections, balances or activation. Staff see the actual occupancy separately from four clearly labeled placeholders.

Pending enrollment requests do not reserve membership positions. The capacity check counts all existing Client memberships, including on-hold, completed and retained erased records, so status changes and retention cannot silently free positions or substitute for an unresolved withdrawal policy. Legacy batches above eight preserve their original history and actual count; additional enrollment is rejected.

## Activation and consistency

- A PLANNED batch activates atomically when its eighth actual approved membership is created or moved into it. The approval, schedule, status change, audit and change events commit or roll back together.
- Authorized staff may activate earlier through the existing versioned batch Status editor. Current assigned-batch scope and server-side permissions apply.
- Concurrent approvals for the final position cannot enroll a ninth member. A full target also rejects a schedule-less membership move. Pending requests remain pending if approval cannot complete.
- Full historical PLANNED batches are not backfilled or automatically rewritten. Staff can activate them explicitly. Completed/cancelled batches are not automatically reopened, and reducing occupancy never automatically changes an ACTIVE batch back to PLANNED.
- No existing schedule, payment, adjustment, identifier or financial rule is rewritten. This feature requires no database migration.

## Staff workflow

Open **Paluwagan Records**. Each batch shows its actual real-member count out of eight and a separate internal-position note. Open **Edit** to inspect two semantic lists: real-member positions and internal display positions. The staff editor retains the existing Status control for manual activation.

An incoming enrollment event marks an open editor as outdated even when the Batch version has not changed. Loading the latest details retains the existing explicit draft-discard confirmation.

## Research and design rationale

Before implementation, DIO compared two open-source implementations:

| Reference | Relevant pattern | Decision |
| --- | --- | --- |
| [Cal.diy seat creation](https://github.com/calcom/cal.diy/blob/2e412471fc1f42c662005854a47c48128c479b0a/packages/features/bookings/lib/handleSeats/create/createNewSeat.ts), [concurrency checks](https://github.com/calcom/cal.diy/blob/2e412471fc1f42c662005854a47c48128c479b0a/packages/features/bookings/lib/handleSeats/create/createNewSeat.integration-test.ts) | Lock, read authoritative occupancy and write in the same transaction; test competing requests for the last position. | Adapt the pattern to existing RecordsService/RoleWorkspaceService advisory transactions; importing a booking subsystem adds unrelated machinery. No source was copied or dependency added. |
| [pretix locking](https://github.com/pretix/pretix/blob/e6f8f178aff537bc32dc7359a5f561b8074a269b/src/pretix/base/services/locking.py), [quotas](https://docs.pretix.eu/dev/api/resources/quotas.html) | Keep authoritative capacity checks separate from possibly stale presentation; acquire PostgreSQL advisory locks inside atomic transactions. | Reuse the app's existing transaction lock, not the Python quota engine. The reference engine has a different stack and broader inventory behavior. |

ROSS used user-expi followed by ui-design-index. The routed ui-design-systems category was absent from the installed catalog, so the implementation follows the existing record dialog, spacing and system theme tokens. Staff goal: understand real occupancy, recognize four nonfinancial positions, then use the existing status control if manual activation is needed.

The evidence ledger is deliberately narrow: [W3C information and relationships](https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html) supports separate labeled semantic groups; [use of color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html) supports explicit Enrolled/Open/Placeholder text in addition to style. As a corrective constraint, [status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html) does not justify repeatedly announcing the entire grid: the existing stale-record feedback and draft handling are retained. These standards inform implementation; they do not establish observed usability or full accessibility conformance.

## Verification

Completed locally and integrated into the main demo on port 3000. TARA implemented backend checks, ROSS implemented the staff interface, DIO compared primary-source patterns, and YELYAH independently reviewed the feature without finding a blocking defect.

- **375 distinct automated checks passed:** 88 API unit/reader checks (including two capacity units), 131 web checks, and 156 PostgreSQL/API scenarios (13 capacity scenarios plus 143 existing core records, access, memberships, calendar, numbering and workflow-notification scenarios). Review reruns overlap these counts and are not added again.
- The isolated checkout initially lacked the existing PDF-reader runtime/configuration; rerunning with the workstation's existing runtime environment passed all 88 API checks. The notification suite hit a persisted login-attempt fixture after sharing the test database with other suites; clearing only dedicated-test-database rate-limit fixtures and rerunning passed all 13 notification scenarios. Production limits were not changed.
- Contracts and API builds, API/web typechecks, the main optimized web build, scoped formatting and whitespace checks passed. Automated regressions ran in the isolated feature checkout; final main builds and browser checks exercised the integrated source.
- **Eight main-demo browser groups passed with zero page errors:** staff-only position display; live occupancy invalidation without a version change; Agent submission/Manager approval and eighth-member activation; ninth approval rejection with request retained pending; 1440/390/320px light/dark layouts and Escape; assigned Manager early manual activation; customer/CEO isolation; and exactly one automatic activation audit event.
- Final read-only fingerprint comparison preserved all **756 original rows across 11 financial, member and GCash evidence tables**, excluding new synthetic walkthrough rows from the original-row comparison. No migration was needed.

Synthetic review batches are clearly labeled in their model names. The automatic review batch has eight actual synthetic memberships; the manual review batch demonstrates activation before enrollment. The four placeholders remain derived presentation only.

Evidence is under ignored `.local/internal-capacity/` in the main checkout and the isolated feature checkout. Existing calendar/numbering and GCash changes were preserved during narrow integration. Changes remain local/uncommitted; user/client acceptance and production deployment remain pending.
