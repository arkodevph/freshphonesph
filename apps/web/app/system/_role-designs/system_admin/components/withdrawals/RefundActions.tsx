"use client";

import WorkspaceNativeSelect from "@/app/system/_role-designs/system_admin/components/WorkspaceNativeSelect";
import DateInput from "@/app/system/_role-designs/system_admin/components/DateInput";
import { useRef, useState } from "react";
import type {
  WithdrawalCase,
  WithdrawalRefundInput,
} from "@freshphones/contracts";
import {
  decideWithdrawalRefund,
  moneyInput,
  recordWithdrawalPayout,
  withdrawalMoney,
} from "@/lib/withdrawals";
import {
  ActionForm,
  NoteField,
} from "@/app/system/_role-designs/system_admin/components/withdrawals/ActionForm";
import type { RunWithdrawalAction } from "@/app/system/_role-designs/system_admin/components/withdrawals/ReviewActions";
import styles from "@/app/system/_role-designs/system_admin/components/withdrawals/workspace.module.css";
import { today as manilaToday } from "@/lib/date";

export function RefundActions({
  row,
  busy,
  run,
}: {
  row: WithdrawalCase;
  busy: boolean;
  run: RunWithdrawalAction;
}) {
  const [decision, setDecision] = useState<WithdrawalRefundInput["decision"]>(
    row.refundStatus,
  );

  const [amount, setAmount] = useState(row.refundAmount ?? "");

  const [date, setDate] = useState(row.refundTargetDate ?? "");

  const [note, setNote] = useState("");

  const [paidAmount, setPaidAmount] = useState("");

  const [paidDate, setPaidDate] = useState(manilaToday());

  const [method, setMethod] = useState("");

  const [reference, setReference] = useState("");

  const [paidNote, setPaidNote] = useState("");

  const requestId = useRef<string | null>(null);

  return (
    <>
      {row.actions.refund && (
        <ActionForm
          title="COO refund decision"
          label="Review refund decision"
          busy={busy}
          confirm="This records a refund decision, not a payment. Only an approved amount becomes available for Finance to record an external refund. No money is sent from this application."
          onSave={() => {
            return run(async () => {
              return decideWithdrawalRefund(row.id, {
                version: row.version,
                decision,
                amount: decision === "APPROVED" ? moneyInput(amount) : null,
                targetDate: decision === "APPROVED" && date ? date : null,
                note,
              });
            }, "Refund decision saved. No payment was made.");
          }}
        >
          <p>
            The amount is decided for this case. Keep it pending if the business
            has not settled an amount or payment date.
          </p>
          <label className={styles.field}>
            Refund decision
            <WorkspaceNativeSelect
              value={decision}
              onChange={(event) => {
                setDecision(
                  event.target.value as WithdrawalRefundInput["decision"],
                );
              }}
            >
              <option value="PENDING">Decision pending</option>
              <option value="APPROVED">Approve an amount</option>
              <option value="DECLINED">Do not approve a refund</option>
            </WorkspaceNativeSelect>
          </label>
          {decision === "APPROVED" && (
            <div className={styles.fields}>
              <label className={styles.field}>
                Approved refund amount (PHP)
                <input
                  required
                  inputMode="decimal"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(event) => {
                    setAmount(event.target.value);
                  }}
                />
              </label>
              <label className={styles.field}>
                Target payment date (optional)
                <DateInput
                  type="date"
                  value={date}
                  onChange={(event) => {
                    setDate(event.target.value);
                  }}
                />
              </label>
            </div>
          )}
          <NoteField
            label="Refund decision note for the member"
            value={note}
            onChange={setNote}
          />
        </ActionForm>
      )}
      {row.actions.payout && (
        <ActionForm
          title="Finance: record an external refund"
          label="Review external refund record"
          busy={busy}
          confirm={`Confirm this refund was already paid externally. The remaining approved amount is ${withdrawalMoney(row.refundRemaining)}. Saving records the payment evidence; it does not send money or change installment payment history.`}
          onSave={() => {
            return run(async () => {
              requestId.current ??= crypto.randomUUID();

              return recordWithdrawalPayout(row.id, {
                version: row.version,
                requestId: requestId.current,
                amount: moneyInput(paidAmount),
                paymentDate: paidDate,
                method,
                reference,
                note: paidNote,
              });
            }, "External refund payment recorded. Installment receipts are unchanged.");
          }}
        >
          <p>
            Record only a refund that was actually paid outside this system.
            Approved amount: {withdrawalMoney(row.refundAmount)} · Already
            recorded: {withdrawalMoney(row.refundPaid)} · Remaining:{" "}
            {withdrawalMoney(row.refundRemaining)}.
          </p>
          <div className={styles.fields}>
            <label className={styles.field}>
              Refund paid (PHP)
              <input
                required
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                max={row.refundRemaining ?? undefined}
                value={paidAmount}
                onChange={(event) => {
                  setPaidAmount(event.target.value);
                }}
              />
            </label>
            <label className={styles.field}>
              Payment date
              <DateInput
                required
                type="date"
                max={manilaToday()}
                value={paidDate}
                onChange={(event) => {
                  setPaidDate(event.target.value);
                }}
              />
            </label>
            <label className={styles.field}>
              Payment method
              <input
                required
                minLength={2}
                maxLength={40}
                value={method}
                onChange={(event) => {
                  setMethod(event.target.value);
                }}
                placeholder="e.g. GCash"
              />
            </label>
            <label className={styles.field}>
              External reference
              <input
                required
                minLength={3}
                maxLength={120}
                value={reference}
                onChange={(event) => {
                  setReference(event.target.value);
                }}
              />
            </label>
          </div>
          <NoteField
            label="Refund payment note"
            value={paidNote}
            onChange={setPaidNote}
          />
        </ActionForm>
      )}
    </>
  );
}
