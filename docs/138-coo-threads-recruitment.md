# COO recruitment: Threads reference and directory hierarchy

November 10, 2026. Continue page-by-page work from docs/137. Audience: COO locating
openings, reviewing their public status and deliberately publishing a new role.
Existing Ember shell, black canvas, quiet selection and green actions remain.

## Reference brief

Primary for this page's directory composition: Louis Nguyen Studio's live CRM
prototype, https://crm-ui-table.vercel.app/, discovered from the author's Threads
post https://www.threads.com/@louisnguyenstudio/post/Dd90QWCkaSu/.
Post timestamp: 2026-10-01 20:56 UTC (October 2 in Manila). Both inspected through
OpenCLI's existing `nami-research` browser session on November 10. This is an
authored prototype with fictional records, not evidence of a shipped CRM product.

The compact title/toolbar and directly adjacent table give records most of the
viewport. Dark neutral canvas, quiet boundaries, muted secondary information and
small meaningful colors support scanning. Screenshot-estimated relationships:
208px sidebar, 48px topbar and toolbar, approximately 45px records; source CSS was
not measured. Freshphones retains its own 244px shell and larger operable controls.

Secondary comparison: Mike Design's July 2, 2026 dashboard concept at
https://www.threads.com/@mikedesignofficial/post/DaS3gkBG1Hh/ was visually inspected.
Its colored creation action is clear, but repeated inset cards are not selected
for this operational directory. Janm's September 27, 2024 post
https://www.threads.com/@janm_ux/post/DAa8dHVNvqw was opened; only caption and a
partial first panel were inspected, so no lesson from its full carousel is claimed.
Threads search itself requires login; Google via OpenCLI discovered public posts.
No login, account changes, posting or following occurred.

Captures and bounded metadata are under
`/home/nami/.agent-reach/design-references/coo-threads-20261110/`.

Negative example: `.local/coo-threads-20261110/before.png` records the original
recruitment page. An expanded publication form consumes approximately 380px and
puts the jobs search around y=930 at 1440x1000. Equal cards, a boxed heading and a
420px confidential-access notice further displace the directory. These specific
relationships, not all cards or this entire page, are the rejected pattern here.

## Implementation and intentional adaptations

- COO heading is open on the black canvas; counts form one divided summary strip.
- Native disclosure keeps publishing visible in a 52px row. All fields stay mounted
  while closed, preserving the controlled draft. Publishing remains explicit.
- Job filters and results follow immediately. First use explains publishing;
  filtered-empty results explain recovery. Empty tables no longer repeat the
  message. Loaded rows retain labeled actions and readable secondary copy.
- Confidential-access notice remains visible but compact. No permissions, API
  behavior, job publication semantics or applicant-review logic changed.
- `isCoo` keeps disclosure and empty-list treatment specific to the requested role;
  CSS is scoped to the COO shell. Other roles retain the expanded composer.
- Dark neutrals remain the base, green identifies creation/open state, focus has
  an independent outline. Mobile counts remain in one row, fields stack, and the
  toolbar wraps with 44px touch targets. Reduced motion removes icon transition.

## Verification

Optimized preview build `zZQvqeHLmaIfCGZv7xf30` (.next-preview-a) passed, including TypeScript.
Fourteen existing recruitment API, directory, draft/conflict and role-policy tests
passed. Edited-source Prettier check and whitespace check passed. Preview restarted
at localhost:3000 with the rebuilt output.

OpenCLI screenshots inspected at 1440x1000 dark/light and 390x844 mobile. Dark
first screen now exposes job search around y=600 versus around y=930 before.
Compared primary prototype's list-first hierarchy, quiet shell, muted labels and
creation entry point. Larger controls, green action role and explicit publishing
are intentional product adaptations. Confidential notice remains, with less
vertical displacement. Mobile toolbar/labels wrap and fields remain readable.
Some interaction captures retain scroll position, and two disclosure-state names
are reversed; their visible state, not the filename, is the evidence.

Real browser fill/click confirmed the title 'Preview draft only' survives closing
and reopening. Draft was then cleared without publishing. Keyboard focus outline
was visible in interaction captures, but the scripted Enter toggle result was not
retained as a verified assertion. No captured console errors were reported.

Live filter acceptance remains unresolved: the preview identity changed COO/CEO
during verification; a filter submission reached No recruitment access and later
navigation showed CEO denial. Cause is unknown. Do not claim the filter flow
passed. The existing access fallback remained active. Real jobs directory was
empty, so populated-row visual coverage remains unknown; no jobs or applicants
were created to fill the screen.

Bridge denied Emulation.setEmulatedMedia; reduced-motion behavior is source-only
verification. Evidence: `.local/coo-threads-20261110/verification.json`, build/test
logs, draft-retention result and five rendered captures. User acceptance, real
hiring usability and deployment remain unknown. This is a directory/publishing
refinement, not a new applicant workflow.
