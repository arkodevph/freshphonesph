"use client";

import WorkspaceProgress from "@/components/WorkspaceProgress";
import WorkspaceDetails from "@/components/WorkspaceDetails";
import { useEffect, useState } from "react";
import type { GcashActivityEntry, Page } from "@freshphones/contracts";
import { getGcashActivity } from "@/lib/gcash-history";
import styles from "./workspace.module.css";

const labels: Record<string, string> = {
  "gcash_history.submitted": "PDF submitted",
  "gcash_history.resubmitted": "Replacement PDF submitted",
  "gcash_history.reviewed": "Records decision saved",
  "gcash_history.transaction_corrected":
    "Transaction corrected · review reopened",
  "gcash_history.archived": "Period archived",
  "gcash_history.restored": "Period restored",
};

export function ReviewHistory({
  id,
  refresh,
}: {
  id: string;
  refresh: number;
}) {
  const [open, setOpen] = useState(false);

  const [page, setPage] = useState(1);

  const [result, setResult] = useState<Page<GcashActivityEntry> | null>(null);

  const [error, setError] = useState("");

  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!open) {
      return;
    }

    let active = true;

    setError("");

    setResult(null);

    void getGcashActivity(id, page)
      .then((value) => {
        if (active) {
          setResult(value);
        }
      })
      .catch((failure: unknown) => {
        if (active) {
          setError(
            failure instanceof Error
              ? failure.message
              : "Could not load review history.",
          );
        }
      });

    return () => {
      active = false;
    };
  }, [id, page, open, refresh, attempt]);

  return (
    <WorkspaceDetails
      className={styles.reviewNote}
      onToggle={(event) => {
        setOpen(event.currentTarget.open);
      }}
    >
      <summary>Review and archive history</summary>
      {open &&
        (error ? (
          <p role="alert">
            {error}{" "}
            <button
              type="button"
              onClick={() => {
                setAttempt(attempt + 1);
              }}
            >
              Retry review history
            </button>
          </p>
        ) : !result ? (
          <WorkspaceProgress label="Loading review history…" />
        ) : (
          <>
            {result.items.map((item) => {
              return (
                <article key={item.id} className={styles.correctionEntry}>
                  <h4>
                    {labels[item.action] ?? item.action} · revision{" "}
                    {item.revision}
                  </h4>
                  <p>
                    {item.actor.name} ·{" "}
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                  {item.reason && <p>{item.reason}</p>}
                  {item.previousReview && (
                    <p>
                      Previous review by {item.previousReview.reviewer}
                      {item.previousReview.reviewedAt
                        ? ` on ${new Date(item.previousReview.reviewedAt).toLocaleString()}`
                        : ""}
                      : {item.previousReview.note}
                    </p>
                  )}
                </article>
              );
            })}
            <nav className={styles.toolbar} aria-label="Review history pages">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => {
                  setPage(page - 1);
                }}
              >
                Previous history page
              </button>
              <span>
                Page {page} of{" "}
                {Math.max(1, Math.ceil(result.total / result.pageSize))}
              </span>
              <button
                type="button"
                disabled={page * result.pageSize >= result.total}
                onClick={() => {
                  setPage(page + 1);
                }}
              >
                Next history page
              </button>
            </nav>
          </>
        ))}
    </WorkspaceDetails>
  );
}
