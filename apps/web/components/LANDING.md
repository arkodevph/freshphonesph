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
  Catalog inquiry links use the solid pastel-pink `heart`, following Jaycee's
  correction of the earlier arrow; each still opens the selected device inquiry.
  Hover fills the entire catalog heart, including its outline, red; leaving
  restores the pastel-pink/lavender colors.
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
- Public icon buttons and links share one brief 520ms shake from
  `landing-v2.css`, using small rotation/translation offsets over their existing
  hover pose. Doodle SVGs participate automatically; other action icons use
  `data-button-icon` (support phone/socials, About Messenger and footer actions).
  The shake requires a fine pointer and normal motion; it does not loop while
  hovered. Disabled controls stay still, and standard menu carets are preserved.
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
- `/enroll` and retained `/v2/enroll` follow Smartway's multi-step application
  composition: a centered intro, rounded card, numbered progress bars, paired
  contact fields, editable review and pill actions. The page reuses the cloud
  artwork and footer sky base, with Fresh Phones' own pastel doodles. Public
  questions remain staff-editable; the middle step is skipped when none exist.
  Back/Edit preserve answers, errors focus the right stage, and Enter advances
  early stages. Final consent, intake submission, retries and updated-form
  review still use the existing enrollment contract and hook.
  Desktop contact/review rows use three columns and text questions share a row;
  tighter card spacing and a shorter heading on low-height desktop viewports
  keep the current form's main action visible. Inputs remain 16px and longer
  published forms or phone layouts scroll naturally.
- `NotFoundPage` and its CSS Module supply the shared custom 404 for both apps.
  Missing URLs (for example `/v`) offer recovery to `/`, units and support.
  The root `not-found.tsx` files also re-export the component's error metadata.

Local landing preview: <http://localhost:3001/>. The integrated site and login
run at <http://localhost:3000/>. Both use the same public components.

- Public navbar, footer, FAQ, application, support and legal links use
  `PublicNavigationLink` and the shared `PublicNavigationLoader` in both root
  layouts. Four large edge circles form a ring, circle once, then merge into a
  gradient cloud. The cloud waits for the destination to commit before shrinking
  into its measured logo as the page appears. Pages without a visible logo use
  a short fade. Public browser back/forward uses the same transition; homepage
  returns skip a duplicate opening intro, including after an animation is skipped.
  Same-page anchors, already selected pages and modified/new-tab clicks retain
  their normal behavior. Cross-origin links keep native navigation.
- Initial homepage loading shares the four-circle sequence (about 3.6 seconds
  after hydration). Skip intro/Skip animation, Escape, reduced motion and
  interrupted playback release the page. No JavaScript keeps native navigation.
  Failed page transitions recover within 15 seconds; new destination content
  stays inert only while the optional animation is visible.

- About's agent verification uses a centered Sono heading with a solid rose
  accent, a larger frosted lookup panel, and a lilac panel with four distinct
  benefits. Asymmetric rounded corners and shared pastel doodles match the
  preparation cards. The labeled 16px search field, glass capsule action,
  privacy note and expanding status/error feedback stack naturally on phones.
  The retained `/v2/verify` page shares the same lookup form. Reduced
  transparency and missing blur have opaque fallbacks.
- FAQ topics expand/collapse with coordinated 560ms size, radius and text
  transitions; answer paging uses a 440ms reveal. Reduced motion is supported.

## Local refinements retained during the November 4 merge

The November 4 transition correction restores the shared `--landing-sky`
background across the story, units, process/reviews, preparation and FAQ.
Decorative story clouds fade before the catalog boundary. Verification and the
footer share one landscape with a sky-blue top fade; the verification wrapper
allows the glass-card shadow to extend naturally across the footer boundary.

The promoted shared components retain local catalog clouds, pastel product
platforms and studio lighting; process clouds; review readability and the glass
Facebook link; the lilac payments panel and peeking mascot; and the wider frosted
footer. The incoming FAQ motion, mobile catalog, portal catalog separation and
continuous verification/footer landscape remain.

The requirements/payment cards follow Jaycee's Huntly reference with asymmetric
outer corners, a slight desktop rotation and overlap, and raised hover states.
The existing white/lilac fills, pastel icons, copy and sky remain; the mascot
moves with the payment card. Mobile cards stack without transforms. Reduced
motion removes the stagger and movement; animated hover requires a fine pointer.
These remain informational articles without added button semantics or tab stops.

About's four promises use shared `AboutPromises` markup on canonical and retained
routes. It adapts Smartway V2's click-to-expand story cards: the first card starts
wide, selection trades the 2.12fr column over 650ms, and all desktop explanations
stay visible. Below 1200px it becomes a single-open accordion. Native title
buttons support Enter/Space, arrow keys, Home/End and visible focus; reduced
motion switches immediately, and no JavaScript leaves all copy readable.
Existing colors and words remain; geometric decoration sits above the copy.
The bottom artwork uses the shared pastel `shield-heart`, `chat-heart`,
`application` and `phone-heart` doodles at 64px. The cards have no number counters.

The existing secondary `/v2/...` pages reuse `PublicPageShell` from this directory
and keep their form queries, privacy links and noindex metadata. Canonical header
and homepage links use the promoted routes at `/`; `/v2` redirects to `/`.
