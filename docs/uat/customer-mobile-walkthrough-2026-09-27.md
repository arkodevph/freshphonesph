# Customer portal local walkthrough — 2026-09-27

This is a developer walkthrough with **synthetic local accounts**, not Fresh Phones PH acceptance or a production launch sign-off. The named UAT and operational decisions in [the launch checklist](../23-customer-launch-uat.md) remain pending.

## Setup

- Local web at `localhost:3000` and API at `localhost:4101`; branch `staging` with uncommitted work.
- Two seeded customer accounts: Demo Customer and Taylor Garcia. No real identity documents or external email were used.
- Browser widths: 390 px mobile for all customer sections, 320 px for the overview, and 1280 px desktop. No horizontal page overflow was observed.
- Temporary Demo Customer records covered a verified payment, a pending payment, a release update, a support reply, a document clarification and correction, and a membership correction request.

## Observed results

| Flow | Local result |
| --- | --- |
| Login and overview | Split login layout and account access link displayed. Overview showed the assigned iPhone model picture, batch, balance, next installment, release status, and actionable items. |
| Membership | Joined and batch dates displayed. A correction request opened a support case; the synthetic staff resolution and outcome appeared back on the membership page. |
| Schedule and payments | A ₱1,500 Finance-verified payment applied to the first ₱5,000 installment, leaving ₱3,500 there and ₱28,500 overall. A separate ₱500 pending payment did not change the verified balance. Currently due was ₱0 before the October 1 due date. |
| Account documents | Statement and payment confirmation downloaded as one-page A4 PDFs. Extracted PDF text contained the correct amounts and the operational, non-BIR notice. |
| Customer documents | A photo ID moved from Needs clarification to Submitted after selecting and previewing a corrected PNG, then to Approved after Records review. The previous submission remained in history. |
| Support | The customer replied to a Waiting for client request. It changed to In progress, and the reply action disappeared from the overview attention list. |
| Release and notifications | A Ready release milestone showed the October 4 collection date. Notifications linked to the exact document, support case, payment confirmation, and release update. Following a document notification opened its matching requirement. |
| Mobile navigation | The More sheet opened with focus on its close button; Escape closed it and returned focus to the More trigger. |
| Account isolation | Taylor's eight sections contained no Demo Customer test records. Direct requests for Demo's support case, document file, payment confirmation, and release updates each returned HTTP 404. |

## Issue found and fixed locally

During initial page loads, empty data arrays briefly produced incorrect messages such as “No verified payments yet,” “No updates yet,” and a “Not Ready” release badge. The customer portal now renders explicit checking or error states until those requests settle. Schedule and installment messages use the same distinction, and the customer avatar can use the signed-in name while the record loads.

`pnpm --filter @fresh/web exec tsc --noEmit` passed after the change. The browser walkthrough confirmed the settled screens and downloaded PDFs. No commit was created.

## Evidence

- [Populated mobile overview](screenshots/customer-overview.png)
- [Support reply and status](screenshots/customer-support-reply.png)
- [Corrected document submitted](screenshots/customer-document-correction.png)
- [Second customer's mobile overview](screenshots/second-customer-overview.png)

The temporary fixture was removed after the walkthrough: 2 payments, 2 documents and their private files, 1 release update, 2 support cases and their messages, and 6 notifications and local email files. The Demo Customer release status, version, and update time were restored. The local servers remained running.

## Still to validate with a named reviewer

- Password reset and single-use email flow; actual customer file download; HEIC conversion guidance on a phone.
- Full keyboard, zoom, and reduced-motion pass; realistic staff backlog and reminder timing.
- Client-approved document, privacy, email, storage, and launch decisions listed in the launch checklist.
