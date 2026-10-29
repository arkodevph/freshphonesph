#!/usr/bin/env python3
"""Read a private GCash PDF. Input: one JSON options line, then PDF bytes.

Passwords are supplied on stdin only. Temporary decrypted pages are removed on exit.
This produces review evidence, never payment records or financial approval.
"""
from __future__ import annotations

import csv
import io
import json
import os
import re
import resource
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET
from datetime import datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path
from statistics import median

MAX_PAGES = 20
MAX_ROWS = 1000
MAX_BYTES = 10 * 1024 * 1024
MONEY = re.compile(r"(?:\d{1,3}(?:,\d{3})+|\d+)\.\d{2}")
DATE = re.compile(r"\d{4}-\d{2}-\d{2}")


class ReadingError(Exception):
    def __init__(self, code: str):
        self.code = code


def run(args: list[str], timeout: int = 20) -> bytes:
    try:
        result = subprocess.run(args, capture_output=True, timeout=timeout,
                                env={**os.environ, "OMP_THREAD_LIMIT": "1"})
    except FileNotFoundError as error:
        raise ReadingError("UNAVAILABLE") from error
    except subprocess.TimeoutExpired as error:
        raise ReadingError("TIMEOUT") from error
    if result.returncode:
        raise ReadingError("UNREADABLE")
    if len(result.stdout) > 12 * 1024 * 1024:
        raise ReadingError("LIMIT")
    return result.stdout


def text_pages(path: Path) -> list[list[dict]]:
    raw = run(["pdftotext", "-bbox-layout", str(path), "-"], 25)
    root = ET.fromstring(raw)
    ns = {"h": "http://www.w3.org/1999/xhtml"}
    result = []
    for page in root.findall(".//h:page", ns):
        width = float(page.attrib["width"])
        scale = 595 / width
        words = []
        for word in page.findall(".//h:word", ns):
            words.append({"text": "".join(word.itertext()),
                          "left": float(word.attrib["xMin"]) * scale,
                          "right": float(word.attrib["xMax"]) * scale,
                          "y": (float(word.attrib["yMin"]) + float(word.attrib["yMax"])) * scale / 2,
                          "confidence": 100.0})
        result.append(words)
    return result


def ocr_page(path: Path, page: int, folder: Path) -> list[dict]:
    prefix = folder / f"page-{page}"
    run(["pdftoppm", "-f", str(page), "-l", str(page), "-singlefile", "-r", "250",
         "-scale-to", "3000", "-png", str(path), str(prefix)], 20)
    image = prefix.with_suffix(".png")
    os.chmod(image, 0o600)
    raw = run(["tesseract", str(image), "stdout", "-l", "eng", "--psm", "6", "tsv"], 25)
    # Image width comes from the PNG IHDR, avoiding another imaging dependency.
    header = image.read_bytes()[:24]
    width = int.from_bytes(header[16:20], "big")
    scale = 595 / width
    result = []
    for row in csv.DictReader(io.StringIO(raw.decode("utf-8", errors="replace")), delimiter="\t", quoting=csv.QUOTE_NONE):
        if not row.get("text", "").strip() or row.get("level") != "5":
            continue
        left, top, w, h = (float(row[key]) for key in ["left", "top", "width", "height"])
        text = row["text"].strip()
        # Tesseract can join adjacent date/time columns into one word.
        # Keep their exact recognized characters while restoring row anchors.
        joined = re.fullmatch(r"(\d{4}-\d{2}-\d{2})(\d{1,2}:\d{2})([AP]M)", text, re.I)
        parts = joined.groups() if joined else (text,)
        offset = 0
        for part in parts:
            part_left = left + w * offset / len(text)
            offset += len(part)
            result.append({"text": part, "left": part_left * scale,
                           "right": (left + w * offset / len(text)) * scale,
                           "y": (top + h / 2) * scale,
                           "confidence": float(row["conf"])})
    image.unlink(missing_ok=True)
    return result


def cash(text: str) -> Decimal | None:
    text = text.strip().replace("PHP", "").replace("₱", "").strip()
    if not MONEY.fullmatch(text):
        return None
    try:
        value = Decimal(text.replace(",", ""))
        return value if value < Decimal("1000000000000") else None
    except InvalidOperation:
        return None


def line_groups(words: list[dict]) -> list[list[dict]]:
    groups: list[list[dict]] = []
    for word in sorted(words, key=lambda item: (item["y"], item["left"])):
        if not groups or abs(groups[-1][0]["y"] - word["y"]) > 2.2:
            groups.append([word])
        else:
            groups[-1].append(word)
    return [sorted(group, key=lambda item: item["left"]) for group in groups]


