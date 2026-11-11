# Fresh AI report briefs and streamed responses

Fresh AI now answers requests such as “summarize all reports” with a read-only six-report brief. The server assembles Payments, Collections, Reconciliation, Tasks, Support and scheduled installments from the existing report queries in a repeatable-read transaction. Selected dates are validated and limited to an ordered range of at most 366 days. Without an explicit range, the summary uses the existing six-month chart period.

Both assistant endpoints require `REPORT_VIEW` and an Owner/CEO role. The report branch also checks access to each underlying report family. Report figures stay on the server-owned summary path; they are not sent to OpenRouter. The summary distinguishes payment-date totals, task/support creation dates, current lifetime balances and scheduled installments. Scheduled amounts are not collected payments or profit.

`POST /api/assistant/questions/stream` emits SSE status, text delta, completion and error events. General guidance streams provider text; the existing non-streaming endpoint remains available. Final response controls appear on completion. Stop aborts the request and preserves partial text; interruptions retain received text and offer retry. New conversation aborts the request and ignores late events. Provider truncation or an incomplete stream produces an error rather than a completed answer.

The progress indicator describes preparation and writing, shows elapsed time and offers a longer-wait hint after eight seconds. It does not present invented reasoning steps. Reduced motion disables indicator animation. Auto-scroll follows new text until the reader scrolls away; Latest reply returns to the bottom.

## Design and evidence

The existing Corporate AI composition documented in [108-fresh-ai-reference-redesign.md](108-fresh-ai-reference-redesign.md) still controls the pale rail, white framed canvas, bounded reading column and composer. The report brief uses three labeled totals, a payment-status bar with count labels and six report sections within that column. Cool neutral surfaces separate content through lightness, while Freshphones blue marks emphasis and controls. Mobile stacks the totals and retains a docked composer. Inspected desktop and mobile light/dark screenshots preserve that hierarchy without horizontal overflow.

The prior session retained supplementary interaction references and screenshots under `/tmp/fresh-ai-response-research/`: assistant-ui Thinking Indicator, Streaming Text, Loading State and Thread; AI Elements Conversation and Message; and Prompt Kit Loader. Their interaction patterns inform the status and streamed-text states; the existing Corporate AI composition remains primary. Reference URLs are in that directory's `urls.json`.

Verification artifacts are in `.local/fresh-ai-response/`, including `verify.cjs`, `verification.json` and screenshots. The browser script compares live report totals with the authenticated API and uses a local HTTP SSE fixture for deterministic slow, interrupted, cancelled and long responses. It checks mobile light/dark layout, partial-text preservation, cancellation on New conversation, reading-position preservation, reduced motion and empty payment activity. The interruption assertion targets the response message explicitly, avoiding unrelated page alerts.

Existing completion logs under `/tmp/fresh-ai-response-*` record 120 passing API tests, 187 passing web tests, API/web TypeScript checks and a successful optimized web build. Scoped Prettier and `git diff --check` pass. These are local verification results; production deployment and non-Chromium verification remain unverified.

Implementation paths: `apps/api-ts/src/assistant/{assistant.controller,report-brief,stream}.ts`, `apps/api-ts/src/reports/reports.service.ts`, `packages/contracts/src/{assistant,event-stream}.ts`, `apps/web/lib/assistant-stream.ts`, and `apps/web/app/system/{CeoAssistant,AssistantReportBrief,AssistantProgress,useCeoAssistant}.tsx` (the hook uses `.ts`). This increment supersedes the older no-report-retrieval description in document 107 for report-summary requests and adds streaming alongside its existing JSON endpoint.

## Gradient alignment

The user's supplied Verified collections card now controls the report brief's surface: one 118-degree teal-to-blue gradient (`#143b40`, `#22575e`, `#4b6c91`), a 15px outer radius and pale text. The brief removes nested metric backgrounds, chart containers and the inset report-count badge. Content sits directly on the gradient, separated by subtle rules. No decorative pseudo-elements, glow layers or inner overlays are added.

Primary text `#f4fcff` has at least 5.24:1 contrast across the gradient stops; secondary text `#e6f3f6` has at least 4.80:1. The secondary text is lighter than the reference's small print to improve readability at the blue end. Chart statuses retain visible count labels alongside their colors. The same surface works in both application themes. Browser evidence for this revision lives in `.local/fresh-ai-gradient/`.
