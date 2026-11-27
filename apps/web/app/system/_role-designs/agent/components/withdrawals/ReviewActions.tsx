"use client";

import { useState } from "react";
import type { WithdrawalCase } from "@freshphones/contracts";
import { ActionForm, NoteField } from "./ActionForm";
import { withdrawalCommand } from "./agent-withdrawal";

export type RunWithdrawalAction = (
  action: () => Promise<unknown>,
  message: string,
) => Promise<boolean>;

export function ReviewActions({
  row,
  busy,
  blocked = busy,
  run,
}: {
  row: WithdrawalCase;
  busy: boolean;
  blocked?: boolean;
  run: RunWithdrawalAction;
}) {
  const [note, setNote] = useState("");

  if (!row.actions.forward) {
    return null;
  }

  return (
    <ActionForm
      title="Your Agent review"
      label="Forward to COO"
      busy={busy}
      blocked={blocked}
      onSave={() => {
        return run(
          withdrawalCommand(row.id, "forward", {
            version: row.version,
            note: note.trim(),
          }),
          "Request forwarded to the COO. Installments continue until the approved replacement handover.",
        );
      }}
    >
      <p>
        Review the member’s explanation and add context for the COO. Forwarding
        does not approve withdrawal or a refund.
      </p>
      <NoteField label="Agent review notes" value={note} onChange={setNote} />
    </ActionForm>
  );
}
