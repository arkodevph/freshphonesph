# KPI task editing and cancellation

Verified locally on November 25, 2026. The KPI officer can edit an active task's title, assignee, priority and deadline from the existing task drawer, or cancel it with a reason. Instructions remain private to the assignee. Reassignment returns an active task to To do; submitted, completed and cancelled tasks cannot be edited or cancelled. No wage decision is automated.

## Contract and implementation

`PATCH /api/tasks/:id` accepts a version and changed fields. `POST /api/tasks/:id/cancel` accepts a version and a reason of 3–1000 trimmed characters. Both require `TASK_ASSIGN`, recheck current permissions inside the transaction, enforce task scope and reject stale versions. Guarded updates increment the version and write audit entries in the same transaction. A KPI officer cannot overwrite another assignee's hidden instructions. A changed deadline or reassignment requires a future deadline and an active staff assignee in scope.

Cancellation records `CANCELLED`, `cancelledAt` and `cancellationReason`; it preserves history. Both start/progress routes, submission and attachment writes reject terminal tasks. Cancelled tasks are included in status filters/counts and report chart accounting. Reassignment or rescheduling clears task alert reads and advances an assignment revision for email deduplication; delivery by the external mail provider was not exercised here.

The shared API functions and hook live in `apps/web/lib/task-management.ts` and `useTaskManagement.ts`. The KPI role owns `TaskManagement.tsx` and its form styling. The form sends only changed fields, retains input on errors, blocks another save after a version conflict, and asks before discarding a dirty draft. The existing drawer, selects, focus handling and spring motion are retained.

Concurrency evidence reused from the retained inspection of Prisma 7.10.0's `packages/client/tests/functional/optimistic-concurrency-control/tests.ts`: https://github.com/prisma/prisma/blob/7.10.0/packages/client/tests/functional/optimistic-concurrency-control/tests.ts. Captured source: `/tmp/peep-task-prisma-reference.txt`, copied into the evidence directory below. Its version-guarded update pattern fits this project's Prisma version; local database checks establish the application's exercised behavior.

## Visual reference and acceptance

This continues the established Fresh Phones task workspace, rather than selecting a new direction. Reopened the retained task reference `/home/nami/.agent-reach/design-references/freshphones-kpi-20261125/coo-tasks-primary.png` and inspected the rendered edit and cancellation views. The primary task is managing ownership and deadlines without losing private instructions or unsaved input.

The implementation keeps the reference's task-first hierarchy, 13–14px working text, quiet neutral status treatments and existing cobalt primary action. The desktop drawer is approximately 580px wide, with 24px content insets; the phone form stacks fields and puts Save on its own row. These are implementation measurements/choices, not a claim to reproduce reference drawer geometry, which is unknown. The relevant negative pattern is enclosing each property in an additional card: properties instead remain one aligned definition list, with spacing grouping the management fields. No new accent edge marks the active state. Keyboard focus outlines remain.

Observed checks: edit and cancellation controls fit at 1705px, 390px and 320px in both themes; Save remains reachable by scrolling at 320×568. Input focus moves to the edit title or cancellation reason and returns to its action on dismissal. Closing restores the task opener's focus. Interrupting drawer entry with Escape permits a subsequent reopen, and reduced motion preserves usable controls. Final settled screenshots replace a lifecycle capture that caught a select's closing transition. Physical devices, color-vision simulation and user acceptance remain unverified.

## Verification

Evidence directory: `/home/nami/.agent-reach/design-references/freshphones-task-management-20261125`.

- The two focused PostgreSQL integration tests passed: staff-task ownership/private evidence/review behavior and task-management preservation/reassignment/terminal cancellation. Tests include stale versions, revoked access, submitted/completed locks and both cancelled-task restart routes. Saved output: `integration.log`.
- The final preview build completed compilation, TypeScript and all 72 generated pages. API and web type checks also passed in the preceding implementation run; a fresh web `tsc --noEmit` passed during this continuation (`web-types-final.log`). Final build ID: `RUrsCYdhZrSiBr8xAp-Lf`, `.next-preview-b`, now serving `http://localhost:3000` against the local preview API on port 4101.
- Reran `live-qa.cjs` against that active build: 27 checks passed with no runtime exceptions. Real writes were limited to the harness-created local preview task, which ended cancelled. Synthetic 503 and 409 failures verify draft recovery; database integration tests separately exercise real version conflicts.
- `final-interactions.cjs`: 11 additional checks passed, with no runtime exceptions. These checks inspect existing tasks without saving changes. Screenshots: `final-edit-{1705,390,320}-{light,dark}.png`; cancellation screenshots and `live-checks.json` are in the same directory.
- Seven report chart tests passed, including cancellation accounting. Scoped repository formatting reported zero files requiring formatting; scoped `git diff --check` passed.
- The earlier combined chart/role-isolation run had nine passes and one failure: `ceo/app/system/reports/ReportVisuals.tsx` imports the shared report design. That unrelated working-tree report change remains outside this task. The full web suite is not claimed green.

## Migration and delivery

Apply both repository migrations, `20261125080000_task_management` and `20261125080100_task_assignment_revision`, before starting the updated API/worker. They add the enum value, cancellation metadata and assignment revision. They were applied to the local preview and test databases. Production migration and deployment remain unperformed. A rollback must account for already-cancelled rows and the PostgreSQL enum addition; do not remove history or assume an older server understands the new status.

Changes remain local and uncommitted. Review at `http://localhost:3000/login`, choose **KPI officer**, then open **Tasks & KPI**.
