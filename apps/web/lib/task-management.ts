import { tsRequest } from "./ts-api";

export type TaskEditFields = {
  title: string;
  assigneeId: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  deadline: string;
  instructions: string;
};

export type TaskEdit = Partial<TaskEditFields> & { version: number };

export function editTask(id: string, input: TaskEdit) {
  return tsRequest(`/tasks/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function cancelTask(id: string, version: number, reason: string) {
  return tsRequest(`/tasks/${id}/cancel`, {
    method: "POST",
    body: JSON.stringify({ version, reason }),
  });
}