def parse_page(words: list[dict], number: int, ocr: bool) -> tuple[list[dict], dict, list[str]]:
    labels = {}
    warnings = []
    for group in line_groups(words):
        mapping = {re.sub(r"[^a-z]", "", w["text"].lower()): w for w in group}
        if all(label in mapping for label in ["description", "reference", "debit", "credit", "balance"]):
            labels = mapping
            break
    if not labels:
        return [], {}, [f"Page {number}: transaction columns were not recognized. Review the original PDF."]
    header_y = labels["description"]["y"]
    dates = sorted([w for w in words if w["left"] < 100 and w["y"] > header_y
                    and DATE.fullmatch(w["text"])], key=lambda w: w["y"])
    refs = [w for w in words if labels["description"]["right"] < w["left"] < labels["debit"]["left"]
            and re.fullmatch(r"\d{13}", w["text"]) and w["y"] > header_y]
    ref_left = median(w["left"] for w in refs) - 2 if refs else labels["reference"]["left"] - 15
    debit_left = (max((w["right"] for w in refs), default=labels["reference"]["right"]) + labels["debit"]["left"]) / 2
    credit_left = (labels["debit"]["right"] + labels["credit"]["left"]) / 2
    balance_left = (labels["credit"]["right"] + labels["balance"]["left"]) / 2
    summary = {}
    summary_y = []
    opening_y = header_y
    for group in line_groups(words):
        label = "".join(re.sub(r"[^A-Z]", "", w["text"].upper()) for w in group if cash(w["text"]) is None)
        for key, marker in [("openingBalance", "BEGINNINGBALANCE"), ("openingBalance", "OPENINGBALANCE"), ("openingBalance", "STARTINGBALANCE"),
                            ("closingBalance", "ENDINGBALANCE"), ("closingBalance", "CLOSINGBALANCE"),
                            ("totalDebit", "TOTALDEBIT"), ("totalCredit", "TOTALCREDIT")]:
            if label == marker:
                values = [cash(w["text"]) for w in group if cash(w["text"]) is not None]
                if len(values) == 1:
                    summary[key] = values[0]
                    if key == "openingBalance":
                        opening_y = group[0]["y"]
                    if key != "openingBalance":
                        summary_y.append(group[0]["y"])

    rows = []
    for index, date in enumerate(dates):
        if len(rows) >= MAX_ROWS:
            raise ReadingError("LIMIT")
        low = (dates[index - 1]["y"] + date["y"]) / 2 if index else (opening_y + date["y"]) / 2
        high = (date["y"] + dates[index + 1]["y"]) / 2 if index + 1 < len(dates) else min(summary_y, default=date["y"] + 8) - 0.1
        band = [w for w in words if low <= w["y"] < high]
        flags = []
        prefix = sorted([w for w in band if w["left"] < min(ref_left, labels["description"]["left"])
                         and (w["text"] == date["text"] or re.fullmatch(r"\d{1,2}:\d{2}|[AP]M", w["text"], re.I))], key=lambda w: w["left"])
        time = " ".join(w["text"] for w in prefix if w["text"] != date["text"])
        try:
            datetime.strptime(date["text"], "%Y-%m-%d")
            datetime.strptime(time.upper(), "%I:%M %p")
        except ValueError:
            flags.append("Check the date or time against the PDF.")
        description_left = max((w["right"] for w in prefix), default=100) + 1
        description = " ".join(w["text"] for group in line_groups([w for w in band if description_left < w["left"] < ref_left]) for w in group)
        reference = "".join(w["text"] for w in sorted(band, key=lambda w: w["left"]) if ref_left <= w["left"] and w["right"] < debit_left)
        if not re.fullmatch(r"\d{13}", reference):
            flags.append("Check the reference number against the PDF.")
        if not description or len(description) > 1500:
            flags.append("Check the transaction description against the PDF.")
        fields = {}
        for name, left, right in [("debit", debit_left, credit_left), ("credit", credit_left, balance_left), ("balance", balance_left, 595)]:
            tokens = [w for w in band if left <= w["left"] and w["right"] < right + 2]
            value = cash("".join(w["text"] for w in sorted(tokens, key=lambda w: w["left"]))) if tokens else None
            if tokens and value is None:
                flags.append(f"Check the {name} amount against the PDF.")
            fields[name] = value
        if (fields["debit"] is None) == (fields["credit"] is None) or fields["balance"] is None:
            flags.append("Check the debit, credit and balance columns.")
        if ocr and any(w["confidence"] < 65 for w in band):
            flags.append("Some scanned text has low recognition confidence.")
        rows.append({"page": number, "date": date["text"], "time": time[:20],
                     "description": description[:1500], "reference": reference[:100],
                     **{key: f"{value:.2f}" if value is not None else None for key, value in fields.items()},
                     "warnings": flags})
    if len(refs) > len(rows):
        warnings.append(f"Page {number}: some reference numbers could not be aligned to transaction dates.")
    if not rows:
        warnings.append(f"Page {number}: no transaction rows were identified. Review the original PDF.")
    return rows, summary, warnings


