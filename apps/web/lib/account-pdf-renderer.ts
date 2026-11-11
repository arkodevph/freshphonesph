import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { Client } from "@freshphones/contracts";
import type { AccountDocument } from "./account-documents";
import { formatPeso as money } from "./currency";

type Assets = {
  regular: ArrayBuffer | Uint8Array;
  bold: ArrayBuffer | Uint8Array;
  logo: ArrayBuffer | Uint8Array;
};

type Cell = { text: string; width: number; numeric?: boolean };

const date = (value: string) => {
  return new Date(`${value.slice(0, 10)}T00:00:00Z`).toLocaleDateString(
    "en-PH",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "Asia/Manila",
    },
  );
};

// Wrap complete values, including long unbroken payment references. Never ellipsize records.
function wrap(text: string, font: PDFFont, size: number, width: number) {
  const lines: string[] = [];

  for (const paragraph of text.split("\n")) {
    let line = "";

    for (const word of paragraph.split(/\s+/)) {
      if (!word) {
        continue;
      }

      const candidate = line ? `${line} ${word}` : word;

      if (font.widthOfTextAtSize(candidate, size) <= width) {
        line = candidate;

        continue;
      }

      if (line) {
        lines.push(line);

        line = "";
      }

      for (const character of word) {
        if (line && font.widthOfTextAtSize(line + character, size) > width) {
          lines.push(line);

          line = "";
        }

        line += character;
      }
    }

    lines.push(line);
  }

  return lines;
}

