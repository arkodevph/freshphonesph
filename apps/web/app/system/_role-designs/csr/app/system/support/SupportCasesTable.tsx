"use client";

import { ChatCircle, Check } from "@phosphor-icons/react";
import {
  SUPPORT_STATUSES,
  supportSourceLabel,
  type SupportCase,
} from "@/lib/api";
import WorkspaceProgress from "@/app/system/_role-designs/csr/components/WorkspaceProgress";
import styles from "@/app/system/_role-designs/csr/app/system/support/support-workspace.module.css";

type Props = {
  loading: boolean;
  error: string | null;
  cases: SupportCase[];
  focusedCase: string | null;
  activeCaseId: string | null;
  openCase: (id: string) => void;
};

export default function SupportCasesTable({
  loading,
  error,
  cases,
  focusedCase,
  activeCaseId,
  openCase,
}: Props) {
  return (
    <div
      className={styles.caseList}
      aria-busy={loading}
      aria-label="Support cases"
    >
      {loading && !cases.length ? (
        <div className={styles.empty}>
          <WorkspaceProgress label="Loading cases…" />
        </div>
      ) : !cases.length ? (
        <div className={styles.empty}>
          <ChatCircle aria-hidden="true" />
          <strong>
            {error
              ? "Cases unavailable"
              : focusedCase
                ? "Case unavailable"
                : "No cases in this view"}
          </strong>
          <p>
            {error
              ? "Use Refresh to try again."
              : focusedCase
                ? "The case may have moved or you may no longer have access."
                : "Try another status or source, or log a new customer concern."}
          </p>
        </div>
      ) : (
        cases.map((c) => {
          const selected = activeCaseId === String(c.id);

          return (
            <button
              key={c.id}
              type="button"
              data-support-row
              className={styles.caseRow}
              aria-expanded={selected}
              aria-controls={selected ? "support-case-detail" : undefined}
              aria-label={`Open case ${String(c.id).slice(0, 8)} for ${c.client_name}`}
              onClick={() => {
                openCase(String(c.id));
              }}
            >
              <span>
                <strong>
                  {c.client_name}
                  {selected && (
                    <Check
                      aria-label="Selected"
                      size={14}
                      style={{ display: "inline", marginLeft: 8 }}
                    />
                  )}
                </strong>
                <small>
                  {c.category} · #{String(c.id).slice(0, 8)}
                </small>
                <small className={styles.preview}>{c.description}</small>
                {c.last_message?.by_customer && (
                  <small className={styles.replyFlag}>Customer replied</small>
                )}
              </span>
              <span>
                <span className={styles.status} data-status={c.status}>
                  {SUPPORT_STATUSES.find(([key]) => {
                    return key === c.status;
                  })?.[1] ?? c.status}
                </span>
                <small>{c.assigned_staff_name ?? "Unassigned"}</small>
              </span>
              <span className={styles.caseMeta}>
                <small>{supportSourceLabel(c.source)}</small>
                <small>
                  Received{" "}
                  {new Date(c.date_received).toLocaleDateString("en-PH", {
                    timeZone: "Asia/Manila",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </small>
              </span>
            </button>
          );
        })
      )}
    </div>
  );
}
