import {
  gcashHistoryUploadSchema,
  type GcashHistory,
  type GcashReadingPage,
  type GcashHistoryQuery,
  type GcashHistoryReview,
  type GcashHistoryUpload,
  type GcashSubmission,
  type Page,
} from "@freshphones/contracts";
import { tsDownload, tsRequest, tsUpload } from "./ts-api";

export interface GcashBatchChoice {
  id: string;
  batch_number: string;
  unit_model: string;
}

export async function listGcashBatchChoices(): Promise<GcashBatchChoice[]> {
  const choices: GcashBatchChoice[] = [];

  for (let page = 1; ; page++) {
    const result = await tsRequest<
      Page<{ id: string; code: string; model: string }>
    >(`/batches?page=${page}`);

    choices.push(
      ...result.items.map((batch) => {
        return {
          id: batch.id,
          batch_number: batch.code,
          unit_model: batch.model,
        };
      }),
    );

    if (page * result.pageSize >= result.total) {
      return choices;
    }
  }
}

export function listGcashHistories(query: Partial<GcashHistoryQuery>) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  }

  return tsRequest<Page<GcashHistory>>(`/gcash-history?${params}`);
}

export function getGcashHistory(id: string) {
  return tsRequest<GcashHistory>(`/gcash-history/${id}`);
}

export function getGcashSubmissions(id: string, page = 1) {
  return tsRequest<Page<GcashSubmission>>(
    `/gcash-history/${id}/submissions?page=${page}`,
  );
}

export function uploadGcashHistory(input: GcashHistoryUpload, file: File) {
  const value = gcashHistoryUploadSchema.parse(input);

  const form = new FormData();

  for (const [key, item] of Object.entries(value)) {
    form.set(key, String(item));
  }

  form.set("file", file);

  return tsUpload<GcashHistory>("/gcash-history", form);
}

export function reviewGcashHistory(id: string, input: GcashHistoryReview) {
  return tsRequest<GcashHistory>(`/gcash-history/${id}/review`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function downloadGcashSubmission(id: string) {
  return tsDownload(`/gcash-history/submissions/${id}/file`);
}

export function gcashPdfError(file: Pick<File, "size" | "type">) {
  if (!file.size) {
    return "Choose a PDF with content.";
  }

  if (file.size > 10 * 1024 * 1024) {
    return "GCash history PDF must be 10 MB or smaller.";
  }

  return file.type === "application/pdf"
    ? null
    : "Choose a PDF exported from GCash.";
}

export function getGcashReading(id: string, page = 1) {
  return tsRequest<GcashReadingPage>(
    `/gcash-history/submissions/${id}/reading?page=${page}`,
  );
}
