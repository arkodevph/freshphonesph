"use client";

import { useSpringDialog } from "@/lib/useSpringDialog";
import ModalCloseButton from "@/app/system/_role-designs/system_admin/components/ModalCloseButton";
import WorkspaceProgress from "@/app/system/_role-designs/system_admin/components/WorkspaceProgress";
import { useEffect, useRef, useState } from "react";
import type { GcashHistory, GcashSubmission } from "@freshphones/contracts";
import { getGcashSubmissions } from "@/lib/api";
import { ReadingDialog } from "@/app/system/_role-designs/system_admin/app/system/gcash-history/ReadingDialog";
import styles from "@/app/system/_role-designs/system_admin/components/record-details.module.css";
import historyStyles from "@/app/system/_role-designs/system_admin/app/system/gcash-history/history.module.css";

export function HistoryDialog({
  row,
  close,
  download,
  changed,
  canReview,
  viewerId,
}: {
  row: GcashHistory;
  close: () => void;
  download: (id: string, filename: string) => Promise<void>;
  changed: (row: GcashHistory) => void;
  canReview: boolean;
  viewerId?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  const [page, setPage] = useState(1);

  const [reading, setReading] = useState<GcashSubmission | null>(null);

  const [items, setItems] = useState<GcashSubmission[]>([]);

  const [total, setTotal] = useState(0);

  const [error, setError] = useState<string | null>(null);

  const [attempt, setAttempt] = useState(0);

  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(true);

  useSpringDialog(dialog, open, close);

  useEffect(() => {
    let active = true;

    setLoading(true);

    setError(null);

    void getGcashSubmissions(row.id, page)
      .then((result) => {
        if (active) {
          setItems(result.items);

          setTotal(result.total);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setItems([]);

          setError(
            error instanceof Error ? error.message : "Could not load history.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [row.id, page, attempt]);

  return (
    <dialog
      data-workspace-modal
      data-modal-size="wide"
      ref={dialog}
      className={`${styles.dialog} ${historyStyles.dialog}`}
      aria-labelledby="gcash-history-title"
      onClose={close}
      onCancel={(event) => {
        event.preventDefault();

        setOpen(false);
      }}
    >
      <header data-modal-header className={styles.header}>
        <div>
          <p className={historyStyles.eyebrow}>PDF history</p>
          <h2 id="gcash-history-title">{row.batch.code}</h2>
          <p className={styles.help}>
            {row.periodStart} — {row.periodEnd}
          </p>
        </div>
        <ModalCloseButton
          onClick={() => {
            return setOpen(false);
          }}
        />
      </header>
      <div className={styles.formBody}>
        <p className={styles.help}>
          Earlier PDFs and Records notes are preserved.
        </p>
        {loading ? (
          <WorkspaceProgress label="Loading PDF history…" />
        ) : error ? (
          <p role="alert">
            {error}{" "}
            <button
              type="button"
              onClick={() => {
                setAttempt((value) => {
                  return value + 1;
                });
              }}
            >
              Retry history
            </button>
          </p>
        ) : (
          items.map((item) => {
            return (
              <article key={item.id} className={historyStyles.revision}>
                <h3 className="font-700">
                  Revision {item.revision} · {item.status.replaceAll("_", " ")}
                </h3>
                <p className="break-words">{item.fileName}</p>
                <p>
                  Submitted by {item.uploadedBy.name} ·{" "}
                  {new Date(item.submittedAt).toLocaleString()}
                </p>
                {item.note && <p>Handler note: {item.note}</p>}
                {item.reviewNote && (
                  <p>
                    Records: {item.reviewNote} · {item.reviewedBy?.name}
                  </p>
                )}
                <div className={historyStyles.actions}>
                  {
                    <button
                      type="button"
                      className={styles.secondary}
                      onClick={() => {
                        setReading(item);
                      }}
                    >
                      Open revision {item.revision}
                    </button>
                  }
                  <button
                    type="button"
                    className={styles.secondary}
                    onClick={() => {
                      void download(item.id, item.fileName);
                    }}
                  >
                    Download revision {item.revision}
                  </button>
                </div>
              </article>
            );
          })
        )}
        <div className={styles.actions}>
          <button
            type="button"
            disabled={loading || page === 1}
            onClick={() => {
              setPage(page - 1);
            }}
          >
            Previous revisions
          </button>
          <span>
            Page {page} of {Math.max(1, Math.ceil(total / 20))}
          </span>
          <button
            type="button"
            disabled={loading || page * 20 >= total}
            onClick={() => {
              setPage(page + 1);
            }}
          >
            Next revisions
          </button>
        </div>
      </div>
      {reading && (
        <ReadingDialog
          key={reading.id}
          row={row}
          submission={reading}
          canReview={canReview}
          viewerId={viewerId}
          changed={(value) => {
            changed(value);

            setAttempt((current) => {
              return current + 1;
            });
          }}
          download={download}
          close={() => {
            setReading(null);
          }}
        />
      )}
    </dialog>
  );
}
