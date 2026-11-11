# Readable report totals

The November 9 screenshot showed eight 170px-minimum metric cards in one row.
The 28px peso values broke inside the decimal places because `overflow-wrap:
anywhere` allowed arbitrary line breaks.

Metric cards now have a 20rem preferred minimum, bounded by the available width.
The totals form four columns at the reviewed desktop width and fewer columns as
space narrows. Values remain on one line with tabular numerals; labels and notes
can wrap normally. Existing mobile single-column behavior and theme tokens stay
in use. No report calculation, currency formatting or financial data changed.

Reference: the retained 17Seven financial dashboard artwork listed in
`docs/96-reports-design-reference.md`, reopened locally for its readable metric
spacing. The user's November 9 screenshot is the negative example: decimal
places broken onto a second line.

## Verification

Protected optimized build and TypeScript checks passed. Running preview: http://localhost:3000, build DCI_ifQNtU-mh5WCdOth0 in .next-preview-a. Browser checks cover all motion stages, page navigation, mobile Skip, Escape, reduced motion and no page errors. Measured cloud-layer opacity jump changed from 1 to 0. Report values fit at 1720, 1280, 768, 390 and 320px; light/dark screenshots are retained in .local/cloud-reports-20261109. Four existing web test files, scoped formatting and whitespace checks passed. User acceptance and production behavior remain unverified.
