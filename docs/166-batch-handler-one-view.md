# Baker: Fresh Phones handler overview, 2026-11-25

User request: show the table fields in one view and redesign the dashboard using real references.

Primary visual reference: Linear My Issues, https://linear.app/docs/my-issues (live page inspected through OpenCLI, screenshot /tmp/baker-linear-myissues.png; original product image /tmp/baker-one-view/linear-my-issues.png). Publication date unknown; the embedded product image is evidence of the documented composition, not a verified authenticated current Linear build. Secondary: https://linear.app/docs/projects for stacked entity properties. Dribbble adapter search failed with selector drift; it did not inform the direction.

Observed grammar: dark neutral shell; muted group headers with compact counts; thin separators; quiet neutral selected navigation; colored status icons adjacent to text. Estimated product reference row height 40px, sidebar 200px, 12–16px row insets; estimates from embedded image, not live computed dimensions. Adaptation: retain Fresh Phones theme tokens and blue brand action; wrap long financial identities rather than truncating; use taller two/three-line rows to preserve readable fields. No gradient frame from the documentation illustration; it has no operational purpose.

Negative example: user's supplied payment/batch screenshots. 1570px minimum batch table plus nested vertical scrolling cuts off status and actions and makes the reader pan across each record. Replacement: 100% fixed table layout, percentage columns, stacked related fields, visible actions, page-only vertical scrolling. Keep pagination, sorting, receipts and eligible actions. On narrow screens show labeled records, not a horizontally overflowing grid.

Dashboard: compact greeting/action row; four truthful assignment metrics; attention, review, and utility columns visible together on desktop. Existing claims/tasks remain real. Reduce oversized statement card; show four review claims with View all. At smaller sizes use two columns then one. Keep missing/error data distinct from zero and preserve existing refresh behavior.

Color: existing neutral surfaces separate canvas, header, rows; subdued text denotes secondary identities; blue is the action role; amber/green/red label payment states. Preserve both system themes. Color is accompanied by labels. No decorative selection borders.

Observable acceptance checks:

- At user's ~1705px app viewport, batch/payment table scrollWidth equals clientWidth, no clipped status or actions, every original field represented, long names/IDs wrap.
- At 1280, 390 and 320px, no horizontal overflow; narrow records have field labels and operable actions.
- At desktop, attention, pending review, GCash and tasks headings visible together without nested scrolling.
- Sort and density controls work; row action menu opens, Escape dismisses, financial dialogs still open; search/no-results recover; Record payment anchor reaches form.
- Both themes, keyboard focus, rapid refresh, reduced motion; preserve existing dialog/menu motion.
- Build and typecheck; inspect optimized localhost:3000 screenshots and record build ID.

Memory limits: brain resume Baker, brain projects, canonical Agent.md, Design-Principles.md and ICM/OpenCLI vault contracts all returned filesystem I/O error. Loaded /home/nami/DESIGNAGENT.md. Brain save cannot be claimed; local evidence retained for recovery.

## Rendered review

Compared the supplied screenshots, the Linear embedded product screenshot, and the optimized localhost preview. Intentional adaptations: retain Fresh Phones shell and existing semantic colors; use percentage table columns and stacked fields; no documentation gradient frame. Dashboard now uses three compact operational columns rather than a tall attention panel plus an oversized statement card. All four section headings appear around y=292–515px at 1705×933. No nested vertical table/dashboard scrollers detected. At 390/320px records stack with labels. Mobile retains the existing horizontal navigation track; table contents do not require panning.

First build A2chAEjoSeF8JKjJyLNi2 passed optimized compilation and full Next TypeScript checking. Six existing handler table/workspace tests passed. Browser interactions exercised: client sort ascending; no-match search and clearing to recover all 16 rows; row menu opening and Escape dismissal; Transaction details opening and Escape dismissal; Record payment anchor reaches form. No financial records were submitted. Light/dark layouts inspected. Final pass tightens team labels and row padding, reserves more action-column width, stacks receipt proof/reference, and removes irrelevant export guidance from the handler-only view.

Evidence limitations: no new financial fixtures or server-side permissions changed; narrow layout screenshots verify display, not phone touch gestures. Existing reduced-motion CSS retained and reviewed in source, but reduced-motion emulation and color-vision simulation were unavailable in this browser tool. Existing menu/dialog animation was exercised; rapid dashboard refresh should be checked in the final build. User acceptance is still pending.

## Final build and acceptance evidence

Final optimized build `ggmdwh0fELiPA3L7OfsPR` in `.next-preview-b` passed compilation, full TypeScript checking and page generation. Running on localhost:3000. At 1705×933 all ten batch rows and all column fields/status/actions fit in one view. At 1705, 1280, 390 and 320px both payment and batch table containers have equal clientWidth/scrollWidth; page/main overflow and nested scroll counts are zero. Every row action remains within viewport bounds. Actual pointer-opened payment menu dismissed with Escape and focus returned to its trigger. Dashboard refresh exercised with immediate repeated input, preserving loaded content.

