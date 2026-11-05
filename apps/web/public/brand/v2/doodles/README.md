# Fresh Phones doodles

Thirteen original SVG illustrations authored for Jaycee's Fresh Phones V2 request,
beginning 2026-11-02. The catalog arrow was added on 2026-11-05 to match the
existing package and shield drawings, then superseded for catalog inquiries by
a filled heart later that day. The supplied icon sheets inform the rounded,
slightly irregular linework and heart accents. These are newly drawn phone/business motifs; no
reference artwork or upstream icon paths were traced or copied.

`icons.svg` is the master: thirteen symbols on a 40 × 40 grid, with rounded caps/joins,
roughly 3.2-unit outlines and slightly lighter interior details. All outlines use
`currentColor`; separate native fill paths color the silhouettes. There is no
raster image, font dependency, script or filter effect.

Use `DoodleIcon` from `apps/web/components/` to render a named symbol:

```tsx
<DoodleIcon name="phone-heart" size={24} />
```

The current palette is pastel-pink fill (`#f3c5df`), muted lavender outlines
(`#82678f`) and blush-white detail (`#fff1f8`), matching the light-blue V2 page
at Jaycee's request. This supersedes the saturated coral/plum palette. Set
`--doodle-fill`, `--doodle-ink` and `--doodle-highlight` to retheme live icons;
`style={{ color: "…" }}` also changes the outline. Icons beside text are decorative and hidden from assistive technology;
keep the visible action label. Standard menu, close and chevron controls retain
their familiar existing glyphs.

Available names: `phone-heart`, `join-heart`, `lock-heart`, `calendar-heart`,
`chat-heart`, `shield-heart`, `id-heart`, `wallet-heart`, `gift`, `application`,
`package-check`, `arrow-up-right`, `heart`.

Catalog inquiry links now use `heart`: a solid pastel-pink heart with the
family's rounded lavender outline. This supersedes the arrow following Jaycee's
2026-11-05 correction. The action still opens the selected device's inquiry;
it is not a favorite toggle. The arrow remains available elsewhere.
The sprite cache version is `pastel-pink-heart-1`; existing symbol artwork is unchanged.

Choose artwork that matches the adjacent action: Apply to join uses `application`
(form and pencil), and Complete & collect uses `package-check`. The original
heart-arrow and gift drawings remain available for other suitable contexts.
Individual SVGs use literal fill colors for vector-editor compatibility. Change
the root `color` attribute for outlines and the path `fill` values for interiors.
`preview.svg` is a complete
vector contact sheet with no external dependencies.

After editing the master, regenerate the files from the repository root:

```sh
python3 scripts/export-landing-doodles.py
python3 scripts/export-landing-doodles.py --check
```

The standalone landing app's existing asset sync copies these files from
`apps/web/public`; do not maintain a second source there. The artwork stays
scoped to V2 and is not automatically published.
