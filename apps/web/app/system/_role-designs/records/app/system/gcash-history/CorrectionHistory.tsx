"use client";

import WorkspaceProgress from "@/app/system/_role-designs/records/components/WorkspaceProgress";
import WorkspaceDetails from "@/app/system/_role-designs/records/components/WorkspaceDetails";
import { useEffect, useState } from "react";
import type { GcashCorrectionEntry, Page } from "@freshphones/contracts";
import { getGcashCorrections } from "@/lib/gcash-history";
import styles from "@/app/system/_role-designs/records/app/system/gcash-history/workspace.module.css";

export function CorrectionHistory({
  id,
  refresh,
}: {
  id: string;
  refresh: number;
}) {
  const [open, setOpen] = useState(false);

  const [page, setPage] = useState(1);

  const [result, setResult] = useState<Page<GcashCorrectionEntry> | null>(null);

  const [error, setError] = useState("");

  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!open) {
      return;
    }

    let active = true;

    setResult(null);

    setError("");

    void getGcashCorrections(id, page)
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
              : "Could not load corrections.",
          );
        }
      });

    return () => {
      active = false;
    };
  }, [open, id, page, refresh, attempt]);

  return (
    <WorkspaceDetails
      className={styles.correctionHistory}
      onToggle={(event) => {
        setOpen(event.currentTarget.open);
      }}
    >
      <summary>Correction history</summary>
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
              Retry correction history
            </button>
          </p>
        ) : !result ? (
          <WorkspaceProgress label="Loading corrections…" />
        ) : (
          <>
            {!result.total && (
              <p>No manual corrections for this PDF revision.</p>
            )}
            {result.items.map((entry) => {
              return (
                <article className={styles.correctionEntry} key={entry.id}>
                  <h4>
                    Correction {entry.version} · transaction{" "}
                    {entry.rowIndex + 1}
                  </h4>
                  <p>
                    {entry.editor.name} ·{" "}
                    {new Date(entry.createdAt).toLocaleString()} ·{" "}
                    {entry.reason}
                  </p>
                  <dl>
                    {(
                      [
                        "date",
                        "time",
                        "description",
                        "reference",
                        "debit",
                        "credit",
                        "balance",
                      ] as const
                    )
                      .filter((key) => {
                        return entry.before[key] !== entry.after[key];
                      })
                      .map((key) => {
                        return (
                          <div key={key}>
                            <dt>{key}</dt>
                            <dd>
                              <span>
                                Before: {entry.before[key] || "Not read"}
                              </span>
                              <span>
                                After: {entry.after[key] || "Not read"}
                              </span>
                            </dd>
                          </div>
                        );
                      })}
                  </dl>
                </article>
              );
            })}
            <nav
              className={styles.toolbar}
              aria-label="Correction history pages"
            >
              <button
                type="button"
                disabled={page === 1}
                onClick={() => {
                  setPage(page - 1);
                }}
              >
                Earlier page
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
                Next page
              </button>
            </nav>
          </>
        ))}
    </WorkspaceDetails>
  );
}
