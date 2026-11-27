import { taskStatuses } from "@freshphones/contracts";
import { tsRequest, tsUpload } from "@/lib/ts-api";
import type { Task, Status } from "./task-view";

export const agentTaskLabels: Record<Status, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  SUBMITTED: "Submitted",
  DONE: "Completed",
  CANCELLED: "Cancelled",
};

export type TaskLocation = { page: number; status?: Status; task?: string };

export const taskIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function agentTaskLocation(
  params: URLSearchParams,
): TaskLocation | null {
  const page = params.get("page") ?? "1";

  const status = params.get("status") || undefined;

  const task = params.get("task") || undefined;

  if (
    !/^\d+$/.test(page) ||
    Number(page) < 1 ||
    Number(page) > 10000 ||
    (status && !taskStatuses.includes(status as Status)) ||
    (task && !taskIdPattern.test(task))
  ) {
    return null;
  }

  return { page: Number(page), status: status as Status | undefined, task };
}

export function agentTaskHref(
  current: TaskLocation,
  next: Partial<TaskLocation>,
) {
  const value = { ...current, ...next };

  const params = new URLSearchParams({ page: String(value.page) });

  if (value.status) {
    params.set("status", value.status);
  }

  if (value.task) {
    params.set("task", value.task);
  }

  return `/system/tasks?${params}`;
}

export function taskStartCommand(row: Task) {
  const body = JSON.stringify({ version: row.version });

  const path = `/tasks/${encodeURIComponent(row.id)}/start`;

  return () => {
    return tsRequest<Task>(path, { method: "PATCH", body });
  };
}

export function taskSubmissionCommand(
  row: Task,
  report: string,
  attachment: File | null,
) {
  const body = new FormData();

  body.set("version", String(row.version));

  body.set("report", report.trim());

  if (attachment) {
    body.set("attachment", attachment);
  }

  const path = `/tasks/${encodeURIComponent(row.id)}/submit`;

  return () => {
    return tsUpload<Task>(path, body);
  };
}

export function taskEvidenceError(file: Pick<File, "size" | "type"> | null) {
  if (!file) {
    return "";
  }

  if (file.size > 5 * 1024 * 1024) {
    return "Choose evidence up to 5 MB.";
  }

  if (
    !["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(
      file.type,
    )
  ) {
    return "Choose a PDF, JPG, PNG or WebP file.";
  }

  return "";
}
