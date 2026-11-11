# Workspace UI patterns

Team guide · updated November 11, 2026. Scope: staff `/system` workspace.
Use this mapping when changing a screen; preserve its role permissions and real data.

## Which pattern belongs where

| Surface | Pattern to follow | Status / source |
| --- | --- | --- |
| COO dashboard | Personal greeting; green verified-collections card with vertical segmented record rail; adjacent monthly collections chart and existing period dropdown | Restored and preview-verified; `coo-dashboard/CooDashboardLayout.tsx`, `CooSummary.tsx`, `CooCollections.tsx` |
| Other page headings | Relevant task/entity title; context only when needed | Standing copy rule; greeting belongs on dashboard |
| CEO and COO Reports | Shared executive overview, open metric row, charts, collapsed filters, Overview / Detailed figures / Saved reports | Preview-verified for COO; `reports/ReportsDashboard.tsx`, `ReportResultsPanel.tsx`, `reports.module.css` |
| Task detail | Main instructions/submission on left; properties rail on right; properties below on narrow screens | Implemented; retain semantic reading order |
| Clients | Identity-first five-column directory; compact COO search/status, More filters, Records disclosure; contained table scroll | Implemented and preview-verified; [142](142-clients-directory-refinement.md) |
| Personnel / Agent network | Search above aligned identity/role/supervisor or agent/pioneer/batch columns; real result counts; contained table scrolling | Implemented; [145](145-coo-portal-remodel.md) records browser coverage and limits |
| Dropdowns in forms | `FormSelect`: shared keyboard/search listbox with hidden native required/disabled constraints; use `Select` for non-form choices | Clients filters/create/release/edit and calendar month integrated; legacy COO forms use `WorkspaceNativeSelect`; [144](144-coo-shared-controls-rollout.md) |
| Date/date-time controls | `DateInput` for typed date/date-time input and anchored shared calendar, including month picker | Clients field integration verified; remaining workspace inventory is open; [143](143-clients-controls-motion.md) |
| Expanding content | `AnimatedDisclosure` for new sections; `WorkspaceDetails` preserves existing summaries and toggle handlers; spring height/opacity/caret, inert while closing; initially expanded content is immediately readable | Clients and 20 staff/shared disclosure sites migrated; [144](144-coo-shared-controls-rollout.md) |

Paths in the table are under `apps/web/app/system/`. Implementation and preview evidence:
[COO restoration and Reports parity](141-coo-reports-parity-restoration.md).

## Shared rules

- Use existing workspace tokens/components, black canvas and meaningful semantic/chart colors. Keep role shells and authorization intact.
- Use neutral selection and label emphasis; a checkmark may clarify selection. Decorative colored edges, underlines, rims and glow are rejected on all four sides. Retain visible keyboard focus.
- Write concise labels and relevant context. Omit redundant subtitles and obvious instructions; retain consequential finance/privacy/error guidance.
- Reuse shared report calculations and components across roles. A visual match does not grant another role's actions.
- Keep unknown data distinct from zero; preserve loading, empty, denied and failed states.
- Compare the rendered change with the selected reference. Check desktop, narrow screens, both themes and changed interactions before claiming verification.

## People repair queue

Clients is the current user-selected refinement; remaining People pages are queued. Navigation source:
`apps/web/app/system/system-navigation.ts`.

| Category | Route | Purpose to preserve |
| --- | --- | --- |
| Personnel | `/system/personnel` | Staff directory and permitted staff details |
| Clients | `/system/clients` | Client records and permitted management |
| Agents | `/system/agents` | Agent records and permitted management |
| Agent network | `/system/agent-network` | Network relationships and progress |
| Recruitment | `/system/recruitment` | Recruitment jobs/applicants and permitted actions |
| HR action approvals | `/system/hr-actions` | Confidential approvals; visible only with permission |

Work one category at a time after the existing ordered repairs. Audit hierarchy,
copy, filters, table/detail containment, states and responsive behavior; select
an inspected task-matched reference, implement, then verify. Category renaming or
merging is not decided. This list maps current categories, not new permissions.

## References and precedence

Latest user-selected green bar card overrides the superseded donut proposal in
[140](140-coo-reference-components.md); use [141](141-coo-reports-parity-restoration.md)
for the corrected direction. Collections chart research is research only:
[SnowUI bars](https://www.threads.com/@farewelltowind/post/DZHK7j5hVny/) and
[monthly comparison](https://www.threads.com/@hilmanmurtaza/post/Db_zNH6E0ZZ),
inspected November 10, 2026. Do not import unsupported budget/target metrics.

## Control details

Use the shared controls in open states as well as the closed screen. `FormSelect`
keeps its hidden native select for form constraints; this is intentional and is
not a visible browser dropdown. Preserve labels, required/disabled state, names
and existing value handlers when migrating. `DateInput` keeps native date values
and local datetime semantics. Reuse `WorkspacePopover`/`createStyleSpring` and
`useSpringDialog`; reduced motion settles immediately. Avoid adding a separate
calendar or a CSS-only entry animation with no closing/reversal path. Check nested
dialog focus, Escape, outside dismissal, keyboard selection and narrow-screen fit.

For an existing native staff selector, `WorkspaceNativeSelect` preserves its original
children, ids, refs and change/blur/validation handlers. It adapts the visible control
for COO and keeps the native control outside that role. It also preserves known
selected values while choices refresh and disables unavailable choices. Use
`FormSelect` for new forms with explicit options/value callbacks, and `Select` for
non-form choices. Shared menus render in the browser top layer to escape clipping.
Inventory: [144](144-coo-shared-controls-rollout.md), including verification limits.

Earnings use unboxed totals and a table-scoped horizontal scroll region. Pagination
remains outside it, with an independent footer gap. Analysis fields retain their
label, help, counter and keyboard focus gutter. See [145](145-coo-portal-remodel.md).

## Modal selection, scroll and pending states

Record view controls use borderless neutral selection and text emphasis. No accent
underline, colored edge or selection glow; keyboard focus remains visible. Batch
editing keeps number/status and lock consequences first. Supplementary membership,
locked terms and schedule details use existing spring disclosures. Editable terms
stay expanded so validation can always reach their controls.

Information and actions must read differently: GCash review status and arithmetic
check labels are plain text; Download, Refresh and Close retain button surfaces.
The statement table has horizontal containment without its own vertical height cap;
PDF scrolling is reserved for document inspection/zoom.

Use WorkspaceProgress for pending identity, unknown route geometry and contextual
refresh. Keep actual filters/table headers and available data in place. Skeletons
must reuse the final layout/components, not invent metric cards and tables. COO
home uses CooDashboardLayout for both skeleton and loaded content. Progress has
an accessible label and a CSS reduced-motion path. See [146](146-coo-modal-system.md)
for verification evidence and tool limits.

### Focused task views (November 11 continuation)

Use separate views for unrelated tasks sharing a route: Customer Service cases /
new concern / lookup, Recruitment jobs / applicants, Agent network agents /
batches, and Notification templates / timing / test. Preserve unsaved inputs by
keeping inactive editors mounted with native `hidden`; inactive views must not
remain visible through component `display` styles. Use real filtered totals and
page controls for authorized in-memory directories. Personnel/Network use
labeled rows at narrow widths, preserving full content without table panning.
GCash review gives Transactions and Original PDF the full reading width.
See `148-coo-focused-workspaces.md` for scope and evidence limits.
Universal modal, enrollment and action-button redesigns are separately queued;
these changes do not establish universal coverage or user acceptance.
