"use client";

import type { Me } from "@/lib/api";
import { tsRequest } from "@/lib/ts-api";
import { X } from "@phosphor-icons/react";
import type { Dispatch, RefObject, SetStateAction } from "react";
import { type FormEvent } from "react";
import styles from "./staff-tasks.module.css";
import { formatDate, label, Task } from "./task-view";

type Props = {
  dialog: RefObject<HTMLDialogElement | null>;
  clearTask: () => void;
  busy: boolean;
  draft: RefObject<boolean>;
  active: Task | null;
  closeTask: () => void;
  activeChanged: boolean;
  loadLatestTask: () => Promise<void>;
  error: string;
  notice: string;
  loadingDetail: boolean;
  download: (task: Task) => Promise<void>;
  canReview: boolean;
  me: Me;
  mutate: (run: () => Promise<unknown>, success: string) => Promise<boolean>;
  submit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  report: string;
  setReport: Dispatch<SetStateAction<string>>;
  setAttachment: Dispatch<SetStateAction<File | null>>;
  attachment: File | null;
  review: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  evaluation: string;
  setEvaluation: Dispatch<SetStateAction<string>>;
  recommendation: string;
  setRecommendation: Dispatch<SetStateAction<string>>;
  decision: string;
  setDecision: Dispatch<SetStateAction<string>>;
  canAssign: boolean;
};

