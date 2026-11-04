# Public landing page

V2 is the sole public landing implementation at `/` in both apps. Components
live directly in `apps/web/components/`; the original landing implementation
and its stylesheet have been removed. `/v2` permanently redirects to `/`.
The portal catalog has its own `PortalCatalog` component and styles.

- V2 pairs locally hosted Sono for headings/navigation/actions with Nunito for
  supporting paragraphs, descriptions, quotes, requirements and input text.
  `font.ts` and `typography.module.css` scope the pairing, including the custom 404. Explicit `font-display` paragraphs (prices and author names) keep Sono.
  Font provenance/license is in `fonts/`.
- The V2 route has its own title and asks search engines not to index it.
- `StoryDoodles` adds floating pastel SVG accents to the three unnumbered
  phone-story beats. Their text, doodles, schedule chips and CTA sit behind
  the transparent scroll canvas so the mascot/phone stay in front. The vertical
  Scroll story marker is removed. Smaller screens use a compact doodle strip;
  reduced motion uses static rows. Direct preview: `/#phone-story`. See guide87.
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
- Hero dots cover the left 30% of the background with a soft radial fade.
  Below 960px the dots stop above the mascot. Headline letters and highlight cards have clean
  solid fills. This supersedes the earlier inset texture following Jaycee's
  correction on 2026-11-03; no dots are clipped into letters or card outlines.
- The blue/white base uses one pink accent family for enrollment actions and the
  rotating device word. Source: niki.aroca / averlo.co Instagram reel
  `https://www.instagram.com/p/DfGEE7DIvjU/`. Analysis, full local video and
  storyboard are retained in the Obsidian Design Brain; implementation guide:
  `docs/92-landing-v2-accent-and-inset-dots.md`.
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
  Missing URLs (for example `/v`) offer recovery to `/`, units and support.
  The root `not-found.tsx` files also re-export the component's error metadata.

Local landing preview: <http://localhost:3001/>. The integrated site and login
run at <http://localhost:3000/>. Both use the same public components.

- The agent-verification card uses reference-led clear glass with an edge
  displacement map, bright curved rim and sharp navy text over a shared landscape
  backdrop. Reduced transparency and missing blur have opaque fallbacks. The
  first gradient-card attempt was rejected. See guide94 and retained references.
- FAQ topics expand/collapse with coordinated 560ms size, radius and text
  transitions; answer paging uses a 440ms reveal. Reduced motion is supported.
