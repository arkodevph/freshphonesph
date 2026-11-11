"use client";

import { useSpringDialog } from "@/lib/useSpringDialog";
import ModalCloseButton from "@/components/ModalCloseButton";
import WorkspaceProgress from "@/components/WorkspaceProgress";
import DateInput from "@/components/DateInput";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { useOperationsMonitor } from "./useOperationsMonitor";
import { monitorReasons, timestamp, waitingAge } from "./monitor-view";
import styles from "./monitor.module.css";

type Work = ReturnType<typeof useOperationsMonitor>;

export default function MonitorFollowUp({ work }: { work: Work }) {
  const dialog = useRef<HTMLDialogElement>(null);

  const [closing, setClosing] = useState(false);

  const [pane, setPane] = useState<"followup" | "history">("followup");

  useSpringDialog(dialog, Boolean(work.selected) && !closing, finishClose);

  useEffect(() => {
    setClosing(false);

    setPane("followup");
  }, [work.selected?.id]);

  function requestClose() {
    if (!work.saving) {
      setClosing(true);
    }
  }

  function finishClose() {
    if (!dialog.current?.open) {
      work.close();

      setClosing(false);
    }
  }

  const item = work.detail?.item;

  return (
    <dialog
      data-workspace-modal
      data-modal-framed
      data-modal-sections
      data-modal-size="standard"
      ref={dialog}
      className={styles.dialog}
      aria-labelledby="monitor-detail-title"
      onCancel={(event) => {
        event.preventDefault();

        requestClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          requestClose();
        }
      }}
      onClose={finishClose}
    >
      <header data-modal-header className={styles.dialogHeader}>
        <div>
          <p>Operational follow-up</p>
          <h2 id="monitor-detail-title">
            {work.selected?.batchCode ?? "Monitoring item"}
          </h2>
        </div>
        <ModalCloseButton onClick={requestClose} disabled={work.saving} />
      </header>
      <nav className={styles.followUpTabs} aria-label="Follow-up sections">
        <button
          type="button"
          aria-pressed={pane === "followup"}
          onClick={() => {
            setPane("followup");
          }}
        >
          Follow-up
        </button>
        <button
          type="button"
          aria-pressed={pane === "history"}
          onClick={() => {
            setPane("history");
          }}
        >
          History
        </button>
      </nav>
      <div data-modal-body className={styles.dialogBody}>
        {work.detailLoading && (
          <WorkspaceProgress label="Loading current item…" />
        )}
        {work.detailError && (
          <div role="alert" className={styles.error}>
            <p>{work.detailError}</p>
            {work.selected && (
              <button
                type="button"
                disabled={work.saving}
                onClick={() => {
                  void work.open(work.selected!, true);
                }}
              >
                Refresh item, keep draft
              </button>
            )}
          </div>
        )}
        {item && (
          <>
            <div data-monitor-pane="followup" hidden={pane !== "followup"}>
              <dl className={styles.metadata}>
                <div>
                  <dt>Source</dt>
                  <dd>
                    {item.source === "PAYMENT" ? "Payment" : "GCash statement"}{" "}
                    · {item.id.slice(0, 8)}
                  </dd>
                </div>
                <div>
                  <dt>Current stage</dt>
                  <dd>{item.stage.toLowerCase()}</dd>
                </div>
                <div>
                  <dt>Responsible</dt>
                  <dd>{item.responsibleName}</dd>
                </div>
                <div>
                  <dt>Stage age</dt>
                  <dd>{waitingAge(item.waitingSince)}</dd>
                </div>
              </dl>
              <p className={styles.reason}>{monitorReasons(item)}</p>
              <form
                id="monitor-followup-form"
                onSubmit={(event) => {
                  event.preventDefault();

                  void work.save("OPEN");
                }}
                className={styles.followUpForm}
              >
                <label>
                  Follow-up note
                  <textarea
                    value={work.note}
                    onChange={(event) => {
                      work.setNote(event.target.value);
                    }}
                    minLength={2}
                    maxLength={1000}
                    rows={3}
                    required
                    disabled={work.saving}
                  />
                </label>
                <label>
                  Follow-up due date <span>(optional, Philippine time)</span>
                  <DateInput
                    type="datetime-local"
                    value={work.dueAt}
                    onChange={(event) => {
                      work.setDueAt(event.target.value);
                    }}
                    disabled={work.saving}
                  />
                </label>
                <p className={styles.hint}>
                  Keep private customer and financial details in the source
                  record. Follow-up resolution does not approve evidence.
                </p>
              </form>
            </div>
            <section
              data-monitor-pane="history"
              hidden={pane !== "history"}
              aria-labelledby="monitor-history-title"
              className={styles.history}
            >
              <h3 id="monitor-history-title" className="sr-only">
                Follow-up history
              </h3>
              {!work.detail?.history.length ? (
                <p>No follow-up has been recorded yet.</p>
              ) : (
                <ol>
                  {work.detail.history.map((event) => {
                    return (
                      <li key={event.id}>
                        <div>
                          <strong>{event.actor.name}</strong>
                          <span>
                            {event.status === "OPEN"
                              ? "Flagged / followed up"
                              : "Resolved"}
                          </span>
                        </div>
                        <p>{event.note}</p>
                        <small>
                          {timestamp(event.createdAt)}
                          {event.dueAt
                            ? ` · Due ${timestamp(event.dueAt)}`
                            : ""}
                        </small>
                      </li>
                    );
                  })}
                </ol>
              )}
              {work.detail &&
                (work.detail.historyPage > 1 || work.detail.historyHasNext) && (
                  <div className={styles.pager}>
                    <button
                      type="button"
                      disabled={work.saving || work.detail.historyPage === 1}
                      onClick={() => {
                        void work.open(
                          item,
                          true,
                          work.detail!.historyPage - 1,
                        );
                      }}
                    >
                      Newer notes
                    </button>
                    <span>Page {work.detail.historyPage}</span>
                    <button
                      type="button"
                      disabled={work.saving || !work.detail.historyHasNext}
                      onClick={() => {
                        void work.open(
                          item,
                          true,
                          work.detail!.historyPage + 1,
                        );
                      }}
                    >
                      Older notes
                    </button>
                  </div>
                )}
            </section>
          </>
        )}
      </div>
      <footer data-modal-footer className={styles.dialogFooter}>
        {item?.href && (
          <Link href={item.href} className={styles.sourceLink}>
            Open source record
          </Link>
        )}
        {pane === "followup" && (
          <>
            {item?.followUp?.status === "OPEN" && (
              <button
                type="button"
                disabled={
                  work.saving || work.conflict || work.note.trim().length < 2
                }
                onClick={() => {
                  void work.save("RESOLVED");
                }}
              >
                Resolve follow-up
              </button>
            )}
            <button
              type="submit"
              form="monitor-followup-form"
              data-variant="primary"
              className={styles.primary}
              disabled={work.saving || !item || work.conflict}
            >
              {work.saving
                ? "Saving…"
                : item?.followUp?.status === "RESOLVED"
                  ? "Reopen follow-up"
                  : "Save follow-up"}
            </button>
          </>
        )}
      </footer>
    </dialog>
  );
}
