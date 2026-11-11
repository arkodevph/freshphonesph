# Payroll spreadsheet workflow v1

Checklist **#13 is implemented as a provisional spreadsheet package**. Jaycee
explicitly directed building with working assumptions now and aligning with the
client’s format when it becomes available. Client formatting, company-specific
rules and acceptance are later alignment work, not prerequisites for building v1.

## Files to review

- [Blank payroll template](templates/payroll-workflow-template.xlsx)
- [Fictional worked example](templates/payroll-workflow-example.xlsx)
- [Reproducible generator and verification instructions](../scripts/payroll/README.md)

The previous [draft workbook](templates/payroll-workflow-draft.xlsx) is retained
for historical links. Start new periods from the v1 blank template.

Both current files have seven tabs: **Read me, Summary, Staff, Payroll,
Adjustments, Payments, Assumptions**. Blue cells accept inputs; grey cells hold
protected formulas. The example is prominently labeled fictional. It contains no
actual staff, approvals or payments.

## Working flow

1. Copy the blank template for a cutoff and revision. Enter the period identifier
   and start/end dates on Summary; v1 does not assume a pay frequency.
2. Enter stable employee IDs and names on Staff. Reference rates/pay basis stay
   descriptive; they do not calculate period salary.
3. Add each employee once on Payroll and enter their confirmed base amount for
   that cutoff. Unknown base amounts stay blank. Only explicit approved
   adjustments flow into the prepared net total.
4. Record additions/deductions on Adjustments with an ID, reason, supporting
   reference, review state, approver and approval date. Pending, rejected,
   incomplete and duplicate evidence is excluded and flagged or labeled.
5. Resolve all CHECK rows. Record the preparer, reviewer and approver on Summary,
   using their actual dates. The workflow check distinguishes returned work,
   missing evidence and recorded approval. These are recorded human signoffs;
   the workbook does not authenticate identity or assign application roles.
6. Record each actual external payment on Payments after it occurs. Partial
   payments retain the remaining amount; excess recorded payment is shown
   separately. Approval does not create payment records, and recording a payment
   does not approve the payroll.
7. Save a dated approved copy. For corrections, keep that copy and create a new
   reviewed revision with a reason. This is a manual version-retention process.

Worksheet protection reduces accidental formula edits. It has no password and
can be removed when adapting the template. File sharing must separately limit
who can access completed payroll information.

## Worked example

All figures and people below are fictional training data, not company pay rules.

| Item                           | Sample staff A | Sample staff B |         Total |
| ------------------------------ | -------------: | -------------: | ------------: |
| Entered base amount            |  PHP 10,000.00 |   PHP 5,000.00 | PHP 15,000.00 |
| Approved addition              |   PHP 1,000.00 |       PHP 0.00 |  PHP 1,000.00 |
| Approved adjustment deducted   |     PHP 250.00 |       PHP 0.00 |    PHP 250.00 |
| Prepared net amount            |  PHP 10,750.00 |   PHP 5,000.00 | PHP 15,750.00 |
| Fictional payment records      |   PHP 6,000.00 |       PHP 0.00 |  PHP 6,000.00 |
| Amount without payment records |   PHP 4,750.00 |   PHP 5,000.00 |  PHP 9,750.00 |

A separate pending PHP 2,000.00 addition is excluded. The example has an approval
record while payment recording remains incomplete, demonstrating the separation.
Its cached preview values are also checked against a fresh recalculation.

## Assumptions and later alignment

The Assumptions tab records v1 choices and the corresponding client follow-up.
Current choices include one workbook per cutoff, one payroll row per employee,
manual base pay, explicit supported adjustments, generic recorded review
responsibilities, external payments, PHP centavos and retained revisions.

When the client supplies their format, map employee identifiers, dates, pay
components, evidence, responsibilities, column labels and print layout. Update
linked formula/validation ranges together and rerun the verifier after changes.
The initial capacity is 100 staff/payroll rows and 300 adjustment/payment rows.

No company rates or statutory calculation rules have been invented. Confirmed
manual amounts can be entered; attendance/rate/tax/contribution/overtime engines
and task-driven salary deductions are outside this spreadsheet workflow.

## Verification and current availability

**18 synthetic calculation scenarios / 84 calculated assertions pass**, plus
13 checks of worked-example cached preview values. Tests use independent
LibreOffice recalculation and scan every sheet for formula errors. They cover
blank/unknown inputs, incomplete approvals, pending adjustments, partial/future/
excess payments, duplicate IDs, invalid/zero dates, centavos, invalid text,
workflow return/approval states and the complete fictional example.

Structural checks verify blank template inputs, editable versus protected cells,
frozen headings, no macros and no external workbook links. The published files
match the verified artifact hashes. Read-me and example-summary layouts were
reviewed via PDF rendering. Python formatting and scoped whitespace checks pass.
Actual Microsoft Excel and Google Sheets runtime/import checks are still to be
performed on the client's chosen platform; this does not block the completed
provisional implementation.
The workbooks and generator are local files; app/API permissions, financial
records, database schema and running services are unaffected. Client alignment
and acceptance remain separate from implementation.

## F18 verification follow-up — November 10, 2026

The user retained the **current Excel workbook format**. Both delivered workbook
archives match the generator's content after excluding creation/modification
timestamps and ZIP container metadata; their formulas, preview caches, validation,
protection and layout are unchanged. The verifier now enforces that comparison
and records separate delivered/generated hashes.

**21 calculation scenarios / 100 assertions pass**, plus the existing 13
worked-example cached values, using independent LibreOffice recalculation with
no formula errors. Added scenarios cover repeated employee/method/payment
references, negative net pay requiring review, and the final supported
staff/payroll/adjustment/payment rows. Two synthetic integrity probes confirm
that an altered formula and a missing example are rejected.

Use the [F18 Excel acceptance checklist](134-f18-payroll-acceptance.md) for the
remaining actual-Excel walkthrough and client rules/signoff. Neither Microsoft
Excel runtime nor client acceptance was established by this local verification.
Delivered workbooks and application business data were preserved.