def read_pdf(data: bytes, password: str) -> dict:
    try:
        from pypdf import PdfReader, PdfWriter
        from pypdf.errors import PdfReadError
    except ImportError as error:
        raise ReadingError("UNAVAILABLE") from error
    try:
        reader = PdfReader(io.BytesIO(data), strict=False)
        if reader.is_encrypted:
            if not password:
                raise ReadingError("PASSWORD_REQUIRED")
            if not reader.decrypt(password):
                raise ReadingError("PASSWORD_INCORRECT")
        count = len(reader.pages)
        if not 1 <= count <= MAX_PAGES:
            raise ReadingError("PAGE_LIMIT")
        rows, summary, warnings, methods = [], {}, [], set()
        with tempfile.TemporaryDirectory(prefix="pages-", dir=os.environ.get("GCASH_TMP_ROOT")) as scratch:
            folder = Path(scratch)
            path = folder / "document.pdf"
            writer = PdfWriter()
            for page in reader.pages:
                writer.add_page(page)
            with path.open("wb") as stream:
                os.chmod(path, 0o600)
                writer.write(stream)
            pages = text_pages(path)
            if len(pages) != count:
                raise ReadingError("UNREADABLE")
            for number, words in enumerate(pages, 1):
                ocr = len(words) < 8 or sum(len(w["text"]) for w in words) < 40
                if ocr:
                    words = ocr_page(path, number, folder)
                parsed, totals, issues = parse_page(words, number, ocr)
                if not parsed and not ocr:
                    # Some scans retain a selectable header above an image-only table.
                    words = ocr_page(path, number, folder)
                    ocr = True
                    parsed, totals, issues = parse_page(words, number, True)
                methods.add("OCR" if ocr else "TEXT")
                rows.extend(parsed)
                if len(rows) > MAX_ROWS:
                    raise ReadingError("LIMIT")
                summary.update(totals)
                warnings.extend(issues)
        debit = sum((Decimal(row["debit"] or "0") for row in rows), Decimal(0))
        credit = sum((Decimal(row["credit"] or "0") for row in rows), Decimal(0))
        previous = summary.get("openingBalance")
        running = []
        for row in rows:
            if previous is not None and row["balance"] is not None:
                running.append(previous - Decimal(row["debit"] or "0") + Decimal(row["credit"] or "0") == Decimal(row["balance"]))
            previous = Decimal(row["balance"]) if row["balance"] is not None else None
        checks = {
            "debitTotalMatches": debit == summary["totalDebit"] if rows and "totalDebit" in summary else None,
            "creditTotalMatches": credit == summary["totalCredit"] if rows and "totalCredit" in summary else None,
            "runningBalancesMatch": all(running) if len(running) == len(rows) and rows else None,
            "closingBalanceMatches": previous == summary["closingBalance"] if rows and "closingBalance" in summary and previous is not None else None,
        }
        if "OCR" in methods:
            warnings.append("Scanned text was read with OCR. Check amounts and reference numbers against the original PDF.")
        if any(value is False for value in checks.values()):
            warnings.append("Some extracted totals or balances do not reconcile. Check the original PDF.")
        if any(row["warnings"] for row in rows):
            warnings.append("Some transaction fields need manual checking.")
        if rows and any(value is None for value in checks.values()):
            warnings.append("Some statement totals or balances could not be checked.")
        warnings = list(dict.fromkeys(warnings))
        return {"version": 1, "status": "UNSUPPORTED" if not rows else "PARTIAL" if warnings else "PARSED",
                "method": "MIXED" if len(methods) > 1 else next(iter(methods)), "pages": count,
                "transactionCount": len(rows), "rows": rows,
                **{key: f"{summary[key]:.2f}" if key in summary else None for key in ["openingBalance", "closingBalance", "totalDebit", "totalCredit"]},
                "calculatedDebit": f"{debit:.2f}", "calculatedCredit": f"{credit:.2f}",
                "checks": checks, "warnings": warnings}
    except ReadingError:
        raise
    except (PdfReadError, ValueError, KeyError, ET.ParseError, NotImplementedError, OSError) as error:
        raise ReadingError("UNREADABLE") from error


def main() -> None:
    os.umask(0o077)
    resource.setrlimit(resource.RLIMIT_AS, (768 * 1024 * 1024, 768 * 1024 * 1024))
    resource.setrlimit(resource.RLIMIT_FSIZE, (32 * 1024 * 1024, 32 * 1024 * 1024))
    resource.setrlimit(resource.RLIMIT_CPU, (80, 80))
    options = sys.stdin.buffer.readline(2049)
    if len(options) > 2048:
        raise ReadingError("UNREADABLE")
    try:
        password = json.loads(options).get("password", "")
    except (ValueError, AttributeError) as error:
        raise ReadingError("UNREADABLE") from error
    if not isinstance(password, str) or len(password) > 128:
        raise ReadingError("UNREADABLE")
    data = sys.stdin.buffer.read(MAX_BYTES + 1)
    if not data.startswith(b"%PDF-") or len(data) > MAX_BYTES:
        raise ReadingError("UNREADABLE")
    print(json.dumps(read_pdf(data, password)))


if __name__ == "__main__":
    try:
        main()
    except ReadingError as error:
        print(json.dumps({"error": error.code}))
        sys.exit(1)
    except Exception:
        # Never emit PDF contents, passwords, subprocess stderr or parser tracebacks.
        print(json.dumps({"error": "UNREADABLE"}))
        sys.exit(1)
