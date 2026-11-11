# CEO assistant conversation navigation

Continues the Claude composition and Apple material reference documented in [90-ios-glass-chat.md](90-ios-glass-chat.md). The retained reference screenshots were inspected again for this pass. The narrow context rail, centered conversation, open assistant response and separate composer row remain the controlling composition.

The header now names the conversation from its first question rather than calling every thread a sales conversation. Long titles truncate visually while retaining their full text in a title attribute. The existing conversation entry in the context rail now returns to the first question. After a follow-up, a Latest question button returns to the newest exchange. Both navigation actions scroll the conversation viewport and honor reduced motion. They do not reset the draft or conversation.

The existing cool, low-saturation palette is retained: neutral light/dark surfaces carry content, blue indicates interaction, and translucent surfaces distinguish controls. New controls consume the existing text, glass, border and focus tokens. Labels communicate their purpose without relying on color. Mobile Latest question and New conversation controls are at least 44px tall; the mobile New conversation button is now 44px wide as well. The scripted-preview disclosure remains in the composer when the mobile header makes room for navigation.

## Verification

- Web TypeScript and changed-file Prettier pass; repository diff whitespace check passes.
- Local seeded Owner preview: submitted a sales question and an unsupported follow-up. The first-question control returns scrollTop to 0; Latest question reaches the last exchange (desktop scrollTop 739, clamped by the end of the content).
- Inspected desktop 1440×900 in both themes, mobile 375×812 and 320×568. No document horizontal overflow at these mobile widths. Composer bottom is 882px on desktop, 736px at 375×812, and 492px at 320×568. Its separate layout row remains above mobile navigation.
- Compared final captures with the retained Claude screenshot: context rail, centered message column, compact user bubble and docked composer remain consistent with the established reference. The added navigation stays in the header instead of consuming report space.
- Cleared-console interaction pass reports no console errors. Initial startup/authentication and development preload warnings occurred before the cleared pass.

Evidence: ignored `.local/ios-glass-chat/navigation/` plus `/tmp/fresh-ceo-{first,latest,mobile}.png`. This pass adds no live AI integration. Scripted sales figures remain sample data. No production build, commit or deployment. User visual acceptance and physical-display contrast remain unverified.
