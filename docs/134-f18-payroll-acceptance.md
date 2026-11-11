# F18 Excel payroll acceptance

On November 10, 2026, the user selected **Keep the current Excel workbook format for now**. Continue the existing provisional spreadsheet workflow. Client-specific rates, pay frequency, signatories and statutory rules remain unconfirmed; this session adds no new payroll calculations or website payroll engine.

## Review package

- [Blank Excel template](templates/payroll-workflow-template.xlsx) — copy this for a new cutoff.
- [Fictional worked example](templates/payroll-workflow-example.xlsx) — inspect this first to see the workflow.
- [Workflow and assumptions](80-payroll-spreadsheet-workflow.md).
- [Generator and verifier](../scripts/payroll/README.md).

The workbook has seven tabs: Read me, Summary, Staff, Payroll, Adjustments, Payments and Assumptions. Keep the delivered blank template and example unchanged. Use working copies for acceptance and real payroll.

## Concrete Excel acceptance run

This is a manual test to perform in the actual Microsoft Excel environment selected by the client. It has not been executed in Excel during this session. Use fictional data for the walkthrough and actual authorized people for eventual signoff.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Open a copy of the fictional example in Excel and enable normal calculation. | Seven tabs open; no repair warning or external-link prompt. The example remains labeled fictional. |
| 2 | Check the example Summary. | Prepared net PHP 15,750; recorded payments PHP 6,000; remaining PHP 9,750; excess PHP 0; CHECK rows 0. |
| 3 | Inspect example Payroll and Adjustments. | Staff A net PHP 10,750 and remaining PHP 4,750; Staff B net/remaining PHP 5,000. Pending PHP 2,000 addition contributes zero. |
| 4 | Check example workflow and payment states. | Approval is recorded; payment records remain incomplete. Approval does not create payments. |
| 5 | Start a copy of the blank template; enter a period ID and valid cutoff dates on Summary. | No real staff or payment records were prefilled. Blue cells accept inputs; formula cells resist accidental edits. |
| 6 | Enter fictional employee `QA-001` and a name on Staff; enter that ID and confirmed base PHP 1,000 on Payroll. | Staff name resolves and prepared net/remaining are PHP 1,000. A blank base remains unknown. |
| 7 | Add a PHP 100 addition with unique ID, employee ID, reason, evidence reference and `For review` state. | Addition is excluded. Complete approver/date and change to Approved: net becomes PHP 1,100. |
| 8 | Enter a PHP 25 deduction with complete explicit approval evidence. | Net/remaining become PHP 1,075. No task or lateness fact creates a deduction. |
| 9 | Record an actual fictional payment of PHP 400 with unique ID, current/past date, method, reference and recorder. | Recorded payment PHP 400; remaining PHP 675. Payment does not approve payroll. |
| 10 | Duplicate the payment under another ID with the same employee, method and reference. | Both repeated records are flagged and excluded until corrected. Undo the duplicate and check that PHP 400/675 returns. |
| 11 | Complete preparer/reviewer/approver names, valid chronological dates and Approved state on Summary. | With all CHECK rows resolved, approval is recorded; PHP 675 remains without payment records. |
| 12 | Save, close and reopen the copy, then inspect print preview. | Values remain consistent; intended columns, labels and totals are readable. Record the Excel version and any layout issue. |

Record the test date, tester, Excel version, filename/revision, each step's pass/fail and supporting issue notes in a separate acceptance record. No actual tester, staff signoff or client acceptance is implied by this checklist.

## Local verification

The checker now compares both delivered `.xlsx` archives with freshly generated content, including formulas, cached example values, validation, cell protection and layout. Only generated creation/modification timestamps and ZIP container metadata are disregarded. It fails before recalculation if a file is missing or content differs. The result file records separate SHA-256 hashes for the delivered and generated artifacts.

**21 scenarios / 100 calculated assertions pass**, plus **13 worked-example cached-value checks**, with no formula errors in independent LibreOffice recalculation. Coverage includes the existing 18 scenarios plus repeated payment references, negative net pay requiring review, and the last supported staff/payroll/adjustment/payment rows. Synthetic corruption checks also confirm rejection of an altered net-pay formula and a missing example file. These checks establish local spreadsheet behavior; Microsoft Excel runtime and client acceptance remain pending.

Local evidence is ignored under `.local/f18/`; calculation logs are `/tmp/f18-baseline.log` and `/tmp/f18-verified.log`. Delivered workbooks were preserved. No application database, payroll records, web UI or running service was changed.

## Inputs still needed for client alignment

Confirm actual cutoff frequency, employee identifiers, confirmed base amounts and pay components; authorized evidence and approval responsibilities; payment methods/references; revision retention/access; any company layout requirements. Statutory computations, attendance/rate engines, Google Sheets import and app exports are separate requirements until explicitly requested and defined.
