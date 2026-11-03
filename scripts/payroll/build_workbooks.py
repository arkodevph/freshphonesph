"""Create provisional payroll workflow v1 workbooks without real payroll data.

Run from any directory: python scripts/payroll/build_workbooks.py.
"""

from __future__ import annotations

import argparse
from datetime import datetime
from pathlib import Path

import xlsxwriter
from xlsxwriter.utility import xl_rowcol_to_cell

ROOT = Path(__file__).resolve().parents[2]
TEMPLATE_NAME = "payroll-workflow-template.xlsx"
EXAMPLE_NAME = "payroll-workflow-example.xlsx"


def build_workbook(output: Path, *, example: bool = False) -> Path:
    output.parent.mkdir(parents=True, exist_ok=True)
    notice = (
        "TRAINING EXAMPLE | FICTIONAL staff, approvals and payments. No real payroll."
        if example
        else "PROVISIONAL V1 | Working format; align company rules and layout with the client later."
    )
    wb = xlsxwriter.Workbook(
        output, {"strings_to_formulas": False, "strings_to_urls": False}
    )
    wb.set_properties(
        {
            "title": "Fresh Phones PH - Payroll workflow v1",
            "subject": "Provisional spreadsheet workflow v1",
            "author": "Fresh Phones PH",
            "comments": "Provisional v1; align with client format later. Sample workbook contains fictional training data only.",
        }
    )
    wb.set_calc_mode("auto")
    navy = "#183E46"
    teal = "#176B70"
    blue = "#EAF3FF"
    grey = "#EFF2F5"
    ink = "#21343A"
    amber = "#FFF1D5"
    red = "#FBE5E4"
    f = {}
    f["title"] = wb.add_format(
        {
            "bold": True,
            "font_size": 21,
            "font_color": "white",
            "bg_color": navy,
            "valign": "vcenter",
        }
    )
    f["sub"] = wb.add_format(
        {"font_size": 10, "font_color": ink, "text_wrap": True, "valign": "vcenter"}
    )
    f["banner"] = wb.add_format(
        {
            "bold": True,
            "bg_color": amber,
            "font_color": "#714A00",
            "text_wrap": True,
            "valign": "vcenter",
        }
    )
    f["header"] = wb.add_format(
        {
            "bold": True,
            "font_color": "white",
            "bg_color": teal,
            "text_wrap": True,
            "valign": "vcenter",
            "border": 1,
            "border_color": "#D5E1E5",
        }
    )
    f["label"] = wb.add_format(
        {"bold": True, "font_color": ink, "font_size": 11, "valign": "vcenter"}
    )
    f["body"] = wb.add_format(
        {"font_color": ink, "font_size": 11, "text_wrap": True, "valign": "vcenter"}
    )
    for kind, color, locked in [("input", blue, False), ("calc", grey, True)]:
        for typ, num in [
            ("text", "@"),
            ("money", "#,##0.00;[Red](#,##0.00);0.00"),
            ("date", "yyyy-mm-dd"),
            ("number", "0"),
        ]:
            f[kind + "_" + typ] = wb.add_format(
                {
                    "bg_color": color,
                    "font_color": ink,
                    "locked": locked,
                    "border": 1,
                    "border_color": "#DBE3E8",
                    "num_format": num,
                    "valign": "vcenter",
                    "font_size": 10,
                }
            )
    f["bad"] = wb.add_format({"bg_color": red, "font_color": "#8D2826"})
    f["metric_count"] = wb.add_format(
        {
            "font_size": 16,
            "bold": True,
            "bg_color": grey,
            "font_color": navy,
            "num_format": "0",
            "border": 1,
            "border_color": "#DBE3E8",
        }
    )
    f["metric"] = wb.add_format(
        {
            "font_size": 16,
            "bold": True,
            "bg_color": grey,
            "font_color": navy,
            "num_format": "#,##0.00;[Red](#,##0.00);0.00",
            "border": 1,
            "border_color": "#DBE3E8",
        }
    )
    formulas = {}
    sheets = {
        name: wb.add_worksheet(name)
        for name in [
            "Read me",
            "Summary",
            "Staff",
            "Payroll",
            "Adjustments",
            "Payments",
            "Assumptions",
        ]
    }

    def layout(ws, title, subtitle, headers, widths, last=105):
        ws.hide_gridlines(2)
        ws.set_tab_color(teal)
        ws.set_zoom(90)
        ws.set_default_row(25)
        ws.set_row(0, 42)
        ws.set_row(1, 34)
        ws.set_row(2, 30)
        ws.set_row(5, 38)
        for col, width in enumerate(widths):
            ws.set_column(col, col, width)
        ws.merge_range(0, 0, 0, len(headers) - 1, title, f["title"])
        ws.merge_range(1, 0, 1, len(headers) - 1, subtitle, f["sub"])
        ws.merge_range(2, 0, 2, len(headers) - 1, notice, f["banner"])
        ws.write(
            3,
            0,
            "Blue cells: enter data. Grey cells: formulas. Amounts: PHP.",
            f["sub"],
        )
        ws.freeze_panes(6, 2)
        ws.autofilter(5, 0, last, len(headers) - 1)
        for col, value in enumerate(headers):
            ws.write(5, col, value, f["header"])
        ws.set_landscape()
        ws.set_paper(9)
        ws.fit_to_pages(1, 0)
        ws.repeat_rows(0, 5)
        ws.set_margins(0.25, 0.25, 0.4, 0.4)
        ws.set_header("&CFresh Phones PH - payroll workflow v1")
        ws.set_footer("&LPrivate once completed&RPage &P of &N")
        ws.print_area(0, 0, last, len(headers) - 1)
        ws.conditional_format(
            6,
            len(headers) - 1,
            last,
            len(headers) - 1,
            {
                "type": "text",
                "criteria": "containing",
                "value": "CHECK:",
                "format": f["bad"],
            },
        )

    def blank(ws, row, col, kind="text"):
        ws.write_blank(row, col, None, f["input_" + kind])

    def formula(ws, row, col, value, kind="text", cache=""):
        formulas[(ws.name, row, col)] = (value, kind)
        ws.write_formula(row, col, value, f["calc_" + kind], cache)

    def money_validation(ws, r1, c1, r2, c2):
        cell = xl_rowcol_to_cell(r1, c1)
        ws.data_validation(
            r1,
            c1,
            r2,
            c2,
            {
                "validate": "custom",
                "value": f"=IFERROR(AND(ISNUMBER({cell}),{cell}>=0,ROUND({cell},2)={cell}),FALSE)",
                "input_title": "Confirmed PHP amount",
                "input_message": "Use a number with at most two decimal places. Leave unknown amounts blank.",
                "error_title": "Check the amount",
                "error_message": "Enter zero or a positive number with at most two decimal places.",
                "error_type": "stop",
            },
        )

    def date_validation(ws, r1, c1, r2, c2):
        ws.data_validation(
            r1,
            c1,
            r2,
            c2,
            {
                "validate": "date",
                "criteria": "between",
                "minimum": datetime(1900, 1, 1),
                "maximum": datetime(2100, 12, 31),
                "error_type": "stop",
                "error_message": "Enter a valid date.",
            },
        )

    staff = sheets["Staff"]
    pay = sheets["Payroll"]
    adj = sheets["Adjustments"]
    paid = sheets["Payments"]
    summary = sheets["Summary"]
    guide = sheets["Read me"]
    layout(
        staff,
        "Staff reference",
        "Use a stable employee ID. Pay-basis/rate fields are reference only; enter the approved period amount on Payroll.",
        [
            "Employee ID",
            "Employee name",
            "Pay basis (reference)",
            "Rate (reference only)",
            "Effective date",
            "Notes",
            "Checks",
        ],
        [19, 27, 25, 22, 18, 38, 34],
    )
    for row in range(6, 106):
        r = row + 1
        for col in range(6):
            blank(staff, row, col, "date" if col == 4 else "text")
        formula(
            staff,
            row,
            6,
            f'=IF(COUNTA(A{r}:F{r})=0,"",IF(A{r}="","CHECK: missing employee ID",IF(COUNTIF($A$7:$A$106,A{r})<>1,"CHECK: duplicate employee ID",IF(B{r}="","CHECK: missing employee name","OK"))))',
        )
    date_validation(staff, 6, 4, 105, 4)

    layout(
        pay,
        "Payroll for one cutoff",
        "Enter the confirmed base pay for this cutoff. Approved adjustments feed additions/deductions; actual payment records stay separate.",
        [
            "Employee ID",
            "Employee name",
            "Base pay (manual)",
            "Approved additions",
            "Approved deductions",
            "Prepared net pay",
            "Recorded paid",
            "Unrecorded balance",
            "Over-recorded paid",
            "Checks",
        ],
        [19, 25, 21, 22, 23, 21, 21, 23, 22, 40],
    )
    for row in range(6, 106):
        r = row + 1
        blank(pay, row, 0)
        blank(pay, row, 2, "money")
        formula(
            pay,
            row,
            1,
            f'=IF(A{r}="","",IFERROR(VLOOKUP(A{r},Staff!$A$7:$B$106,2,FALSE),""))',
        )
        for col, kind in [(3, "Addition"), (4, "Deduction")]:
            formula(
                pay,
                row,
                col,
                f'=IF(A{r}="","",SUMIFS(Adjustments!$J$7:$J$306,Adjustments!$B$7:$B$306,A{r},Adjustments!$C$7:$C$306,"{kind}"))',
                "money",
            )
        formula(
            pay,
            row,
            5,
            f'=IF(OR(A{r}="",COUNTIF(Staff!$A$7:$A$106,A{r})<>1,COUNTIF($A$7:$A$106,A{r})<>1,NOT(ISNUMBER(C{r})),C{r}<0,IFERROR(ROUND(C{r},2)<>C{r},TRUE)),"",ROUND(C{r}+D{r}-E{r},2))',
            "money",
        )
        formula(
            pay,
            row,
            6,
            f'=IF(A{r}="","",SUMIFS(Payments!$J$7:$J$306,Payments!$B$7:$B$306,A{r}))',
            "money",
        )
        formula(pay, row, 7, f'=IF(F{r}="","",MAX(ROUND(F{r}-G{r},2),0))', "money")
        formula(pay, row, 8, f'=IF(F{r}="","",MAX(ROUND(G{r}-F{r},2),0))', "money")
        formula(
            pay,
            row,
            9,
            f'=IF(AND(A{r}="",C{r}=""),"",IF(A{r}="","CHECK: missing employee ID",IF(COUNTIF($A$7:$A$106,A{r})<>1,"CHECK: duplicate payroll row",IF(COUNTIF(Staff!$A$7:$A$106,A{r})<>1,"CHECK: unknown/duplicate staff ID",IF(B{r}="","CHECK: missing staff name",IF(NOT(ISNUMBER(C{r})),"CHECK: enter confirmed base pay",IF(OR(C{r}<0,ROUND(C{r},2)<>C{r}),"CHECK: base pay or centavos",IF(F{r}<0,"CHECK: negative net pay",IF(I{r}>0,"CHECK: recorded payment exceeds net","Ready for human review")))))))))',
        )
    money_validation(pay, 6, 2, 105, 2)

    layout(
        adj,
        "Adjustments and supporting evidence",
        "Only complete Approved records are included. These cells record human decisions; they do not verify authority or determine lawful deductions.",
        [
            "Adjustment ID",
            "Employee ID",
            "Type",
            "Amount",
            "Reason",
            "Supporting reference",
            "Review state",
            "Approved by",
            "Approval date",
            "Included amount",
            "Checks",
        ],
        [21, 19, 18, 18, 38, 30, 20, 25, 18, 20, 42],
        305,
    )
    for row in range(6, 306):
        r = row + 1
        for col in range(9):
            blank(
                adj, row, col, "money" if col == 3 else "date" if col == 8 else "text"
            )
        check = f'=IF(COUNTA(A{r}:I{r})=0,"",IF(A{r}="","CHECK: missing adjustment ID",IF(COUNTIF($A$7:$A$306,A{r})<>1,"CHECK: duplicate adjustment ID",IF(COUNTIF(Staff!$A$7:$A$106,B{r})<>1,"CHECK: unknown/duplicate staff ID",IF(COUNTIF(Payroll!$A$7:$A$106,B{r})<>1,"CHECK: no unique payroll row",IF(OR(AND(C{r}<>"Addition",C{r}<>"Deduction"),NOT(ISNUMBER(D{r})),D{r}<0,IFERROR(ROUND(D{r},2)<>D{r},TRUE)),"CHECK: type or amount",IF(G{r}="Approved",IF(OR(E{r}="",F{r}="",H{r}="",NOT(ISNUMBER(I{r})),I{r}<=0,I{r}>TODAY()),"CHECK: incomplete approval evidence","OK"),IF(OR(G{r}="Draft",G{r}="For review",G{r}="Rejected"),"Not included: "&G{r},"CHECK: select review state"))))))))'
        formula(adj, row, 10, check)
        formula(
            adj, row, 9, f'=IF(COUNTA(A{r}:I{r})=0,"",IF(K{r}="OK",D{r},0))', "money"
        )
    adj.data_validation(
        "C7:C306", {"validate": "list", "source": ["Addition", "Deduction"]}
    )
    adj.data_validation(
        "G7:G306",
        {"validate": "list", "source": ["Draft", "For review", "Approved", "Rejected"]},
    )
    money_validation(adj, 6, 3, 305, 3)
    date_validation(adj, 6, 8, 305, 8)

    layout(
        paid,
        "Actual external payment records",
        "Record payments only after they occur. Partial payments use separate payment IDs. Saving a row does not send money.",
        [
            "Payment ID",
            "Employee ID",
            "Amount actually paid",
            "Payment date",
            "Method",
            "External/voucher reference",
            "Recorded by",
            "Notes",
            "Checks",
            "Counted payment",
        ],
        [21, 19, 24, 18, 20, 32, 25, 36, 43, 23],
        305,
    )
    for row in range(6, 306):
        r = row + 1
        for col in range(8):
            blank(
                paid, row, col, "money" if col == 2 else "date" if col == 3 else "text"
            )
        formula(
            paid,
            row,
            8,
            f'=IF(COUNTA(A{r}:H{r})=0,"",IF(A{r}="","CHECK: missing payment ID",IF(COUNTIF($A$7:$A$306,A{r})<>1,"CHECK: duplicate payment ID",IF(OR(COUNTIF(Payroll!$A$7:$A$106,B{r})<>1,COUNTIF(Staff!$A$7:$A$106,B{r})<>1),"CHECK: no unique staff/payroll row",IF(OR(NOT(ISNUMBER(C{r})),C{r}<=0,IFERROR(ROUND(C{r},2)<>C{r},TRUE)),"CHECK: positive amount / centavos",IF(OR(NOT(ISNUMBER(D{r})),D{r}<=0,D{r}>TODAY()),"CHECK: actual payment date",IF(OR(E{r}="",F{r}="",G{r}=""),"CHECK: incomplete payment evidence",IF(COUNTIFS($B$7:$B$306,B{r},$E$7:$E$306,E{r},$F$7:$F$306,F{r})>1,"CHECK: repeated employee/method/reference","OK"))))))))',
        )
        formula(
            paid, row, 9, f'=IF(COUNTA(A{r}:H{r})=0,"",IF(I{r}="OK",C{r},0))', "money"
        )
    money_validation(paid, 6, 2, 305, 2)
    date_validation(paid, 6, 3, 305, 3)

    summary.hide_gridlines(2)
    summary.set_tab_color(teal)
    summary.set_zoom(100)
    summary.set_column("A:A", 31)
    summary.set_column("B:C", 18)
    summary.set_column("D:D", 21)
    summary.set_column("E:E", 18)
    summary.set_column("F:F", 20)
    summary.set_column("G:H", 18)
    summary.set_row(0, 42)
    summary.set_row(1, 34)
    summary.set_row(2, 30)
    summary.merge_range("A1:H1", "Payroll review and payment summary", f["title"])
    summary.merge_range(
        "A2:H2",
        "One workbook per cutoff. Complete the metadata, resolve checks, and obtain the company’s actual signoff.",
        f["sub"],
    )
    summary.merge_range("A3:H3", notice, f["banner"])
    for address, text in [
        ("A5", "Period identifier"),
        ("D5", "Cutoff start"),
        ("F5", "Cutoff end"),
        ("A7", "Review state"),
        ("A9", "Prepared by"),
        ("D9", "Prepared date"),
        ("A10", "Reviewed by"),
        ("D10", "Reviewed date"),
        ("A11", "Approved by"),
        ("D11", "Approval date"),
    ]:
        summary.write(address, text, f["label"])
    for address in ["B5:C5", "B7:C7", "B9:C9", "B10:C10", "B11:C11"]:
        summary.merge_range(address, "", f["input_text"])
    for address in ["E5", "G5", "E9", "E10", "E11"]:
        summary.write_blank(address, None, f["input_date"])
    summary.data_validation(
        "B7",
        {"validate": "list", "source": ["Draft", "For review", "Approved", "Returned"]},
    )
    for address in ["E5", "G5", "E9", "E10", "E11"]:
        summary.data_validation(
            address,
            {
                "validate": "date",
                "criteria": "between",
                "minimum": datetime(1900, 1, 1),
                "maximum": datetime(2100, 12, 31),
            },
        )
    metrics = [
        ("Employees entered", "=COUNTA(Payroll!A7:A106)"),
        ("Prepared net pay (PHP)", "=SUM(Payroll!F7:F106)"),
        ("Recorded payments (PHP)", "=SUM(Payments!J7:J306)"),
        ("Unrecorded balance (PHP)", "=SUM(Payroll!H7:H106)"),
        ("Above net pay (PHP)", "=SUM(Payroll!I7:I106)"),
        (
            "Rows needing checks",
            '=COUNTIF(Staff!G7:G106,"CHECK:*")+COUNTIF(Payroll!J7:J106,"CHECK:*")+COUNTIF(Adjustments!K7:K306,"CHECK:*")+COUNTIF(Payments!I7:I306,"CHECK:*")',
        ),
    ]
    for row, (label, value) in enumerate(metrics, 13):
        summary.write(row, 0, label, f["label"])
        summary.write_formula(
            row, 1, value, f["metric_count"] if row in (13, 18) else f["metric"], 0
        )
        summary.set_row(row, 30)
    summary.merge_range(
        "D14:H19",
        "Review checklist\n1. Confirm the actual pay rules and period.\n2. Resolve every CHECK row.\n3. Compare amounts with supporting evidence.\n4. Have the designated people review/approve.\n5. Record actual payments separately.\n6. Save a dated approved snapshot.",
        f["body"],
    )
    summary.merge_range(
        "A22:H23",
        "Totals cover only the prepared rows and valid payment records in this workbook. Blank base pay stays unknown. Resolve incomplete or duplicate records before relying on totals.",
        f["banner"],
    )
    summary.write("A25", "Period metadata", f["label"])
    summary.merge_range("B25:H25", "", f["calc_text"])
    summary.write_formula(
        "B25",
        '=IF(OR(B5="",NOT(ISNUMBER(E5)),NOT(ISNUMBER(G5)),E5<=0,G5<=0),"Enter period ID and cutoff dates",IF(G5<E5,"CHECK: cutoff end is before start","Period metadata entered"))',
        f["calc_text"],
        "Enter period ID and cutoff dates",
    )
    summary.conditional_format(
        "B19", {"type": "cell", "criteria": ">", "value": 0, "format": f["bad"]}
    )
    summary.set_landscape()
    summary.set_paper(9)
    summary.fit_to_pages(1, 1)
    summary.print_area("A1:H30")

    guide.hide_gridlines(2)
    guide.set_tab_color(navy)
    guide.set_column("A:A", 4)
    guide.set_column("B:B", 27)
    guide.set_column("C:H", 14)
    guide.set_row(0, 44)
    guide.merge_range("B1:H1", "Fresh Phones PH | Payroll workflow v1", f["title"])
    guide.merge_range("B3:H4", notice, f["banner"])
    steps = [
        (
            "Purpose",
            "Improve spreadsheet preparation, evidence, review and payment recording. Keep one workbook per cutoff.",
        ),
        (
            "1 | Staff",
            "Enter stable employee IDs and names. Optional rates/pay basis are reference only; no salary is calculated from them.",
        ),
        (
            "2 | Payroll",
            "Enter each employee once and the confirmed base pay for this cutoff. Leave unknown amounts blank. Grey cells calculate arithmetic totals.",
        ),
        (
            "3 | Adjustments",
            "Record additions/deductions with a unique ID, reason and supporting reference. Only complete Approved entries feed payroll. Never derive deductions from task lateness.",
        ),
        (
            "4 | Review",
            "Complete Summary period details. Resolve checks. Record the actual designated preparer, reviewer and approver; responsibilities remain to be confirmed.",
        ),
        (
            "5 | Payments",
            "After an external payment, record its own ID, employee, actual amount/date, method, reference and recorder. Approval alone is not payment.",
        ),
        (
            "6 | Retain",
            "Save a dated approved copy. Corrections need a new reviewed revision and a reason; keep the prior approved copy and payment evidence.",
        ),
        (
            "Inputs / formulas",
            "Blue cells accept input. Grey cells contain protected formulas. Protection has no password and prevents accidental edits; it is not access control or authenticated approval.",
        ),
        (
            "Private sharing",
            "Share completed payroll only with authorized people. Do not place bank passwords, account credentials or unnecessary identity documents in this workbook.",
        ),
        (
            "Excel / Google Sheets",
            "Macro-free .xlsx with common formulas. After importing into Google Sheets, confirm formulas, dropdowns, formats and edit permissions on that platform.",
        ),
        (
            "Template capacity",
            "100 staff/payroll rows and 300 adjustment/payment rows. Expand every linked formula/validation range together if more rows are needed.",
        ),
        (
            "Provisional assumptions",
            "The Assumptions tab records the current working choices. Continue building with these; align cutoff rules, pay components, responsible people and layout when the client supplies their format.",
        ),
        (
            "What it does not do",
            "No attendance/rate, tax, contribution, overtime or automatic deduction calculations; no payslip generation, bank transfer, app integration or authority verification.",
        ),
        (
            "Known limitations",
            "Duplicate IDs/references and incomplete records are excluded from counted amounts until corrected. An unresolved CHECK means totals may omit records; investigate before approval.",
        ),
        (
            "Worked example",
            "The companion example workbook uses clearly fictional staff and payments to demonstrate the full review and partial-payment flow. Copy the blank template for real periods; use approved amounts and keep the example separate.",
        ),
    ]
    for index, (heading, body) in enumerate(steps):
        row = 6 + index * 2
        guide.merge_range(row, 1, row, 2, heading, f["label"])
        guide.merge_range(row, 3, row + 1, 7, body, f["body"])
        guide.set_row(row, 25)
        guide.set_row(row + 1, 25)
    guide.set_paper(9)
    guide.fit_to_pages(1, 2)
    guide.set_margins(0.35, 0.35, 0.35, 0.35)
    guide.print_area("B1:H37")
    summary.write("B7", "Draft", f["input_text"])
    summary.write("A27", "Workflow check", f["label"])
    summary.merge_range("B27:H27", "", f["calc_text"])
    workflow = '=IF(B14=0,"START: enter payroll rows",IF(B19>0,"CHECK: resolve row issues",IF(B25<>"Period metadata entered","CHECK: confirm cutoff details",IF(OR(TRIM(B9)="",TRIM(B10)="",NOT(ISNUMBER(E9)),NOT(ISNUMBER(E10)),E9<=0,E10<=0,E9>TODAY(),E10>TODAY(),E10<E9),"CHECK: record preparer and reviewer",IF(B7="Returned","RETURNED: correct and re-review",IF(B7<>"Approved","FOR REVIEW: human approval pending",IF(OR(TRIM(B11)="",NOT(ISNUMBER(E11)),E11<=0,E11>TODAY(),E11<E10),"CHECK: complete approval record","APPROVAL RECORDED: payments stay separate")))))))'
    formula(summary, 26, 1, workflow, cache="START: enter payroll rows")
    summary.write("A28", "Payment records", f["label"])
    summary.merge_range("B28:H28", "", f["calc_text"])
    reconciliation = '=IF(B14=0,"No payroll entries",IF(B19>0,"CHECK: resolve rows before reconciliation",IF(B18>0,"CHECK: recorded amounts exceed net",IF(B17>0,"Payment records incomplete","Recorded amounts match known net pay"))))'
    formula(summary, 27, 1, reconciliation, cache="No payroll entries")
    summary.conditional_format(
        "B27:H28",
        {
            "type": "text",
            "criteria": "containing",
            "value": "CHECK:",
            "format": f["bad"],
        },
    )

    assumptions = sheets["Assumptions"]
    assumptions.hide_gridlines(2)
    assumptions.set_tab_color(teal)
    assumptions.set_column("A:A", 30)
    assumptions.set_column("B:B", 56)
    assumptions.set_column("C:C", 55)
    assumptions.set_row(0, 42)
    assumptions.merge_range(
        "A1:C1", "Provisional v1 | client alignment register", f["title"]
    )
    assumptions.merge_range(
        "A3:C4",
        notice
        + " Working choices are recorded below; map the client’s format when supplied.",
        f["banner"],
    )
    for col, label in enumerate(
        ["Area", "Working choice in v1", "Align with client later"]
    ):
        assumptions.write(5, col, label, f["header"])
    choices = [
        (
            "Payroll cutoff",
            "One workbook per period; dates entered manually.",
            "Confirm cutoff frequency, identifier and payment schedule.",
        ),
        (
            "Staff identity",
            "Stable text IDs, one payroll row per staff member per period.",
            "Map their staff identifiers and any split employment arrangements.",
        ),
        (
            "Base pay",
            "Human-entered confirmed period amount; optional rate is reference only.",
            "Confirm pay basis and their existing calculation process.",
        ),
        (
            "Adjustments",
            "Only complete human-approved additions/deductions feed the total.",
            "Map pay components, evidence requirements and approval policy.",
        ),
        (
            "Review",
            "Prepared by, reviewed by and approved by are generic recorded responsibilities.",
            "Assign actual responsible people; no app role is implied.",
        ),
        (
            "Payments",
            "Record actual external payments separately; partial payments are supported.",
            "Confirm payment methods and reference/voucher conventions.",
        ),
        (
            "Amounts",
            "PHP, two decimal places for period/adjustment/payment amounts.",
            "Confirm currency and rounding conventions.",
        ),
        (
            "Corrections",
            "Use a new revision and keep the previously approved copy.",
            "Confirm revision numbering, retention and access policy.",
        ),
        (
            "Platform",
            "Macro-free .xlsx with common formulas and editable input cells.",
            "Verify Excel or Sheets import, formula results and edit permissions.",
        ),
        (
            "Capacity",
            "100 staff/payroll rows; 300 adjustment and payment rows.",
            "Expand every matching formula/validation range together if needed.",
        ),
        (
            "Company layout",
            "Current seven-tab structure is the provisional working format.",
            "Rename/reorder/map columns and print layout to their supplied file.",
        ),
    ]
    for row, values in enumerate(choices, 6):
        assumptions.set_row(row, 56)
        for col, value in enumerate(values):
            assumptions.write(row, col, value, f["body"])
    assumptions.freeze_panes(6, 1)
    assumptions.set_landscape()
    assumptions.set_paper(9)
    assumptions.fit_to_pages(1, 1)
    assumptions.print_area(0, 0, 17, 2)

    if example:

        def enter(ws, row, values, date_cols=(), money_cols=()):
            for col, value in enumerate(values):
                kind = (
                    "date"
                    if col in date_cols
                    else "money" if col in money_cols else "text"
                )
                ws.write(row, col, value, f["input_" + kind])

        enter(
            staff,
            6,
            [
                "SAMPLE-001",
                "Sample staff A",
                "Manual sample period amount",
                "",
                datetime(2026, 10, 1),
                "FICTIONAL training data",
            ],
            date_cols=(4,),
        )
        enter(
            staff,
            7,
            [
                "SAMPLE-002",
                "Sample staff B",
                "Manual sample period amount",
                "",
                datetime(2026, 10, 1),
                "FICTIONAL training data",
            ],
            date_cols=(4,),
        )
        for row, identifier, amount in [
            (6, "SAMPLE-001", 10000),
            (7, "SAMPLE-002", 5000),
        ]:
            pay.write(row, 0, identifier, f["input_text"])
            pay.write(row, 2, amount, f["input_money"])
        adjustment_rows = [
            [
                "SAMPLE-ADD",
                "SAMPLE-001",
                "Addition",
                1000,
                "Fictional approved addition",
                "SAMPLE-EVIDENCE-1",
                "Approved",
                "Sample approver",
                datetime(2026, 10, 15),
            ],
            [
                "SAMPLE-LESS",
                "SAMPLE-001",
                "Deduction",
                250,
                "Fictional manually approved adjustment",
                "SAMPLE-EVIDENCE-2",
                "Approved",
                "Sample approver",
                datetime(2026, 10, 15),
            ],
            [
                "SAMPLE-PENDING",
                "SAMPLE-001",
                "Addition",
                2000,
                "Fictional pending request; excluded from totals",
                "SAMPLE-EVIDENCE-3",
                "For review",
                "",
                "",
            ],
        ]
        for row, values in enumerate(adjustment_rows, 6):
            enter(adj, row, values, date_cols=(8,), money_cols=(3,))
        for row, amount in [(6, 4000), (7, 2000)]:
            identifier = "SAMPLE-PAY-" + str(row - 5)
            enter(
                paid,
                row,
                [
                    identifier,
                    "SAMPLE-001",
                    amount,
                    datetime(2026, 10, 16),
                    "Sample method",
                    "NOT-A-REAL-PAYMENT-" + identifier,
                    "Sample recorder",
                    "FICTIONAL training record",
                ],
                date_cols=(3,),
                money_cols=(2,),
            )
        for cell, value in {
            "B5": "SAMPLE-CUTOFF",
            "B7": "Approved",
            "B9": "Sample preparer",
            "B10": "Sample reviewer",
            "B11": "Sample approver",
        }.items():
            summary.write(cell, value, f["input_text"])
        for cell, value in {
            "E5": datetime(2026, 10, 1),
            "G5": datetime(2026, 10, 15),
            "E9": datetime(2026, 10, 14),
            "E10": datetime(2026, 10, 15),
            "E11": datetime(2026, 10, 15),
        }.items():
            summary.write(cell, value, f["input_date"])
        # Cached values make the example useful in previews; tests independently
        # recalculate the same formulas with LibreOffice.
        cached = {
            ("Staff", 6, 6): "OK",
            ("Staff", 7, 6): "OK",
            ("Payroll", 6, 1): "Sample staff A",
            ("Payroll", 7, 1): "Sample staff B",
            ("Payroll", 6, 3): 1000,
            ("Payroll", 6, 4): 250,
            ("Payroll", 6, 5): 10750,
            ("Payroll", 6, 6): 6000,
            ("Payroll", 6, 7): 4750,
            ("Payroll", 6, 8): 0,
            ("Payroll", 7, 3): 0,
            ("Payroll", 7, 4): 0,
            ("Payroll", 7, 5): 5000,
            ("Payroll", 7, 6): 0,
            ("Payroll", 7, 7): 5000,
            ("Payroll", 7, 8): 0,
            ("Payroll", 6, 9): "Ready for human review",
            ("Payroll", 7, 9): "Ready for human review",
            ("Adjustments", 6, 9): 1000,
            ("Adjustments", 7, 9): 250,
            ("Adjustments", 8, 9): 0,
            ("Adjustments", 6, 10): "OK",
            ("Adjustments", 7, 10): "OK",
            ("Adjustments", 8, 10): "Not included: For review",
            ("Payments", 6, 8): "OK",
            ("Payments", 7, 8): "OK",
            ("Payments", 6, 9): 4000,
            ("Payments", 7, 9): 2000,
            ("Summary", 26, 1): "APPROVAL RECORDED: payments stay separate",
            ("Summary", 27, 1): "Payment records incomplete",
        }
        for (sheet, row, col), value in cached.items():
            expr, kind = formulas[(sheet, row, col)]
            sheets[sheet].write_formula(row, col, expr, f["calc_" + kind], value)
        for row, value in enumerate([2, 15750, 6000, 9750, 0, 0], 13):
            summary.write_formula(
                row,
                1,
                metrics[row - 13][1],
                f["metric_count"] if row in (13, 18) else f["metric"],
                value,
            )
        summary.write_formula(
            "B25",
            '=IF(OR(B5="",NOT(ISNUMBER(E5)),NOT(ISNUMBER(G5)),E5<=0,G5<=0),"Enter period ID and cutoff dates",IF(G5<E5,"CHECK: cutoff end is before start","Period metadata entered"))',
            f["calc_text"],
            "Period metadata entered",
        )
    for name, ws in sheets.items():
        if name not in ["Read me", "Summary"]:
            ws.protect(
                "",
                {
                    "autofilter": True,
                    "select_locked_cells": True,
                    "select_unlocked_cells": True,
                },
            )
        else:
            ws.protect("", {"select_locked_cells": True, "select_unlocked_cells": True})
    wb.close()
    return output


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", type=Path, default=ROOT / "docs/templates")
    args = parser.parse_args()
    for filename, example in [(TEMPLATE_NAME, False), (EXAMPLE_NAME, True)]:
        print(build_workbook(args.output_dir / filename, example=example))


if __name__ == "__main__":
    main()
