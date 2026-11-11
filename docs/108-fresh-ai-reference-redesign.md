# Fresh AI workspace redesign

The user requested a better AI interface and fresh references via ui-design-index. Research used ui-design-index → ui-design-systems, Agent Reach Exa search, Jina page extraction and visual inspection of nine distinct Dribbble works. Source artwork is retained as local research evidence only; the product uses its own icons, copy and branding.

## Primary composition

[Corporate AI — Chat AI Dashboard, Iman Abdul](https://dribbble.com/shots/25912958-Corporate-AI-Chat-AI-Dashboard) controls the composition: narrow pale rail, framed white main workspace, slim header, centered brand symbol and question, wide rounded composer, and three understated suggestion tiles underneath. The Freshphones header stays in its existing shell. The reference's composer affordances for unsupported voice, uploads and deep research are replaced with the existing optional reporting-period control. No decorative asset is copied.

Fidelity map:

- Pale outer frame and narrow left rail → cool neutral frame, 216px conversation rail and inset white workspace.
- Compact header above an open canvas → Fresh AI identity and a neutral Guidance mode badge.
- Centered symbol and question → Freshphones blue Sparkle icon, 26–34px question and short secondary copy.
- Wide rounded composer → 720px content column, subtle border, clear focus outline and a blue send action.
- Three neutral cards in one row → payments, batch preparation and report guidance. Prompts reflect current capabilities, without asking for unavailable live sales or records.
- Active conversation → bounded reading column, right-aligned user messages, open assistant text, secondary Copy/Sources actions and composer dock.
- Mobile → remove rail, retain branded header and New conversation, stack suggestions, preserve composer access above the existing bottom navigation. Loading, errors and cancelled requests use the same hierarchy.

## Color and interaction

The reference's blue/neutral relationship fits the existing Freshphones palette. Use near-white #f5f6f8 for the frame, #ffffff for the canvas, #f7f8fa for neutral cards, #20242b for main text, #626b78 for secondary text and #245fbd for emphasis and focus. These low-saturation cool neutrals separate surfaces through lightness; the more saturated blue identifies actions without tinting status cards. Borders stay continuous and neutral. Dark equivalents use lifted charcoal surfaces and a lighter blue accent. State is also labeled in text; it never depends on color alone.

Use CSS transitions for hover/focus and a short message arrival. Reduced motion disables animation. No animation dependency or image asset is added. Copy uses the browser clipboard with success/error feedback; Stop aborts the request and keeps its question available to retry. New conversation aborts an in-flight request. Responses remain plain text.

## Reviewed alternatives

| Reference | Assessment |
| --- | --- |
| [Centra / Uxerflow](https://dribbble.com/shots/24987328-Centra-Chat-AI-Dashboard) | Good navigation discipline; the reviewed Explore screen emphasizes a catalog rather than a chat. |
| [Meya / Script](https://dribbble.com/shots/22883451-AI-Chat-Dashboard) | Clear centered welcome; extra right project rail is unnecessary for this scope. |
| [Mindora / BayFi](https://dribbble.com/shots/27532114-Mindora-AI-Chat-Dashboard) | Strong whitespace; oversized serif and decorative orb don't fit the product. |
| [CLYRA / Teja Salangka Dermawan](https://dribbble.com/shots/26498517-CLYRA-AI-Chat-Dashboard) | Legible cards; six capabilities, pink gradients and upgrade promotions are unsuitable here. |
| [Agent / Maciek Balasinski](https://dribbble.com/shots/25687049-Agent-Chat-Interface) | Useful sparse conversation state; attachment-heavy composer is not implemented here. |
| [Untitled UI / Jordan Hughes](https://dribbble.com/shots/25707321-AI-assistant-Untitled-UI) | Useful small-screen message hierarchy; floating widget isn't the main desktop composition. |
| [Charlotte / Potara](https://dribbble.com/shots/24542308-Charlotte-ChatBot-Dashboard-Home-Page) | Dashboard management surface, not focused chat; warm/lime palette rejected for this use. |
| [Raycall / Uxerflow](https://dribbble.com/shots/27601308-Raycall-AI-Dashboard-Chat) | Developer console density and dark/red styling are not appropriate for the owner workspace. |

Research files and visual board: `.local/fresh-ai-ui/` and `/tmp/fresh-ai-design-refs/`. Final verification evidence is recorded after browser testing.

## Visual comparison and checks

The inspected first viewport and `.local/fresh-ai-ui/reference-comparison.jpg` preserve the primary reference's rail/canvas proportions, centered blue brand marker, bounded composer and three-card rhythm. Freshphones retains its existing floating application header. The implementation replaces unsupported reference features with real controls and keeps explanatory text readable. Mobile suggestions use a compact vertical arrangement; short-height windows use safe centering so the top of overflowing content remains reachable.

The optimized web build and TypeScript validation pass, as do all 186 existing web tests. Browser verification covers suggestion selection, Enter/Shift+Enter, optional-period payloads, visible keyboard focus, Copy and source disclosure, loading, provider failure/retry, Stop, cancellation on New conversation, long-answer scrolling, light/dark themes, widths from 320 to 1440px and reduced motion. Mocked provider responses exercise error/cancellation states; a separate live OpenRouter request is displayed and captured in `live-conversation.png`. No new dependency is added.

Text contrast for the defined surface pairs: light primary 15.57:1, light secondary 5.08:1, blue action 6.09:1, dark primary 13.83:1, dark secondary 6.79:1 and dark accent 8.78:1. These are text-pair checks, not a claim of a complete accessibility audit. Final screenshots and machine-readable check results live in `.local/fresh-ai-ui/`.
