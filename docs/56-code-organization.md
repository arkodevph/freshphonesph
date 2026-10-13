# Code organization and readability

Run `pnpm format` to expand function bodies, brace control flow and format source files.
Run `pnpm format:check` to verify the same rules. The formatter inserts blank lines between
completed semicolon-terminated executable statements and compares emitted syntax for changed files before writing.
Imports stay together without blank lines between them; import comments are preserved.
Formatting may split adjacent JSX text strings; the check compares their combined text.

The source pass covers TypeScript, TSX, JavaScript modules and CSS in apps, packages and
scripts. It excludes dependencies, generated Prisma code, build output, public assets,
declaration files and historical SQL migrations. Python receipt OCR is a separate helper.

## Frontend boundaries

| Feature | Coordination | Presentation |
|---|---|---|
| Payments | `usePaymentsWorkspace.tsx` | Record form, payment list, receipt viewer, Finance review and payment details dialogs |
| Customer portal | `usePortalWorkspace.tsx` | Topbar, sidebar, membership overview/dates, notifications, support, settings and mobile tools |
| Clients | `useClientsWorkspace.tsx` | Client creation form and records table |
| Catalog | `page.tsx` handles role access | `CatalogWorkspace.tsx` and `CatalogEditor.tsx` |
| Recruitment | `RecruitmentWorkspace.tsx` handles role access and tabs | Recruitment desk, agents panel and shared directory controls |
| Reports | `ReportsDashboard.tsx` | Filter and results panels, with shared history and report helpers |
| Team | `TeamDashboard.tsx` | Account directory, account creation and account management dialogs |
| Tasks | `StaffTasksDashboard.tsx` | Task filters and task detail/submission dialog |
| Support | `SupportDashboard.tsx` | Concern creation, conversation panel and case table |
| Retention | `page.tsx` | Requests panel, policy form and candidate review panel |
| Installment schedule | `PaymentScheduleWorkspace.tsx` | Plan summary, calendar, preview, schedule logs and installment dialog |

Page files arrange feature components and access states. Workspace hooks own existing state,
effects and actions, including concurrency/version checks and private-data clearing.
Forms and dialogs receive typed values and callbacks. Group their props by feature so the
page describes its sections without repeating large lists of state variables.

The `*-view.tsx` modules contain shared display types, constants and small reusable helpers.
Feature components and hooks stay beside their routes. Avoid importing a page to obtain
shared implementation details.

Identical record form fields and input styles live in `components/FormField.tsx`.
Date defaults use `lib/date.ts`; calendar keyboard navigation uses the existing
`lib/portal-membership-calendar.ts` utilities. Session identity stays in React state
and is fetched using the session cookie; there is no unused local-storage identity cache.

## Functions and objects

Use pure functions for money formatting, schedule generation, allocation, filtering and
other explicit data transformations. Keep their inputs and outputs visible.

Use NestJS service classes for injected dependencies, database operations and object
lifecycles. Controllers validate and delegate. Services own authorized writes, transactions
and audit events. Do not introduce classes around calculations merely to enforce OOP.

Refactor by feature responsibility and preserve business semantics. Verify type checks,
contract tests and the relevant PostgreSQL integration suite. Formatting and a green type
check do not establish browser behavior or production financial correctness by themselves.
