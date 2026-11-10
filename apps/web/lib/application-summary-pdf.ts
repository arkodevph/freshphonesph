import type { PortalApplicationSummary } from "@freshphones/contracts";
import {
  applicationSummaryGeneratedAt,
  applicationSummarySections,
} from "./application-summary";

export async function createApplicationSummaryPdf(
  summary: PortalApplicationSummary,
  fonts: { regular: ArrayBuffer | Uint8Array; bold: ArrayBuffer | Uint8Array },
) {
  const [{ PDFDocument, rgb }, { default: fontkit }] = await Promise.all([
    import("pdf-lib"),
    import("@pdf-lib/fontkit"),
  ]);

  const pdf = await PDFDocument.create();

  pdf.registerFontkit(fontkit);

  const [regular, bold] = await Promise.all([
    pdf.embedFont(fonts.regular),
    pdf.embedFont(fonts.bold),
  ]);

  pdf.setTitle(summary.title);

  pdf.setAuthor("Fresh Phones PH");

  const ink = rgb(0.09, 0.1, 0.12);

  const muted = rgb(0.32, 0.34, 0.39);

  const accent = rgb(0.33, 0.28, 0.76);

  let page = pdf.addPage([595, 842]);

  let y = 790;

  function ensureSpace(height: number) {
    if (y - height < 64) {
      page = pdf.addPage([595, 842]);

      y = 790;
    }
  }

  function line(text: string, size = 10, heavy = false, subtle = false) {
    const font = heavy ? bold : regular;

    const width = 499;

    const draw = (value: string) => {
      ensureSpace(size + 7);

      page.drawText(value, {
        x: 48,
        y,
        size,
        font,
        color: subtle ? muted : ink,
      });

      y -= size + 7;
    };

    let current = "";

    for (const word of text.split(/\s+/)) {
      const candidate = current ? `${current} ${word}` : word;

      if (font.widthOfTextAtSize(candidate, size) <= width) {
        current = candidate;

        continue;
      }

      if (current) {
        draw(current);

        current = "";
      }

      for (const character of word) {
        if (
          current &&
          font.widthOfTextAtSize(current + character, size) > width
        ) {
          draw(current);

          current = "";
        }

        current += character;
      }
    }

    if (current) {
      draw(current);
    }
  }

  page.drawText("Fresh Phones PH", {
    x: 48,
    y,
    size: 15,
    font: bold,
    color: accent,
  });

  y -= 32;

  line(summary.title, 21, true);

  line(
    `Generated ${applicationSummaryGeneratedAt(summary.generatedAt)} (Philippine time)`,
    9,
    false,
    true,
  );

  y -= 9;

  line(summary.notice, 10, false, true);

  for (const section of applicationSummarySections(summary)) {
    ensureSpace(70);

    y -= 16;

    line(section.title, 12, true);

    y -= 3;

    for (const field of section.fields) {
      line(`${field.label}: ${field.value}`);
    }

    if (section.note) {
      y -= 3;

      line(section.note, 9, false, true);
    }
  }

  const pages = pdf.getPages();

  pages.forEach((sheet, index) => {
    sheet.drawText(
      `Fresh Phones PH · Application summary · ${index + 1} of ${pages.length}`,
      {
        x: 48,
        y: 35,
        size: 8,
        font: regular,
        color: muted,
      },
    );
  });

  return pdf.save();
}

export async function downloadApplicationSummaryPdf(
  summary: PortalApplicationSummary,
  isCurrent: () => boolean = () => {
    return true;
  },
) {
  const [regular, bold] = await Promise.all([
    fetch("/fonts/NotoSans-Regular.ttf"),
    fetch("/fonts/NotoSans-Bold.ttf"),
  ]);

  if (!regular.ok || !bold.ok) {
    throw new Error("Could not load the PDF fonts. Please try again.");
  }

  const [regularBytes, boldBytes] = await Promise.all([
    regular.arrayBuffer(),
    bold.arrayBuffer(),
  ]);

  const output = await createApplicationSummaryPdf(summary, {
    regular: regularBytes,
    bold: boldBytes,
  });

  if (!isCurrent()) {
    return;
  }

  const bytes = new Uint8Array(output.length);

  bytes.set(output);

  const url = URL.createObjectURL(
    new Blob([bytes], { type: "application/pdf" }),
  );

  const anchor = document.createElement("a");

  anchor.href = url;

  anchor.download = `fresh-phones-application-${summary.membership.id}.pdf`;

  document.body.append(anchor);

  anchor.click();

  anchor.remove();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 60_000);
}
