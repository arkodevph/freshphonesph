"use client";

import ModalCloseButton from "@/app/system/_role-designs/pioneer_agent/components/ModalCloseButton";
import WorkspaceProgress from "@/app/system/_role-designs/pioneer_agent/components/WorkspaceProgress";
import { useRef } from "react";
import {
  Close,
  FileText,
  DownloadMinimalistic,
  Calendar,
  CheckCircle,
  UserCircle,
} from "@/app/system/_role-designs/pioneer_agent/components/SolarIcons";
import Select from "@/app/system/_role-designs/pioneer_agent/components/Select";
import { can } from "@/lib/useMe";
import { tsRequest } from "@/lib/ts-api";
import type { StaffTaskDialogProps } from "@/app/system/_role-designs/pioneer_agent/app/system/tasks/StaffTaskDialog";
import {
  formatDate,
  label,
} from "@/app/system/_role-designs/pioneer_agent/app/system/tasks/task-view";
import styles from "@/app/system/_role-designs/pioneer_agent/app/system/tasks/coo/coo-tasks.module.css";

export default function CooTaskDetail(props: StaffTaskDialogProps) {
  const {
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
  } = props;

  const file = useRef<HTMLInputElement>(null);

  return (
    <dialog
      data-workspace-modal
      data-modal-framed
      data-modal-size="wide"
      ref={dialog}
      className={styles.detailDialog}
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
      <header data-modal-header className={styles.detailHeader}>
        <div>
          <p>Task details</p>
          <h2 id="staff-task-title">{active?.title ?? "Loading task…"}</h2>
          {active && (
            <span className={styles.status} data-task-status={active.status}>
              {label(active.status)}
            </span>
          )}
        </div>
        <ModalCloseButton onClick={closeTask} disabled={busy} />
      </header>
      {activeChanged && (
        <div className={styles.detailNotice} role="status">
          This task changed. Your draft and original version are preserved.{" "}
          <button
            type="button"
            className={styles.secondary}
            disabled={busy}
            onClick={() => {
              return void loadLatestTask();
            }}
          >
            Load latest task
          </button>
        </div>
      )}
      {error && (
        <p className={styles.detailNotice} role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className={styles.detailNotice} role="status">
          {notice}
        </p>
      )}
      {loadingDetail || !active ? (
        <WorkspaceProgress className={styles.empty} label="Loading task…" />
      ) : (
        <div className={styles.detailLayout}>
          <div className={styles.detailMain}>
            <section className={styles.instructionBlock}>
              <h3>Instructions</h3>
              <p>{active.instructions || "No extra instructions."}</p>
            </section>
            {active.submittedAt && (
              <section className={styles.submissionBlock}>
                <header>
                  <CheckCircle />
                  <h3>Work submitted</h3>
                </header>
                <p className={styles.submissionTime}>
                  {formatDate(active.submittedAt)} ·{" "}
                  {active.lateFlag ? "Submitted late" : "Submitted on time"}
                </p>
                <p>{active.report || "No written report."}</p>
                {active.attachment && (
                  <button
                    type="button"
                    className={styles.secondary}
                    onClick={() => {
                      return void download(active);
                    }}
                  >
                    <DownloadMinimalistic />
                    {active.attachment.fileName}
                  </button>
                )}
              </section>
            )}
            {canReview && active.review && (
              <section className={styles.submissionBlock}>
                <h3>KPI review</h3>
                <p>{active.review.factualEvidence}</p>
                <p>
                  <strong>Evaluation:</strong> {active.review.evaluation}
                </p>
                <p>
                  <strong>Recommendation:</strong>{" "}
                  {active.review.recommendation || "None"}
                </p>
                <p>
                  <strong>Decision:</strong> {label(active.review.decision)} ·{" "}
                  {active.review.reviewerName}
                </p>
              </section>
            )}
            {can(me, "TASK_SUBMIT") &&
              active.assigneeId === me.id &&
              active.status === "TODO" && (
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
            {can(me, "TASK_SUBMIT") &&
              active.assigneeId === me.id &&
              ["TODO", "IN_PROGRESS"].includes(active.status) && (
                <form onSubmit={submit} className={styles.reportForm}>
                  <div>
                    <h3>Submit your work</h3>
                    <p className={styles.formIntro}>
                      Share what you completed and any supporting evidence.
                    </p>
                  </div>
                  <label className={styles.field}>
                    Report
                    <textarea
                      maxLength={5000}
                      rows={5}
                      disabled={busy || activeChanged}
                      value={report}
                      onChange={(event) => {
                        return setReport(event.target.value);
                      }}
                      placeholder="Describe the work you completed, the outcome, and anything that needs follow-up."
                    />
                  </label>
                  <div className={styles.field}>
                    <span>
                      Evidence <small>(optional)</small>
                    </span>
                    <label className={styles.fileUpload}>
                      <input
                        ref={file}
                        className="sr-only"
                        type="file"
                        accept="application/pdf,image/jpeg,image/png,image/webp"
                        disabled={busy || activeChanged}
                        onChange={(event) => {
                          return setAttachment(event.target.files?.[0] ?? null);
                        }}
                      />
                      <span className={styles.fileIcon}>
                        <FileText />
                      </span>
                      <span>
                        <strong>
                          {attachment?.name ?? "Attach a PDF or image"}
                        </strong>
                        <small>PDF, JPG, PNG or WebP · up to 5 MB</small>
                      </span>
                    </label>
                    {attachment && (
                      <button
                        type="button"
                        className={styles.removeAttachment}
                        disabled={busy}
                        onClick={() => {
                          setAttachment(null);

                          if (file.current) {
                            file.current.value = "";
                          }
                        }}
                      >
                        Remove attachment
                      </button>
                    )}
                  </div>
                  <footer className={styles.reportFooter}>
                    <span>Report or evidence is required.</span>
                    <button
                      type="submit"
                      data-variant="primary"
                      className={styles.primary}
                      disabled={
                        busy || activeChanged || (!report.trim() && !attachment)
                      }
                    >
                      {busy ? "Submitting…" : "Submit work"}
                    </button>
                  </footer>
                </form>
              )}
            {canReview &&
              active.status === "SUBMITTED" &&
              !active.reviewed &&
              active.lateFlag && (
                <form onSubmit={review} className={styles.reportForm}>
                  <h3>Human KPI review</h3>
                  <p className={styles.formIntro}>
                    Record the context before deciding. No wage change is made
                    here.
                  </p>
                  <label className={styles.field}>
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
                    />
                  </label>
                  <label className={styles.field}>
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
                  <div className={styles.field}>
                    <span id="coo-review-decision-label">Decision</span>
                    <Select
                      id="coo-review-decision"
                      labelId="coo-review-decision-label"
                      value={decision}
                      onValueChange={setDecision}
                      options={[
                        { value: "NOTED", label: "Noted" },
                        {
                          value: "ACTION_RECOMMENDED",
                          label: "Action recommended",
                        },
                      ]}
                      disabled={busy || activeChanged}
                      animate
                      fitViewport
                    />
                  </div>
                  <button
                    type="submit"
                    data-variant="primary"
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
                  data-variant="primary"
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
          <aside className={styles.detailSidebar} aria-label="Task properties">
            <dl>
              <div>
                <dt>
                  <UserCircle />
                  Assigned to
                </dt>
                <dd>{active.assigneeName}</dd>
              </div>
              <div>
                <dt>Priority</dt>
                <dd>
                  <span
                    className={styles.priority}
                    data-priority={active.priority}
                  >
                    <i />
                    {label(active.priority)}
                  </span>
                </dd>
              </div>
              <div>
                <dt>
                  <Calendar />
                  Deadline
                </dt>
                <dd>
                  <time dateTime={active.deadline}>
                    {formatDate(active.deadline)}
                  </time>
                </dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>
                  <span
                    className={styles.status}
                    data-task-status={active.status}
                  >
                    {label(active.status)}
                  </span>
                </dd>
              </div>
            </dl>
          </aside>
        </div>
      )}
    </dialog>
  );
}
