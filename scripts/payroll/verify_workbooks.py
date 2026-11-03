"""Recalculate synthetic payroll workbooks using an isolated LibreOffice profile.

The generated examples and test fixtures contain fictional data only.
"""

from __future__ import annotations

import argparse
from datetime import datetime, timedelta
import hashlib
import json
import math
from pathlib import Path
import shutil
import subprocess
from zipfile import ZipFile
from zoneinfo import ZoneInfo

from openpyxl import load_workbook

from build_workbooks import EXAMPLE_NAME, TEMPLATE_NAME, ROOT, build_workbook


def verify(work_dir: Path) -> dict:
    work_dir = work_dir.resolve()
    work_dir.mkdir(parents=True, exist_ok=True)
    QA = work_dir
    BASE = build_workbook(QA / "source" / TEMPLATE_NAME)
    EXAMPLE = build_workbook(QA / "source" / EXAMPLE_NAME, example=True)
    (QA / "input").mkdir(exist_ok=True)
    (QA / "calculated").mkdir(exist_ok=True)
    TODAY = datetime.now(ZoneInfo("Asia/Manila")).replace(
        hour=0, minute=0, second=0, microsecond=0, tzinfo=None
    )
    checks = []
    cases = []
    wb = load_workbook(BASE)
    assert wb.sheetnames == [
        "Read me",
        "Summary",
        "Staff",
        "Payroll",
        "Adjustments",
        "Payments",
        "Assumptions",
    ]
    assert all(ws.protection.sheet for ws in wb)
    for name, cols, end in [
        ("Staff", range(6), 106),
        ("Payroll", [0, 2], 106),
        ("Adjustments", range(9), 306),
        ("Payments", range(8), 306),
    ]:
        for row in range(7, end + 1):
            for col in cols:
                assert wb[name].cell(row, col + 1).value is None, (name, row, col)
    assert wb["Payroll"]["C7"].protection.locked is False
    assert wb["Payroll"]["F7"].protection.locked is True
    assert wb["Payroll"].freeze_panes == "C7"
    with ZipFile(BASE) as z:
        assert not any(
            "vba" in name.lower() or "externalLinks/" in name for name in z.namelist()
        )
    checks.append(
        "Blank template, six sheets, editable inputs, protected formula cells, no macros or external workbook links"
    )

    def case(name):
        w = load_workbook(BASE)
        w["Staff"]["A7"] = "0001"
        w["Staff"]["B7"] = "Synthetic QA employee"
        w["Staff"]["D7"] = 99999
        w["Payroll"]["A7"] = "0001"
        w["Payroll"]["C7"] = 1000
        w["Summary"]["B5"] = "SYNTHETIC-QA"
        w["Summary"]["E5"] = datetime(2026, 10, 1)
        w["Summary"]["G5"] = datetime(2026, 10, 15)
        return w

    def adjustment(
        w,
        row,
        ident,
        kind,
        amount,
        status="Approved",
        approver="Synthetic reviewer",
        date=TODAY,
    ):
        for col, value in enumerate(
            [
                ident,
                "0001",
                kind,
                amount,
                "Synthetic QA reason",
                "QA-EVIDENCE-" + ident,
                status,
                approver,
                date,
            ],
            1,
        ):
            w["Adjustments"].cell(row, col, value)

    def payment(w, row, ident, amount, date=TODAY, ref=None):
        for col, value in enumerate(
            [
                ident,
                "0001",
                amount,
                date,
                "Synthetic method",
                ref or "QA-REF-" + ident,
                "Synthetic recorder",
                "QA only",
            ],
            1,
        ):
            w["Payments"].cell(row, col, value)

    def save(w, name, expected):
        p = QA / "input" / (name + ".xlsx")
        w.save(p)
        cases.append({"file": p.name, "expected": expected})

    save(
        load_workbook(BASE),
        "00-blank",
        {
            "Payroll!F7": None,
            "Summary!B14": 0,
            "Summary!B15": 0,
            "Summary!B19": 0,
            "Summary!B27": "START: enter payroll rows",
            "Summary!B28": "No payroll entries",
        },
    )
    w = case("normal")
    adjustment(w, 7, "ADD-1", "Addition", 100)
    adjustment(w, 8, "DED-1", "Deduction", 25)
    adjustment(w, 9, "PENDING-1", "Addition", 500, "For review", None, None)
    payment(w, 7, "PAY-1", 400)
    payment(w, 8, "PAY-2", 200)
    save(
        w,
        "01-approved-pending-partial",
        {
            "Payroll!B7": "Synthetic QA employee",
            "Payroll!D7": 100,
            "Payroll!E7": 25,
            "Payroll!F7": 1075,
            "Payroll!G7": 600,
            "Payroll!H7": 475,
            "Payroll!I7": 0,
            "Adjustments!J9": 0,
            "Summary!B19": 0,
        },
    )
    w = case("unknown")
    w["Payroll"]["C7"] = None
    adjustment(w, 7, "MISSING", "Addition", 700, approver=None, date=None)
    payment(w, 7, "FUTURE", 100, date=TODAY + timedelta(days=1))
    save(
        w,
        "02-unknown-incomplete-future",
        {
            "Payroll!F7": None,
            "Adjustments!J7": 0,
            "Payments!J7": 0,
            "Payroll!G7": 0,
            "Summary!B19": 3,
        },
    )
    w = case("duplicates")
    w["Payroll"]["A8"] = "0001"
    w["Payroll"]["C8"] = 1000
    save(
        w,
        "03-duplicate-payroll",
        {
            "Payroll!F7": None,
            "Payroll!F8": None,
            "Summary!B14": 2,
            "Summary!B15": 0,
            "Summary!B19": 2,
        },
    )
    w = case("duplicateledgers")
    adjustment(w, 7, "DUP", "Addition", 100)
    adjustment(w, 8, "DUP", "Addition", 100)
    payment(w, 7, "DUP-PAY", 100)
    payment(w, 8, "DUP-PAY", 100)
    save(
        w,
        "04-duplicate-evidence",
        {
            "Payroll!F7": 1000,
            "Payroll!G7": 0,
            "Adjustments!J7": 0,
            "Adjustments!J8": 0,
            "Payments!J7": 0,
            "Payments!J8": 0,
            "Summary!B19": 4,
        },
    )
    w = case("overpaid")
    payment(w, 7, "OVERPAID", 1100)
    save(
        w,
        "05-overpaid",
        {
            "Payroll!F7": 1000,
            "Payroll!G7": 1100,
            "Payroll!H7": 0,
            "Payroll!I7": 100,
            "Summary!B18": 100,
            "Summary!B19": 1,
        },
    )
    w = case("unknownstaff")
    w["Payroll"]["A7"] = "UNKNOWN"
    payment(w, 7, "UNKNOWN", 100)
    w["Payments"]["B7"] = "UNKNOWN"
    save(
        w,
        "06-unknown-staff",
        {"Payroll!F7": None, "Payroll!G7": 0, "Payments!J7": 0, "Summary!B19": 2},
    )
    w = case("centavos")
    w["Payroll"]["C7"] = 1000.01
    adjustment(w, 7, "CENT-ADD", "Addition", 0.02)
    adjustment(w, 8, "CENT-LESS", "Deduction", 0.01)
    save(
        w,
        "07-centavos",
        {"Payroll!F7": 1000.02, "Payroll!H7": 1000.02, "Summary!B19": 0},
    )
    w = case("precision")
    w["Payroll"]["C7"] = 1000.001
    save(
        w,
        "08-extra-decimal-places",
        {"Payroll!F7": None, "Summary!B15": 0, "Summary!B19": 1},
    )
    w = case("text")
    w["Payroll"]["C7"] = "unknown"
    adjustment(w, 7, "TEXT", "Addition", "unconfirmed")
    payment(w, 7, "TEXT", "unconfirmed")
    save(
        w,
        "09-text-is-not-zero",
        {"Payroll!F7": None, "Adjustments!J7": 0, "Payments!J7": 0, "Summary!B19": 3},
    )

    def reviewers(w):
        w["Summary"]["B9"] = "Synthetic preparer"
        w["Summary"]["B10"] = "Synthetic reviewer"
        w["Summary"]["E9"] = TODAY
        w["Summary"]["E10"] = TODAY

    w = case("approval-not-payment")
    reviewers(w)
    w["Summary"]["B7"] = "Approved"
    w["Summary"]["B11"] = "Synthetic approver"
    w["Summary"]["E11"] = TODAY
    save(
        w,
        "10-approval-without-payment",
        {
            "Summary!B27": "APPROVAL RECORDED: payments stay separate",
            "Summary!B28": "Payment records incomplete",
            "Payroll!G7": 0,
            "Payroll!H7": 1000,
        },
    )
    w = case("payment-not-approval")
    reviewers(w)
    payment(w, 7, "FULL", 1000)
    save(
        w,
        "11-payment-without-approval",
        {
            "Summary!B27": "FOR REVIEW: human approval pending",
            "Summary!B28": "Recorded amounts match known net pay",
            "Payroll!G7": 1000,
            "Payroll!H7": 0,
        },
    )
    w = case("incomplete-signoff")
    reviewers(w)
    w["Summary"]["B7"] = "Approved"
    save(
        w,
        "12-incomplete-signoff",
        {
            "Summary!B27": "CHECK: complete approval record",
            "Payroll!G7": 0,
        },
    )
    w = case("returned")
    reviewers(w)
    w["Summary"]["B7"] = "Returned"
    save(
        w,
        "13-returned-workflow",
        {
            "Summary!B27": "RETURNED: correct and re-review",
            "Payroll!F7": 1000,
        },
    )
    w = case("bad-cutoff")
    reviewers(w)
    w["Summary"]["E5"] = datetime(2026, 10, 20)
    save(
        w,
        "14-invalid-cutoff",
        {
            "Summary!B25": "CHECK: cutoff end is before start",
            "Summary!B27": "CHECK: confirm cutoff details",
        },
    )
    w = case("zero-evidence-dates")
    adjustment(w, 7, "ZERO-DATE", "Addition", 100, date=0)
    payment(w, 7, "ZERO-DATE", 100, date=0)
    save(
        w,
        "16-zero-evidence-dates",
        {
            "Adjustments!J7": 0,
            "Payments!J7": 0,
            "Summary!B19": 2,
        },
    )
    w = case("zero-cutoff")
    reviewers(w)
    w["Summary"]["E5"] = 0
    save(
        w,
        "17-zero-cutoff-date",
        {
            "Summary!B25": "Enter period ID and cutoff dates",
            "Summary!B27": "CHECK: confirm cutoff details",
        },
    )
    example_expectations = {
        "Summary!B14": 2,
        "Summary!B15": 15750,
        "Summary!B16": 6000,
        "Summary!B17": 9750,
        "Summary!B18": 0,
        "Summary!B19": 0,
        "Summary!B27": "APPROVAL RECORDED: payments stay separate",
        "Summary!B28": "Payment records incomplete",
        "Payroll!F7": 10750,
        "Payroll!H7": 4750,
        "Payroll!F8": 5000,
        "Payroll!H8": 5000,
        "Adjustments!J9": 0,
    }
    example = load_workbook(EXAMPLE)
    for name in ["Summary", "Staff", "Payroll", "Adjustments", "Payments"]:
        assert "FICTIONAL" in example[name]["A3"].value
    save(example, "15-fictional-worked-example", example_expectations)

    checks.append(
        "Worked example is labeled fictional and uses separate approval/payment records"
    )
    (QA / "cases.json").write_text(
        json.dumps({"structuralChecks": checks, "cases": cases}, indent=2)
    )
    office = shutil.which("libreoffice") or shutil.which("soffice")
    if not office:
        raise RuntimeError(
            "LibreOffice is required for actual formula calculation checks."
        )
    command = [
        office,
        "-env:UserInstallation=" + (QA / "office-profile").as_uri(),
        "--headless",
        "--convert-to",
        "xlsx:Calc MS Excel 2007 XML",
        "--outdir",
        str(QA / "calculated"),
        *[str(QA / "input" / case["file"]) for case in cases],
    ]
    with (QA / "recalculate.log").open("w") as log:
        subprocess.run(
            command, stdout=log, stderr=subprocess.STDOUT, check=True, timeout=180
        )

    def assert_values(w, expected, filename):
        for target, value in expected.items():
            sheet, cell = target.split("!")
            actual = w[sheet][cell].value
            context = (filename, target, actual, value)
            if value is None:
                assert actual in (None, ""), context
            elif isinstance(value, (int, float)):
                assert isinstance(actual, (int, float)) and math.isclose(
                    actual, value, abs_tol=1e-8
                ), context
            else:
                assert actual == value, context

    # Test both the stored preview values and a separate calculation engine.
    assert_values(
        load_workbook(EXAMPLE, data_only=True), example_expectations, EXAMPLE.name
    )
    results = []
    for case in cases:
        calculated = QA / "calculated" / case["file"]
        assert calculated.is_file(), calculated
        w = load_workbook(calculated, data_only=True)
        errors = [
            (sheet.title, cell.coordinate, cell.value)
            for sheet in w
            for row in sheet
            for cell in row
            if cell.data_type == "e"
        ]
        assert not errors, (case["file"], errors[:10])
        assert_values(w, case["expected"], case["file"])
        results.append(
            {
                "case": case["file"],
                "assertions": len(case["expected"]),
                "formulaErrors": 0,
            }
        )
        print("PASS " + case["file"])
    result = {
        "structuralChecks": checks,
        "cases": results,
        "assertions": sum(case["assertions"] for case in results),
        "cachedExampleAssertions": len(example_expectations),
        "artifacts": {
            p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in [BASE, EXAMPLE]
        },
        "calculationEngine": subprocess.check_output(
            [office, "--version"], text=True
        ).strip(),
        "excelAndGoogleSheetsRuntimeChecked": False,
    }
    (QA / "results.json").write_text(json.dumps(result, indent=2))
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--work-dir", type=Path, default=ROOT / ".local/payroll-v1/qa")
    args = parser.parse_args()
    result = verify(args.work_dir)
    print(
        f"{len(result['cases'])} scenarios passed; {result['assertions']} calculated assertions."
    )


if __name__ == "__main__":
    main()
