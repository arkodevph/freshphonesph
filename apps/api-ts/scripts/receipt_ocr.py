#!/usr/bin/env python3
"""Extract candidate payment fields from a receipt image. Human review is required."""

from __future__ import annotations

import argparse
import io
import json
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


def extract(text: str, template_key: str) -> dict[str, object]:
    template = TEMPLATES[template_key]
    amount = normalized_amount(labelled_value(text, template["amount_labels"], MONEY))
    reference = normalized_reference(labelled_value(
        text, template["reference_labels"], r"([A-Z0-9][A-Z0-9 ,:/-]{4,60})"
    ))
    date_value = labelled_value(
        text,
        template["date_labels"],
        r"([^\n]{6,40})",
    )
    if not date_value:
        date_match = re.search(rf"\b({MONTH_DATE}|{NUMERIC_DATE})\b", text, re.IGNORECASE)
        date_value = date_match.group(1) if date_match else None
    payment_date = normalized_date(date_value)
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
