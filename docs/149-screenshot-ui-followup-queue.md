# Screenshot follow-up queue — November 11, 2026

Queue and source audit only; this record does not claim runtime repairs or universal coverage passed. Preserve prior queue work and existing local implementation. User requests one-by-one work.

## New and expanded items

1. **Manage account drawer exit** — new queue item 9. Image 1, `/system/team`. `TeamDashboard.tsx` `closeManage()` clears `managed` then calls native `close()` immediately (lines 584–599 on inspection). Keep content and native modal alive until the reverse spring settles. Cover X, Cancel, Escape and any successful-save dismissal; preserve pending-write blocking, drafts, focus return and rapid reversal. Reduced-motion must close immediately without trapping focus. Source diagnosis confirmed; runtime fix pending.
2. **Recruitment panel collision** — new queue item 10. Image 2 shows touching composer/list borders and no visual separation, reported as overlap. Inspect `RecruitmentWorkspace.tsx`, `JobOpeningComposer.tsx`, `JobOpeningsPanel.tsx` and recruitment CSS/layout ancestry. Reproduce collapsed and expanded composer, error/loading/empty/list states, retained draft, 320/390px and short desktop. Exact overlap cause remains unknown; do not call a margin-only change universally fixed.
3. **Universal dialogs** — expand queue item 6 with Images 3–4, Operations monitor and Catalog. Inventory below is a source scan, not a passed browser sweep. Shared `ModalCloseButton`, spring hook and framed styles already exist in current work, so reconcile them rather than recreate them. Header title and close control remain visible together; consistent top-right close hit area, body insets, typography and separated sections; reachable actions; one vertical scroll owner. Catalog must not lose its heading/close while reading a long form. Preserve intentional media zoom, compact calendars, role gates, dirty drafts and data-write semantics. Verify each site, Escape/backdrop policy, keyboard focus return, mobile/light/dark, entry/exit and interruptions.
4. **Enrollment requests** — expand queue item 7 with Image 5. Current bright outer and nested replacement-note boxes compete with names/status and repeat paragraphs. Use a review queue: aligned member/batch identity, labeled request status, submitter and one review action; replacement summary subordinate; complete terms/history in an explicit disclosure or detail view. Preserve RESTART/CONTINUE_UNPAID distinctions, approvals, original verified-payment history, review notes, filters and pagination. Current `EnrollmentRequests.tsx` is existing work in progress; source presence does not establish active-preview verification.

## References and evidence

OpenCLI `doctor` confirmed connected; Google discovery returned no results, so established Threads sources were reopened directly. No account writes.

- Modal primary: https://www.threads.com/@uxjubayer/post/DfDkBSpjRlC/ — Maniruzzaman Jubayer, October 28 UTC / October 29 Manila 2026, re-opened and visually inspected November 11. Live post capture `threads-modal-current.png`; full 1600px artwork re-inspected at `/home/nami/.agent-reach/design-references/coo-modals-20261111/jubayer-form-original-0.jpg`. Controlling pattern: title/context and top-right X, common content alignment, paired fields, full-width narrative input and distinct bottom actions. Existing brief `docs/146-coo-modal-system.md` contains approximate artwork geometry; these are not measured CSS values. Preserve Fresh Phones charcoal/black and semantic mint; do not import purple selection edges or synthetic financial data. Static concept does not verify motion.
- Enrollment composition lead: https://www.threads.com/@shuvouix/post/DeZejA7tuNo — Yasinul Huq Shuvo, October 12, 2026, re-opened and visually inspected November 11. Inspect the lower Recent Deals rows: shared column alignment, compact toolbar and subordinate metadata rather than repeated bordered cards. Scope only that list grammar; do not copy dashboard metrics/charts. Live capture `threads-crm-current.png`; retained larger capture `/home/nami/.agent-reach/design-references/workspace-20261111/crm-enlarged.png`. Internal row geometry is unknown at this capture size. Full-size task-specific review/decision-detail reference remains to be inspected before finalizing Enrollment detail composition; this CRM image alone is insufficient for those states.
- Negative examples: user's Images 3–4 show inconsistent close/header visibility; Image 5 shows competing bright nested borders. Replace these concrete failures while retaining all authorized information.

Supplied screenshots retained in `/home/nami/.agent-reach/design-references/ui-queue-20261111-followup/`. No preview rebuild or UI code edits in this queue update. Existing earlier build/test claims are not re-verification of these screenshots.

## Dialog inventory

Scan: native `<dialog>` and `role="dialog"` under staff routes and shared components, November 11. Also re-scan dynamic wrappers, portal routes and non-JSX openers before claiming application-wide completeness. Date picker, public plan and search popover are explicit separate variants, not interchangeable form modals.

| Source | Kind | Scope |
| --- | --- | --- |
| `apps/web/app/system/agents/page.tsx:537` | native dialog | staff/shared audit |
| `apps/web/app/system/catalog/CatalogEditor.tsx:316` | native dialog | staff/shared audit |
| `apps/web/app/system/enrollments/EnrollmentRequests.tsx:287` | native dialog | staff/shared audit |
| `apps/web/app/system/gcash-history/HistoryDialog.tsx:84` | native dialog | staff/shared audit |
| `apps/web/app/system/gcash-history/ReadingDialog.tsx:92` | native dialog | staff/shared audit |
| `apps/web/app/system/gcash-history/SubmissionActions.tsx:98` | native dialog | staff/shared audit |
| `apps/web/app/system/operations-monitor/MonitorFollowUp.tsx:40` | native dialog | staff/shared audit |
| `apps/web/app/system/payments/FinanceReviewDialog.tsx:62` | native dialog | staff/shared audit |
| `apps/web/app/system/payments/PaymentAdjustmentDialog.tsx:101` | native dialog | staff/shared audit |
| `apps/web/app/system/payments/PaymentDetailsDialog.tsx:26` | native dialog | staff/shared audit |
| `apps/web/app/system/payments/ReceiptViewerDialog.tsx:34` | native dialog | staff/shared audit |
| `apps/web/app/system/tasks/StaffTaskDialog.tsx:84` | native dialog | staff/shared audit |
| `apps/web/app/system/tasks/coo/CooTaskAssignment.tsx:53` | native dialog | staff/shared audit |
| `apps/web/app/system/tasks/coo/CooTaskDetail.tsx:57` | native dialog | staff/shared audit |
| `apps/web/app/system/team/CreateAccountDialog.tsx:54` | native dialog | staff/shared audit |
| `apps/web/app/system/team/ManageAccountDialog.tsx:58` | native dialog | staff/shared audit |
| `apps/web/components/BatchAssignments.tsx:251` | native dialog | staff/shared audit |
| `apps/web/components/CatalogBreakdown.tsx:65` | native dialog | staff/shared audit |
| `apps/web/components/DateInput.tsx:289` | native dialog | separate compact/public variant |
| `apps/web/components/PaymentResultDetails.tsx:131` | native dialog | staff/shared audit |
| `apps/web/components/PortalCatalogBreakdown.tsx:65` | native dialog | separate compact/public variant |
| `apps/web/components/RecordDetails.tsx:368` | native dialog | staff/shared audit |
| `apps/web/components/WorkspacePageSearch.tsx:99` | ARIA dialog/popover | separate compact/public variant |
