import type { Client } from "@freshphones/contracts";
import type { AccountDocument } from "./account-documents";

export async function downloadAccountPdf(
  client: Client,
  record: AccountDocument,
  options: { signal?: AbortSignal; beforeDownload?: () => Promise<void> } = {},
) {
  const [{ createAccountPdf }, regularResponse, boldResponse, logoResponse] =
    await Promise.all([
      import("./account-pdf-renderer"),
      fetch("/fonts/NotoSans-Regular.ttf", { signal: options.signal }),
      fetch("/fonts/NotoSans-Bold.ttf", { signal: options.signal }),
      fetch("/brand/fresh-phones-logo.png", { signal: options.signal }),
    ]);

  if (!regularResponse.ok || !boldResponse.ok) {
    throw new Error("Could not load the PDF font. Please try again.");
  }

  if (!logoResponse.ok) {
    throw new Error("Could not load the Fresh Phones logo. Please try again.");
  }

  const [regular, bold, logo] = await Promise.all([
    regularResponse.arrayBuffer(),
    boldResponse.arrayBuffer(),
    logoResponse.arrayBuffer(),
  ]);

  options.signal?.throwIfAborted();

  const pdfBytes = await createAccountPdf(client, record, {
    regular,
    bold,
    logo,
  });

  options.signal?.throwIfAborted();

  await options.beforeDownload?.();

  options.signal?.throwIfAborted();

  const bytes = new Uint8Array(pdfBytes.length);

  bytes.set(pdfBytes);

  const url = URL.createObjectURL(
    new Blob([bytes], { type: "application/pdf" }),
  );

  const anchor = document.createElement("a");

  anchor.href = url;

  anchor.download =
    "payment" in record
      ? `fresh-phones-payment-${record.payment.id}.pdf`
      : "fresh-phones-statement.pdf";

  document.body.append(anchor);

  anchor.click();

  anchor.remove();

  setTimeout(() => {
    return URL.revokeObjectURL(url);
  }, 60_000);
}