Final files: `apps/web/app/system/_role-designs/batch_handler/app/system/records/HandlerBatchTable.tsx`, batch table CSS; `app/system/payments/HandlerPaymentTable.tsx`, `PaymentListPanel.tsx`, `page.tsx`; handler-table component/CSS; handler dashboard components/CSS, under the same role directory. Other role designs were preserved. Source formatting and git diff whitespace checks passed.

Screenshots and viewport measurements retained in `/home/nami/.agent-reach/design-references/freshphones-handler-one-view-2026-11-25`. Browser screenshots are evidence of local implementation, not user approval. Brain persistence remains blocked by vault I/O errors.

## November 25 follow-up: payment entry position

Controlling reference: user screenshot `/tmp/codex-clipboard-Cot46U.png`, inspected directly. Scope is the Batch handler payment page, retaining its neutral surfaces, blue actions, typography and two-thirds form / one-third balance grid. Negative example: the full history and checklist precede the primary entry task; the form measured y=1890.56 at scroll top in the old optimized preview (1705×990), requiring a jump link or scrolling. Move the existing form and balance grid directly below the shell, then checklist and history. Remove redundant introductory copy and the now-unnecessary jump toolbar. Preserve payment fields, privacy/approval consequences, state, validation and existing spring components.

Observable checks: form starts in the first viewport without a hash; balance aligns beside it on desktop and follows it on mobile; history/checklist remain accessible; no horizontal page overflow at 1705, 390 and 320px; both themes; existing method menu and checklist still respond and dismiss correctly. No financial submission is needed for a layout correction. Baseline capture `/tmp/handler-payment-before.png` contains a full-page capture artifact; use the supplied screenshot and measured DOM position for the before comparison.

## November 25 follow-up: duplicate Follow-up card

User rejected `/tmp/codex-clipboard-YcdPkm.png` (directly inspected): two queue counts in a large panel, with an inherited curved divider on the second button. The existing Payment inbox already contains the same Receipt needed and Returned controls/counts. Remove the duplicate panel and its CSS rather than maintain a second set of controls. Overview becomes two columns for assignments and statements; both existing inbox actions remain. Remove obsolete statement spanning/tablet subgrid styles now that the overview has two children. Verify the entire dashboard, both themes and 390/320px, filter switching, keyboard feedback and repeated refresh. This is a direct correction; no experimental improvement score or general agent-quality claim is made.


## Continuation verified on November 25

Recovered the interrupted follow-up and restored the local preview API using its existing `.env.preview` (loopback database `freshphones_preview`, port 4101). Completed and activated optimized build `QkTgX1Umq3BmXXVxgDMGu` in `.next-preview-b` at localhost:3000. Compilation, full Next TypeScript checking and all 72 static pages passed. Six existing handler table/workspace tests passed. Whitespace checks pass. The correction files are absent from formatter findings; the repository-wide read-only check reports 94 other files needing formatting, including unrelated handler receipt/report/task files. No formatting cleanup was applied.

Rendered comparison against the supplied low-form and duplicate-card screenshots: existing form moved to y=104 on desktop (1705×990), submit bottom y=802; balance remains beside the form. At 390/320×844, form begins y=199 beneath the mobile shell, and its bottom action remains reachable by page scrolling. Checklist/history follow the form. The dashboard overview now contains only assignments and GCash statements, with Receipt needed and Returned appearing once each in the inbox. No Follow-up heading remains. Retained Fresh Phones neutral surfaces, blue actions, quiet selected labels and existing typography; the removed panel no longer repeats queue counts or introduces the rejected curved divider.

Twelve page/viewport/theme cases (dashboard/payments × 1705/390/320 × light/dark) have zero document horizontal overflow and no visible error alerts. Inspected all twelve captures plus the scrolled mobile inbox/form bottom. Inbox filters switch selected state, immediate repeated refresh preserves the dashboard, checklist opens/closes, method menu opens/dismisses with Escape and focus returns to its combobox. Reduced-motion emulation is supported by this browser version and the method menu remains usable. Console inspection after restoration shows preload warnings, with no new runtime errors observed. No payment, task, or receipt was submitted. Physical-device gestures, submission/error/retry flows, color-vision simulation and user acceptance remain unverified.

Evidence: `/home/nami/.agent-reach/design-references/freshphones-handler-form-20261125/verification.json`, `verified-*.png`; build/format logs retained beside them. Vault access is restored; this continuation supersedes the earlier persistence blocker. Earlier one-view verification remains historical session evidence, not a fresh rerun of the batch page.
