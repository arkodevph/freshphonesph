# F11 withdrawals/refunds and F12 replacement completion

Verified locally on 10 November 2026. The user selected completion of the existing
withdrawal/replacement flows. Ordinary ongoing-batch enrollment with new catch-up
or release rules remains outside this pass. Existing business behavior is documented
in [77](77-member-withdrawals-main-demo.md).

## Confirmed gap and change

Finance could read a withdrawal and record its external refund, but also saw
**Open replacement enrollment**, which led to an enrollment endpoint returning 403.
The withdrawal response now supplies `actions.viewReplacementEnrollment`, using
the same permissions as the enrollment-request read endpoint. The UI shows that
link only when the action is available. Customer responses keep replacement
identities hidden. Enrollment API authorization remains the enforcement boundary.

The regression checks the action and actual enrollment-read response for Agent,
assigned Manager, COO and Finance, plus the customer response.

## Live synthetic journeys

Two clearly labeled batches were added to the local `_preview` database:

| Batch | Replacement arrangement | Result |
| --- | --- | --- |
| `F11-F12-CONTINUE-435729` | Continue unpaid installments | The partly paid first installment transfers only ₱5; total replacement obligation is ₱80. |
| `F11-F12-FRESH-b0f0f1` | Start a new membership plan | Replacement receives a separate ₱240 plan, with three ₱80 installments on 29 February, 31 March and 30 April 2028. |

For both cases, the live API verified member submission, assigned Agent forwarding,
COO approval/consultation/terms, Agent proposal and assigned Manager admission.
Approval and a pending proposal kept the original dues and all eight occupied
positions. Admission exchanged the position atomically, preserved original payment
rows and original schedule amounts/dates, and gave the replacement zero inherited
payment credit. New payment claims against the handed-over membership were blocked.
Customer responses hid Agent/CEO internal notes and replacement identity.

Refund decisions stayed separate. A discretionary ₱15 approval did not change
installment credit. Finance recorded a ₱5 partial payout; replay returned the same
result, an amount exceeding the remaining approval was rejected, and COO payout
was denied. The restart case was settled through a second API payout. The
continuation case's final ₱10 was recorded through the browser confirmation form.
These are labeled synthetic records, not real disbursements.

The canonical one-click demo Agent initially had no linked Agent profile. A new,
clearly labeled synthetic profile was attached only because that field was empty,
with an audit record. Existing batch assignments and account passwords were not
reseeded. The new QA batches use this profile and the existing demo Manager and
Handler. Synthetic opening payments are fixture setup; their original rows were
compared after handover and payout.

## Verification evidence

- Seven withdrawal integration groups pass on freshly migrated isolated
  `freshphones_f11_f12_test`, including the new enrollment-link permission checks.
- Six withdrawal web tests pass. Contracts build and API TypeScript pass.
- Optimized web build and its TypeScript check pass; final formatting reports zero
  files needing changes. The running preview uses `.next-preview-b`, build
  `fAnizbH9c9rJDKsiNU5Iy`.
- On that actual preview, Finance has no enrollment link at desktop or 390px;
  neither viewport has page-level horizontal overflow. The assigned Manager still
  follows the exact enrollment link to the approved replacement request. A fresh
  Finance console check has no error entries; CSS preload warnings remain.
- Live API script/result: `.local/f11-f12/full-journey.cjs`,
  `full-journey-result.json` and `full-journey.log`.
- Browser screenshots and final preview verification are retained under
  `.local/f11-f12/`. Test/build/format logs are in
  `/tmp/freshphones-f03-20261110/f11-f12-*.log`.

An initial regression rerun reused a database whose persisted login limits had
already been consumed, causing 429s. The final run used a fresh database and passed.
No rate-limit weakening was introduced.

Named-user acceptance, real company refund wording, production acceptance and any
additional ordinary ongoing-batch enrollment policy remain separate. No commit,
push, release merge or production deployment was performed.
