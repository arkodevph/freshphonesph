"use client";

import WorkspaceNativeSelect from "@/app/system/_role-designs/coo/components/WorkspaceNativeSelect";
import { useState } from "react";
import type {
  WithdrawalCase,
  WithdrawalDecisionInput,
} from "@freshphones/contracts";
import {
  cancelWithdrawal,
  decideWithdrawal,
  forwardWithdrawal,
  resubmitWithdrawal,
} from "@/lib/withdrawals";
import {
  ActionForm,
  NoteField,
} from "@/app/system/_role-designs/coo/components/withdrawals/ActionForm";
import styles from "@/app/system/_role-designs/coo/components/withdrawals/workspace.module.css";

export type RunWithdrawalAction = (
  action: () => Promise<unknown>,
  message: string,
) => Promise<boolean>;

export function ReviewActions({
  row,
  busy,
  run,
}: {
  row: WithdrawalCase;
  busy: boolean;
  run: RunWithdrawalAction;
}) {
  const [note, setNote] = useState("");

  const [reason, setReason] = useState(row.reason);

  const [decision, setDecision] =
    useState<WithdrawalDecisionInput["decision"]>("CHANGES_REQUESTED");

  return (
    <>
      {row.actions.forward && (
        <ActionForm
          title="Agent review"
          label="Forward to COO"
          busy={busy}
          onSave={() => {
            return run(() => {
              return forwardWithdrawal(row.id, { version: row.version, note });
            }, "Request forwarded to the COO. Installments continue.");
          }}
        >
          <p>
            Review the member's explanation and add context for the COO.
            Forwarding does not approve withdrawal.
          </p>
          <NoteField
            label="Agent review notes"
            value={note}
            onChange={setNote}
          />
        </ActionForm>
      )}
      {row.actions.decide && (
        <ActionForm
          title="COO withdrawal decision"
          label="Review withdrawal decision"
          busy={busy}
          confirm="This records the withdrawal decision only. Approval keeps installments due and the batch position occupied until an approved replacement joins. Refund resolution remains separate."
          onSave={() => {
            return run(() => {
              return decideWithdrawal(row.id, {
                version: row.version,
                decision,
                note,
              });
            }, "Withdrawal decision saved. Refund resolution is tracked separately.");
          }}
        >
          <label className={styles.field}>
            Withdrawal decision
            <WorkspaceNativeSelect
              value={decision}
              onChange={(event) => {
                setDecision(
                  event.target.value as WithdrawalDecisionInput["decision"],
                );
              }}
            >
              <option value="CHANGES_REQUESTED">
                Request more information
              </option>
              <option value="APPROVED">Approve — await replacement</option>
              <option value="REJECTED">Do not approve</option>
            </WorkspaceNativeSelect>
          </label>
          <NoteField
            label="Decision note for the member"
            value={note}
            onChange={setNote}
          />
        </ActionForm>
      )}
      {row.actions.resubmit && (
        <ActionForm
          title="Update your explanation"
          label="Resubmit to Agent"
          busy={busy}
          onSave={() => {
            return run(() => {
              return resubmitWithdrawal(row.id, {
                version: row.version,
                reason,
              });
            }, "Updated explanation sent to your Agent.");
          }}
        >
          <NoteField
            label="Withdrawal explanation"
            value={reason}
            onChange={setReason}
            minLength={10}
            maxLength={5000}
          />
        </ActionForm>
      )}
      {row.actions.cancel && (
        <ActionForm
          title="Cancel this request"
          label="Review cancellation"
          busy={busy}
          confirm="Your withdrawal request will be cancelled. Your membership, installment schedule and payment records continue as before."
          onSave={() => {
            return run(() => {
              return cancelWithdrawal(row.id, { version: row.version, note });
            }, "Withdrawal request cancelled.");
          }}
        >
          <NoteField
            label="Reason for cancelling"
            value={note}
            onChange={setNote}
          />
        </ActionForm>
      )}
    </>
  );
}
