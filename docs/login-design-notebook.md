# Login layout design notebook

## Current direction — 2026-11-25

Jaycee requested the layout in his supplied ARKO login screenshot for Fresh
Phones' `/login`. The screenshot is the primary composition reference, not
permission to copy ARKO's identity or artwork. Keep Fresh Phones' established
blue, navy, pastel characters, Nunito typography and real sign-in flows.
The current revision has all nine original pets separated in one row across
the card’s full top edge, each with two paws gripping its front. Original faces,
colors, tilts and animation logic are retained. The card is480px maximum with
40px top padding. Brand/headline remain on the left; the pastel phone-heart
return button wiggles on hover/focus. Latest evidence:
`.local/login-pet-row-20261125/`.

Source and render evidence: `.local/login-layout-20261125/` (local, ignored).
Original references: `reference-arko.png`, `before-user.png`; actual baseline:
`before-desktop.png`. Read ROSS's shared notebook workflow, website, visual,
typography, motion and mobile standards, plus the existing account-security
design notebook before implementation. Existing role-specific notebooks remain
scoped to their own workspaces.

## Behavior and evidence

Goal: identify Fresh Phones, enter credentials, recover if necessary and reach
the existing workspace. Alternate paths: workspace preview, support return and
MFA/recovery. Feedback remains beside its relevant controls; real authentication,
permissions, destinations and preview availability retain their existing logic.

