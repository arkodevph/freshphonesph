# Clients checklist and Public catalog — November 12, 2026

The Clients checklist now uses persistent field labels, a wider label field, multiline instructions and a natural-width action. Both COO administration disclosures have matching full-width rows. Public catalog now leads with filters and listings below the shell title: removed the duplicate title, decorative icon, category eyebrow and explanatory paragraphs. Add listing sits beside Refresh. Its editor retains labels, validation and publishing consequences without a repeated subtitle.

## Reference and comparison

Clients follows its existing Add client form, inspected in the actual preview. The supplied rejected screenshot showed three equal placeholder-only fields, an oversized submit action and mismatched disclosure widths. The adapted form uses an 880px maximum width, a 1:2 code/label row and stacked mobile fields. Existing palette and shared disclosure spring remain.

Public catalog follows the user's supplied screenshot `/tmp/codex-clipboard-n7epBe.png` and explicit request for minimal copy. The repeated header explained an already named page; the replacement uses the shell's single heading and existing controls. Compared before/after at 766px and inspected 1440/390/320px in both themes. Existing navigation, palette, filter labels and table remain; the table scrolls within its container on mobile. Publishing consequences remain beside Create/Save. Nami's standing minimal-copy rule now includes this correction.

## Verification

- Clients: collapsed/checklist-open/both-open at 1440/390/320px, both themes; equal disclosure widths and no page overflow. Settled submit button has 18px below it inside the panel. Early fixed-delay screenshots caught the spring mid-animation and are superseded by settled captures.
- Draft code/instructions survive collapse/reopen; label and checkbox survive reversal. Native Enter collapses and retains summary focus. Empty form fails validity with two required fields; no client or requirement submitted. Four rapid toggles return to the intended state. Shared velocity-preserving spring source was unchanged; separate 90ms samples reached endpoints and do not independently prove intermediate velocity.
- Native OS reduced-motion emulation is denied by the OpenCLI bridge. Scoped matchMedia override passes immediate close/open JS path and was restored afterward. Other engines, assistive technology and user acceptance remain unknown.
- Catalog: one h1, removed copy absent, search/filter/Add listing controls fit at all six viewport/theme combinations. Add listing editor opens/closes at all three widths, with labels and save consequence retained and footer within dialog bounds. No listing saved.
- 228/228 web tests pass; 10/10 focused tests from the preceding work also pass. Scoped formatting, whitespace check and optimized build/TypeScript pass. Browser error captures contain no messages.

## Preview and evidence

Final preview: `http://localhost:3000/system/catalog`, optimized build `bfXa1e7YPNBefiXqvlWNX` in `.next-preview-b`. Clients matrix ran on `ZJ-vyIetbTba-QkI3IQTF` in `.next-preview-a`; final build includes identical Clients source and a final smoke check.

Evidence is ignored locally under `.local/clients-checklist-20261112/` (brief, results, verification JSON, settled screenshots, test/build logs) and `.local/catalog-minimal-20261112/` (user rejection, before/after, responsive/editor screenshots, verification JSON, final Clients smoke, console capture and build log). Existing unrelated changes are preserved. No commit, push or deployment.
