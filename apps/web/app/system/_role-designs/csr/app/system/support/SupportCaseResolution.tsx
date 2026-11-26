"use client";

import { SUPPORT_STATUSES, type SupportCase, type Me } from "@/lib/api";
import WorkspaceNativeSelect from "@/app/system/_role-designs/csr/components/WorkspaceNativeSelect";
import WorkspaceDetails from "@/app/system/_role-designs/csr/components/WorkspaceDetails";
import type { ResolutionDraft } from "@/app/system/_role-designs/csr/app/system/support/support-view";
import styles from "@/app/system/_role-designs/csr/app/system/support/support-workspace.module.css";

type Props = {
  supportCase: SupportCase;
  draft?: ResolutionDraft;
  pending: string | null;
  me: Me | null;
  editCase: (c: SupportCase, patch: Partial<ResolutionDraft>) => void;
  assignToMe: (c: SupportCase) => Promise<void>;
  saveCase: (c: SupportCase) => Promise<void>;
  discardDraft: (id: string) => void;
};

export default function SupportCaseResolution({
  supportCase: c,
  draft,
  pending,
  me,
  editCase,
  assignToMe,
  saveCase,
  discardDraft,
}: Props) {
  const stale = !!draft && draft.version !== c.version;

  return (
    <WorkspaceDetails className={styles.panel} open>
      <summary>Case details & resolution</summary>
      <div className={styles.editor} style={{ paddingTop: 16 }}>
        <div className={styles.heading}>
          <p className={styles.muted}>
            Assigned to {c.assigned_staff_name ?? "no one"}
          </p>
          {!c.assigned_staff &&
            ["csr", "coo", "cs_head", "cs_team"].includes(me?.role ?? "") &&
            !["resolved", "closed"].includes(c.status) && (
              <button
                className={styles.button}
                type="button"
                disabled={!!pending}
                onClick={() => {
                  void assignToMe(c);
                }}
              >
                Assign to me
              </button>
            )}
        </div>
        <label>
          Status
          <WorkspaceNativeSelect
            aria-label={`Status for ${c.category}`}
            value={draft?.status ?? c.status}
            disabled={!!pending || c.status === "closed"}
            onChange={(event) => {
              editCase(c, { status: event.target.value });
            }}
          >
            {SUPPORT_STATUSES.map(([value, label]) => {
              return (
                <option key={value} value={value}>
                  {label}
                </option>
              );
            })}
          </WorkspaceNativeSelect>
        </label>
        <label>
          Resolution
          <textarea
            aria-label={`Resolution for ${c.category}`}
            value={draft?.resolution ?? c.resolution}
            onChange={(event) => {
              editCase(c, { resolution: event.target.value });
            }}
            disabled={!!pending || c.status === "closed"}
            placeholder="What was done?"
          />
        </label>
        {stale && (
          <p role="alert">
            Case changed. Your draft is retained; discard it before saving.
          </p>
        )}
        <div className={styles.actions}>
          <button
            className={styles.primary}
            type="button"
            disabled={!!pending || !draft || stale || c.status === "closed"}
            onClick={() => {
              void saveCase(c);
            }}
          >
            {pending === `save:${c.id}` ? "Saving…" : "Save changes"}
          </button>
          {draft && (
            <button
              className={styles.button}
              type="button"
              disabled={!!pending}
              onClick={() => {
                discardDraft(String(c.id));
              }}
            >
              Discard resolution draft
            </button>
          )}
        </div>
      </div>
    </WorkspaceDetails>
  );
}