| Evidence                                                                                                                     | Strength and limits                                                                             | Decision and falsification check                                                                                                                                             |
| ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [W3C reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)                                                        | Strong standards guidance; not evidence that this composition improves completion time          | Use minimum viewport height and a stacked phone layout. Fail if fields/actions are clipped or horizontal scrolling appears at 320 CSS px.                                    |
| [W3C target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)                                      | Strong standards guidance; 24px is an AA minimum with exceptions, not an optimal universal size | Use 44–50px main controls and visible keyboard focus. Inspect actual bounds and keyboard operation.                                                                          |
| Choice-overload correction, [Scheibehenne et al. 2010](https://doi.org/10.1086/651235), retained in user-expi evidence guide | Context-dependent synthesis; not a claim that fourteen roles inherently overwhelm anyone        | Preserve every existing role. Put the preview disclosure after credential sign-in so an expanded chooser cannot precede the primary form. Verify all roles remain reachable. |

Route: user-expi → ui-design-index → dashboard/design-system forms. The routed
category file is absent locally (as also recorded in the prior security
notebook); use the router's composition-lock workflow, native form/disclosure
primitives and the supplied primary reference. No gallery research requested.
No dependencies or unfamiliar authentication feature needed.

## Fidelity map and implementation choices

- Macro silhouette: full-bleed approximately 55/45 desktop split, no inset outer
  card or dark page gutter. Left brand at the upper left, substantial headline
  centered vertically, quiet supporting copy underneath.
- Right: a distinct blue/cloud backdrop, top-left return link, centered contained
  white sign-in card, nine separated pets gripping its full top edge,
  and supporting footer below. Keep generous surrounding
  negative space. Use existing owned cloud assets and characters.
- Type: existing Nunito; fluid 40–64px story headline, 30–36px form title, 16px
  inputs, 14px labels. No eyebrow labels or decorative section numbers.
- Surfaces: blue grid on left, navy text, white card with blue offset shadow,
  20px outer corners and 10px inputs; alpha borders, authored OKLCH sky colors.
- States: existing error/loading/MFA/support flow, 0.97 card entrance/pressed
  controls, short error shake, native details with feature-detected intrinsic
  height transition, reduced-motion fallback. Keep character interaction.
- Narrow screens: compact brand introduction then the full-width form area;
  allow vertical growth for preview/error/MFA/zoom rather than clip content.

## Initial verified result — 2026-11-25

- Protected optimized build and TypeScript pass; 72 pages generated. Main local
  preview now uses `.next-preview-a`, build `qDYrXz8sg00mXeJzqVE_E` at
  <http://localhost:3000/login>. Review-only port 3010 stopped.
- Seven browser sizes: 1920×968, 1440×900, 1024×768, 768×1024, 393×852,
  320×740 and 852×393. No horizontal overflow, page errors or failed compiled
  assets. Actual desktop, tablet and phone renders inspected against the
  supplied composition. Short screens scroll vertically; nothing is clipped.
- All fourteen preview roles remain reachable after the credential form; native
  disclosure starts collapsed. Open states checked at every size. Two axe scans
  (1440/393, chooser expanded) report zero WCAG A/AA violations. This is scoped
  automated evidence, not full accessibility conformance or human acceptance.
- Password visibility, existing character keyboard control, mocked rejected
  sign-in, MFA/recovery switch and support-return state pass. Live credential
  tab order and focus styles checked; Enter opens the preview disclosure.
  Normal card entrance and reduced-motion layouts both exercised.
- Real Pioneer preview login200 → `/system`, authenticated identity200,
  logout200 and old session401. Initial audit cookie lookup used the wrong
  path; corrected the checker to `/api/auth/me`, then reran successfully.
- Six existing session/support/presentation tests and scoped formatting pass.
  Sign-in handlers before the render and character source are byte-identical
  to baseline; all 41 inherited pending paths retain their original hashes.
- Sixteen local images retained, including both supplied screenshots, baseline,
  seven final sizes, expanded previews, error/MFA/support and live desktop.
  Machine-readable results: `layout-results.json`, `demo-results.json`,
  `keyboard-motion.json`, `source-checks.json`; logs beside them.

No backend/grant/database-seeding change, commit, push or deployment. Human
visual acceptance remains pending until Jaycee reviews. The requested local
layout implementation and scoped technical verification are complete.

## Pastel button and centered placement — superseded, 2026-11-25

Jaycee asked for the back button to use the website's pastel colors and Fresh
Phones icons, then requested moving the animals to the top of the sign-in card
and removing its sparkle. This supersedes the left-panel animal placement in
this revision's fidelity map; the split composition and left headline remain.

Reuse the website's existing `DoodleIcon` phone-heart symbol and its pastel-pink
fill/lavender outline. Back link uses a blush-to-lilac pill, soft white border
and shadow, existing destination/label/focus and reduced-motion/press behavior.
Move the existing live `LoginCharacters` component immediately above the form
heading, 156px wide, overlapping the card's upper edge. Remove `Sparkle` entirely
from this route. Tighten form gaps to16px, field gaps to7px and top margin to24px;
keep 16px inputs, readable labels and every existing control. On phones reserve
space between the back button and animals; use a compact100px brand header.
Preserve existing mood, pointer/password and keyboard character behavior.

Protected optimized build/TypeScript pass (72 pages); live3000 now bucket b /
`wxdTLqi29aHBT3Qz1gRC4`. Formatting/whitespace pass. Eight compiled browser
sizes (1920,1440,1280,1024,852 landscape,768,393,320) show no horizontal
overflow or animal/back-button/heading overlap. Actual desktop/phone renders
and the cropped pastel button inspected; 13 supplied/final images retained in
`.local/login-refinement-20261125/`. Tablet widths reserve176px above the card,
phones150px, maintaining clearance for the overlapping illustration.

Both expanded-chooser axe scans (1440/393) have zero violations. All fourteen
preview roles, visible keyboard focus via actual Tab navigation, phone-heart
sprite200, button destination, password visibility and character keyboard
interaction pass. No page errors or failed assets. Normal and reduced-motion
paths exercised. Sign-in action source and41 unowned pending-path hashes are
unchanged; original character component remains unchanged. Machine-readable
results: `verification.json`, `source-preservation.json`, `final-result.json`.
No new backend/authentication, data/grant, dependency or publication change.
Human visual acceptance remains unrecorded; requested local refinement complete.

## Floating corner placement — superseded; button wiggle retained, 2026-11-25

Jaycee rejected the centered animals crossing the card edge and supplied a
reference with an illustration perched above the upper-right edge. He also
identified the missing button wiggle. Current direction: keep the existing
interactive animal artwork, absolutely anchor it24px from the card's right edge,
180px wide and138px above its top. Its base overlaps the edge slightly, while
64px top padding keeps the heading below it. This supersedes the centered156px
negative-margin placement. Stack at960px so the return link stays clear in
short landscape; reserve224px above phone cards and168/176px on desktop/tablet.

Add a single550ms whole-button wiggle on fine-pointer hover and keyboard focus:
rotate0→−3→3→−2→2→0 degrees. Active state stops the wiggle to preserve0.97 press
feedback; reduced motion disables animation and transform as before. No repeated
idle motion or delay before navigation. Preserve pastel icon/surface and label.

Source-CSS placement preview checked at seven sizes and actual1920/393 renders
retained in `.local/login-perch-20261125/`; a collision at852px led to moving the
stack breakpoint from800 to960px before the optimized build. Final protected optimized build/TypeScript pass (72 pages), scoped formatting
and whitespace pass. Current localhost3000 bucket a / `wTPOVjUq_cAM2tL8WcaU2`.
Ten compiled sizes (1920,1440,1280,1024,961,960,852 landscape,768,393,320)
verify upper-right placement, slight card-edge overlap, heading clearance,
return-link clearance and no horizontal overflow. Actual1440/393 renders
inspected against the supplied corner reference; all fields/actions and fourteen
workspace previews remain reachable. Two expanded-chooser axe scans report zero
violations; no page errors or failed compiled assets.

Actual CSS animation sampled at0/110/220/330/440/550ms for hover and keyboard
focus: identity, −3°, +3°, −2°, +2°, identity. Both effects last550ms. Press stops
animation and settles at0.97; reduced motion has no animation or transform.
Existing password visibility/animal keyboard behavior passes. Evidence:
`verification.json`, `source-preservation.json`, `final-result.json`; screenshots
include both supplied references, two source previews and ten compiled sizes.
All41 unowned pending paths and the character source match baseline. This
correction changed only login CSS plus this notebook; no auth/backend/data/grant
change, commit, push or deployment. Visual acceptance remains unrecorded.

## Corner-stack contact — superseded by the row, 2026-11-25

Jaycee rejected the corner-positioned pile as still floating. Position and
bounding-box overlap were insufficient: the artwork lacked front-plane
occlusion and a grip/contact cue. Keep all nine original heads and interactions,
cut the lower artwork at y405 of its455-unit viewBox, and align that cut exactly
with the card edge using a proportional89.010989% translation/clip. Add six
small, matching-fur vector paws for the three front pets, crossing the card edge
with short toe lines and a contact shadow. Paws are decorative and ignore
pointer events. Phone top space236px maintains clearance after raising the art.

This supersedes the earlier floating corner placement. Source-preview close-ups
at1920/393 and contact geometry at eight widths verified before building:
visible cut aligns within1px of the card, every paw crosses the edge. Evidence:
`.local/login-peek-20261125/`. Protected optimized build/TypeScript (72 pages), scoped formatting/whitespace
and compiled verification pass. Current localhost3000 uses bucket b /
`szxV-Pk7oxKZ8xDTVj6NW`. Ten widths, including960/961 boundary and short
landscape: visible cut aligns with the actual card edge within1px; all six paws
cross it. Actual1920/393 contact crops and full-size renders inspected. No
horizontal overflow, heading/button collision, page exception or failed asset.
Two expanded-chooser axe scans report zero violations; all14 roles reachable.
All nine original pet controls pass actual keyboard Tab/Enter navigation and
password-visibility states. Existing hover/keyboard wiggle,0.97 press and reduced
motion pass. The login/auth page and character state/event logic are unchanged;
41 unowned pending paths match baseline. Eighteen supplied/source-preview/final
images plus verification/source/final JSON retained. Refreshed3000 in desktop
browser. No auth/backend/data/grant/dependency/publication change. Human visual
acceptance remains unrecorded.

## Nine independent pets in one gripping row — 2026-11-25

Jaycee requested all nine pets separated and lined up across the card top,
each gripping it. Reuse the exact original vector faces, colors, tilts and
existing animation/state/event logic; source reuse preserves the animations.
This supersedes the corner stack. Render nine equally spaced positions in one
2160×200 SVG row, cut at the common card edge. Each pet has its own pair of
matching paws:18 total, aligned to the same positions in a separate foreground
SVG. Keep nine independent existing keyboard controls with transparent hit areas.

Widen the card to480px maximum and span the row with12px end insets; all nine
remain in a single row on phones. Tighten card top padding to40px and phone panel
top space to120px, since the tall stack is gone. Preserve the pastel return
button/wiggle and existing sign-in/MFA/support/preview behavior. Native face
renderer and character state/event logic remain unchanged; remove obsolete
stack x/y coordinates from pet data.

Source-preview close-ups at1920/393 inspected. Nine nonoverlapping faces and18
paws gripping the actual edge pass at10 widths before build. Preview/evidence:
`.local/login-pet-row-20261125/`. The initial build stopped during final tracing;
resumed from unchanged source and finished through the protected launcher.
Final72-page optimized build/TypeScript and scoped formatting/whitespace pass.
Current localhost3000 uses bucket a / `xv556mObL88khzS-idXnB`, running under the
persistent resource-limited `freshphones-local-web.service`. Active/ready build
markers match; reopened the page in the desktop browser.

Ten compiled sizes from320px to1920px, including960/961 boundary and short
landscape, verify nine separated faces, nine paw pairs and eighteen edge
crossings. Every pet has a measured target of at least24.25px in each dimension
at the smallest tested width. Actual desktop/phone row close-ups and full form
renders inspected. All fourteen preview roles remain reachable; two expanded
chooser axe scans have zero violations. No page errors, failed compiled assets
or horizontal overflow. All nine independent keyboard controls pass in password
mode; password visibility and original eye-closed turn behavior remain.

All nine actual blink animations sampled open→closed→open at their original
six-second period. Cursor-follow gaze changes in the browser; typing, loading
and error moods pass with a browser-only rejected-login fixture. Normal/reduced
motion and return-button550ms hover/focus wiggle/0.97 press remain verified.
Source checks confirm the exact face renderer, original nine identities/colors/
tilts, character state/event logic and animation CSS unchanged. The login/auth
page and41 unowned pending paths remain byte-identical to baseline.

Seventeen before/source-preview/final screenshots, `verification.json`,
`blink-samples.json`, `source-preservation.json` and `final-result.json` retained.
No image generation, new dependency, auth/backend/grant/data change, commit,
push or deployment. Requested local lineup complete; human visual acceptance
remains unrecorded.
