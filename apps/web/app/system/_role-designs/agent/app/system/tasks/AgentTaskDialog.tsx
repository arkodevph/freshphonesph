"use client";

import { useEffect, useRef, useState } from "react";
import type { Me } from "@/lib/api";
import { useSpringDialog } from "@/lib/useSpringDialog";
import ModalCloseButton from "../../../components/ModalCloseButton";
import { formatDate } from "./task-view";
import { agentTaskLabels } from "./agent-task";
import { useAgentTask } from "./useAgentTask";
import AgentTaskWork from "./AgentTaskWork";
import TaskActivity from "./TaskActivity";
import styles from "./task-detail-panel.module.css";

export default function AgentTaskDialog({
  detail,
  me,
  close,
  onSaved,
}: {
  detail: ReturnType<typeof useAgentTask>;
  me: Me;
  close: () => void;
  onSaved: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  const title = useRef<HTMLHeadingElement>(null);

  const [closing, setClosing] = useState(false);

  const [dirty, setDirty] = useState(false);

  const [activity, setActivity] = useState(false);

  useSpringDialog(dialog, !closing, close);

  useEffect(() => {
    title.current?.focus();
  }, []);

  useEffect(() => {
    if (!dirty && !detail.busy && !detail.uncertain) {
      return;
    }

    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
    }

    window.addEventListener("beforeunload", warn);

    return () => {
      return window.removeEventListener("beforeunload", warn);
    };
  }, [dirty, detail.busy, detail.uncertain]);

  function mayDiscard() {
    return (
      !(dirty || detail.uncertain) ||
      window.confirm(
        "Discard your unsaved task draft? Check an unconfirmed submission’s current result before starting another attempt.",
      )
    );
  }

  function leave() {
    if (!detail.busy && mayDiscard()) {
      setClosing(true);
    }
  }

  function reload() {
    if (!detail.busy && mayDiscard()) {
      void detail.reload();
    }
  }

  const row = detail.row;

  return (
    <dialog
      ref={dialog}
      data-workspace-modal
      data-modal-framed
      data-modal-size="drawer"
      data-task-detail-panel
      className={styles.detailDialog}
      aria-labelledby="agent-task-title"
      onKeyDown={(event) => {
        if (event.key !== "Tab") {
          return;
        }

        const items = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            "a[href], button, input, textarea, select, [tabindex]",
          ),
        ).filter((element) => {
          return (
            element.tabIndex >= 0 &&
            !element.matches(":disabled") &&
            !element.closest("[hidden]") &&
            element.getClientRects().length > 0
          );
        });

        const first = items[0],
          last = items.at(-1);

        if (!first || !last) {
          event.preventDefault();

          title.current?.focus();

          return;
        }

        if (
          event.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === title.current)
        ) {
          event.preventDefault();

          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();

          first.focus();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();

        leave();
      }}
    >
      <header data-modal-header className={styles.detailHeader}>
        <h2 id="agent-task-title" ref={title} tabIndex={-1}>
          {row?.title ??
            (detail.loading ? "Loading task…" : "Task unavailable")}
        </h2>
        <ModalCloseButton onClick={leave} disabled={detail.busy} />
      </header>
      {detail.error && (
        <p className={styles.detailNotice} role="alert">
          {detail.error}
        </p>
      )}
      {detail.notice && (
        <p className={styles.detailNotice} role="status">
          {detail.notice}
        </p>
      )}
      {detail.stale && (
        <div className={styles.detailNotice} role="status">
          <p>
            This task changed. Your report and evidence are preserved. Review
            the current task before saving.
          </p>
          <button
            type="button"
            className={styles.secondary}
            disabled={detail.busy}
            onClick={reload}
          >
            Load latest task
          </button>
        </div>
      )}
      {detail.uncertain && (
        <div className={styles.detailNotice} role="status">
          <p>
            The previous result is unconfirmed. Your original report, evidence
            and version are locked. Check the latest task or retry the original
            action unchanged.
          </p>
          <button
            type="button"
            className={styles.secondary}
            disabled={detail.busy || detail.stale}
            onClick={() => {
              return void detail.retry().then((saved) => {
                if (saved) {
                  onSaved();
                }
              });
            }}
          >
            Retry original task action
          </button>
          <button
            type="button"
            className={styles.secondary}
            disabled={detail.busy}
            onClick={reload}
          >
            Check latest task
          </button>
        </div>
      )}
      {!row ? (
        <section className={styles.empty}>
          <p role="status">
            {detail.loading
              ? "Loading task details…"
              : "This task is unavailable in your current assignment. Private details and drafts have been cleared."}
          </p>
          {!detail.loading && (
            <>
              <button
                type="button"
                className={styles.secondary}
                onClick={reload}
              >
                Retry task details
              </button>
              <button
                type="button"
                className={styles.secondary}
                onClick={leave}
              >
                Back to my tasks
              </button>
            </>
          )}
        </section>
      ) : (
        <div className={styles.detailLayout}>
          <section
            className={styles.detailProperties}
            aria-label="Task properties"
          >
            <dl>
              <div>
                <dt>Status</dt>
                <dd>{agentTaskLabels[row.status]}</dd>
              </div>
              <div>
                <dt>Assigned by</dt>
                <dd>{row.creatorName}</dd>
              </div>
              <div>
                <dt>Assigned to</dt>
                <dd>{row.assigneeName}</dd>
              </div>
              <div>
                <dt>Priority</dt>
                <dd>{row.priority.toLowerCase()}</dd>
              </div>
              <div>
                <dt>Deadline</dt>
                <dd>
                  <time dateTime={row.deadline}>
                    {formatDate(row.deadline)}
                  </time>
                </dd>
              </div>
            </dl>
          </section>
          <div className={styles.detailMain}>
            <nav className={styles.tabs} aria-label="Task sections">
              <button
                type="button"
                aria-pressed={!activity}
                onClick={() => {
                  return setActivity(false);
                }}
              >
                Details
              </button>
              <button
                type="button"
                aria-pressed={activity}
                onClick={() => {
                  return setActivity(true);
                }}
              >
                Activity
              </button>
            </nav>
            <div hidden={!activity}>
              <TaskActivity
                taskId={row.id}
                version={row.version}
                enabled={activity}
                onAccessLost={detail.clear}
              />
            </div>
            <div hidden={activity} className={styles.work}>
              <section className={styles.instructionBlock}>
                <h3>Instructions</h3>
                <p>{row.instructions || "No additional instructions."}</p>
              </section>
              {row.status === "CANCELLED" && (
                <section className={styles.instructionBlock}>
                  <h3>Cancelled</h3>
                  <p>
                    {row.cancellationReason ||
                      "The assigner cancelled this task. No further submission is available."}
                  </p>
                  {row.cancelledAt && <p>{formatDate(row.cancelledAt)}</p>}
                </section>
              )}
              <AgentTaskWork
                key={`${row.id}:${detail.revision}`}
                row={row}
                me={me}
                detail={detail}
                onDirty={setDirty}
                onSaved={onSaved}
              />
            </div>
          </div>
        </div>
      )}
    </dialog>
  );
}
