"use client";

import WorkspaceDetails from "@/app/system/_role-designs/batch_handler/components/WorkspaceDetails";
import WorkspaceNativeSelect from "@/app/system/_role-designs/batch_handler/components/WorkspaceNativeSelect";
import DateInput from "@/app/system/_role-designs/batch_handler/components/DateInput";
import { useState } from "react";
import Link from "next/link";
import type { ChecklistState } from "@freshphones/contracts";
import { useSubmissionChecklist } from "@/app/system/payments/useSubmissionChecklist";
import RequirementForm from "@/app/system/_role-designs/batch_handler/app/system/payments/RequirementForm";
import styles from "@/app/system/_role-designs/batch_handler/app/system/payments/submission-checklist.module.css";

const labels: Record<ChecklistState, string> = {
  MISSING: "Missing",
  RETURNED: "Returned",
  RECEIVED: "Received · awaiting Records",
  COMPLETE: "Complete",
  CANCELLED: "Cancelled",
};

export default function SubmissionChecklist({ enabled }: { enabled: boolean }) {
  const [open, setOpen] = useState(false);

  const workspace = useSubmissionChecklist(enabled, open);

  const { data, draft, loading, saving, query, activeQuery } = workspace;

  const locked = Boolean(draft) || saving;

  return (
    <WorkspaceDetails
      id="submission-checklist"
      className={`${styles.panel} glass`}
      onToggle={(event) => {
        setOpen(event.currentTarget.open);
      }}
    >
      <summary>Submission checklist</summary>
      <div className={styles.body}>
        <p>
          Company-wide rule: receipt proof for recorded claims, Records-reviewed
          required statements, and declared missing submissions must be complete
          before Manager approval or Finance verification. Unpaid installments
          are tracked separately.
        </p>
        <form
          className={styles.filters}
          onSubmit={(event) => {
            event.preventDefault();

            workspace.setDraft(null);

            void workspace.load(query);
          }}
        >
          <label>
            Find batch
            <input
              value={workspace.search}
              disabled={locked}
              onChange={(event) => {
                workspace.setSearch(event.target.value);
              }}
              placeholder="Search batch code or model"
            />
          </label>
          <label>
            Batch
            <WorkspaceNativeSelect
              required
              value={query.batchId}
              disabled={locked}
              onChange={(event) => {
                workspace.setQuery({ ...query, batchId: event.target.value });
              }}
            >
              <option value="">Choose batch</option>
              {workspace.batches.map((batch) => {
                return (
                  <option key={String(batch.id)} value={String(batch.id)}>
                    {batch.batch_number}
                  </option>
                );
              })}
            </WorkspaceNativeSelect>
          </label>
          <label>
            From
            <DateInput
              required
              type="date"
              value={query.from}
              disabled={locked}
              onChange={(event) => {
                workspace.setQuery({ ...query, from: event.target.value });
              }}
            />
          </label>
          <label>
            To
            <DateInput
              required
              type="date"
              min={query.from}
              value={query.to}
              disabled={locked}
              onChange={(event) => {
                workspace.setQuery({ ...query, to: event.target.value });
              }}
            />
          </label>
          <button disabled={locked || loading || !query.batchId}>
            {loading ? "Loading…" : "Load checklist"}
          </button>
        </form>
        {workspace.error && (
          <p className={styles.error} role="alert">
            {workspace.error}{" "}
            <button
              type="button"
              disabled={loading || saving}
              onClick={() => {
                void workspace.load(activeQuery ?? query);
              }}
            >
              Retry
            </button>
          </p>
        )}
        {workspace.notice && <p role="status">{workspace.notice}</p>}
        {data && activeQuery && (
          <>
            <header className={styles.heading}>
              <div>
                <h3>
                  {data.complete
                    ? "No missing evidence in this view"
                    : "Submission evidence incomplete"}
                </h3>
                <p>
                  {activeQuery.from} – {activeQuery.to}. Statements and
                  expectations can cover a wider reporting period.
                </p>
              </div>
              {data.canManage && (
                <button
                  type="button"
                  disabled={locked || loading}
                  onClick={workspace.add}
                >
                  Add expected evidence
                </button>
              )}
            </header>
            <ul className={styles.rows} aria-label="Submission evidence">
              {data.payments.map((payment) => {
                return (
                  <li key={`payment-${payment.id}`}>
                    <div>
                      <strong>{payment.name}</strong>
                      <span>Recorded claim · {payment.date}</span>
                    </div>
                    <span data-state={payment.state}>
                      {labels[payment.state]}
                    </span>
                    <Link href={`/system/payments?payment=${payment.id}`}>
                      Open payment
                    </Link>
                  </li>
                );
              })}
              {data.statements.map((statement) => {
                return (
                  <li key={`statement-${statement.id}`}>
                    <div>
                      <strong>{statement.label}</strong>
                      <span>
                        Statement · {statement.from} – {statement.to}
                      </span>
                    </div>
                    <span data-state={statement.state}>
                      {labels[statement.state]}
                    </span>
                    <Link
                      href={`/system/gcash-history?history=${statement.id}`}
                    >
                      Open statement
                    </Link>
                  </li>
                );
              })}
              {data.requirements.map((requirement) => {
                return (
                  <li key={requirement.id}>
                    <div>
                      <strong>{requirement.description}</strong>
                      <span>
                        Expected {requirement.kind.toLowerCase()} ·{" "}
                        {requirement.periodStart} – {requirement.periodEnd}
                      </span>
                      <span>Reason: {requirement.reason}</span>
                    </div>
                    <span data-state={requirement.state}>
                      {labels[requirement.state]}
                    </span>
                    {data.canManage && (
                      <button
                        type="button"
                        disabled={locked || loading}
                        onClick={() => {
                          const {
                            id,
                            version,
                            state: _state,
                            ...record
                          } = requirement;

                          workspace.setDraft({
                            id,
                            version,
                            record: { ...record, reason: "" },
                          });
                        }}
                      >
                        Update evidence
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
            {!data.payments.length &&
              !data.statements.length &&
              !data.requirements.length && (
                <p>
                  No recorded claims, uploaded statements or declared
                  expectations in this period. This does not confirm that
                  installments have been paid.
                </p>
              )}
            {draft && (
              <RequirementForm
                draft={draft}
                data={data}
                saving={saving}
                edit={(record) => {
                  workspace.setDraft({ ...draft, record });
                }}
                save={workspace.save}
                cancel={() => {
                  workspace.setDraft(null);
                }}
              />
            )}
          </>
        )}
      </div>
    </WorkspaceDetails>
  );
}
