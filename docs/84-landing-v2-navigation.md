# Landing V2 navigation — 2026-11-02

Jaycee requested simplifying the crowded V2 navigation using his supplied
Smartway Finance screenshot. The screenshot is the primary visual reference.
The change is confined to the V2 presentation shared by both local apps.

## Behavior and design

Visitor flow: browse Units, learn About the business, or Inquire; apply through
the brighter frosted-glass primary action. Existing customers use the quieter Log in link.
Explore contains How it works, Careers and Support. The logo returns home.
On compact screens a single navigation disclosure contains the same links and
both actions. These task priorities are design assumptions based on the existing
site and Jaycee's reference, not visitor analytics.

The user-expi → ui-design-index landing route supplies three patterns:
floating centered pill, direct primary links with a secondary disclosure, and
one visually dominant action. No separate ui-landing-patterns package is
installed; the supplied screenshot and local Smartway navigation implementation
provide the concrete composition.

**Current direction after Jaycee's top-state correction:** the desktop header
starts expanded to 1280px with a fully transparent background, like the second
Smartway screenshot. It contracts to a centered 960px frosted pill after roughly
80px of scroll, and expands again at the top. Dark blue text suits the lighter
Fresh Phones hero. A light blue translucent surface, backdrop blur, white border
and inset highlight replace the previous solid navy. Log in, Apply to join, the
compact toggle and both navigation panels use compatible frosted treatments.
After Jaycee requested more transparency and light-blue buttons, the pill tint
is 24% with 16px blur (previously 76%/24px). Buttons use translucent light-blue
fills, with a brighter Apply action and blue hover states. Softer borders and
highlights replace the earlier milky appearance. Sono labels and the existing logo remain.
At 1024px and above four navigation choices remain visible; smaller layouts
use a native disclosure. The earlier permanent navy pill and solid white button
were superseded by Jaycee's explicit correction and glass request.

The scroll marker uses IntersectionObserver; it handles restored/hash scroll
positions without a per-frame scroll listener. Width/background transitions stop
under reduced-motion preferences. Browsers without backdrop-filter receive solid
light fallback surfaces. Existing menus, destinations and V1 are preserved.

## Evidence ledger and limits

| Basis                                | Evidence, confidence and boundary                                                                                                                                                                                                                                                 | Design implication / falsification                                                                                                                                                                                 |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Grouping and disclosure              | [W3C APG disclosure navigation](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/) provides strong implementation guidance for ordinary site links, native controls and Escape dismissal; it is not a conversion experiment.                    | Ordinary links remain in lists; native details/summary work without JavaScript. JavaScript adds outside/focus-leave/Escape dismissal and focus restoration. Reject if keyboard users cannot reach any destination. |
| Comfortable target acquisition       | [WCAG 2.2 target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) is a strong accessibility baseline, not evidence for a universal ideal button size.                                                                                         | Use 44px minimum control/link heights, visible focus and responsive spacing. Reject if controls overlap or are clipped at narrow widths or zoom.                                                                   |
| Correction to choice-overload claims | [Scheibehenne, Greifeneder & Todd (2010)](https://scheibehenne.de/ScheibehenneGreifenederTodd2010.pdf) synthesized 50 experiments / 5,036 participants and found substantial variation with a near-zero average effect. Contextual evidence, not a study of this site's visitors. | Four visible choices are a composition decision, not a psychological maximum. Preserve the other destinations one level away. Revisit if visitors struggle to find Support, Careers or How it works.               |

## Implementation and validation

Navbar.tsx and Navbar.module.css own the V2 header. LandingPage.tsx renders the
same shared component in both apps. No new package, API, database or asset change.

The earlier permanent-pill pass passed both protected builds/types and 22 browser
groups; its evidence remains under .local/v2-navbar/. The current correction's
build logs and top/scrolled screenshots are under .local/v2-navbar-glass/.

## Glass-specific evidence and validation

[MDN backdrop-filter documentation](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter)
explains why the surface needs partial transparency for background blur to show.
[W3C contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
sets the readability constraint: blur is decorative and does not itself establish
contrast. The design therefore uses dark text over a pale glass tint and retains
opaque fallback surfaces. This is implementation guidance, not a claim that
glass improves visitor behavior or conversion.

**Earlier top/scroll implementation verification, before the color-only refinement:**
Both protected optimized builds and TypeScript gates passed, along with scoped
repository formatting. All 26 live browser groups passed across both apps at
1665/1440/1300/1024/768/390/320px: fully transparent expanded top, contraction and
glass on scroll, return to the top, restored/hash reload state, non-overlapping
controls and 44px targets, glass buttons, keyboard menus and Escape/focus return,
outside/focus dismissal, short mobile menu scrolling, breakpoint dismissal,
section/login destinations, no-JavaScript navigation, reduced/normal motion and
dark preference. Zero browser page exceptions. All 35 original V1 source hashes
match. Top/scrolled desktop and mobile screenshots were visually reviewed.
Both local previews run the correction; no push or deployment. Visitor usability
and conversion effects have not been measured.

## More transparent glass and light-blue buttons

At Jaycee's follow-up request, reduced the scrolled navbar fill from 76% to 24%,
blur from 24px to 16px, and softened the white border/highlight and shadow. Apply
uses light-blue rgb(130 206 255 / 62%) with an 82% hover fill; Log in and the
mobile toggle use rgb(165 222 255 / 38%) with a 56% hover fill. Solid pale-blue
fallbacks remain for browsers without blur support. Only Navbar.module.css changed.

Both protected optimized builds/types and scoped formatting pass. Four targeted
browser groups pass across both apps at 1440px and 320px: actual tint/blur and
blue control colors, hover, dark text/44px targets, bounds, mobile Escape and
transparent-top/scrolled/return states. Desktop screenshots over the hero, Units
and How it works were visually reviewed; zero browser page exceptions. All 35
original V1 hashes match. Both previews are updated. This is a color/surface-only
refinement; the earlier 26-group behavior pass is historical verification of the
same navigation logic. Evidence: .local/v2-navbar-light-blue/. Local only.
