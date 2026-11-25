"use client";

import type { Me } from "@/lib/api";
import { can } from "@/lib/useMe";
import WorkspaceProgress from "@/app/system/_role-designs/pioneer_agent/components/WorkspaceProgress";
import ModalCloseButton from "@/app/system/_role-designs/pioneer_agent/components/ModalCloseButton";
import { usePioneerTaskDetail } from "./usePioneerTaskDetail";
import { taskApi } from "./pioneer-task-api";
import { formatDate, label } from "./task-view";
import styles from "./staff-tasks.module.css";

export default function PioneerTaskDialog({
  me,
  detail,
}: {
  me: Me;
  detail: ReturnType<typeof usePioneerTaskDetail>;
}) {
  const task = detail.task;

  const own = task?.assigneeId === me.id;

  return (
    <dialog
      ref={detail.dialog}
      className={styles.dialog}
      aria-labelledby="pioneer-task-title"
      onCancel={(event) => {
        event.preventDefault();

        detail.close();
      }}
    >
      <header className={styles.dialogHead}>
        <h2 id="pioneer-task-title">{task?.title ?? "Task details"}</h2>
        <ModalCloseButton onClick={detail.close} disabled={detail.busy} />
      </header>
      {detail.error && (
        <p className={styles.dialogAlert} role="alert">
          {detail.error}
        </p>
      )}
      {detail.notice && (
        <p className={styles.dialogNotice} role="status">
          {detail.notice}
        </p>
      )}
      {detail.changed && (
        <p className={styles.dialogNotice} role="status">
          This task changed. Your draft and original version are preserved.{" "}
          <button
            type="button"
            onClick={() => {
              void detail.loadLatest();
            }}
            disabled={detail.busy}
          >
            Load latest task
          </button>
        </p>
      )}
      {detail.loading ? (
        <WorkspaceProgress label="Loading task…" />
      ) : task ? (
        <div className={styles.dialogBody}>
          <dl className={styles.facts}>
            {[
              ["Assignee", task.assigneeName],
              ["Priority", label(task.priority)],
              ["Deadline", formatDate(task.deadline)],
              ["Status", label(task.status)],
            ].map(([title, value]) => {
              return (
                <div key={title}>
                  <dt>{title}</dt>
                  <dd>{value}</dd>
                </div>
              );
            })}
          </dl>
          <section>
            <h3>Instructions</h3>
            <p className={styles.preWrap}>
              {task.instructions || "No extra instructions."}
            </p>
          </section>
          {task.submittedAt && (
            <section>
              <h3>Submission</h3>
              <p>
                Submitted {formatDate(task.submittedAt)} ·{" "}
                {task.lateFlag ? "Late" : "On time"}
              </p>
              <p className={styles.preWrap}>
                {task.report || "No written report."}
              </p>
              {task.attachment && (
                <button
                  className={styles.secondary}
                  type="button"
                  onClick={() => {
                    void detail.download();
                  }}
                >
                  Download {task.attachment.fileName}
                </button>
              )}
            </section>
          )}
          {task.status === "SUBMITTED" && task.lateFlag && !task.reviewed && (
            <p className={styles.help}>
              Completion is waiting for a human KPI review of the late
              submission.
            </p>
          )}
          {own && can(me, "TASK_SUBMIT") && task.status === "TODO" && (
            <button
              type="button"
              className={styles.secondary}
              disabled={detail.busy || detail.changed}
              onClick={() => {
                void detail.save(() => {
                  return taskApi.action(task, "start");
                }, "Task started.");
              }}
            >
              Start task
            </button>
          )}
          {own &&
            can(me, "TASK_SUBMIT") &&
            ["TODO", "IN_PROGRESS"].includes(task.status) && (
              <form className={styles.stacked} onSubmit={detail.submit}>
                <h3>Submit your work</h3>
                <label htmlFor="pioneer-task-report">Report</label>
                <textarea
                  id="pioneer-task-report"
                  rows={5}
                  maxLength={5000}
                  value={detail.report}
                  onChange={(event) => {
                    detail.setReport(event.target.value);
                  }}
                  disabled={detail.busy}
                />
                <label>
                  Evidence (optional PDF or image, up to 5 MB)
                  <input
                    key={`${task.id}:${task.version}`}
                    type="file"
                    accept="application/pdf,image/jpeg,image/png,image/webp"
                    disabled={detail.busy}
                    onChange={(event) => {
                      detail.setAttachment(event.target.files?.[0] ?? null);
                    }}
                  />
                </label>
                {detail.attachment && (
                  <p className={styles.help}>{detail.attachment.name}</p>
                )}
                <button
                  data-variant="primary"
                  className={styles.primary}
                  type="submit"
                  disabled={
                    detail.busy ||
                    detail.changed ||
                    (!detail.report.trim() && !detail.attachment)
                  }
                >
                  {detail.busy ? "Saving…" : "Submit work"}
                </button>
              </form>
            )}
          {can(me, "TASK_ASSIGN") &&
            task.status === "SUBMITTED" &&
            (!task.lateFlag || task.reviewed) && (
              <button
                data-variant="primary"
                className={styles.primary}
                type="button"
                disabled={detail.busy || detail.changed}
                onClick={() => {
                  void detail.save(() => {
                    return taskApi.action(task, "complete");
                  }, "Task completed.");
                }}
              >
                Mark complete
              </button>
            )}
        </div>
      ) : (
        !detail.loading && (
          <div className={styles.empty}>
            <p>Task details are unavailable.</p>
            <button
              className={styles.secondary}
              type="button"
              onClick={() => {
                void detail.refresh(true);
              }}
            >
              Try again
            </button>
          </div>
        )
      )}
    </dialog>
  );
}
