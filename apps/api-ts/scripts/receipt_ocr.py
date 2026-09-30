#!/usr/bin/env python3
"""Extract candidate payment fields from a receipt image. Human review is required."""

from __future__ import annotations

import argparse
import io
import json
import os
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path

from PIL import Image, ImageEnhance, ImageOps, UnidentifiedImageError

Image.MAX_IMAGE_PIXELS = 20_000_000

TEMPLATES = json.loads(Path(__file__).with_name("receipt_templates.json").read_text())
MONEY = r"(?:PHP|PhP|₱|P)?\s*([0-9][0-9,]*(?:\.\d{2})?)"
MONTH_DATE = r"(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{4}(?:\s+(?:at\s+)?\d{1,2}:\d{2}(?:\s*[AP]M)?)?"
NUMERIC_DATE = r"\d{1,2}/\d{1,2}/\d{2,4}(?:\s+(?:at\s+)?\d{1,2}:\d{2}(?:\s*[AP]M)?)?"


def labelled_value(text: str, labels: list[str], value_pattern: str) -> str | None:
    for label in labels:
        match = re.search(
            rf"{re.escape(label)}[\s.:#-]*{value_pattern}", text, re.IGNORECASE
        )
        if match:
            return match.group(1).strip()
    return None


def normalized_amount(value: str | None) -> str | None:
    if not value:
        return None
    try:
        return f"{float(value.replace(',', '')):.2f}"
    except ValueError:
        return None


def normalized_date(value: str | None) -> str | None:
    if not value:
        return None
    cleaned = re.sub(r"\s+", " ", value.replace("·", " ")).strip(" ,")
    candidates = [cleaned, re.split(r"\s+(?:at\s+)?\d{1,2}:\d{2}", cleaned, maxsplit=1)[0]]
    formats = (
        "%Y-%m-%d", "%m/%d/%Y", "%m/%d/%y", "%b %d, %Y", "%B %d, %Y",
        "%d %b %Y", "%d %B %Y",
    )
    for candidate in candidates:
        for fmt in formats:
            try:
                return datetime.strptime(candidate.strip(), fmt).date().isoformat()
            except ValueError:
                pass
    return None


def normalized_reference(value: str | None) -> str | None:
    if not value:
        return None
    return re.sub(rf"\s+(?:{MONTH_DATE}|{NUMERIC_DATE}).*$", "", value, flags=re.IGNORECASE).strip()


def reference_value(text: str, labels: list[str], template_key: str) -> str | None:
    for label in labels:
        match = re.search(
            rf"{re.escape(label)}[\s.,:#-]*([A-Z0-9][A-Z0-9 ,:/-]{{4,60}})",
            text, re.IGNORECASE,
        )
        if not match:
            continue
        reference = normalized_reference(match.group(1))
        if template_key == "gcash" and reference:
            following = text[match.end():].lstrip("\r\n").splitlines()
            continuation = re.fullmatch(
                r"\s*(\d(?:[\d ]*\d)?)\s*(?:[AP]M)?\s*",
                following[0], re.IGNORECASE,
            ) if following else None
            if continuation:
                fragment = continuation.group(1).strip()
                digits = re.sub(r"\D", "", reference + fragment)
                if len(digits) == 13 and len(re.sub(r"\D", "", reference)) < 13:
                    reference = f"{reference} {fragment}"
        return reference
    return None


def receipt_time(text: str) -> str | None:
    date = re.search(rf"\b(?:{MONTH_DATE}|{NUMERIC_DATE})\b", text, re.IGNORECASE)
    if not date:
        return None
    clock = re.search(r"\b(\d{1,2}):([0-5]\d)(?:\s*([AP]M))?\b", date.group(0), re.IGNORECASE)
    if not clock or int(clock.group(1)) > 23:
        return None
    meridiem = clock.group(3)
    if not meridiem:
        following = text[date.end():].lstrip("\r\n").splitlines()
        if following:
            continuation = re.fullmatch(r"\s*(?:\d[\d ]*\s+)?([AP]M)\s*", following[0], re.IGNORECASE)
            if continuation:
                meridiem = continuation.group(1)
    return f"{int(clock.group(1))}:{clock.group(2)}{f' {meridiem.upper()}' if meridiem else ''}"


