# Claude-style conversation and iOS glass correction

The user rejected the earlier report-inside-a-panel layout, supplying a screenshot where the nested transcript clipped the report and the composer crowded the chart. The preceding docs/89 describes that superseded layout. This change fixes the chat composition and material treatment; it preserves the scripted sales response and the owner's reporting permissions.

## References and fidelity

Primary composition: Claude's message column and docked composer. Read [Claude's official conversation walkthrough](https://academy.claude.com/courses/claude-101/your-first-conversation-with-claude) and [getting started guidance](https://support.claude.com/en/articles/8114491-get-started-with-claude). The live claude.ai reference was behind a browser challenge, so visual inspection used the dated February 2025 conversation screenshot in [TestingCatalog's Claude article](https://www.testingcatalog.com/anthropics-claude-3-7-lets-users-control-ais-cognitive-effort-with-extended-thinking-mode/). It establishes the composition, not a claim to reproduce today's exact Claude UI. No account or third-party conversation was accessed.

Material reference: [Apple's official Liquid Glass design introduction](https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/) and [Materials guidance](https://developer.apple.com/design/human-interface-guidelines/materials). Inspected the official cross-platform image. Glass applies to the sidebar, composer and small controls; report data stays on more opaque surfaces. CSS blur is a web approximation, not native optical refraction.

Fidelity map: narrow navigation rail; full-height chat surface; an approximately 820px centered thread; right-aligned compact user bubbles; open assistant response; one chat-wide scroll viewport; separate dock row of the same width; controls below the input. Removed the enclosing dashboard card and fixed pixel-height report region. The scrollbar is at the chat viewport edge, not squeezed beside the sales report. The composer occupies its own layout row and does not cover the transcript.

Palette: cool, low-saturation blue/lilac base provides a restrained backdrop for glass. Light material blends white into the canvas; dark material blends slate into navy-charcoal. Brightness and opacity distinguish controls from content. Blue remains the action/data emphasis. Text stays neutral and the charts retain explicit PHP labels. Thin continuous edges and diffuse shadows indicate layers without colored card edges.

## Implementation

- Assistant-only shell class removes the surrounding dashboard padding and outer page scroller.
- Replaced accumulated assistant CSS height overrides with a full-height grid/flex layout. The message viewport is the only vertical conversation scroller; the composer is a separate grid row. Report cards have no internal vertical scrollbar.
- Updated type to readable 15–16px conversational text, expanded the report column and removed its outer card. Supporting metrics/chart use neutral rounded panels.
- Sidebar and composer use translucent material, backdrop blur/saturation and restrained inset lighting; input auto-grows to 144px. Follow-ups scroll to the latest exchange smoothly; reduced motion uses immediate scrolling.
- Device disclosure uses a 0fr-to-1fr grid transition and hides collapsed contents from keyboard/assistive technology with inert/aria-hidden.
- Mobile hides the redundant context rail, retains New conversation in the header, and keeps the composer above bottom navigation. Short screens use a compact control row. Prompt selection scrolls the composer into view.
- Reduced-transparency and missing-backdrop-filter fallbacks use opaque surfaces. Reduced-motion disables reveal, bar growth, control and disclosure transitions.

Sources: `apps/web/app/system/{layout.tsx,ceo-portal.module.css,CeoAssistant.tsx,useCeoAssistant.ts,CeoSalesSummary.tsx,ceo-assistant.module.css}`. Reference images and inspected renders are retained in ignored `.local/ios-glass-chat/`.

## Verification

At 1726×990 (matching the supplied browser content dimensions), thread viewport height is 657px, its bottom is y=801, and composer starts at y=815: a 14px separation, no overlap. Composer ends at y=972, inside the viewport. The message row and composer both occupy the same 820px column including the assistant mark gutter. Shell content is overflow-hidden; only the thread scrolls vertically. Expanded chart/device table are reachable by scrolling that viewport.

Verified two consecutive sales questions, focus remaining in the input, smooth follow-up scrolling, sales disclosure and mobile New conversation. At 375×812 the thread is 447.5px high and composer ends at y=736, above navigation; at 320×568 composer ends at y=492 and the thread remains usable. Document horizontal overflow is absent at desktop, 768px, 375px and 320px.

Reduced-motion/transparency emulation: both preferences match; composer backdrop becomes none and report/bar animation names become none. A cleared-console navigation and scripted-response pass has no runtime errors. Web TypeScript, changed-file Prettier and scoped diff whitespace checks pass. Light rendered input background sampled from screenshot is RGB(250,252,254), with computed placeholder/text contrast 5.48:1 / 15.14:1. Dark rendered input background is RGB(36,42,58), giving placeholder/text contrast 6.03:1 / 12.79:1. Physical display calibration remains unverified.

No live AI integration, production build, commit or deployment. Fixed sample sales figures are unchanged.
