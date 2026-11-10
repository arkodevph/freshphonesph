# Fresh Phones V2 hand-drawn SVG icons

Jaycee supplied four sheets of rounded outline icons and asked for SVG artwork
in that style for buttons and selected page areas. The supplied images are the
primary style reference. Scope: an original reusable icon family (initially nine, now eleven) and its
integration into V2, retaining the current glass/blue buttons and page structure.

## Direction and behavior

The user-expi → ui-design-index landing route leads to three compatible patterns:
bold rounded outlines, slightly irregular friendly silhouettes, and selective
heart accents. The separate ui-landing-patterns package is not installed; the
supplied images define the composition. Wedding-specific motifs are adapted to
phone, account, application, planning, support, payment and collection topics.
The initial navy/blue artwork was refined to rose-pink (`#b52c5c`) after Jaycee
requested slightly larger pink or red icons. Text and button backgrounds retain
their existing colors. No screenshot is embedded
or auto-traced.

Visitor flow and labels remain browse units → apply or contact the team; existing
customers log in. The small drawings accompany readable action labels rather
than becoming new icon-only controls. Hero feature cards, preparation panels,
process stage labels and the agent verification action use relevant artwork.
Menu/close/chevron affordances keep their existing familiar shapes. Unknown:
whether visitors prefer the style; review the live page rather than claiming an
effect on conversions.

## Evidence and implementation comparison

