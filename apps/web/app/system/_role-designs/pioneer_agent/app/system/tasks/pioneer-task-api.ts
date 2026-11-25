import { tsRequest, tsUpload } from "@/lib/ts-api";
import type { Assignee, Page, Task, Priority } from "./task-view";

export type Assignment = {
  title: string;
  instructions: string;
  assigneeId: string;
  priority: Priority;
  deadline: string;
};

export const taskApi = {
  list(query: string) {
    return tsRequest<Page<Task>>(`/tasks?${query}`);
  },
  assignees() {
    return tsRequest<Assignee[]>("/tasks/assignees");
  },
  detail(id: string) {
    return tsRequest<Task>(`/tasks/${id}`);
  },
  assign(form: Assignment, key: string) {
    return tsRequest<Task>("/tasks", {
      method: "POST",
      headers: { "Idempotency-Key": key },
      body: JSON.stringify(form),
    });
  },
  action(task: Task, action: "start" | "complete") {
    return tsRequest<Task>(`/tasks/${task.id}/${action}`, {
      method: action === "start" ? "PATCH" : "POST",
      body: JSON.stringify({ version: task.version }),
    });
  },
  submit(task: Task, report: string, file: File | null) {
    const body = new FormData();

    body.set("version", String(task.version));

    body.set("report", report.trim());

    if (file) {
      body.set("attachment", file);
    }

    return tsUpload<Task>(`/tasks/${task.id}/submit`, body);
  },
};
