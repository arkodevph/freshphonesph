# V2 color accent and background dots

Latest correction on 2026-11-03: Jaycee rejected dots clipped to letters/cards.
`Hero.module.css` now paints one 16px repeating blue dot field behind the hero
overlay, using a centered broad elliptical opacity mask to fade at the outer edges.
The whole overlay is textured, rather than a patch behind the text.
Headline and card texture were removed; pink accents remain. The inset-dot
implementation described below is historical and superseded.

On 2026-11-03 Jaycee requested dots inside colored letters and shapes rather
than an overlay, then supplied https://www.instagram.com/p/DfGEE7DIvjU/ as a
color reference. The 16.27-second niki.aroca / averlo.co reel demonstrates three
base-palette/accent reveals: sky blue + white + hot pink, midnight black +
electric blue + cantaloupe orange, and deep blue + white + bubblegum pink.
Its principle is one unexpected accent; the reel is not evidence of measured
conversion improvements. Its typography and stock site layouts are not copied.

Freshphones keeps the existing cloud hero and blue/white palette. Pink is
reserved for enrollment actions and the rotating device word. CSS variables
in `landing-v2.css` define #f28dcc action fill, #ffb1de hover, #a51b68 headline
ink and #741047 dots. The warm magenta accent separates actions from the cool
blue field; navy type keeps small button labels readable. These are adapted
project colors, not claimed exact source-video hex values.

`Hero.tsx` removes all four `Halftone` spans. Headline texture uses a repeating
5px radial-gradient clipped to actual glyphs; each animated word owns its
background so invisible words do not paint through a parent clip. Highlight
cards use 12px repeating dot backgrounds in their normal and glass fallback
fills. No mask span, opacity overlay or field behind the text remains. The
historical Halftone source files are unused by the hero.

Calculated sRGB contrast: navy #14266b on pink 6.22:1; header navy #102447 on
pink 6.93:1; hero navy on hover pink 8.29:1; magenta word on #c1e4f4 sky 5.30:1;
blue second line on sky 5.26:1. Card navy against the darkest dot color is 7.95:1.
These calculations cover the specified CSS colors; physical-display contrast
and all animated video pixels remain unmeasured.

Retained primary reference: `/home/nami/design-sources/instagram-DfGEE7DIvjU/`
contains `reference.mp4` (video and audio muxed from the viewed browser media),
`storyboard.jpg` (one frame per second) and source screenshots. Canonical design
analysis: Obsidian `04-Resources/Design Brain/Unexpected accent color - niki.aroca.md`.

Validation: landing TypeScript, changed-file formatting and scoped whitespace
checks; inspected desktop 1710x990 and mobile 390x844 screenshots; no horizontal
overflow or browser page errors. Root remains V2, and /v2 remains its preview.
No commit or deployment performed.
