"use client";

import { useEffect, useId, useState } from "react";
import { Devices } from "@phosphor-icons/react";
import styles from "./security.module.css";

export type SecuritySession = {
  id: string;
  createdAt: string;
  expiresAt: string;
  userAgent: string | null;
  current: boolean;
};

const pageSize = 5;

export default function ActiveSessions({
  sessions,
  busy,
  onRevoke,
}: {
  sessions: SecuritySession[];
  busy: boolean;
  onRevoke: (sessionId?: string) => void;
}) {
  const id = useId();

  const [page, setPage] = useState(1);

  const pages = Math.max(1, Math.ceil(sessions.length / pageSize));

  const currentPage = Math.min(page, pages);

  const start = (currentPage - 1) * pageSize;

  // Keep this device easy to find; retain the API's recent-first order for others.
  const ordered = [
    ...sessions.filter((session) => {
      return session.current;
    }),
    ...sessions.filter((session) => {
      return !session.current;
    }),
  ];

  const visible = ordered.slice(start, start + pageSize);

  useEffect(() => {
    setPage((current) => {
      return Math.min(current, pages);
    });
  }, [pages]);

  return (
    <section
      className={styles.card}
      data-portal-material="card"
      aria-labelledby={`${id}-title`}
    >
      <div className={styles.cardHeading}>
        <span className={styles.sectionIcon}>
          <Devices aria-hidden="true" />
        </span>
        <h2 id={`${id}-title`}>Active sessions</h2>
      </div>
      <p>
        Sign out sessions you no longer recognize. Password changes and account
        access changes also end sessions.
      </p>
      <p className={styles.sessionSummary} role="status" aria-atomic="true">
        {sessions.length
          ? `Showing ${start + 1}–${start + visible.length} of ${sessions.length} sessions`
          : "No active sessions to show."}
        <span className={styles.srOnly}>
          {` Page ${currentPage} of ${pages}.`}
        </span>
      </p>
      <ul className={styles.sessions} id={`${id}-list`}>
        {visible.map((session) => {
          return (
            <li key={session.id}>
              <div>
                <strong>
                  {session.current ? "This session" : "Another session"}
                </strong>
                <p>Signed in {new Date(session.createdAt).toLocaleString()}</p>
              </div>
              {!session.current && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    return onRevoke(session.id);
                  }}
                >
                  Sign out
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <nav className={styles.sessionPagination} aria-label="Session pages">
        <button
          type="button"
          aria-label="Previous sessions page"
          aria-controls={`${id}-list`}
          disabled={busy || currentPage === 1}
          onClick={() => {
            return setPage(currentPage - 1);
          }}
        >
          Previous
        </button>
        <span>
          Page {currentPage} of {pages}
        </span>
        <button
          type="button"
          aria-label="Next sessions page"
          aria-controls={`${id}-list`}
          disabled={busy || currentPage === pages}
          onClick={() => {
            return setPage(currentPage + 1);
          }}
        >
          Next
        </button>
      </nav>
      <button
        type="button"
        disabled={busy || sessions.length < 2}
        onClick={() => {
          return onRevoke();
        }}
      >
        Sign out other sessions
      </button>
    </section>
  );
}
