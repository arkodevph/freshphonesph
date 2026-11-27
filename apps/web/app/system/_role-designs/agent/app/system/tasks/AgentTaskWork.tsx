"use client";

import { useEffect, useRef, useState } from "react";
import type { Me } from "@/lib/api";
import { can } from "@/lib/useMe";
import { ApiError, tsDownload } from "@/lib/ts-api";
import type { Task } from "./task-view";
import { formatDate } from "./task-view";
import {
  taskEvidenceError,
  taskStartCommand,
  taskSubmissionCommand,
} from "./agent-task";
import { useAgentTask } from "./useAgentTask";
import styles from "./task-detail-panel.module.css";

export default function AgentTaskWork({
  row,
  me,
  detail,
  onDirty,
  onSaved,
}: {
  row: Task;
  me: Me;
  detail: ReturnType<typeof useAgentTask>;
  onDirty: (dirty: boolean) => void;
  onSaved: () => void;
}) {
  const [report, setReport] = useState("");

  const [file, setFile] = useState<File | null>(null);

  const [error, setError] = useState("");

  const [operation, setOperation] = useState("");

  const input = useRef<HTMLInputElement>(null);

  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;

    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    onDirty(Boolean(report.trim() || file));
  }, [report, file, onDirty]);

  useEffect(() => {
    if (["SUBMITTED", "DONE"].includes(row.status)) {
      setReport("");

      setFile(null);

      onDirty(false);
    }
  }, [row.status, onDirty]);

  async function run(
    action: () => Promise<unknown>,
    message: string,
    name: string,
  ) {
    setOperation(name);

    const saved = await detail.run(action, message);

    if (alive.current) {
      setOperation("");

      if (saved) {
        onSaved();
      }
    }
  }

  async function download() {
    setError("");

    setOperation("download");

    try {
      const blob = await tsDownload(`/tasks/${row.id}/attachment`);

      if (!alive.current) {
        return;
      }

      const url = URL.createObjectURL(blob),
        anchor = document.createElement("a");

      anchor.href = url;

      anchor.download = row.attachment?.fileName ?? "task-evidence";

      anchor.click();

      window.setTimeout(() => {
        return URL.revokeObjectURL(url);
      }, 1000);
    } catch (failure) {
      if (!alive.current) {
        return;
      }

      if (
        failure instanceof ApiError &&
        [401, 403, 404].includes(failure.status)
      ) {
        detail.clear();
      }

      setError(
        failure instanceof Error
          ? failure.message
          : "Could not download evidence.",
      );
    } finally {
      if (alive.current) {
        setOperation("");
      }
    }
  }

  const editable =
    can(me, "TASK_SUBMIT") &&
    row.assigneeId === me.id &&
    ["TODO", "IN_PROGRESS"].includes(row.status);

  const evidenceError = taskEvidenceError(file);

  return (
    <>
      {error && <p role="alert">{error}</p>}
      {row.submittedAt && (
        <section className={styles.submissionBlock}>
          <h3>
            {row.status === "DONE"
              ? "Work completed"
              : "Work submitted for review"}
          </h3>
          <p>
            {formatDate(row.submittedAt)} ·{" "}
            {row.lateFlag
              ? "Submitted after the deadline"
              : "Submitted on time"}
          </p>
          <p>{row.report || "Evidence submitted without a written report."}</p>
          {row.attachment && (
            <button
              type="button"
              className={`${styles.secondary} ${styles.evidenceName}`}
              disabled={operation === "download"}
              onClick={() => {
                return void download();
              }}
              aria-label={`Download evidence: ${row.attachment.fileName}`}
            >
              {operation === "download"
                ? "Downloading evidence…"
                : row.attachment.fileName}
            </button>
          )}
          <p>
            Submission timing is a recorded fact. Authorized staff handle review
            and completion.
          </p>
        </section>
      )}
      {editable && (
        <>
          {row.status === "TODO" && (
            <button
              type="button"
              className={styles.secondary}
              disabled={detail.blocked}
              onClick={() => {
                return void run(
                  taskStartCommand(row),
                  "Task started. Your report draft is retained.",
                  "start",
                );
              }}
            >
              {detail.busy && operation === "start"
                ? "Starting task…"
                : "Start task"}
            </button>
          )}
          <form
            className={styles.reportForm}
            aria-label="Submit my task work"
            aria-busy={detail.busy}
            onSubmit={(event) => {
              event.preventDefault();

              if (
                detail.blocked ||
                evidenceError ||
                (!report.trim() && !file)
              ) {
                return;
              }

              void run(
                taskSubmissionCommand(row, report, file),
                "Your work was submitted for authorized review.",
                "submit",
              );
            }}
          >
            <h3>Submit your work</h3>
            <p>
              Add a report, evidence, or both. Submitting work does not complete
              the task.
            </p>
            <label className={styles.field}>
              Report
              <textarea
                maxLength={5000}
                rows={5}
                disabled={detail.blocked}
                value={report}
                onChange={(event) => {
                  return setReport(event.target.value);
                }}
              />
            </label>
            <label className={styles.field}>
              Evidence (optional)
              <input
                ref={input}
                type="file"
                hidden
                accept="application/pdf,image/jpeg,image/png,image/webp"
                disabled={detail.blocked}
                onChange={(event) => {
                  return setFile(event.target.files?.[0] ?? null);
                }}
              />
            </label>
            <button
              type="button"
              className={styles.secondary}
              disabled={detail.blocked}
              onClick={() => {
                return input.current?.click();
              }}
            >
              Choose evidence
            </button>
            <p>PDF, JPG, PNG or WebP · up to 5 MB</p>
            {file && (
              <>
                <p
                  className={styles.evidenceName}
                  title={file.name}
                  role="status"
                >
                  {file.name}
                </p>
                <button
                  type="button"
                  className={styles.secondary}
                  disabled={detail.blocked}
                  onClick={() => {
                    setFile(null);

                    if (input.current) {
                      input.current.value = "";
                    }
                  }}
                >
                  Remove evidence
                </button>
              </>
            )}
            {evidenceError && <p role="alert">{evidenceError}</p>}
            <footer className={styles.reportFooter}>
              <span>Report or evidence is required.</span>
              <button
                type="submit"
                data-variant="primary"
                className={styles.primary}
                disabled={
                  detail.blocked ||
                  Boolean(evidenceError) ||
                  (!report.trim() && !file)
                }
              >
                {detail.busy && operation === "submit"
                  ? "Submitting work…"
                  : "Submit work for review"}
              </button>
            </footer>
          </form>
        </>
      )}
    </>
  );
}
