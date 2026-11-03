# Editable website enrollment form (#11 follow-up)

Jaycee requested a public enrollment form connected to the system, with staff able to add, edit, remove and reorder questions. He confirmed **COO and Records** as editors/publishers and **Agent review → assigned Batch Manager approval** as the normal enrollment path. This feature is implemented and verified in the main local demo. The printable membership summary remains in **My documents**.

## Try it

- Landing page: <http://localhost:3001/> → **Apply to join**, available beside Login Portal in the desktop navbar, at the top of the compact/mobile menu, and in the Hero.
- Public form: <http://localhost:3001/enroll> (also available at <http://localhost:3000/enroll>).
- Existing staff role login: <http://localhost:3000/login>.
- Form editor: <http://localhost:3000/system/enrollments?view=form> using COO or Records.
- Application queue: <http://localhost:3000/system/enrollments?view=applications> using the assigned Agent, linked assigned Manager or COO oversight.

The local demo starts with a published starter form routing to the existing **Demo Agent**. This is a local walkthrough configuration; a fresh deployment has no automatically published form or selected Agent. Editors choose their receiving Agent, save and publish. No remote deployment/publication was performed.

## Form editor

COO/Records can change the title, introduction, contact labels/help and custom questions. Custom question types are **short text**, **long text**, **single choice** and **multiple choice**. They can add/remove questions and options, mark questions required and reorder with keyboard-accessible Move up/Move down controls. Up to 30 custom questions and 2–20 choices per choice question are supported. Plain-text bounds and total UTF-8 payload budgets are enforced.

Name and phone remain required identity mappings; email stays optional, matching the existing enrollment workflow. Core mappings cannot be deleted or changed into unrelated data. Their wording/help may be edited. Uploads, conditional logic, scripts, signatures and new agreement terms are outside this addition.

**Save draft** does not change the website. **Preview draft** sends nothing. **Publish form** requires a saved valid draft and an active receiving Agent. Optimistic versions reject concurrent stale writes while preserving the editor's local changes until they explicitly reload.

Publishing creates an immutable revision. Deleting/changing questions affects later versions; previous applications retain their exact question wording, choices, order and answers. Changes to the receiving Agent affect future published intake. COO may explicitly reassign an existing received application.

## Public application and review

1. The visitor answers the current public form and acknowledges contact use. Validation focuses the error summary and links to affected fields.
2. Submission returns an application reference and **Application received**. It creates no member/account/schedule/payment or reserved position.
3. The assigned Agent reads the original answers, confirms/corrects contact details, optionally finds an existing member privately, and selects one of their assigned open batches.
4. **Forward to Manager** atomically creates/links the existing enrollment request. Reviewed contact is separate from immutable original intake. Matching retries reuse the request; changed payloads conflict.
5. The assigned Batch Manager can inspect the original website application and use the existing approval flow. Actual membership/issued plan and capacity checks happen at approval. Existing COO final-review oversight remains as before; COO cannot bypass the initial assigned-Agent forwarding step.

Manager visibility begins only after forwarding and follows current batch assignment. Records edits the form but does not gain private application access. CEO stays report-only. Customer accounts cannot access the staff applications queue. New in-app notices are minimal and scoped to the receiving Agent; no new email workflow was added.

If a visitor submits an outdated revision, the form requires explicit review of the latest version. Contact details and unchanged responses are retained; changed/removed earlier answers remain readable for copying and are not silently reinterpreted. Network failures retain answers and reuse the same submission UUID until the payload changes.

The completed printable summary and agreement-upload flow in My documents remain separate from the new public application. No new signed agreement or financial terms are created by the form.

## Implementation and privacy

- Shared bounded Zod definitions/answer validation: `packages/contracts/src/enrollment-form.ts`.
- Draft/revision/intake models and immutable/erasure guards: migration `20261030130000_public_enrollment_forms`.
- New API domain: `apps/api-ts/src/enrollment-forms/`, plus narrow existing enrollment-service integration.
- Public `GET /api/public/enrollment-form` exposes only revision metadata and form definition. Public `POST /api/public/enrollment-applications` returns only a reference.
- Authenticated `/api/enrollment/form` and `/api/enrollment/applications` enforce current permissions and current assignment scope inside reads/writes. The separate landing origin is allowed only for the exact new public submission route.
- Public intake uses existing ingress/application rate limits, no-store behavior, strict schema and idempotency protection. Public callers cannot choose private staff/member/batch identities or self-enroll.
- UI uses permission-safe tabs in the existing Enrollments workspace. No separate new sidebar module is required.

