# V2 hero halftone accents

Current scope after Jaycee’s correction: **only the opening V2 hero**. Dots
spread evenly behind its full text block; the three highlight cards use larger,
stronger dots with no fade. Mobile cards share aligned outer edges. All wiring
in other sections was removed; typography and glass buttons remain.

`Halftone` is an empty, hidden decorative span with no pointer events. CSS
radial-gradient masks repeat in a 14px grid behind the text and a 12px grid at
26% opacity inside cards. No added runtime animation or dependency.

This supersedes the initial wide oval and diagonal corner masks following
Jaycee’s request to spread the text dots and remove the fade on the cards.
The original SVG artwork and `scripts/art/generate-v2-halftone.mjs` remain as
unused earlier assets. Earlier research compared
[Dotfield](https://github.com/kemie/Dotfield) variable-radius SVG output with
[pattern.css](https://github.com/bansal/pattern.css) uniform CSS dots.

The latest treatment was checked in the live standalone preview at 1440/390px:
four decorative layers, all inside the hero, repeating masks and the expected
card opacity. Desktop/mobile screenshots: `.local/v2-halftone/spread-*.png`.
Port 3001 now uses the protected Webpack development command for live updates;
port 3000 remains an optimized preview and was not rebuilt for this CSS pass.
Earlier builds and 1440/390/320px scope/alignment checks passed for the previous
oval/corner treatment. Local only.
