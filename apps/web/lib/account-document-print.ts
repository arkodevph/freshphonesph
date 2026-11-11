// The browser may finish the record request before the brand image/font has decoded.
export async function prepareAccountDocumentPrint(sheet: Element | null) {
  if (!sheet) {
    throw new Error("The account document is not ready. Please try again.");
  }

  await document.fonts.ready;

  try {
    await Promise.all(
      Array.from(sheet.querySelectorAll("img")).map((image) => {
        return image.decode();
      }),
    );
  } catch {
    throw new Error("Could not load the Fresh Phones logo. Please try again.");
  }
}
