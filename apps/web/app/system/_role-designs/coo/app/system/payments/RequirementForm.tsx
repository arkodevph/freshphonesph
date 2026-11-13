"use client";

import WorkspaceNativeSelect from "@/app/system/_role-designs/coo/components/WorkspaceNativeSelect";
import type {
  EvidenceRequirementInput,
  SubmissionChecklist,
} from "@freshphones/contracts";
import type { RequirementDraft } from "@/app/system/payments/useSubmissionChecklist";
import styles from "@/app/system/_role-designs/coo/app/system/payments/submission-checklist.module.css";

export default function RequirementForm({
  draft,
  data,
  saving,
  edit,
  save,
  cancel,
}: {
  draft: RequirementDraft;
  data: SubmissionChecklist;
  saving: boolean;
  edit: (record: EvidenceRequirementInput) => void;
  save: () => Promise<void>;
  cancel: () => void;
}) {
  const record = draft.record;

  const stale =
    draft.version > 0 &&
    data.requirements.find((row) => {
      return row.id === draft.id;
    })?.version !== draft.version;

  const patch = (change: Partial<EvidenceRequirementInput>) => {
    edit({ ...record, ...change });
  };

  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();

        void save();
      }}
    >
      <h3>
        {draft.version
          ? "Update expected evidence"
          : "Declare expected evidence"}
      </h3>
      <p>
        {record.periodStart} – {record.periodEnd}. Link the actual submission
        when it arrives. A reason is saved with every change.
      </p>
      <fieldset disabled={saving || stale}>
        <label>
          Evidence type
          <WorkspaceNativeSelect
            value={record.kind}
            disabled={draft.version > 0}
            onChange={(event) => {
              patch({
                kind: event.target.value as EvidenceRequirementInput["kind"],
                clientId: null,
                paymentId: null,
                historyId: null,
              });
            }}
          >
            <option value="RECEIPT">Receipt</option>
            <option value="STATEMENT">GCash statement</option>
          </WorkspaceNativeSelect>
        </label>
        {record.kind === "RECEIPT" && (
          <label>
            Member
            <WorkspaceNativeSelect
              required
              value={record.clientId ?? ""}
              disabled={draft.version > 0}
              onChange={(event) => {
                patch({
                  clientId: event.target.value || null,
                  paymentId: null,
                });
              }}
            >
              <option value="">Choose member</option>
              {data.members.map((member) => {
                return (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                );
              })}
            </WorkspaceNativeSelect>
          </label>
        )}
        <label>
          {record.kind === "STATEMENT"
            ? "Required statement and account owner"
            : "Expected receipt description"}
          <input
            required
            minLength={3}
            maxLength={500}
            value={record.description}
            onChange={(event) => {
              patch({ description: event.target.value });
            }}
          />
        </label>
        {record.kind === "RECEIPT" ? (
          <label>
            Received payment
            <WorkspaceNativeSelect
              value={record.paymentId ?? ""}
              onChange={(event) => {
                patch({ paymentId: event.target.value || null });
              }}
            >
              <option value="">Still missing</option>
              {data.payments
                .filter((payment) => {
                  return (
                    payment.clientId === record.clientId &&
                    payment.date >= record.periodStart &&
                    payment.date <= record.periodEnd
                  );
                })
                .map((payment) => {
                  return (
                    <option key={payment.id} value={payment.id}>
                      {payment.name} · {payment.date} · {payment.id.slice(0, 8)}
                    </option>
                  );
                })}
            </WorkspaceNativeSelect>
          </label>
        ) : (
          <label>
            Received statement
            <WorkspaceNativeSelect
              value={record.historyId ?? ""}
              onChange={(event) => {
                patch({ historyId: event.target.value || null });
              }}
            >
              <option value="">Still missing</option>
              {data.statements
                .filter((statement) => {
                  return (
                    statement.from <= record.periodStart &&
                    statement.to >= record.periodEnd
                  );
                })
                .map((statement) => {
                  return (
                    <option key={statement.id} value={statement.id}>
                      {statement.label} · {statement.from} – {statement.to}
                    </option>
                  );
                })}
            </WorkspaceNativeSelect>
          </label>
        )}
        {draft.version > 0 && (
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={record.cancelled}
              onChange={(event) => {
                patch({ cancelled: event.target.checked });
              }}
            />
            Cancel this expectation because it is no longer required
          </label>
        )}
        <label>
          Reason
          <textarea
            required
            minLength={3}
            maxLength={1000}
            rows={3}
            value={record.reason}
            onChange={(event) => {
              patch({ reason: event.target.value });
            }}
          />
        </label>
      </fieldset>
      {stale && (
        <p role="alert">
          This expectation changed while you were editing. Your draft is
          preserved. Cancel to review the current version before editing again.
        </p>
      )}
      <div className={styles.actions}>
        <button type="button" disabled={saving} onClick={cancel}>
          Cancel editing
        </button>
        <button type="submit" disabled={saving || stale}>
          {saving ? "Saving…" : "Save expected evidence"}
        </button>
      </div>
    </form>
  );
}
