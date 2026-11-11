# Clients directory refinement

November 10, 2026 · User selected Clients in the People navigation and explicitly
requested UI refinement with Threads references. This prioritizes Clients within
the People item; report/earnings/calendar repairs remain separately queued.

## Reference brief

Primary: [Shuvo CRM](https://www.threads.com/@shuvouix/post/DeZejA7tuNo), October 12,
2026. Opened through OpenCLI and visually inspected after the image finished
loading. Its Recent Deals region supplies the directory grammar: identity-first
rows, small secondary text, quiet separators, compact search/filter controls.
Secondary compared: [Ikram Health CRM](https://www.threads.com/@ikramsakib/post/DeKUh8aEwVi),
October 6/7, 2026 depending timezone. Visually inspected its aligned identity lists
and quiet secondary data. No medical, sales, AI or automation behavior imported.
Both are static 572px-wide post images; exact original UI dimensions and interaction
behavior are unknown. Row spacing/type proportions are estimates, not measurements.

Evidence directory: `/home/nami/.agent-reach/design-references/clients-20261110/`.
Captures `crm-reference.png`, `health-reference.png`, `before.png`. Command route:
`opencli browser nami-clients-reference` and `nami-clients-research` open/screenshot.
Searches: CRM dashboard design; client table design (the latter returned unrelated
furniture posts and supplied no usable design lesson).

Negative example: existing Clients `before.png`. Two full-width occasional-action
panels and seven permanently visible filters precede the list. A row repeats many
button shapes while separating name/contact/identifier into competing columns.
Replace this with compact action disclosures and search/status, expandable secondary
filters, combined client identity, and one Records disclosure for secondary actions.

## Implementation mapping

| Reference relationship | Product adaptation |
| --- | --- |
| Compact toolbar adjacent to records | Search/status always visible for COO; More filters retains model/date/handler/agent, active count and date-error disclosure |
| Strong identity with secondary context | Name, contact and identifier together; neutral initials rather than invented photos |
| Quiet aligned rows | Five columns, 13px body/12px labels, 16px row insets, semantic status retained |
| Restrained actions | Existing Records actions grouped in native keyboard-operable disclosure; release update remains adjacent to release status |
| Existing product shell | Keep COO navigation, black canvas, semantic colors and no decorative selection edges |

Preserve API queries, pagination, all permission gates, linked-client/batch paths,
release drafts, schedule and requirement behavior. No data writes needed for design
verification. Only the compact filter variant is COO-specific; the shared Clients
row layout serves other authorized roles too. Other record filter consumers keep
existing behavior. Small screens use contained keyboard-focusable table scrolling.

## Verification

Final optimized build `XP92AhXzgXGHx363tArc0` passed compilation and TypeScript.
All 13 existing record-filter, record-edit and role-workspace tests passed. Prettier
and scoped whitespace checks passed. Desktop composition visually compared with
the primary reference; search/status toolbar and five-column identity-led table
retain the intended hierarchy without importing the reference dashboard's metrics.
Live COO checks: 52 real preview clients, 20 per page, five columns; unmatched search,
Completed status empty state, Clear, date-error auto-expansion and pagination
(21–40) passed. Enter opens Records with focus retained; Edit opens/closes without
saving. The sampled synthetic member has no issued schedule: existing API recovery
message shown, not a fabricated schedule. Add-client disclosure retains its fields;
no submit or data write performed. At 390/320 document widths equal viewport;
contained table scroll regions are 354/284px wide with 680px content, horizontal
scroll exercised. Final evidence: `verification.json`, `after-desktop.png`,
`after-light.png`, `after-390.png`, `after-320.png`, `records-expanded.png`,
`edit-open.png`, `create-expanded.png`, `filters-error.png`, `empty.png` in evidence
directory. Desktop, light and mobile screenshots visually inspected.

Light review found weak release-button contrast from legacy utility styles;
local explicit system-token treatment and top alignment were added. Final shared optimized build `PUcn2ceQa9hwuZmMwfu0O` completed and was activated;
compiled CSS and JS include the release class and explicit token styles. Final
live verification in `polish-verification.json`: 20 loaded rows, role COO,
release text/background dark #f0f2f0/#0d0d0d and light #202622/#ffffff; top-aligned
cells; rapid disclosure toggles end open as expected. Final light and 320px images
visually inspected. Final evidence uses `after-dark-final.png`,
`after-light-final.png`, `after-390-final.png`, `after-320-final.png`,
`records-expanded-final.png`. Native disclosures introduce no animated transition. Other browsers, assistive technology, successful schedule
rendering for a scheduled member and user acceptance remain unknown. An API reload
took about 50 seconds during verification; no backend fix is claimed.

Verification completed just after midnight, November 11, 2026 Manila. No commit, push or deployment performed.