Public intake is separate from EnrollmentRequest because anonymous visitors are not accountable staff submitters. There are no fake submitting users. Original intake/revisions are immutable; SQL also guards closed/forwarded records and erased tombstones.

`PUBLIC_ENROLLMENT` is a separate manual retention category. No retention policy/period is seeded. Existing approved-policy, hold, review and execution requirements apply; only CLOSED, unconverted intake can be erased. Erasure scrubs intake contact/answers/free text and related copies while retaining routing/references/revisions. Converted/linked evidence stays blocked pending a separate approved disposition; issued membership and financial history are not erased here.

## Source/design comparison

DIO compared [JSON Forms UI schema](https://github.com/eclipsesource/jsonforms/blob/2c5fae62a8aace19970ac037d122fa6428cd0436/packages/core/src/models/uischema.ts), [Form.io builder](https://github.com/formio/formio.js/blob/90732a2192f3cd909574b4bf5292a1bbaa3a0717/src/WebformBuilder.js) and [Formbricks question schemas](https://github.com/formbricks/formbricks/blob/e87153d1019841a61c2d1869c0b07989f06eb41a/packages/types/surveys/elements.ts). JSON Forms/Form.io are MIT but introduce larger renderer/builder systems. The inspected Formbricks types are AGPLv3 and were not copied. The implementation uses the existing Zod/React stack and stable revision/data-binding patterns; no new package dependency was needed.

ROSS applied user-expi then ui-design-index. Routed landing/design-system category skills are not installed; existing public inquiry/careers and staff patterns supplied the visual language. YELYAH independently inspected authorization, revisions, forwarding/retention and UI recovery; no remaining actionable defect was found.

## Verification and local evidence

**594 distinct automated checks pass:** 107 API unit/reader/validation, 156 web and 331 PostgreSQL/API scenarios across the integration suite. Counts do not add the overlapping focused/reviewer reruns. Contracts/API builds, generated client, web/landing types and protected optimized builds, and scoped repository formatting pass.

Ten live browser groups pass with zero page errors: editor permissions; question add/edit/reorder/remove/preview/save/publish; real landing CTA/validation/receipt; stale-form and network recovery; Agent forwarding; Manager original-answer inspection/approval; COO/Records/CEO boundaries; 1440/390/320px layouts; unchanged customer My documents/balance; and restored starter publication. The existing seeded staff accounts were used. A clearly named new walkthrough batch/application/member was added locally, preserving current members' plans.

Migration rehearsal **and actual main migration** preserve all original values across **69 tables / 4,274 rows**. Post-walkthrough comparison preserves **1,019 original business rows in 21 tables**, including membership, schedule, payment, document, GCash and withdrawal history, with zero bookkeeping differences. API, worker, system preview and separate landing preview are healthy.

Private evidence/backups are ignored under `.local/enrollment-forms/`; tests use dedicated databases ending in `_test`. Source was developed in isolated `freshphonesph-enrollment-forms`, then the reviewed 49-path change was integrated with original-main backups and no concurrent source conflicts. Source remains local/uncommitted. User/client acceptance and deployment are separate.

## Navbar entry point — October 30, 2026

At Jaycee's follow-up request, the public navbar now includes **Apply to join** linking to `/enroll` on the same site origin. The full desktop navigation begins at1280px to fit the new action; smaller screens use the menu, with enrollment first and vertical scrolling on short screens. Both system and separate landing optimized builds/types and scoped formatting pass. Four targeted read-only browser groups pass with zero page errors on both origins at1440/1280/1024/768/390/320px, including keyboard navigation and a320×400px scrolling menu. No form submissions or business-record changes occurred in this follow-up. The mobile dropdown uses an opaque white surface so page text cannot show through its links. Earlier594automated/tenflow-group evidence remains the initial full-feature validation.
