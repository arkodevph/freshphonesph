# Public FAQ search by topic

Implemented locally on `feature/reports-page`, 2026-10-08, for scope §4's requirement
to search common questions by topic. Open the landing page at `/#faq`.

## Behavior

The six existing questions are grouped under Getting started, Payments, Devices and
Delivery. **All topics** shows the complete collection. Search matches question text,
answer text, topic names and a small set of alternate terms such as “preowned”. Words
are case-insensitive, tolerate accents/punctuation and must all match the same entry.
A selected topic and search query apply together; results retain their original order.

The screen announces the result count, explains an empty result and provides **Clear
filters** / **Show all questions** to restore the full collection and focus the search
field. Search input is limited to 100 characters. Filters stay in the current page's
memory and work without further network requests once the page is loaded.

Question buttons use stable IDs, `aria-expanded` and `aria-controls`; collapsed answers
are hidden from the accessibility tree. Enter/Space operate the accordion, and topic
buttons expose their selected state with `aria-pressed`. Changing either filter closes
the previous answer, so a different result never inherits its expanded state. Topic
buttons wrap on narrow screens and keyboard focus remains visible.

## Content and scope

Content is maintained in `apps/web/lib/faq.ts`; the UI is `components/Faq.tsx` with a
local CSS module. Five existing answers are preserved. The payment answer now directs
visitors to the offer's saved sample terms and external payment channels, replacing the
older calendar “15 & 30” promise that conflicted with the current fixed-day schedules.
Search aliases are not additional offers or business promises.

This increment adds no API route, staff CMS, account permission, database migration,
search logging or authentication dependency. The existing contact section remains the
destination for further questions in this increment. The subsequent
[public support entry](46-public-support-entry.md) connects FAQ help to `/support`.
Business approval of FAQ claims and public wording remains pending.

## Verification

`apps/web/test/faq.test.ts` covers answer/topic matching, mixed case, spacing and
punctuation, alternate terms, combined filters, multiword matching, reset order and
empty/unrecognized input. The existing web test suite also runs for regression coverage.

All **48 web tests** pass. The Next.js production build, including TypeScript checking,
passes. Four browser check groups pass against that build: combined filters and keyboard
accordion semantics; answer search, empty/reset states and focus return; desktop and
390px/320px layouts; offline filtering and literal/unrecognized input. No page errors were
reported. API regression tests were not rerun for this browser-only increment.