| Basis                               | Evidence and boundary                                                                                                                                                                                                                                                                                                                                                                                          | Decision / falsification                                                                                                                                                                     |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Decorative images beside labels     | [W3C decorative-image guidance](https://www.w3.org/WAI/tutorials/images/decorative/) says adjacent text can already convey the information; strong accessibility guidance, not a preference experiment.                                                                                                                                                                                                        | Inline SVGs use aria-hidden and focusable=false, with original visible action labels and destinations. Reject if accessible names change or artwork becomes a separate focus stop.           |
| Correction to visual simplification | The [choice-overload synthesis](https://scheibehenne.de/ScheibehenneGreifenederTodd2010.pdf) does not establish a universal maximum number of choices. Its experiments do not test these icons.                                                                                                                                                                                                                | Preserve the simplified navigation and add no new choices. This change supplies a visual identity; it does not justify hiding labels or destinations.                                        |
| Existing geometric icons            | Inspected the primary-source [Phosphor heart](https://github.com/phosphor-icons/core/blob/main/assets/regular/heart.svg) and [Lucide heart](https://github.com/lucide-icons/lucide/blob/main/icons/heart.svg), including raw path data. Phosphor is already installed; Lucide would introduce another family. Both inspected heart shapes are geometric and do not reproduce the supplied hand-drawn linework. | Keep existing Phosphor functional controls. Author nine small original vector drawings rather than importing a second icon package or distorting an entire UI set. No upstream paths reused. |

The master SVG symbol sheet is under `apps/web/public/brand/v2/doodles/`.
`DoodleIcon.tsx` renders a same-origin symbol using currentColor. Its default
rose ink can be overridden with --doodle-ink or an explicit style color, sharing
one cached asset and requiring no animation or new dependency. Eleven standalone
SVGs and an independent vector preview sheet are exported by
`scripts/export-landing-doodles.py`; --check detects stale exports.
The existing landing asset-sync step supplies both apps.

Navbar doodles render at 24px (previously 20px), hero/verification actions at
28px (previously 24px), process labels at 32px and preparation panels at 36px.
Hero feature icons are 24px and the trust accent is 20px. Small
menu controls remain unchanged. Compact navbar actions retain 44px minimum
targets, with a grid and slightly tighter labels so both actions fit at 320px.

## Initial implementation verification

Before the later rose/size refinement, both protected optimized builds and TypeScript gates pass. Scoped repository
formatting and the SVG export check pass. All master/standalone/preview SVGs are
valid XML with native vector shapes and no script, embedded raster or foreignObject.
All 35 original V1 source hashes match.

Six live Chromium groups pass across both apps: 1440px/320px placements and symbol
rendering, unchanged accessible action names/destinations, no extra icon focus
stops, 44px actions and compact-menu bounds/Escape; all nine standalone files and
sprite/preview return HTTP 200; all symbols render at 20px/104px with inherited
navy/blue color. Zero page exceptions. The vector sheet, actual hero/buttons,
mobile menu, preparation panels and size/color proof were visually reviewed.
Both previews run the change; local only, no push/deployment. Evidence is in the
ignored `.local/v2-doodles/` folder.

## Larger rose-pink refinement

Jaycee requested slightly larger icons in pink or red, then highlighted the navbar
lock and heart-arrow. Selected rose-pink #b52c5c. Navbar icons are now 24px instead
of 20px, hero/verification action icons 28px instead of 24px, process icons 32px
and preparation icons 36px. Hero features are 24px, and the trust accent 20px.
Only the doodles change color; existing text and pale-blue glass buttons retain
their colors. The component's --doodle-ink fallback and individual SVG exports
now default to rose; the vector contact sheet uses matching rose accents.

Both protected builds/types, scoped formatting and SVG export checks pass. Four
targeted live Chromium groups pass across both apps at 1440/320px: actual rose
ink and larger sizes, native symbols, 44px targets, navbar/hero action bounds,
non-overlapping process labels/counters and refreshed rose SVG deliveries.
Zero page exceptions; 35 original V1 source hashes match. Desktop/mobile
screenshots visually reviewed; both previews updated. Evidence:
.local/v2-doodles-rose/. Local only, no push/deployment.

## Leading icon placement

Jaycee requested icons always on the left. Button/link doodles now precede their
visible labels in the actual JSX: navbar Apply to join, both hero actions and
Verify your agent. Log in already led with its lock. Navbar dropdown/mobile link
arrows also precede labels, with left-aligned row grouping. The V2 component
README records this rule for future edits. Existing rose color/sizes and blue
glass fills remain.

Both protected builds/types and scoped formatting pass. Four live Chromium
groups on both apps at 1440/320px verify the actual DOM and rendered left-to-right
order, accessible names/destinations, 44px targets, narrow-screen bounds and menu
Escape dismissal. Zero page exceptions; all 35 original V1 hashes match. Desktop
and mobile screenshots reviewed, both previews updated. Evidence:
.local/v2-icons-left/. Local only, no push/deployment.

## Match icons to the action

Jaycee highlighted the heart-arrow on Apply to join and said some icons did not
fit their wording. Replaced it with an original form-and-pencil `application`
icon in both navbar variants and the hero. The wording/destination match the
actual enrollment form. The rest of the mapping was reviewed: phone for units,
lock for login, shield for verification, calendar for schedules, chat for support,
ID for requirements and wallet for payments. Complete & collect now uses an
original `package-check` instead of a gift, matching the unit handover context.

The master/typed component and SVG exports now include eleven symbols. Existing
artwork remains in the reusable pack. The vector contact sheet expands to four
rows so the two additions are fully visible. Rose ink, leading placement and the
current sizes remain in use. Component and asset READMEs record the semantic rule.

Both protected optimized builds/types, changed-TSX formatting and SVG export checks
pass. Six live Chromium groups across both apps verify 1440/320px button mapping,
labels/destinations, leading rose artwork, 24/28px application glyph bounds,
44px targets, mobile dismissal, checked-parcel placement, new SVG deliveries,
eleven master symbols and the expanded contact sheet. Zero page exceptions;
35 original V1 hashes match. Both new drawings and desktop/mobile screenshots
were visually reviewed. Both local previews run the update; no push/deployment.
Evidence: .local/v2-icon-meaning/.

## Filled coral-pink theme

Jaycee supplied a filled-icon reference and requested adding color inside the
previously outline-only artwork. All eleven symbols now have native silhouette
fill layers in coral-pink #ff5c7a, plum #6c143d outlines and pale-pink #ffe3eb
interior details. Small heart/pen/clasp details use the lighter fill. The original
outlines, action mappings, sizes and leading placement are preserved. This
supersedes the earlier monochrome rose theme.

The sprite supports --doodle-fill and --doodle-highlight alongside the existing
--doodle-ink/currentColor outline channel. Standalone exports resolve fill
variables to literal colors for vector-editor portability. The vector contact
sheet is updated. A versioned sprite URL refreshes cached external SVG resources
when the live component hot reloads. Assets were synced using the existing
landing sync helper.

Validation used the existing protected Webpack development preview at port 3001.
The eleven-icon contact sheet and actual 1440/320px page/menu screenshots were
visually reviewed. HTTP 200, plum ink, labels, current left placement, 44px action
heights and bounds were confirmed; no browser page exceptions. Export checks,
changed-file Prettier and native SVG markup checks pass; all 35 original V1 hashes
match. Evidence: .local/v2-doodle-fills/. No optimized rebuild was needed for
this visual iteration; the integrated preview remains its earlier optimized
snapshot. Source and the live landing are updated; no push or deployment.

## Pastel pink palette — 2026-11-02

Jaycee requested replacing the red-looking icons with pastel/pink to match the
light-blue page. Current palette: blush fill `#f3c5df`, muted lavender outlines
`#82678f`, and blush-white details `#fff1f8`. This supersedes coral/plum above.
Updated all eleven master symbols, component ink, standalone SVG exports and
contact sheet; versioned sprite URL `pastel-pink-1` refreshes browser caches.
Asset sync and hot reload update port 3001. All 32 rendered doodles use the new
ink/sprite version; live SVG HTTP200, mobile bounds, zero page exceptions,
export consistency and scoped formatting pass. Desktop/mobile screenshots in
`.local/v2-pastel-icons/`. Local only; no optimized rebuild for this color pass.

## Catalog inquiry arrow — 2026-11-05

Jaycee clarified that the catalog arrow should match the existing package and
shield doodles. The standard geometric arrow is superseded by an original
`arrow-up-right` symbol in the same native SVG family: pastel-pink silhouette,
lavender rounded outline and a solid pink face. Catalog links render it
through `DoodleIcon` at 32px on desktop and 28px on mobile, retaining 44px targets
and each device's accessible inquiry label and destination. The control stays
free of a filled circular background.

The master/typed family now has twelve symbols. Existing symbol artwork remains
unchanged. Regenerated the standalone arrow and vector contact sheet, synced the
landing assets, and changed the sprite cache version to `pastel-pink-arrow-2`.
The new drawing was compared beside `package-check` and `shield-heart`, then
reviewed in desktop/mobile product cards on both local previews.

Four live groups pass across ports 3000/3001 at 1440/320px: the branded symbol
renders with its correct palette and size, 44px targets and inquiry labels/URLs
remain, and no overflow or page errors occur. TypeScript, SVG export consistency,
scoped formatting and whitespace checks pass. Evidence and the three-icon style
comparison: `.local/catalog-doodle-arrow-20261105/`.

### Solid arrow fill correction

Jaycee rejected the first arrow and clarified that it looked hollow. Removed
its white inset and glint, filled the entire arrow pastel pink, and softened
the silhouette corners. The sprite cache is now `pastel-pink-arrow-2`. Existing
other icon drawings, catalog targets and destinations remain. Master/export
checks, scoped formatting and four live desktop/mobile renders pass; the new
fill was reviewed beside the package/shield and on the product card. Evidence:
`.local/catalog-doodle-arrow-20261105/filled-v2/`. User visual acceptance remains pending.


## Catalog inquiry heart — 2026-11-05

Jaycee rejected the arrow's appearance and requested a heart instead. Catalog
inquiry controls now use a solid pastel-pink `heart` in the same native family:
rounded lavender outline, slightly irregular lobes and no white center. This
supersedes all catalog arrow revisions above; `arrow-up-right` remains available
as an unused family symbol. The heart remains a link to the selected device's
inquiry, with the existing accessible name and 44px target. No favorite state
or extra action was introduced. Sizes stay 32px desktop/28px mobile. Fine-pointer
hover gives a small lift/scale; reduced motion stays static.

Added the thirteenth master/typed symbol, regenerated the standalone heart and
contact sheet, synced landing assets and bumped the sprite query to
`pastel-pink-heart-1`. The other twelve drawings are unchanged.

Six desktop/mobile viewport checks across ports3000/3001 pass at1440,390 and
320px: heart sprite/cache, artwork sizing,44px target, transparent surface,
keyboard focus and selected-device inquiry navigation. No overflow or browser
errors. Export consistency, scoped formatting and whitespace checks pass.
Evidence: `.local/catalog-heart-20261105/`. Local/uncommitted; no deployment.
