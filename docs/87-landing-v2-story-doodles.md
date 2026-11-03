# Unnumbered phone story with floating doodles

Jaycee highlighted “01 · Choose your unit,” supplied a reference with tilted
illustrations floating around headline text, and clarified removing all step
numbering in that section. Both numbered prefixes are removed: Choose your unit
and Pick your rhythm now appear without counters. The existing payment schedule
labels retain their actual values.

## Composition and behavior

The supplied floating-money screenshot is the primary composition reference:
rotated drawings, varied scale and open space around the copy. Fresh Phones uses
the current rose-pink SVG family and context-appropriate motifs rather than
copying the reference's money artwork or color palette.

- Choose your unit: phone, shield and chat doodles.
- Pick your rhythm: calendar, wallet and phone doodles.
- Finale: checked parcel, phone and shield doodles.

Each group belongs to its existing story beat, so it appears and fades with the
same scroll progress as its copy. Desktop drawings sit around the copy at
64/56/48px with slight rotation and gentle CSS drift. At widths below 1024px,
44/36/40px drawings occupy a compact strip above the copy. Reduced motion uses
static 56px rows in the readable, existing linear story layout.

All decoration is aria-hidden, non-focusable and ignores pointer events. It does
not become a new navigation choice. This follows [W3C decorative-image guidance](https://www.w3.org/WAI/tutorials/images/decorative/):
adjacent copy already conveys the meaning. Motion and illustrations are style
choices; no effect on task performance or conversion has been established.

The story's View Available Units action now has a leading phone doodle, following
Jaycee's placement rule and matching its destination. The new phone-story ID
provides a direct local review anchor at `/v2#phone-story`.

## Implementation

`StoryDoodles.tsx` and its CSS Module own the decoration. `ScrollPhoneStory.tsx`
removes the prefixes and attaches each group to the existing beat. The canvas,
frame loading, easing, progress calculations and schedule choices are preserved.
Existing SVG symbols are reused; no new asset, dependency, API or database work.
The original V1 implementation remains separate.

## Validation

Both final protected optimized builds/types and changed-file formatting pass.
All 23 live Chromium groups pass: all three normal-motion stages at
1440/1024/320px on both apps, correct scroll visibility, loaded SVGs, no clipping
or copy overlap, unnumbered labels and catalogue navigation; both reduced-motion
layouts at 1440/320px; and no-JavaScript reduced-motion copy/decorations. Zero
page exceptions. All 35 original V1 source hashes match.

Normal-motion desktop/mobile stages and the static mobile layout were visually
reviewed. Both local previews run the update. Final build logs are
landing-final-build.log and web-final-build.log in the ignored
.local/v2-story-doodles/ folder, alongside screenshots and browser-results.json.
No push or deployment.