export default function StaffTaskDialog({
  dialog,
  clearTask,
  busy,
  draft,
  active,
  closeTask,
  activeChanged,
  loadLatestTask,
  error,
  notice,
  loadingDetail,
  download,
  canReview,
  me,
  mutate,
  submit,
  report,
  setReport,
  setAttachment,
  attachment,
  review,
  evaluation,
  setEvaluation,
  recommendation,
  setRecommendation,
  decision,
  setDecision,
  canAssign,
}: Props) {
  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby="staff-task-title"
      onClose={clearTask}
      onCancel={(event) => {
        if (
          busy ||
          (draft.current &&
            !window.confirm("Discard your unsaved task report or review?"))
        ) {
          event.preventDefault();
        }
      }}
    >
      <div className={styles.dialogHead}>
        <div>
          <span className={styles.eyebrow}>Task details</span>
          <h2 id="staff-task-title">{active?.title ?? "Loading…"}</h2>
        </div>
        <button
          type="button"
          className={styles.iconButton}
          onClick={closeTask}
          disabled={busy}
          aria-label="Close task"
        >
          <X />
        </button>
      </div>
      {activeChanged && (
        <p role="status" className={styles.dialogNotice}>
          This task changed. Your draft and original version are preserved.{" "}
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              return void loadLatestTask();
            }}
          >
            Load latest task
          </button>
        </p>
      )}
      {error && (
        <p className={styles.dialogAlert} role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className={styles.dialogNotice} role="status">
          {notice}
        </p>
      )}
      {loadingDetail || !active ? (
        <p className={styles.empty}>Loading task…</p>
      ) : (
        <div className={styles.dialogBody}>
          <div className={styles.facts}>
            <div>
              <span>Assignee</span>
              <strong>{active.assigneeName}</strong>
            </div>
            <div>
              <span>Priority</span>
              <strong>{label(active.priority)}</strong>
            </div>
            <div>
              <span>Deadline</span>
              <strong>{formatDate(active.deadline)}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>{label(active.status)}</strong>
            </div>
          </div>
          <section>
            <h3>Instructions</h3>
            <p className={styles.preWrap}>
              {active.instructions || "No extra instructions."}
            </p>
          </section>
          {active.submittedAt && (
            <section>
              <h3>Submission</h3>
              <p>
                Submitted {formatDate(active.submittedAt)} ·{" "}
                <strong>{active.lateFlag ? "Late" : "On time"}</strong>
              </p>
              <p className={styles.preWrap}>
                {active.report || "No written report."}
              </p>
              {active.attachment && (
                <button
                  type="button"
                  className={styles.secondary}
                  onClick={() => {
                    return void download(active);
                  }}
                >
                  Download {active.attachment.fileName}
                </button>
              )}
            </section>
          )}
          {canReview && active.review && (
            <section>
              <h3>KPI review</h3>
              <p>{active.review.factualEvidence}</p>
              <p className={styles.preWrap}>
                <strong>Evaluation:</strong> {active.review.evaluation}
              </p>
              <p className={styles.preWrap}>
                <strong>Recommendation:</strong>{" "}
                {active.review.recommendation || "None"}
              </p>
              <p>
                <strong>Decision:</strong> {label(active.review.decision)} ·{" "}
                {active.review.reviewerName}
              </p>
            </section>
          )}
          {active.assigneeId === me?.id && active.status === "TODO" && (
            <button
              type="button"
              className={styles.secondary}
              disabled={busy || activeChanged}
              onClick={() => {
                return void mutate(() => {
                  return tsRequest(`/tasks/${active.id}/start`, {
                    method: "PATCH",
                    body: JSON.stringify({ version: active.version }),
                  });
                }, "Task started.");
              }}
            >
              Start task
            </button>
          )}
          {active.assigneeId === me?.id &&
            (active.status === "TODO" || active.status === "IN_PROGRESS") && (
              <form onSubmit={submit} className={styles.stacked}>
                <h3>Submit your work</h3>
                <label>
                  Report
                  <textarea
                    maxLength={5000}
                    rows={4}
                    value={report}
                    onChange={(event) => {
                      return setReport(event.target.value);
                    }}
                    placeholder="Describe what you completed"
                  />
                </label>
                <label>
                  Evidence (optional PDF or image, up to 5 MB)
                  <input
                    type="file"
                    accept="application/pdf,image/jpeg,image/png,image/webp"
                    onChange={(event) => {
                      return setAttachment(event.target.files?.[0] ?? null);
                    }}
                  />
                </label>
                <button
                  type="submit"
                  className={styles.primary}
                  disabled={
                    busy || activeChanged || (!report.trim() && !attachment)
                  }
                >
                  {busy ? "Submitting…" : "Submit work"}
                </button>
              </form>
            )}
          {canReview &&
            active.status === "SUBMITTED" &&
            !active.reviewed &&
            active.lateFlag && (
              <form onSubmit={review} className={styles.stacked}>
                <h3>Human KPI review</h3>
                <p className={styles.help}>
                  Submitted{" "}
                  {active.submittedAt ? formatDate(active.submittedAt) : "—"};
                  deadline {formatDate(active.deadline)}. Record the context
                  before deciding. No wage change is made here.
                </p>
                <label>
                  Evaluation
                  <textarea
                    required
                    minLength={3}
                    maxLength={5000}
                    rows={4}
                    value={evaluation}
                    onChange={(event) => {
                      return setEvaluation(event.target.value);
                    }}
                    placeholder="What happened and what context did you consider?"
                  />
                </label>
                <label>
                  Recommendation
                  <input
                    maxLength={200}
                    value={recommendation}
                    onChange={(event) => {
                      return setRecommendation(event.target.value);
                    }}
                    placeholder="Optional"
                  />
                </label>
                <label>
                  Decision
                  <select
                    value={decision}
                    onChange={(event) => {
                      return setDecision(event.target.value);
                    }}
                  >
                    <option value="NOTED">Noted</option>
                    <option value="ACTION_RECOMMENDED">
                      Action recommended
                    </option>
                  </select>
                </label>
                <button
                  type="submit"
                  className={styles.primary}
                  disabled={
                    busy || activeChanged || evaluation.trim().length < 3
                  }
                >
                  {busy ? "Recording…" : "Record review"}
                </button>
              </form>
            )}
          {canAssign &&
            active.status === "SUBMITTED" &&
            (!active.lateFlag || active.reviewed) && (
              <button
                type="button"
                className={styles.primary}
                disabled={busy || activeChanged}
                onClick={() => {
                  return void mutate(() => {
                    return tsRequest(`/tasks/${active.id}/complete`, {
                      method: "POST",
                      body: JSON.stringify({ version: active.version }),
                    });
                  }, "Task completed.");
                }}
              >
                {busy ? "Completing…" : "Mark complete"}
              </button>
            )}
        </div>
      )}
    </dialog>
  );
}
