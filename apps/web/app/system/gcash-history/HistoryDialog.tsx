"use client";

import { useEffect, useRef, useState } from "react";
import type { GcashHistory, GcashSubmission } from "@freshphones/contracts";
import { getGcashSubmissions } from "@/lib/api";
import { ReadingDialog } from "./ReadingDialog";
import styles from "@/components/record-details.module.css";

export function HistoryDialog({
  row,
  close,
  download,
}: {
  row: GcashHistory;
  close: () => void;
  download: (id: string, filename: string) => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  const [page, setPage] = useState(1);

  const [reading, setReading] = useState<GcashSubmission | null>(null);

  const [items, setItems] = useState<GcashSubmission[]>([]);

  const [total, setTotal] = useState(0);

  const [error, setError] = useState<string | null>(null);

  const [attempt, setAttempt] = useState(0);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

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
      ref={dialog}
      className={styles.dialog}
      aria-labelledby="gcash-history-title"
      onCancel={close}
    >
      <header className={styles.header}>
        <h2 id="gcash-history-title">{row.batch.code} — PDF history</h2>
        <button type="button" className={styles.secondary} onClick={close}>
          Close history
        </button>
      </header>
      <div className={styles.formBody}>
        <p>
          {row.periodStart} to {row.periodEnd}. Earlier PDFs and Records notes
          are preserved.
        </p>
        {loading ? (
          <p role="status">Loading PDF history…</p>
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
              <article
                key={item.id}
                className="rounded-2xl border border-slate-200 p-4"
              >
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
                {item.reading && (
                  <button
                    type="button"
                    className={styles.secondary}
                    onClick={() => {
                      setReading(item);
                    }}
                  >
                    Read revision {item.revision}
                  </button>
                )}
                <button
                  type="button"
                  className={styles.secondary}
                  onClick={() => {
                    void download(item.id, item.fileName);
                  }}
                >
                  Download revision {item.revision}
                </button>
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
          id={reading.id}
          filename={reading.fileName}
          close={() => {
            setReading(null);
          }}
        />
      )}
    </dialog>
  );
}
