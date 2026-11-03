# Landing V2 rounded monospace font

## Current pairing — 2026-11-02 refinement

Jaycee subsequently requested keeping Nunito on V2's subtexts. Sono remains on
headings, navigation, brand wordmarks, action labels, prices and other explicit
display text. Supporting paragraphs, subtitles, descriptions, testimonials,
requirement lists, small print and field text use Nunito. The custom 404 uses
the same pairing. This supersedes the initial all-Sono body treatment below.
V1's source and Nunito typography remain unchanged.

The V2 root keeps display typography as its default, while body/display font
tokens are separate. Semantic body-copy elements use the Nunito token; explicit
`font-display` paragraphs keep their display role. Existing hero and loader
wordmarks now explicitly use the display token, and the requirements checklist
and 404 supporting labels explicitly use the body token. No copy, layout or
font weights were changed.

Both optimized builds/types and scoped formatting pass after this refinement.
Fourteen browser groups across both local apps verify actual Sono headings and
Nunito hero copy, section subtitles, requirement lists, FAQ answers/help,
testimonials, footer copy and 404 descriptions at 1440/1280/1024/390/320px.
Display text, navigation and prices retain Sono; currency rendering and V1
isolation pass. Zero page errors; all 35 original V1 source hashes match.
Desktop/mobile screenshots were visually reviewed. Both previews run the
pairing; evidence is in `.local/v2-subtext/`. Local only, no push/deployment.

## Original selection and baseline

Jaycee requested Diatype Rounded Mono with the
[Play the System reference](https://fontsinuse.com/uses/75656/play-the-system-parametric-approaches-in-grap)
on 2026-11-02. After checking the
[foundry](https://abcdinamo.com/typefaces/diatype-rounded) and finding no font
files in the project, Downloads or installed user fonts, Jaycee explicitly
selected **a free rounded-mono alternative**.

Compared two public open-source font projects and their source/docs/licenses:

| Option | Fit and reuse |
| --- | --- |
| [Sono](https://github.com/sursly/sono) | Soft rounded forms, variable 200–800 weights, explicit mono/proportional axis, SIL OFL 1.1. Selected for the closer visual fit and existing 800-weight headings. |
| [Sometype Mono](https://github.com/dharmatype/Sometype-Mono) | SIL OFL 1.1, monospace family intended for coding/tabular layouts. Suitable but less close to the requested soft rounded character. |

The selection is a design judgment, not a claim that either font duplicates
Diatype. The reference uses multiple Diatype styles; Jaycee's explicit
rounded-monospace direction controls this change.

Sono's full Google Fonts variable TTF was compressed to WOFF2, preserving its
glyphs, axes and outlines. The local file is 67,168 bytes, with its license,
source URL and source hash recorded in the V2 `fonts/` folder. Uses the installed
Next.js `next/font/local` convention with display swap; no new package or
runtime third-party font request.

`typography.module.css` scopes body, display and sans font tokens to the V2
wrapper and custom 404, with `MONO` explicitly set to 1. Existing font weights
remain. Nunito/system fallback supplies missing glyphs, including the Philippine
peso sign absent from Sono. The original root layouts and V1 font tokens remain
unchanged; shared enrollment, support and other destination pages retain their
existing typography.

Review criteria: actual downloaded font use (not just the CSS family name),
monospaced metrics, working currency symbols, navigation/hero/footer fit at
1440/1280/390/320px, readable 404, and V1 still rendering Nunito. Use the existing
responsive layout; adjust V2-only fit rules only if browser inspection finds a
real wrapping or overlap problem.

Validation completed locally on 2026-11-02: both protected optimized builds and
their TypeScript checks pass; scoped Prettier passes. Fourteen live browser
groups across both apps verify real custom Sono glyph rendering through browser
font inspection, equal-width mono metrics, body/display inheritance, original
800-weight headings, local HTTP-200 font responses, and working peso fallback.
Navigation fits at 1440/1280/1024/390/320px; mobile menu and V2 section links work.
The custom 404 renders Sono at 1440/390/320px; V1 still renders actual Nunito.
Zero page errors, and all 35 original V1 source hashes match. Desktop/mobile
hero, footer and 404 screenshots were visually reviewed. No layout changes
were required. The WOFF2 preserves source glyph mappings, outlines and axes.
Both previews are running; evidence is ignored under `.local/v2-font/`.
Local only, no push or deployment.