def gcash_name(line: str) -> str | None:
    words = line.split()
    if not 2 <= len(words) <= 4 or not re.fullmatch(r"[A-Z]\.?", words[-1]):
        return None
    name_parts = words[:-1]
    # GCash masks names. Tesseract often reads the dots as lowercase letters or "+-".
    if not any(re.search(r"[•*·.+-]|[a-z]{2,}[A-Z]$", word) for word in name_parts):
        return None
    normalized = []
    for word in name_parts:
        if re.fullmatch(r"M[lI][a-z•*·.+-]+[A-Z]", word):
            prefix, remainder = "MI", word[2:]
        else:
            prefix_match = re.match(r"[A-Z]{1,2}", word)
            if not prefix_match:
                return None
            prefix, remainder = prefix_match.group(), word[prefix_match.end():]
        suffix = remainder[-1] if remainder and remainder[-1].isupper() else ""
        masked = remainder[:-1] if suffix else remainder
        if not masked or not re.fullmatch(r"[a-z•*·.+-]+", masked):
            return None
        masked = masked.replace("+-", "•")
        normalized.append(f"{prefix}{'•' * len(masked)}{suffix}")
    return " ".join([*normalized, words[-1].rstrip(".") + "."])


def gcash_phone(line: str) -> str | None:
    compact = re.sub(r"[\s-]", "", line)
    match = re.fullmatch(r"\+?63([9QO])([0-9A-Za-z•*·.]{9})", compact, re.IGNORECASE)
    if not match or not match.group(2)[-4:].isdigit():
        return None
    middle, ending = match.group(2)[:5], match.group(2)[-4:]
    if middle.isdigit():
        digits = f"9{middle}{ending}"
        return f"+63 {digits[:3]} {digits[3:6]} {digits[6:]}"
    return f"+63 9{''.join(char if char.isdigit() else '•' for char in middle)}{ending}"


def gcash_identity(text: str) -> tuple[str | None, str | None]:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    for index, line in enumerate(lines):
        phone = gcash_phone(line)
        if phone:
            return gcash_name(lines[index - 1]) if index else None, phone
    return None, None


def extract(text: str, template_key: str) -> dict[str, object]:
    template = TEMPLATES[template_key]
    amount = normalized_amount(labelled_value(text, template["amount_labels"], MONEY))
    reference = reference_value(text, template["reference_labels"], template_key)
    date_value = labelled_value(
        text,
        template["date_labels"],
        r"([^\n]{6,40})",
    )
    if not date_value:
        date_match = re.search(rf"\b({MONTH_DATE}|{NUMERIC_DATE})\b", text, re.IGNORECASE)
        date_value = date_match.group(1) if date_match else None
    payment_date = normalized_date(date_value)
    time_value = receipt_time(text)
    receipt_name, receipt_phone = gcash_identity(text) if template_key == "gcash" else (None, None)
    fields = [amount, reference, payment_date]
    warnings = []
    if not amount:
        warnings.append("Amount was not found. Enter it manually.")
    if not reference:
        warnings.append("Reference number was not found. Check the receipt.")
    if not payment_date:
        warnings.append("Payment date was not found. Check the receipt.")
    return {
        "template": template_key,
        "method": template["label"],
        "amount": amount,
        "referenceNumber": reference,
        "paymentDate": payment_date,
        "receiptTime": time_value,
        "receiptName": receipt_name,
        "receiptPhone": receipt_phone,
        "confidence": round(sum(bool(field) for field in fields) / len(fields), 2),
        "warnings": warnings,
    }


def image_text(data: bytes) -> str:
    try:
        image = Image.open(io.BytesIO(data))
        image.verify()
        image = Image.open(io.BytesIO(data)).convert("L")
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as error:
        raise ValueError("The uploaded file is not a readable image.") from error
    if image.width < 200 or image.height < 200:
        raise ValueError("Receipt image is too small to scan.")
    image.thumbnail((2400, 2400))
    image = ImageEnhance.Contrast(ImageOps.autocontrast(image)).enhance(1.5)
    output = io.BytesIO()
    image.save(output, format="PNG")
    result = subprocess.run(
        ["tesseract", "stdin", "stdout", "--psm", "6"],
        input=output.getvalue(), capture_output=True, timeout=20, check=False,
        env={**os.environ, "OMP_THREAD_LIMIT": "1"},
    )
    if result.returncode != 0:
        raise RuntimeError("Receipt OCR could not process this image.")
    return result.stdout.decode("utf-8", errors="replace")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("template", choices=sorted(TEMPLATES))
    parser.add_argument("--text", action="store_true", help="Parse UTF-8 stdin instead of an image")
    args = parser.parse_args()
    source = sys.stdin.buffer.read()
    text = source.decode("utf-8") if args.text else image_text(source)
    print(json.dumps(extract(text, args.template)))


if __name__ == "__main__":
    try:
        main()
    except (ValueError, RuntimeError, subprocess.TimeoutExpired) as error:
        print(json.dumps({"error": str(error)}))
        raise SystemExit(2)
