# COO redesign: page and component reference plan

User direction, November 10: work page by page, research the specific part, make
it friendly to the person doing the work, and avoid a generic dashboard layout.
The stacked floating cards were explicitly rejected. The shared component pass
in `136-coo-workspace-system.md` is a foundation; it does not establish that every
business workflow has been redesigned or usability-tested.

## Inspected sources and their exact jobs

All research used OpenCLI and the existing `nami-research` browser session.
Local captures: `/home/nami/.agent-reach/design-references/fp-coo-page-parts/`.
Dates below distinguish inspection from publication. Static concepts and captured
product screens do not establish a current shipped product interface.

| ID | Reference | Specific part to study | Selection and limits |
| --- | --- | --- | --- |
| A | [Ember study](https://www.instagram.com/p/DfGCFq_KBl7/) | Compact shell, restrained navigation and content hierarchy | Existing primary visual grammar, re-inspected at the retained 14-second frame. Flat selected row deliberately adapts the user's rejection. |
| B | [Linear filtering on Mobbin](https://mobbin.com/explore/screens/7f421e82-b70f-4bf5-ab1c-f5787f9e40cb) | Filter beside the list; short options with counts; maintain the row context | Actual captured screen visually inspected. Source capture/version date unknown; scoped historical interaction reference. |
| C | [Task management filters — Mariia Trofymenko](https://dribbble.com/shots/27039500-Task-Management-Filters) | Explicit field, operator and value; filters close to their results | Visually inspected concept. Use the grouping, not an unsupported advanced-filter builder or the author's unmeasured business-impact claims. |
| D | [Customer detail table — Louis Nguyen Studio](https://dribbble.com/shots/27158069-CRM-App-s-Customer-Detail-Table) | Search/filter toolbar, readable entity rows, separate Add action | Primary directory composition reference. March 7, 2026 date appeared in discovery; the public shot was inspected November 10. Preserve Fresh Phones fields and permissions. |
| E | [Finance table, light/dark — Farhad Ahmed](https://dribbble.com/shots/27671570-Financial-Dashboard-Table-UI-Light-Dark-Mode) | Date, description, amount and labeled status column relationships | Primary scoped payment-table reference. Concept publication date unknown. Keep readable operational sizes; its tiny icon-only edit/delete controls are a negative example for consequential actions. |
| F | [Payments dashboard — Orbix](https://dribbble.com/shots/27088165-Payments-Dashboard-Design-Fintech-Expense-Management-UI) | Status-based payment queue and restrained row separators | Secondary comparison. Angled laptop staging limits measurement; no banking/payment execution features copied. |
| G | [Linear issue creation](https://linear.app/docs/creating-issues) | Intentional creation entry point, title/body first, supporting properties, draft continuity | Live official docs and editor illustration inspected. Primary task-creation interaction reference; it does not authorize adding Linear features to this app. |
| H | [Height inbox/details on Mobbin](https://mobbin.com/explore/screens/ace37593-be75-47c1-866b-4105cac27e9f) | Keep list selection visible beside item context/history | Historical screen: visible dates are 2023. Use only for the scoped list/detail relationship, not a current primary direction. |
| I | [Task list — Riazul Islam](https://dribbble.com/shots/27675728-Task-Management-Dashboard-SaaS-UI-UX-Design) | Column comparison and density critique | Negative comparison: glow and compressed type compete with data. Its percentage-progress column is unsupported here and must not be invented. |
| J | [Mobbin dashboard study](https://mobbin.com/blog/what-good-dashboard-design-looks-like) | Choose useful home-screen context and a clear next action | Live article read and inspected; its examples are supporting evidence, not a replacement for the controlling shell reference. |

## The user's resource reel

[Jeremy / jermy.builds, October 30, 2026](https://www.instagram.com/p/DfGxNsjNboh/)
was opened, its selected caption read, and its video downloaded through OpenCLI.
Three-second sampled frames were inspected; full audio was not transcribed.
It names [Mobbin](https://mobbin.com/), [Variant](https://variant.com/),
[Spline](https://spline.design/), [Shapes](https://www.shapes.gallery/),
[Coolors](https://coolors.co/), and [Design Spells](https://designspells.com/).

These are resource roles, not six competing visual directions. Mobbin supplies
real captured flows, Dribbble supplies authored component/composition studies,
and Design Spells supplies scoped interaction demonstrations. Variant's public
shell was available but its design examples did not render in the capture.
Spline and Shapes were inspected as optional art tools; operational controls do
not require 3D scenes or arbitrary shapes. Coolors text was available, but the
palette screenshot was blank, so no palette-inspection claim is made. The existing
black/neutral/green/lavender roles remain grounded in the project's direction.

Other access limits: a second Mobbin chip screenshot remained a loading frame;
the generic filter-flow URL redirected to discovery. Neither is selected evidence.

## Behavioral rationale before layout changes

The COO usually needs to locate work, assess its status, open its context, then
act. Creation and configuration remain discoverable but should not occupy most
of a directory's initial viewport. This is a product hypothesis informed by D
and G, not a measured reduction in completion time.

The flow to verify is: orient -> search/filter -> inspect result -> open details
or creation -> edit -> receive persistent success/error -> return with context.
Preserve input values through disclosure and errors. Keep labels, help and
consequences with the relevant control. Do not remove necessary filter options
merely to make a screen look simpler.

Evidence ledger:

- **Strong, normative accessibility:** [W3C focus not obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html), opened through OpenCLI. Keep keyboard focus visible around sticky tables, popovers and dialogs. This informs a test, not a claim of whole-app conformance.
- **Promising design analogy:** D's table-first directory and G's explicit creation entry point support expandable creation sections here. These sources are not controlled usability experiments. Falsify the adaptation if users cannot discover creation or lose their draft.
- **Corrective limit:** more disclosure is not automatically easier. Retain frequent search/status choices and obvious creation labels. The choice-overload meta-analysis DOI was blocked by a security verification page; its findings were not treated as newly verified evidence.
- **Category route:** `ui-design-index` -> `ui-design-systems`: scannable tables, contextual controls, explicit state feedback. Typography remains readable; screenshots supply relationships rather than exact source CSS dimensions.

## Page-by-page application and acceptance checks

Each row has a distinct job. Shared fields and buttons keep one visual language;
the page's task determines arrangement and disclosure. Baseline desktop images
for all 19 module routes are in `.local/coo-system-20261110/dark-*.png`.

| Page | User's job and referenced part | Concrete treatment / check |
| --- | --- | --- |
| Dashboard | Orient to team and payment-record state; A/J | Replace rejected artwork with real-count verification ledger. Preserve time scope and loading slots. Check independently delayed account notice and data. |
| Tasks & KPI | Locate a status and inspect/assign work; B/C/G | Status totals become direct filters using the existing server filter. Keep a clear active value, result count, empty recovery, assignee search and saved draft while closing the assignment. |
| Reports | Set period, inspect figures, export; E/F | Align the period with the title, flatten redundant metric enclosures, distinguish filter input from applied period, preserve exact figures and export scope. |
| Personnel | Find the relevant staff member and supervisor; D | Quiet directory rows and readable role/supervisor text. No invented staff-management actions on this read-only surface. |
| Clients | Find a member before managing their record; D/G | Expand Add client and requirement configuration on request. Put existing filters/table earlier. Verify form values survive close/reopen and existing record links still work. |
| Agents | Find an agent and inspect public-verification identity; D | Expand creation on request, retain masked/public-data boundaries, neutral Edit control and status labels. |
| Agent network | Understand assignment relationships; H/D | Keep agent, pioneer and batch context together. Long assigned lists remain scrollable and readable; no fictitious network diagram or counts. |
| Recruitment | Manage openings and applications; D/G | Preserve separate publishing and applicant-review contexts. Shared fields/actions become coherent; publication remains explicit and role-gated. Deeper hiring-specific reference remains needed before restructuring this workflow. |
| Operations monitor | Identify waiting work and follow up; B/H | Keep review stage, responsible staff, waiting time and problem in one scannable row. Neutral filters; retain overdue labels and the explicit review-rule consequence. |
| Unit catalog | Find a listing, change its details, preview publication; D/G | Search and visibility filters stay close to table; editor uses shared field/focus states. Existing public visibility and order semantics remain. |
| Enrollments | Review a request with replacement context; H/G | Preserve request/replacement explanation beside the decision, with visible status. Keep enrollment request, website application and form destinations distinct. |
| Paluwagan Records | Find a batch and understand its plan; D/G | Expand New batch on request; show schedule preview during creation. Existing filters/table are reached earlier. Never guess installment or balance data. |
| Payments & Finance | Locate a claim and inspect verification context; E/F | Label status and amounts; correct the search icon gutter and primary-action contrast. Preserve full references, exact date filtering and view-details controls. |
| GCash history | Find a statement and compare reading/review evidence; E/H | Filter queue, open submission, inspect original/history and record review separately. Preserve the explicit boundary that this page does not verify payments. |
| Withdrawals | Select a request then inspect its consequences; H | Keep master/detail context, neutralize local purple panels, preserve replacement/refund explanations and explicit decisions. |
| Device inquiries | Find an incoming inquiry and update follow-up; D/H | Search/status remain visible. Preserve the real empty state and pagination; don't fabricate leads to fill the design. |
| Customer Service | Locate a concern, inspect conversation, reply; H/G | Preserve customer lookup and source-channel context. Shared fields/table/dialog controls align; conversational state remains separate from case status. A dedicated support-inbox reference is still needed before a major rearrangement. |
| Customer work | See the queues the role can actually access; H/J | Auto-fit the queue grid to permitted queues instead of reserving three columns for one queue. Retain error/loading distinctions. |
| User management | Find an account, inspect role/access, create deliberately; D/G | Keep directory first, clear status and labeled Manage. Verify create dialog, visible focus, and search icon gutter. Role changes remain server-authorized. |
| Notification settings | Change wording/timing and review delivery status; G | Keep labels and editable values readable with explicit Save. Neutral surfaces and meaningful setup/error status. Do not send test email during visual review. A dedicated template-editor reference remains needed before larger flow changes. |

The unfinished hiring/support/template-specific research is explicit; the common
component pass must not be described as a complete redesign of those workflows.

## Verification record

Append the final optimized preview build, route sweep, interaction results and
remaining gaps after the rebuilt directory/task pass is inspected. User acceptance
and actual staff task-success testing remain separate.
