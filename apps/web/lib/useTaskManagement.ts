"use client";

import { useEffect, useRef, useState } from "react";
import {
  cancelTask,
  editTask,
  type TaskEdit,
  type TaskEditFields,
} from "./task-management";

type Snapshot = TaskEditFields & { id: string; version: number };

type Mutate = (
  run: () => Promise<unknown>,
  success: string,
) => Promise<boolean>;

function localDeadline(value: string) {
  const date = new Date(value);

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function useTaskManagement(
  task: Snapshot,
  mutate: Mutate,
  onDirtyChange: (dirty: boolean) => void,
) {
  const [mode, setMode] = useState<"view" | "edit" | "cancel">("view");

  const [form, setForm] = useState<TaskEditFields>(() => {
    return {
      ...task,
      deadline: localDeadline(task.deadline),
    };
  });

  const [reason, setReason] = useState("");

  const original = useRef({ task, form });

  const changes: TaskEdit = { version: original.current.task.version };

  for (const key of [
    "title",
    "assigneeId",
    "priority",
    "instructions",
  ] as const) {
    if (form[key] !== original.current.form[key]) {
      Object.assign(changes, { [key]: form[key] });
    }
  }

  if (form.deadline !== original.current.form.deadline) {
    const date = new Date(form.deadline);

    changes.deadline = Number.isFinite(date.getTime())
      ? date.toISOString()
      : form.deadline;
  }

  const changed = Object.keys(changes).length > 1;

  const dirty =
    mode === "edit" ? changed : mode === "cancel" && Boolean(reason.trim());

  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    return () => {
      return onDirtyChange(false);
    };
  }, [onDirtyChange]);

  function open(next: "edit" | "cancel") {
    const fields = {
      title: task.title,
      assigneeId: task.assigneeId,
      priority: task.priority,
      instructions: task.instructions,
      deadline: localDeadline(task.deadline),
    };

    original.current = { task, form: fields };

    setForm(fields);

    setReason("");

    setMode(next);
  }

  function dismiss() {
    if (dirty && !window.confirm("Discard your unsaved task changes?")) {
      return;
    }

    setMode("view");
  }

  async function save() {
    if (!changed) {
      return;
    }

    if (
      await mutate(() => {
        return editTask(task.id, changes);
      }, "Task updated.")
    ) {
      setMode("view");
    }
  }

  async function cancel() {
    if (
      await mutate(() => {
        return cancelTask(
          task.id,
          original.current.task.version,
          reason.trim(),
        );
      }, "Task cancelled.")
    ) {
      setMode("view");
    }
  }

  return {
    mode,
    form,
    setForm,
    reason,
    setReason,
    changed,
    open,
    dismiss,
    save,
    cancel,
  };
}
