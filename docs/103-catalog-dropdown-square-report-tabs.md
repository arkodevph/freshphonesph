# Catalog dropdown and report tab curves

The latest clarification supersedes the square-corner request: keep the existing
iOS glass composition and sliding selection, with subtle rounded rectangular
edges. Outer track radius is 11px and buttons/indicator are 4px, matching the
existing 7px inset (6px padding + 1px border). These values are a restrained
product judgment, not an empirically optimal radius. Palette, spacing, typography,
44px targets and 320ms motion are preserved.

Recent community research was resumed on 2026-11-05:
- [Reddit nested-corner discussion](https://www.reddit.com/r/MacOS/comments/1s6uxkq/saw_this_today_cannot_unsee_now_what_is_going_on/): concerns about inconsistent inner/outer curves.
- [Reddit excessive-rounding discussion](https://www.reddit.com/r/software/comments/1w50k9s/why_are_applications_continuing_to_make/): opinions vary; not usability evidence.
- [Cursor community, Aug–Sep 2026](https://forum.cursor.com/t/about-cursor-ide-ui/170047): users request visual consistency and clear boundaries.

Existing product screenshots control composition; community discussion only informs
corner treatment. The cool neutral translucent background, dark/light text and blue
focus remain unchanged, so this change introduces no palette or contrast changes.
Community reference screenshot: `/tmp/fresh-radius-community-reference.png`.
Agent Reach Reddit returned HTTP 403; public web retrieval supplied the discussions.
Facebook returned unrelated glass-supply groups, which were excluded.

The public catalog's Availability field now uses the existing shared Select
component, with the landing page's navy/blue/pale-sky tokens. It retains the
same availability values, filtering and page reset. The menu has a selected
checkmark,44px option targets, keyboard navigation, Escape/outside dismissal,
viewport-aware placement and existing reduced-motion support. The catalog
section permits the open menu to overflow so empty filtered results do not
clip the options. The original search field is unchanged.

## UX constraints and evidence

Goal: scan six report categories, activate one, recognize the active report;
or choose availability and inspect the filtered units. Preserve labels and
visible selection; provide focus feedback and a reversible choice. Actual
user speed and preference were not measured.

| Evidence | Strength and limits | Decision / failure criterion |
| --- | --- | --- |
| [WCAG target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum) | Strong normative guidance;24px AA minimum has exceptions, not a proof that any shape is best | Keep44px report buttons and menu options; fail if targets shrink or overlap |
| [APG tabs guidance](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) | Strong interaction guidance; automatic activation is recommended only without noticeable panel latency | Preserve explicit report activation and existing focus/pressed semantics; focus alone must not issue a report change |
| User-provided composition | Product preference, not empirical usability evidence | Retain local glass material and motion; change only corner geometry on report controls |

Routed through user-expi → ui-design-index → ui-design-systems. Compatible
patterns are a single grouped navigation surface, persistent selected-state
feedback and a shared keyboard-accessible form control. Cool neutral surfaces
and dark labels retain the existing palette; blue focus feedback is distinct
from the selected glass surface. No evidence claims a square radius improves
task performance. The user's latest instruction supersedes the earlier square styling.

## Earlier square-version verification (historical)

Protected optimized build including TypeScript and whitespace checks pass.
Chromium verifies dropdown options, Home/End/Enter selection, retained focus,
Escape cancellation, outside dismissal, empty results and menu bounds at
1728/390/320px. Report checks cover all six categories in light/dark at the same
three widths: zero-radius corners,44px minimum height, exact settled indicator
alignment, no page overflow, retained indicator node, and a distinct sampled
mid-transition position. Inspected desktop tabs and desktop/mobile dropdown
screenshots against the user's existing composition.

Evidence: `/tmp/freshphones-controls-check.py`, `/tmp/fresh-controls-results.json`,
`/tmp/fresh-catalog-dropdown-*.png`, `/tmp/fresh-report-tabs-*.png` and
`/tmp/freshphones-control-shapes-build.log`. Preview runs at localhost:3000.
Firefox, Safari, screen-reader announcements and physical-device testing remain
unknown. Changes remain local and uncommitted.

Obsidian session sync remains unavailable while its `/mnt/storage` device is
disconnected; this file preserves the verified handoff locally.

## Latest subtle-curve verification — 2026-11-05

Optimized preview build including TypeScript passed. Browser checks passed all six
report selections in light/dark at 1728/390/320px: computed radii 11px/4px, 7px
inset, targets at least 44px, no page overflow, settled indicator alignment within
1px, same persistent indicator node, and distinct start/mid/end sliding positions.
Desktop light and mobile dark screenshots were visually inspected: composition,
palette and spacing match the earlier product screenshots; only corner geometry
changed. Mobile retains the existing horizontally scrollable report strip.
Evidence: `/tmp/fresh-subtle-tabs-check.py`, `/tmp/fresh-subtle-tabs-results.json`,
`/tmp/fresh-report-tabs-{light,dark}-{1728,390,320}.png`,
`/tmp/fresh-subtle-tabs-build.log`. CSS diff whitespace check passed.
Memory resume/save attempts remain unresponsive with unavailable Obsidian storage;
local session fallback: `/tmp/freshphones-subtle-tabs-session.json`.


## Screenshot correction — 2026-11-05

The user rejected the rendered 11px/4px treatment as still incorrect. The selected
44px-high tab remained visibly boxy. Revised outer/inner radii to 15px/8px,
retaining the same 7px inset, glass palette, spacing, labels and 320ms slide.
The user's screenshot is the controlling visual reference:
`/tmp/codex-clipboard-NLdOOc.png`. This adjusts corner geometry only; it does not
establish that the user has accepted the revised appearance.

Revised 15px/8px preview build and TypeScript passed. Browser checks passed all
six report selections at 1728/390/320px in both themes, including indicator
alignment and sampled mid-slide motion. Inspected desktop light and mobile dark
screenshots against the user screenshot; selected tab has visibly softer corners.
Evidence: `/tmp/fresh-soft-tabs-build.log`, `/tmp/fresh-soft-tabs-check.log` and
`/tmp/fresh-subtle-tabs-results.json` (latest run). User acceptance remains open.
