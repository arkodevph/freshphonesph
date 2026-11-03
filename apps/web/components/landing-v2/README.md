# Landing page V2

Independent starting copy of the current landing page, created on 2026-11-02 at
Jaycee's request. The visual redesign will be directed in subsequent changes.

- Current version: `/` on both the integrated site and standalone landing app.
- V2: `/v2` on both apps. Both routes render this same V2 implementation.
- Edit presentation components and CSS in this folder to work on V2. Original
  components and `apps/web/app/landing.css` continue to serve the current page.
- `landing-v2.css` scopes every selector to `[data-landing-version="2"]` and uses
  separate animation names. The copied CSS Modules are independent too.
- Navigation to homepage sections stays on `/v2`; enrollment, inquiries, login,
  support and other existing destination pages remain connected.
- Brand assets, global design tokens and API/catalog helpers are shared.
  Add new V2 assets under a separate path rather than overwriting existing ones.
- V2 pairs locally hosted Sono for headings/navigation/actions with Nunito for
  supporting paragraphs, descriptions, quotes, requirements and input text.
  `font.ts` and `typography.module.css` scope the pairing, including the custom 404. Explicit `font-display` paragraphs (prices and author names) keep Sono.
  V1 retains Nunito. Font provenance/license is in `fonts/`.
- The V2 route has its own title and asks search engines not to index it.
- `StoryDoodles` adds floating pastel SVG accents to the three unnumbered
  phone-story beats. Their text, doodles, schedule chips and CTA sit behind
  the transparent scroll canvas so the mascot/phone stay in front. The vertical
  Scroll story marker is removed. Smaller screens use a compact doodle strip;
  reduced motion uses static rows. Direct preview: `/v2#phone-story`. See guide87.
- `DoodleIcon` supplies the original rounded/heart SVG artwork for V2 buttons
  and selected details. Master, standalone SVGs and vector preview are in
  `public/brand/v2/doodles/`; see that folder's README and guide86.
  Place button/link doodles before their visible labels in JSX so they stay
  on the left at every screen size, as requested by Jaycee.
  Match the drawing to the action: `application` for Apply to join and
  `package-check` for Complete & collect; keep decorative style subordinate to meaning.
- The decorative cloud divider is omitted in V2. The hero flows directly into
  the existing phone story; its two calls to action use matching glass surfaces.
- Explore links use calendar/job-badge/chat doodles on the left, including
  their mobile equivalents. The desktop panel drops in over 340ms and folds
  up over 220ms, with staggered rows and reversible animation. Escape/outside
  dismissal, keyboard focus, reduced motion and native no-JS details remain.
- Header Log in/Apply and both hero actions have stronger hover feedback:
  5–6px lift, slight enlargement, brighter glass/rim glow, tilted doodles and
  a press-down state. Hover movement requires a fine pointer; reduced-motion
  settings suppress button/icon movement. Scoped to these V2 CSS Modules.
- Halftones are limited to the opening hero: evenly tiled dots behind its copy
  and stronger dots without fading inside the three highlights. Mobile cards
  share aligned edges. The remaining sections have no halftone treatment.
- The agent-verification section continues a light-blue sky into the V2 nature
  footer, using matching sky colors at their shared edge. The original grassy
  hills, cyan lake and clouds show at full color below a top-only blend, with
  no border or full-image white wash. Darker footer text keeps columns readable;
  mobile uses a full-cover landscape crop. Asset and
  built-in imagegen prompt: `public/brand/v2/footer/README.md`.
- The FAQ follows Smartway’s centered topic-card composition at a 90rem maximum
  width, with more compact heading/topic text. The split intro sits above four
  topic cards and a navy answer panel; search and a support prompt sit in the
  utility row below. Six answers, paging, keyboard navigation and native no-JS
  disclosures remain. This supersedes the earlier edge-wide variant. Reference:
  `Smartway Finance v2/dist/faq-topics.css` and `faq-topics.js` (read-only).
- `NotFoundPage` and its CSS Module supply the shared custom 404 for both apps.
  Missing URLs (for example `/v`) offer recovery to `/v2`, units and support.
  The root `not-found.tsx` files also re-export the component's error metadata.

Local preview: <http://localhost:3001/v2> runs protected Webpack development
mode for live visual updates. <http://localhost:3000/v2> is the integrated
optimized preview and requires a rebuild for source changes, as described in
the root README.
