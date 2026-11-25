"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { ApiError } from "@/lib/ts-api";
import { deadlineDefault, message, type Assignee } from "./task-view";
import { taskApi, type Assignment } from "./pioneer-task-api";

export function usePioneerAssignment(reload: () => Promise<boolean>) {
  const [form, setForm] = useState<Assignment>({
    title: "",
    instructions: "",
    assigneeId: "",
    priority: "MEDIUM",
    deadline: deadlineDefault(),
  });

  const [assignees, setAssignees] = useState<Assignee[]>([]);

  const [lookupError, setLookupError] = useState("");

  const [error, setError] = useState("");

  const [notice, setNotice] = useState("");

  const [busy, setBusy] = useState(false);

  const guard = useRef(false);

  const identity = useRef<{ body: string; key: string } | null>(null);

  const lookupSequence = useRef(0);

  const loadAssignees = useCallback(async () => {
    const request = ++lookupSequence.current;

    try {
      const rows = await taskApi.assignees();

      if (request === lookupSequence.current) {
        setAssignees(rows);

        setLookupError("");
      }
    } catch (error) {
      if (request === lookupSequence.current) {
        setLookupError(message(error));

        if (error instanceof ApiError && [401, 403].includes(error.status)) {
          setAssignees([]);
        }
      }
    }
  }, []);

  useEffect(() => {
    void loadAssignees();

    return () => {
      lookupSequence.current++;
    };
  }, [loadAssignees]);

  async function assign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (guard.current) {
      return;
    }

    guard.current = true;

    setBusy(true);

    setError("");

    setNotice("");

    try {
      const input = {
        ...form,
        title: form.title.trim(),
        instructions: form.instructions.trim(),
        assigneeId: form.assigneeId.toLowerCase(),
        deadline: new Date(form.deadline).toISOString(),
      };

      const body = JSON.stringify(input);

      if (identity.current?.body !== body) {
        identity.current = { body, key: crypto.randomUUID() };
      }

      await taskApi.assign(input, identity.current.key);

      identity.current = null;

      setForm((current) => {
        return { ...current, title: "", instructions: "" };
      });

      setNotice("Task assigned.");

      if (!(await reload())) {
        setNotice(
          "Task assigned. The list could not refresh; retry the list to see it.",
        );
      }
    } catch (error) {
      setError(message(error));
    } finally {
      guard.current = false;

      setBusy(false);
    }
  }

  return {
    form,
    setForm,
    assignees,
    busy,
    error,
    notice,
    lookupError,
    loadAssignees,
    assign,
  };
}
