import type { Client, ClientBalance, Payment } from "@freshphones/contracts";

type Statement = { title: string; notice: string; generatedAt: string; balance: ClientBalance; verifiedPayments: Pick<Payment, "id" | "amount" | "effectiveAmount" | "adjustments" | "paymentDate" | "method" | "referenceNumber">[] };
type Confirmation = { title: string; notice: string; generatedAt: string; payment: Payment };
const money = (value: string) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(value));
const date = (value: string) => new Date(value).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });

export async function downloadAccountPdf(client: Client, record: Statement | Confirmation) {
  const [{ PDFDocument, rgb }, { default: fontkit }, regularResponse, boldResponse] = await Promise.all([
    import("pdf-lib"), import("@pdf-lib/fontkit"), fetch("/fonts/NotoSans-Regular.ttf"), fetch("/fonts/NotoSans-Bold.ttf"),
  ]);
  if (!regularResponse.ok || !boldResponse.ok) throw new Error("Could not load the PDF font. Please try again.");
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const [regular, bold] = await Promise.all([
    pdf.embedFont(await regularResponse.arrayBuffer()), pdf.embedFont(await boldResponse.arrayBuffer()),
  ]);
  pdf.setTitle(record.title);
  pdf.setAuthor("Fresh Phones PH");
  const dark = rgb(0.15, 0.17, 0.36);
  const muted = rgb(0.36, 0.42, 0.55);
  const purple = rgb(0.31, 0.20, 0.74);
  let page = pdf.addPage([595, 842]);
  let y = 790;
  const newPage = () => { page = pdf.addPage([595, 842]); y = 790; };
  const line = (text: string, size = 10, heavy = false, color = dark) => {
    const font = heavy ? bold : regular;
    const maxWidth = 505;
    const words = text.split(/\s+/);
    let current = "";
    const draw = (value: string) => {
      if (y < 70) newPage();
      page.drawText(value, { x: 45, y, size, font, color });
      y -= size + 8;
    };
    for (const word of words) {
      if (font.widthOfTextAtSize(word, size) > maxWidth) {
        if (current) { draw(current); current = ""; }
        let chunk = "";
        for (const character of word) {
          if (font.widthOfTextAtSize(chunk + character, size) > maxWidth && chunk) { draw(chunk); chunk = ""; }
          chunk += character;
        }
        current = chunk;
        continue;
      }
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) { draw(current); current = word; }
      else current = candidate;
    }
    if (current) draw(current);
  };
  line("Fresh Phones PH", 17, true, purple);
  y -= 8;
  line(record.title, 18, true);
  line(`Generated ${new Date(record.generatedAt).toLocaleString("en-PH")}`, 9, false, muted);
  y -= 10;
  line(`Customer: ${client.name}`);
  line(`Batch: ${client.batch.code}`);
  line(`Unit: ${client.unitModel || client.batch.model}`);
  y -= 12;
  if ("balance" in record) {
    line("Account balance", 13, true, purple);
    line(`Total due: ${money(record.balance.totalDue)}`);
    line(`Finance-verified paid: ${money(record.balance.verifiedPaid)}`);
    line(`Remaining balance: ${money(record.balance.remainingBalance)}`, 11, true);
    y -= 10;
    line("Verified payments", 13, true, purple);
    if (!record.verifiedPayments.length) line("No verified payments yet.");
    for (const payment of record.verifiedPayments)
      line(`${date(payment.paymentDate)}  |  Credit: ${money(payment.effectiveAmount ?? payment.amount)}  |  Original: ${money(payment.amount)}  |  ${payment.method}  |  Ref: ${payment.referenceNumber || "—"}`, 9);
  } else {
    line("Verified payment", 13, true, purple);
    line(`Original verified amount: ${money(record.payment.amount)}`, 11, true);
    line(`Current credit: ${money(record.payment.effectiveAmount ?? record.payment.amount)}`, 11, true);
    line(`Payment date: ${date(record.payment.paymentDate)}`);
    line(`Method: ${record.payment.method}`);
    line(`Reference: ${record.payment.referenceNumber || "—"}`);
  }
  for (const payment of "payment" in record ? [record.payment] : record.verifiedPayments) {
    if (!payment.adjustments?.length) continue;
    y -= 10;
    line(`Adjustment history: ${date(payment.paymentDate)}`, 12, true, purple);
    for (const entry of payment.adjustments)
      line(`Adjustment ${entry.sequence}: ${money(entry.amount)} | ${money(entry.beforeAmount)} → ${money(entry.afterAmount)} | ${new Date(entry.createdAt).toLocaleString("en-PH", { timeZone: "Asia/Manila" })}`, 9);
  }
  y -= 18;
  line(record.notice, 10, true, purple);
  line("Payments are coordinated externally. This document reflects Finance-verified records at the time shown above.", 9, false, muted);
  const pdfBytes = await pdf.save();
  const bytes = new Uint8Array(pdfBytes.length);
  bytes.set(pdfBytes);
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "payment" in record ? `fresh-phones-payment-${record.payment.id}.pdf` : "fresh-phones-statement.pdf";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
