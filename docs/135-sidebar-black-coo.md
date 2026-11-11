# Sidebar composition and black COO dashboard

Direction: user's November 10 screenshot shows the rejected current sidebar.
Primary visual: the neutral Ember sidebar at 14 seconds in Griffin Wooldridge's
user-selected dashboard study, inspected again locally on November 10. Retained
frame: `/home/nami/.agent-reach/design-references/nami-user-posts-2026-11-10/DfGCFq_KBl7-at-14s.jpg`.
Source and evidence limits are in the Nami brain's
`01-Projects/Nami/Dashboard-Craft-and-Motion.md`. This is a captured authored
example, not a claim about the current interface of a live Ember product.
The older Untitled UI selection in docs/122 no longer controls this revision.

Audience/task: staff navigating role-filtered operational work. Preserve route
permissions, staff groups, account access and the CEO's separate header topology.
Negative example: `.local/sidebar-20261110/user-rejected-sidebar.png`; its bright
stripe, outlined active row and loose row rhythm are explicitly rejected.

## Reference brief and intentional adaptations

The Ember frame places a compact brand above integrated search, uses a steady
icon/label column, muted group labels and closely spaced rows. Values below are
implementation choices estimated from that visual, not measurements of source CSS:

| Relationship | Previous implementation | Revision |
| --- | --- | --- |
| Search placement | Main header | Under sidebar brand, one accessible search instance |
| Row rhythm | 44px rows with 4px gaps | 36px rows with 2px gaps on desktop; 44px coarse/mobile targets |
| Icons | 20px, special sizing only for COO Workspace | Consistent 17px across staff groups |
| Selection | Blue icon, bordered/striped treatment in supplied preview | Flat neutral surface and label emphasis; separate keyboard outline |
| Groups | 24px gap and uneven Workspace treatment | 22px gap and one shared type/alignment system |
| Sidebar scale | 244px shell | Keep 244px; adjust interior composition |

User's additional instruction: COO dashboard dark mode must use actual black,
without blue. The dark COO dashboard uses #000 canvas, #0d0d0d panels, neutral borders,
colored chart series and contextual controls. Removed dark backdrop gradients,
blue glass, and the summary card's old decorative curves. The global COO desaturation override was removed after the user clarified that
black applies to the background, not the whole system. The sidebar is also black in dark mode. Neutral surfaces establish hierarchy;
labels and the exact-figures chart table preserve meaning beyond color.
The reference's rounded/outlined active row is deliberately simplified to honor
the user's rejection. Brand artwork stays original rather than copying Ember.

## Verification

Final optimized preview: `http://localhost:3000/system`, `.next-preview-a`, build
`ySwyBZMZkmoD_XELaCvP4`. Inspected final desktop dark/light (1440×1000), mobile
(390×844), sidebar search and mobile chart screenshots in
`.local/sidebar-20261110/`. Compared compact shell, integrated search, group
rhythm, icon alignment, metric hierarchy and dimensional detail against Ember.
The flat selected row and record-sheet artwork are intentional adaptations.

Build including TypeScript passed. Existing 14 public navigation/link tests and
11 chart/role-policy tests passed. Live OpenCLI checks: one neutral selected
sidebar link without border/stripe/shadow; 20 unique COO routes; one sidebar
search; Ctrl+K opens and focuses search; filtering returns Reports; Escape
returns focus; chart keyboard Tab selects the next month with visible focus;
October readout matches the chart labels (₱63,110 verified, ₱18,250 pending);
canvas computes to rgb(0,0,0). CEO retains Dashboard/AI assistant/Reports in its
header, hidden sidebar and one search. No captured browser errors. No separate
browser was launched. Reduced-motion styles inspected in source; no emulated
reduced-motion browser run or independent user acceptance claimed. No commit,
push or deployment.

## Creative detail pass

User correction: “where's the cool details like Ember”, followed by “add to Nami,
don't be so literal.” The standing agent guidance now defaults to creative
interpretation and scopes color corrections to the named property. Close copying
is reserved for explicit requests.

Nine current pages were visually inspected via the existing OpenCLI browser;
selection notes and access limits are in
`.local/sidebar-20261110/references/research.md`. Ember remains primary. Added
an original CSS record-sheet illustration, green verified bars with lavender
hatching for pending claims, and pointer/keyboard/touch month inspection with
actual API amounts. The exact figures table is preserved. Replaced the greeting
with task context. Removed the outer summary panel's redundant enclosure.
No new dependencies, made-up trends or financial product claims.
