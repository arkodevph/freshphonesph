# Jiggicons: glass icons, creative motion and sidebar blur

User-selected reference: https://jiggicons.com/ and its glass library at
https://jiggicons.com/library, inspected through OpenCLI on 2026-11-25.
Controlling screenshot: `/tmp/codex-clipboard-5tOPyy.png`.
The user explicitly requested both the lower-edge blur and the icon animations.
On 2026-11-25 the user then requested more creative object-specific action across
all icons, exemplified by opening the little door in Home. This supersedes
preserving the original choreography as the final motion direction.

## Reference and adaptation

Retain the reference's dimensional grayscale objects: pale translucent bodies,
dark bases and layered gradients on a 24px grid. The supplied crop's icons are
approximately 18–20px with about 40px row spacing (estimates). Fresh Phones uses
22px in its existing labeled navigation rows. Preserve the shell, typography,
spacing, grouping and neutral selected surfaces. Invert only the icon artwork in
dark mode to retain visible glass layers; introduce no new semantic colors.

Use these icons in existing staff/customer navigation and owner shortcuts.
Retain labels, primitive action/status symbols, and existing menu/press/theme
motion. Avoid the inspected negative pattern of decorative icons on every
section. No extra gallery or explanatory product copy.

## Original SVGs and runtime (retained source)

`apps/web/generated/jiggicons` contains the original dependency-free runtime from
`jiggicons@0.1.2` and 25 free icons' glass markup and per-icon choreography.
The runtime is copied unchanged, with the package's declarations and licence;
unused drawing variants are omitted from the generated icon data. Audio is off.
No package is installed. The earlier static-only implementation is superseded.
The static reference sprite from `jiggicons-static@0.1.1` remains available in
`apps/web/public/icons/jiggicons` as the original copied source asset.

`JiggIcons.tsx` renders the original inline SVG layers using unique stable IDs
for masks/gradients. The original spring player moves each part separately; Freshphones now supplies
its own authored tracks, described below.
A live Bell sample plays 11 layer animations; the body and clapper use different
pivots and follow tracks. The external sprite is unsuitable for addressing
those moving layers, so the live components render inline instead.

Hovering the containing link/button and keyboard focus trigger a one-shot.
Touch pointer entry also triggers it. Rapid re-entry lets an in-flight motion
settle without restarting or snapping. Clean up bindings and motion on unmount;
honor reduced motion at entry and stop playback when that preference changes.
No idle loop or mount animation.

## Freshphones creative motion — November 25 follow-up

Baker's direction: communicate an action intrinsic to each object at the actual
22px navigation size. The negative example is Home's whole-house bounce: it moves
but tells no Home-specific story. Replace that with an independently hinged door
and keep the house grounded. Apply the same criterion to all 25 icons.

`components/jiggicons-choreography.json` owns the 25 motion descriptions and
spring tracks. `components/jiggicons-motion.ts` adapts the original SVG rig and
plays those tracks through the copied spring runtime. Keep the generated source
unchanged. Home gains a separate dark opening and a door leaf with a tiny knob;
the cube's lid becomes a separate rig layer. Hinge actions use sampled 3D rotation
on visible artwork and matching mask layers. No new dependencies or audio.

| Icon | Authored action |
| --- | --- |
| Home | Door hinges open, waits, closes; house stays grounded |
| Calendar | Page tips around the top binding; dates reveal in sequence |
| Receipt | Paper feeds out and its lines print in reading order |
| Bot | Looks toward you; antenna follows; one eye winks |
| Briefcase | Handle lifts and lid opens from the back hinge |
| Face | Leans in, winks, broadens its smile |
| Handshake | Squeezes, pumps twice, releases |
| Globe | Meridians turn around its fixed axis |
| Megaphone | Tips toward its audience and speaks in three cone pulses |
| Lock | Shackle lifts and turns aside, then relocks |
| Eye | Blinks, scans left/right, looks forward |
| Phone | Vibrates for an incoming call; home indicator responds |
| Send | Plane draws back, banks upward, glides home |
| Folder | Front cover hinges open and closes |
| Money | Banknotes fan apart for counting and restack |
| Clock | Minute hand winds back, sweeps a revolution, catches on time |
| Download | Arrow drops into tray; tray absorbs its landing |
| Message | Typing dots rise in sequence; reply bubble nudges forward |
| Headset | Tips to listen; microphone swings into speaking position |
| Key | Slides in, turns a quarter turn around its center, slides out |
| Bell | Rings twice with a trailing clapper |
| Broom | Sweeps and gathers; bristles lag behind its handle |
| Parcel | Lid lifts away and seats back onto a grounded box |
| Switch | Thumb clicks across its track, waits, returns |
| Exit | Door swings from its left hinge and softly closes |

Acceptance: every icon visibly plays its own action; opening Home's door does not
move the house; no clipping at sampled frames; one-shot settling, rapid re-entry,
keyboard/touch, unmount cleanup and reduced-motion behavior remain functional.
Compare both themes and desktop/phone navigation in the rebuilt running preview.
Reference/art proportions, shell spacing and quiet selection remain as recorded
above. Source-specific motion adaptations are deliberate user-requested changes.

