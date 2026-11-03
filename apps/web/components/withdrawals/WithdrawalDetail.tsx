"use client";

import type { WithdrawalCase } from "@freshphones/contracts";
import {
  withdrawalMoney,
  withdrawalRefundLabel,
  withdrawalStatusLabels,
} from "@/lib/withdrawals";
import { RefundActions } from "./RefundActions";
import { ReplacementActions } from "./ReplacementActions";
import { ReviewActions, type RunWithdrawalAction } from "./ReviewActions";
import styles from "./workspace.module.css";

export function WithdrawalDetail({
  row,
  customer,
  busy,
  stale,
  reload,
  close,
  run,
}: {
  row: WithdrawalCase;
  customer: boolean;
  busy: boolean;
  stale: boolean;
  reload: () => void;
  close: () => void;
  run: RunWithdrawalAction;
}) {
  return (
    <article
      className={styles.panel}
      aria-label={`Withdrawal request for ${row.batch.code}`}
    >
      <header className={styles.heading}>
        <div>
          <p className={styles.reference}>
            {row.batch.code} · Submitted{" "}
            {new Date(row.submittedAt).toLocaleDateString("en-PH")}
          </p>
          <h2>{row.memberName}</h2>
        </div>
        <button type="button" disabled={busy} onClick={close}>
          Back to requests
        </button>
      </header>
      <div className={styles.badges}>
        <span className={styles.badge}>
          {withdrawalStatusLabels[row.status]}
        </span>
        <span className={styles.badge}>{withdrawalRefundLabel(row)}</span>
      </div>
      {row.duesContinue ? (
        <div className={styles.consequence}>
          <strong>Installments continue until a replacement joins.</strong>
          <p>
            Submitting or approving this request does not stop dues or release
            the batch position. Refund decisions and payment are tracked
            separately.
          </p>
        </div>
      ) : row.status === "REPLACED" ? (
        <div className={styles.notice}>
          <strong>Replacement joined</strong>
          <p>
            The handover is recorded. Original payment history is retained, and
            refund resolution remains separate.
          </p>
        </div>
      ) : null}
      {stale && (
        <div className={styles.error} role="alert">
          <strong>This request has changed.</strong>
          <p>
            Your current draft is retained. Load the latest request and review
            its details before saving.
          </p>
          <button type="button" disabled={busy} onClick={reload}>
            Discard drafts and load latest request
          </button>
        </div>
      )}
      <section className={styles.section}>
        <h3>Member's explanation</h3>
        <p className={styles.reason}>{row.reason}</p>
      </section>
      {row.decisionNote && (
        <section className={styles.section}>
          <h3>COO decision</h3>
          <p className={styles.reason}>{row.decisionNote}</p>
        </section>
      )}
      {!customer && row.agentNote && (
        <section className={styles.section}>
          <h3>Agent review</h3>
          <p className={styles.reason}>{row.agentNote}</p>
        </section>
      )}
      <dl className={styles.summary}>
        <div>
          <dt>Current installment obligation</dt>
          <dd>{withdrawalMoney(row.financial.totalDue)}</dd>
        </div>
        <div>
          <dt>Verified installment payments</dt>
          <dd>{withdrawalMoney(row.financial.verifiedPaid)}</dd>
        </div>
        <div>
          <dt>Remaining installments</dt>
          <dd>{withdrawalMoney(row.financial.remaining)}</dd>
        </div>
        <div>
          <dt>Refund decision</dt>
          <dd>{withdrawalRefundLabel(row)}</dd>
        </div>
        <div>
          <dt>Approved refund</dt>
          <dd>{withdrawalMoney(row.refundAmount)}</dd>
        </div>
        <div>
          <dt>Target refund payment date</dt>
          <dd>{row.refundTargetDate ?? "Not scheduled"}</dd>
        </div>
        <div>
          <dt>Refund payment recorded</dt>
          <dd>{withdrawalMoney(row.refundPaid)}</dd>
        </div>
        <div>
          <dt>Approved refund still unpaid</dt>
          <dd>{withdrawalMoney(row.refundRemaining)}</dd>
        </div>
      </dl>
      {Number(row.financial.releasedDue) > 0 && (
        <p className={styles.help}>
          Originally scheduled: {withdrawalMoney(row.financial.originalDue)}.
          Unpaid obligation released at replacement:{" "}
          {withdrawalMoney(row.financial.releasedDue)}. This release is not a
          payment or refund.
        </p>
      )}
      {row.refundNote && (
        <section className={styles.section}>
          <h3>Refund decision note</h3>
          <p className={styles.reason}>{row.refundNote}</p>
        </section>
      )}
      {!customer && row.replacementMode && (
        <section className={styles.section}>
          <h3>Approved replacement arrangement</h3>
          <p>
            {row.replacementMode === "RESTART"
              ? "Start a fresh installment plan"
              : "Continue unpaid installments"}
          </p>
          {row.restartPlan && (
            <dl className={styles.summary}>
              <div>
                <dt>New contract price</dt>
                <dd>{withdrawalMoney(row.restartPlan.contractPrice)}</dd>
              </div>
              <div>
                <dt>Installments</dt>
                <dd>
                  {row.restartPlan.installmentCount} ·{" "}
                  {row.restartPlan.cadence === "SEMIMONTHLY"
                    ? "15th and month end"
                    : row.restartPlan.cadence.toLowerCase()}
                </dd>
              </div>
              <div>
                <dt>New plan start</dt>
                <dd>{row.restartPlan.startDate}</dd>
              </div>
              <div>
                <dt>First new due date</dt>
                <dd>{row.restartPlan.firstDueDate}</dd>
              </div>
            </dl>
          )}
          {row.consultationNote && (
            <>
              <h4>CEO consultation (staff only)</h4>
              <p className={styles.reason}>{row.consultationNote}</p>
            </>
          )}
          {row.replacementNote && (
            <p className={styles.reason}>{row.replacementNote}</p>
          )}
        </section>
      )}
      <div key={`${row.id}:${row.version}`}>
        <ReviewActions row={row} busy={busy || stale} run={run} />
        {!customer && (
          <ReplacementActions row={row} busy={busy || stale} run={run} />
        )}
        {!customer && (
          <RefundActions row={row} busy={busy || stale} run={run} />
        )}
      </div>
      <details className={styles.section}>
        <summary>Request history</summary>
        {row.events.length ? (
          <ol className={styles.timeline}>
            {row.events.map((event) => {
              return (
                <li key={event.id}>
                  <strong>{event.action.replaceAll(/[_.]/g, " ")}</strong>
                  <p className={styles.reason}>{event.note}</p>
                  <time dateTime={event.createdAt}>
                    {new Date(event.createdAt).toLocaleString("en-PH")} ·{" "}
                    {event.actor.name}
                  </time>
                </li>
              );
            })}
          </ol>
        ) : (
          <p>No recorded updates yet.</p>
        )}
      </details>
      {row.payouts.length > 0 && (
        <details className={styles.section}>
          <summary>Recorded external refund payments</summary>
          <p>
            These records document refunds paid outside the system. They are
            separate from verified installment receipts.
          </p>
          <div
            className={styles.table}
            role="region"
            aria-label="Recorded external refunds"
            tabIndex={0}
          >
            <table>
              <thead>
                <tr>
                  <th>Amount</th>
                  <th>Paid on</th>
                  <th>Method</th>
                  <th>Reference</th>
                </tr>
              </thead>
              <tbody>
                {row.payouts.map((item) => {
                  return (
                    <tr key={item.id}>
                      <td>{withdrawalMoney(item.amount)}</td>
                      <td>{item.paymentDate}</td>
                      <td>{item.method}</td>
                      <td>{item.reference}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </article>
  );
}
