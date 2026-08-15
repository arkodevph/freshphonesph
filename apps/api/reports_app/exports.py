"""Export builders — CSV / XLSX from flat report rows (docs/14 S4.1).

Exports carry only the authorized columns passed in (no sensitive fields).
"""
import csv
import io

from openpyxl import Workbook


def rows_to_csv(rows: list[dict], columns: list[tuple[str, str]]) -> bytes:
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow([label for _key, label in columns])
    for row in rows:
        writer.writerow([_stringify(row.get(key)) for key, _label in columns])
    return buf.getvalue().encode("utf-8")


def rows_to_xlsx(rows: list[dict], columns: list[tuple[str, str]], title="Report") -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = title[:31]  # Excel sheet-name limit
    ws.append([label for _key, label in columns])
    for row in rows:
        ws.append([_stringify(row.get(key)) for key, _label in columns])
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def _stringify(value):
    if value is None:
        return ""
    return str(value)