export async function createAccountPdf(
  client: Client,
  record: AccountDocument,
  assets: Assets,
) {
  const pdf = await PDFDocument.create();

  pdf.registerFontkit(fontkit);

  const [regular, bold, logo] = await Promise.all([
    pdf.embedFont(assets.regular),
    pdf.embedFont(assets.bold),
    pdf.embedPng(assets.logo),
  ]);

  pdf.setTitle(record.title);

  pdf.setAuthor("Fresh Phones PH");

  pdf.setSubject(
    "Operational account document; not an official BIR sales invoice.",
  );

  const W = 595.28,
    H = 841.89,
    left = 51.02,
    width = W - left * 2;

  const ink = rgb(28 / 255, 45 / 255, 64 / 255),
    muted = rgb(102 / 255, 112 / 255, 133 / 255),
    blue = rgb(60 / 255, 95 / 255, 204 / 255),
    border = rgb(220 / 255, 226 / 255, 235 / 255),
    tint = rgb(240 / 255, 243 / 255, 250 / 255);

  const generated = new Date(record.generatedAt).toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
  });

  const noticeLines = wrap(record.notice, regular, 8, width);

  const bottom = H - 48.19 - (noticeLines.length * 11 + 46);

  let page: PDFPage;

  let top = 0;

  const text = (
    value: string,
    x: number,
    y: number,
    size = 10,
    heavy = false,
    color = ink,
  ) => {
    page.drawText(value, {
      x,
      y: H - y - size,
      font: heavy ? bold : regular,
      size,
      color,
    });
  };

  const rule = (
    y: number,
    x = left,
    length = width,
    color = border,
    thickness = 0.65,
  ) => {
    page.drawLine({
      start: { x, y: H - y },
      end: { x: x + length, y: H - y },
      color,
      thickness,
    });
  };

  const box = (x: number, y: number, w: number, h: number, fill = tint) => {
    page.drawRectangle({
      x,
      y: H - y - h,
      width: w,
      height: h,
      color: fill,
      borderColor: border,
      borderWidth: 0.65,
    });
  };

  const newPage = () => {
    page = pdf.addPage([W, H]);

    page.drawImage(logo, {
      x: left,
      y: H - 48.19 - 65.2,
      width: 65.2,
      height: 65.2,
    });

    text("Fresh Phones PH", left + 79, 64, 17, true);

    text("Gadget Center", left + 79, 91, 9, false, muted);

    const metadata = [
      "ACCOUNT DOCUMENT",
      "Generated",
      generated,
      "Philippine time",
    ];

    metadata.forEach((line, i) => {
      const size = i === 0 ? 7 : 7.5;

      const font = i === 0 ? bold : regular;

      text(
        line,
        W - left - font.widthOfTextAtSize(line, size),
        59 + i * 12,
        size,
        i === 0,
        i === 0 ? blue : muted,
      );
    });

    rule(136, left, width, blue, 1.5);

    top = 157;

    if (pdf.getPageCount() > 1) {
      text(`${record.title} · continued`, left, top, 12, true);

      top += 22;

      text(`Member reference: ${client.id}`, left, top, 8, false, muted);

      top += 28;
    }
  };

  const ensure = (height: number) => {
    if (top + height > bottom) {
      newPage();
    }
  };

  // Paragraphs may span pages; each page still retains the account header and footer.
  const paragraph = (value: string, size = 9, heavy = false, color = muted) => {
    const lines = wrap(value, heavy ? bold : regular, size, width);

    for (const line of lines) {
      ensure(size + 5);

      text(line, left, top, size, heavy, color);

      top += size + 5;
    }
  };

  const heading = (value: string) => {
    ensure(55);

    text(value.toUpperCase(), left, top, 9, true);

    top += 25;
  };

  const fields = (items: [string, string][]) => {
    for (let i = 0; i < items.length; i += 2) {
      const row = items.slice(i, i + 2).map(([label, value]) => {
        return { label, lines: wrap(value, bold, 10, (width - 34) / 2) };
      });

      let offset = 0;

      const count = Math.max(
        ...row.map((cell) => {
          return cell.lines.length;
        }),
      );

      while (offset < count) {
        ensure(49);

        const capacity = Math.max(1, Math.floor((bottom - top - 25) / 14));

        const take = Math.min(count - offset, capacity);

        row.forEach((cell, col) => {
          const x = left + (col * (width + 34)) / 2;

          text(
            cell.label + (offset ? " · continued" : ""),
            x,
            top,
            8,
            false,
            muted,
          );

          cell.lines.slice(offset, offset + take).forEach((line, j) => {
            text(line, x, top + 17 + j * 14, 10, true);
          });
        });

        top += 25 + take * 14;

        offset += take;

        if (offset < count) {
          newPage();
        }
      }
    }

    rule(top + 5);

    top += 29;
  };

  const table = (labels: Cell[], rows: string[][]) => {
    const sizes = labels.map((col, i) => {
      if (!col.numeric) {
        return 8.5;
      }

      const longest = Math.max(
        ...rows.map((row) => {
          return regular.widthOfTextAtSize(row[i], 8.5);
        }),
        1,
      );

      return Math.min(8.5, (8.5 * (col.width - 14)) / longest);
    });

    const header = () => {
      const lines = labels.map((cell) => {
        return wrap(cell.text, bold, 7.5, cell.width - 14);
      });

      const height =
        Math.max(
          ...lines.map((line) => {
            return line.length;
          }),
        ) *
          11 +
        15;

      box(left, top, width, height);

      let x = left;

      labels.forEach((cell, i) => {
        lines[i].forEach((line, j) => {
          text(
            line,
            cell.numeric
              ? x + cell.width - 7 - bold.widthOfTextAtSize(line, 7.5)
              : x + 7,
            top + 7 + j * 11,
            7.5,
            true,
            muted,
          );
        });

        x += cell.width;
      });

      top += height;
    };

    ensure(70);

    header();

    for (const row of rows) {
      const lines = row.map((value, i) => {
        return labels[i].numeric
          ? [value]
          : wrap(value, regular, sizes[i], labels[i].width - 14);
      });

      const count = Math.max(
        ...lines.map((cell) => {
          return cell.length;
        }),
      );

      // Start normal rows together; exceptionally long references continue without loss.
      if (top + count * 13 + 18 > bottom && count * 13 + 18 < bottom - 245) {
        newPage();

        header();
      }

      let offset = 0;

      while (offset < count) {
        if (bottom - top < 31) {
          newPage();

          header();
        }

        const take = Math.min(
          count - offset,
          Math.max(1, Math.floor((bottom - top - 18) / 13)),
        );

        let x = left;

        labels.forEach((cell, i) => {
          const displayed = lines[i].slice(offset, offset + take);

          displayed.forEach((line, j) => {
            text(
              line,
              cell.numeric
                ? x + cell.width - 7 - regular.widthOfTextAtSize(line, sizes[i])
                : x + 7,
              top + 9 + j * 13,
              sizes[i],
            );
          });

          x += cell.width;
        });

        top += take * 13 + 18;

        rule(top);

        offset += take;
      }
    }

    top += 22;
  };

  const summary = (items: [string, string][]) => {
    ensure(items.length * 34);

    for (const [label, value] of items) {
      const size = Math.min(11, (11 * 135) / bold.widthOfTextAtSize(value, 11));

      text(label, left + width - 260, top, 9, false);

      text(
        value,
        left + width - bold.widthOfTextAtSize(value, size),
        top - 1,
        size,
        true,
        blue,
      );

      rule(top + 22, left + width - 260, 260, border);

      top += 34;
    }
  };

  newPage();

  paragraph(record.title, 23, true, ink);

  top += 8;

  paragraph(
    "payment" in record
      ? `Finance-verified payment record · Payment ID: ${record.payment.id}`
      : `Account position as of ${generated} · Philippine time`,
  );

  top += 23;

  fields([
    ["Customer", client.name],
    ["Member reference", client.id],
    ["Batch", client.batch.code],
    ["Unit", client.unitModel || client.batch.model || "—"],
  ]);

  if ("balance" in record) {
    ensure(100);

    const values = [
      record.balance.totalDue,
      record.balance.verifiedPaid,
      record.balance.remainingBalance,
    ];

    const titles = [
      "Current installment obligation",
      "Finance-verified credit",
      "Remaining balance",
    ];

    const colWidth = width / 3;

    values.forEach((value, i) => {
      const x = left + i * colWidth;

      box(x, top, colWidth, 83, i === 2 ? tint : rgb(1, 1, 1));

      wrap(titles[i], regular, 8, colWidth - 24).forEach((line, j) => {
        text(line, x + 12, top + 13 + j * 12, 8, false, muted);
      });

      const number = money(value);

      const size = Math.min(
        16,
        (16 * (colWidth - 24)) / bold.widthOfTextAtSize(number, 16),
      );

      text(number, x + 12, top + 49, size, true, i === 2 ? blue : ink);
    });

    top += 108;

    if (Number(record.balance.releasedDue ?? 0) > 0) {
      heading("Replacement release");

      fields([
        [
          "Originally issued installment obligation",
          record.balance.originalDue != null
            ? money(record.balance.originalDue)
            : "Not captured",
        ],
        [
          "Unpaid obligation released at replacement",
          money(record.balance.releasedDue!),
        ],
      ]);

      paragraph(
        "The replacement handover released the unpaid obligation shown above. This release is not a payment or refund. Original incoming payments remain in your history; refund decisions and external refund records are tracked separately.",
        8,
      );

      top += 20;
    }

    heading("Verified payment history");

    if (record.verifiedPayments.length) {
      table(
        [
          { text: "Date", width: 72 },
          { text: "Method", width: 61 },
          { text: "Reference", width: width - 313 },
          { text: "Original", width: 90, numeric: true },
          { text: "Current credit", width: 90, numeric: true },
        ],
        record.verifiedPayments.map((payment) => {
          return [
            date(payment.paymentDate),
            payment.method || "—",
            payment.referenceNumber || "—",
            money(payment.amount),
            money(payment.effectiveAmount ?? payment.amount),
          ];
        }),
      );
    } else {
      paragraph("No verified payments yet.");

      top += 20;
    }

    summary([
      ["Total verified credit", money(record.balance.verifiedPaid)],
      ["Remaining balance", money(record.balance.remainingBalance)],
    ]);

    paragraph(
      "Pending and returned claims are excluded from verified credit.",
      8,
    );
  } else {
    fields([
      ["Payment date", date(record.payment.paymentDate)],
      ["Method", record.payment.method || "—"],
    ]);

    heading("Payment details");

    table(
      [
        { text: "Payment / reference", width: width - 220 },
        { text: "Original verified amount", width: 110, numeric: true },
        { text: "Current credit", width: 110, numeric: true },
      ],
      [
        [
          `Installment payment\n${record.payment.referenceNumber || "—"}`,
          money(record.payment.amount),
          money(record.payment.effectiveAmount ?? record.payment.amount),
        ],
      ],
    );

    ensure(70);

    box(left, top, width, 63, rgb(246 / 255, 248 / 255, 253 / 255));

    text("Current verified credit", left + 17, top + 24, 10, true);

    const credit = money(
      record.payment.effectiveAmount ?? record.payment.amount,
    );

    const size = Math.min(24, (24 * 230) / bold.widthOfTextAtSize(credit, 24));

    text(
      credit,
      left + width - 17 - bold.widthOfTextAtSize(credit, size),
      top + (63 - size) / 2 - 2,
      size,
      true,
      blue,
    );

    top += 82;

    paragraph(
      "Original and current credit values remain visible when an adjustment changes the credited amount.",
      8,
    );
  }

  for (const payment of "payment" in record
    ? [record.payment]
    : record.verifiedPayments) {
    if (!payment.adjustments?.length) {
      continue;
    }

    top += 22;

    heading(`Adjustment history · ${date(payment.paymentDate)}`);

    paragraph(
      `Payment ID: ${payment.id} · Reference: ${payment.referenceNumber || "—"}`,
      8,
    );

    top += 8;

    for (const entry of payment.adjustments) {
      paragraph(
        `Adjustment ${entry.sequence}: ${money(entry.amount)} · ${money(entry.beforeAmount)} → ${money(entry.afterAmount)} · ${new Date(entry.createdAt).toLocaleString("en-PH", { timeZone: "Asia/Manila" })} Philippine time`,
        8,
        false,
        ink,
      );

      top += 7;
    }
  }

  top += 15;

  paragraph(
    "Payments are coordinated externally. This document reflects the records verified by Finance at the time shown above.",
    8,
  );

  // Add the real operational notice and page count to every page after pagination.
  const pages = pdf.getPages();

  pages.forEach((current, i) => {
    page = current;

    rule(bottom + 14);

    noticeLines.forEach((line, j) => {
      text(line, left, bottom + 24 + j * 11, 8, false, muted);
    });

    const y = bottom + 34 + noticeLines.length * 11;

    text("Fresh Phones PH", left, y, 7, false, muted);

    const counter = `${i + 1} / ${pages.length}`;

    text(
      counter,
      W - left - regular.widthOfTextAtSize(counter, 7),
      y,
      7,
      false,
      muted,
    );
  });

  return pdf.save();
}
