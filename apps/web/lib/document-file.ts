const maxDocumentBytes = 5 * 1024 * 1024;

const documentTypes = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

const extensionTypes: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

const typeAliases: Record<string, string> = {
  "application/x-pdf": "application/pdf",
  "image/jpg": "image/jpeg",
  "image/pjpeg": "image/jpeg",
  "image/x-png": "image/png",
};

/** Some file pickers omit MIME metadata. The API still validates the actual file bytes. */
export function prepareDocumentFile(file: File): File {
  const suppliedType = file.type.trim().toLowerCase();

  if (
    /\.(heic|heif)$/i.test(file.name) ||
    /image\/hei[cf]/i.test(suppliedType)
  ) {
    throw new Error(
      "HEIC/HEIF photos cannot be reviewed here. Save or share the photo as JPG or PDF, then choose that file.",
    );
  }

  if (file.size === 0) {
    throw new Error("This file is empty. Choose a PDF or image with content.");
  }

  if (file.size > maxDocumentBytes) {
    throw new Error(
      "This file is too large. Choose a PDF, JPG, PNG or WebP file up to 5 MB.",
    );
  }

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";

  const type =
    !suppliedType || suppliedType === "application/octet-stream"
      ? extensionTypes[extension]
      : (typeAliases[suppliedType] ?? suppliedType);

  if (!type || !documentTypes.includes(type)) {
    throw new Error("Choose a PDF, JPG, PNG or WebP file.");
  }

  return type === file.type
    ? file
    : new File([file], file.name, { type, lastModified: file.lastModified });
}