Evidence directory:
`/home/nami/.agent-reach/design-references/freshphones-creative-icons-20261125`.
Rebuilt optimized preview: `http://localhost:3000/login`, `.next-preview-a`,
build `eoyfaUV6S8lWfKjLB1VrK`. Full compilation, TypeScript and 72 pages pass;
the served build manifest returns HTTP 200. Scoped formatting passes. The original
source-integrity check still passes because the copied assets/runtime are intact.

The isolated browser fixture passes all 25 distinct moving tracks, settling and
reduced motion. It explicitly checks that Home's door animates while the house
stays still. Inspected all-icon light/dark captures and six sampled motion frames
at both 22px and 56px. The key's initial off-center pivot clipped during its turn;
corrected to a centered pivot and reinspected before this build.

`creative-icons.mp4` is a local motion review artifact, not a product gallery.
The rebuilt running app passes 18 live motion checks (including Home's grounded
body and 3D door hinge) with zero runtime/hydration errors. Navigation regression
passes 56 checks across staff, COO, owner and customer, both themes and
1705/390/320px widths, keyboard focus, browser Back and the customer drawer.
Inspected actual Home-open light/dark and phone captures after rebuilding.
User acceptance, physical devices and deployment remain unverified.

## Progressive lower edge

The user called out the soft lower edge as a feature Baker must retain.
The homepage's `.progressive-blur` is a fixed 64px bottom overlay with seven
masked backdrop layers from 0.25px to 16px. This is actual progressive blur,
rather than merely an opacity fade or a property of the SVG artwork.

Apply that effect above the sidebar account area on staff/customer navigation.
The overlay passes pointer events and is hidden from assistive technology.
Reserve 64px of padding so the last destination can scroll clear. Hide the blur
while navigation holds focus, preserving readable focused labels. The horizontal
staff phone navigation has no lower overlay. Sparse menus remain sharp because
nothing needs to scroll behind that edge.

## Sources and licence

- https://jiggicons.com/docs/javascript: `markupOf`, `play`, `bindTrigger`,
  `stop`, glass variant behavior and original icon data.
- https://jiggicons.com/docs/static and https://jiggicons.com/docs/license:
  original static files and permitted free icon use inside commercial/client
  apps. Drawings and choreography use the Jiggicons terms, not MIT. Runtime code
  is MIT. Both notices are retained beside their copied sources.
- https://registry.npmjs.org/jiggicons/-/jiggicons-0.1.2.tgz:
  substantive inspection of `src/index.js` (`play`, `markupOf`, `bindTrigger`),
  `src/engine/motion-spec.mjs` (`bake`, `keyframesOf`) and 25 icon definitions.
- https://github.com/facebook/react/blob/v19.2.4/packages/react/src/ReactHooks.js:
  inspected `useEffect(create, deps)` cleanup return contract through OpenCLI.
  Installed Next.js 16.2.9 server/client component guidance was also inspected.
- https://github.com/vercel/next.js/blob/v16.2.9/packages/next/src/client/link.tsx:
  previously captured source confirms SVG children retain anchor/event semantics.

## Prior verification and evidence (before creative follow-up)

Source-integrity check passes: all 25 glass drawings and choreographies match the
upstream package, and the copied runtime source is unchanged. Scoped formatting
passes. Motion acceptance covers whole-control hover, independent layer motion,
keyboard focus, touch entry, rapid re-entry, settling, unique IDs, unmount cleanup,
reduced-motion entry/live preference changes, both themes, phones and real routing.
Verified optimized preview: `http://localhost:3000/login`, build
`9Lxw1Pcz-TzTr5KeYxGdA` in `.next-preview-b`. Compilation, TypeScript and
72 generated pages passed. The served build manifest returned HTTP 200 during
this continuation; the live wrapper passed all 16 motion checks with no runtime
or hydration errors. The earlier navigation regression run passed 56 checks
across staff, COO, owner and customer.

The continuation additionally exercised every icon in an isolated browser fixture
using the exact app data and copied runtime. All 25 played visibly moving layers,
produced distinct full keyframe signatures, settled, and blocked playback under
reduced motion. This fixture checks all icon choreographies; the separate live
app run checks their React wrapper and navigation integration. Screenshots of
all icons in both themes and the live desktop/phone preview were inspected.
The artwork retains the controlling reference's grayscale glass material.

Per-icon behavior includes bell body/clapper lag, turning clock hands, lifting
lock shackle, sequential message dots, blinking/scanning eye, diagonal paper-plane
flight, sweeping broom, sliding switch thumb and opening/closing door. These are
separate authored layer tracks, not a common wrapper animation. The user repeated
this per-icon requirement on 2026-11-25; preserve it in future changes.

Additional evidence: `all-icons-qa.cjs`, `all-icons-checks.json`,
`all-icons-motion-light.png` and `all-icons-motion-dark.png` in the motion evidence
directory below. No new production-code change was needed in this continuation:
the previous implementation already contained the original per-icon motion.

Original icon/blur evidence and 63 passing checks:
`/home/nami/.agent-reach/design-references/freshphones-jiggicons-20261125`.
Animation reference captures, original source, integrity script and browser checks:
`/home/nami/.agent-reach/design-references/freshphones-jiggicons-motion-20261125`.

All work stays local and uncommitted. User acceptance, physical devices and
production deployment remain unverified.
