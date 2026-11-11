import type { Batch } from "./api";
import type { BatchSortField } from "@freshphones/contracts";

export type BatchTableSort = { key: BatchSortField; direction: "asc" | "desc" };

export const newestBatchSort: BatchTableSort = {
  key: "createdAt",
  direction: "desc",
};

export function nextBatchSort(
  current: BatchTableSort,
  key: BatchSortField,
): BatchTableSort {
  return {
    key,
    direction:
      current.key === key && current.direction === "asc" ? "desc" : "asc",
  };
}

export function batchCadenceLabel(batch: Batch) {
  switch (batch.cadence) {
    case "semimonthly":
      return batch.first_due_date
        ? "Bi-monthly"
        : "Every 15 days (existing plan)";
    case "monthly":
      return batch.first_due_date ? "Monthly" : "Every 30 days (existing plan)";
    case "weekly":
      return "Weekly";
    default:
      return "—";
  }
}

export function batchText(value?: string | null) {
  return value?.trim() || "—";
}
