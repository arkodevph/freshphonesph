"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { ApiError, tsDownload } from "@/lib/ts-api";
import { useLiveRecords } from "@/lib/useLiveRecords";
import { useSpringDialog } from "@/lib/useSpringDialog";
import { message, type Task } from "./task-view";
import { taskApi } from "./pioneer-task-api";

type Navigate = (values: Record<string, string | null>) => void;

export function usePioneerTaskDetail(
  taskId: string | null,
  navigate: Navigate,
  reload: () => Promise<boolean>,
) {
  const dialog = useRef<HTMLDialogElement>(null);

  const [opened, setOpened] = useState(false);

  useSpringDialog(dialog, opened);

  const [task, setTask] = useState<Task | null>(null);

  const [loading, setLoading] = useState(false);

  const [changed, setChanged] = useState(false);

  const [error, setError] = useState("");

  const [notice, setNotice] = useState("");

  const [report, setReport] = useState("");

  const [attachment, setAttachment] = useState<File | null>(null);

  const [busy, setBusy] = useState(false);

  const id = useRef<string | null>(null);

  const snapshot = useRef(task);

  snapshot.current = task;

  const draft = useRef(false);

  draft.current = Boolean(report.trim() || attachment);

  const guard = useRef(false);

  const sequence = useRef(0);

  const refresh = useCallback(async (replace = false) => {
    const target = id.current;

    if (!target || guard.current) {
      return;
    }

    const request = ++sequence.current;

    try {
      const latest = await taskApi.detail(target);

      if (request !== sequence.current || target !== id.current) {
        return;
      }

      if (
        !replace &&
        snapshot.current &&
        snapshot.current.version !== latest.version
      ) {
        setChanged(true);
      } else {
        setTask(latest);

        setChanged(false);

        setError("");
      }
    } catch (error) {
      if (request !== sequence.current || target !== id.current) {
        return;
      }

      setError(message(error));

      if (error instanceof ApiError && [401, 403, 404].includes(error.status)) {
        setTask(null);

        setReport("");

        setAttachment(null);

        setChanged(false);
      }
    } finally {
      if (request === sequence.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const target = taskId && /^[0-9a-f-]{36}$/i.test(taskId) ? taskId : null;

    if (target === id.current) {
      return;
    }

    if (
      guard.current ||
      (draft.current && !window.confirm("Discard your unsaved task report?"))
    ) {
      navigate({ task: id.current });

      return;
    }

    sequence.current++;

    id.current = target;

    snapshot.current = null;

    setTask(null);

    setReport("");

    setAttachment(null);

    setError("");

    setNotice("");

    setChanged(false);

    if (target) {
      setOpened(true);

      setLoading(true);

      void refresh(true);
    } else {
      setOpened(false);
    }
  }, [taskId, navigate, refresh]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (draft.current || guard.current) {
        event.preventDefault();

        event.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", beforeUnload);

    return () => {
      sequence.current++;

      id.current = null;

      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, []);

  useLiveRecords(() => {
    void refresh();
  });

  function close() {
    if (
      guard.current ||
      (draft.current && !window.confirm("Discard your unsaved task report?"))
    ) {
      return;
    }

    draft.current = false;

    setReport("");

    setAttachment(null);

    navigate({ task: null });
  }

  async function loadLatest() {
    if (
      draft.current &&
      !window.confirm("Load the latest task and discard your unsaved report?")
    ) {
      return;
    }

    draft.current = false;

    setReport("");

    setAttachment(null);

    setLoading(true);

    await refresh(true);
  }

  async function save(
    run: () => Promise<Task>,
    success: string,
    clearDraft = false,
  ) {
    if (guard.current || changed || !task) {
      return;
    }

    guard.current = true;

    sequence.current++;

    setBusy(true);

    setError("");

    setNotice("");

    try {
      const latest = await run();

      setTask(latest);

      snapshot.current = latest;

      setChanged(false);

      if (clearDraft) {
        setReport("");

        setAttachment(null);

        draft.current = false;
      }

      setNotice(success);

      if (!(await reload())) {
        setNotice(
          `${success} The task list could not refresh; retry the list.`,
        );
      }
    } catch (error) {
      setError(message(error));

      if (error instanceof ApiError && error.status === 409) {
        setChanged(true);
      }

      if (error instanceof ApiError && [401, 403, 404].includes(error.status)) {
        setTask(null);

        setReport("");

        setAttachment(null);
      }
    } finally {
      guard.current = false;

      setBusy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!task || (!report.trim() && !attachment)) {
      return;
    }

    await save(
      () => {
        return taskApi.submit(task, report, attachment);
      },
      "Work submitted.",
      true,
    );
  }

  async function download() {
    if (!task?.attachment) {
      return;
    }

    try {
      const blob = await tsDownload(`/tasks/${task.id}/attachment`);

      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = url;

      link.download = task.attachment.fileName;

      link.click();

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
    } catch (error) {
      setError(message(error));
    }
  }

  return {
    dialog,
    task,
    loading,
    changed,
    error,
    notice,
    report,
    setReport: (value: string) => {
      draft.current = Boolean(value.trim() || attachment);

      setReport(value);
    },
    attachment,
    setAttachment: (value: File | null) => {
      draft.current = Boolean(report.trim() || value);

      setAttachment(value);
    },
    busy,
    close,
    loadLatest,
    refresh,
    save,
    submit,
    download,
  };
}
