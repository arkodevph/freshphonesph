"use client";

import WithdrawalFinancials from "@/app/system/_role-designs/system_admin/components/withdrawals/WithdrawalFinancials";
import WorkspaceDetails from "@/app/system/_role-designs/system_admin/components/WorkspaceDetails";
import type { WithdrawalCase } from "@freshphones/contracts";
import { withdrawalMoney, withdrawalStatusLabels } from "@/lib/withdrawals";
import { RefundActions } from "@/app/system/_role-designs/system_admin/components/withdrawals/RefundActions";
import { ReplacementActions } from "@/app/system/_role-designs/system_admin/components/withdrawals/ReplacementActions";
import {
  ReviewActions,
  type RunWithdrawalAction,
} from "@/app/system/_role-designs/system_admin/components/withdrawals/ReviewActions";
import styles from "@/app/system/_role-designs/system_admin/components/withdrawals/workspace.module.css";

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
      className={`${styles.panel} ${styles.casePage}`}
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
      </div>
      <div className={styles.caseLayout}>
        <WithdrawalFinancials row={row} />
        <div className={styles.caseJournal}>
          {row.duesContinue ? (
            <div className={styles.consequence}>
              <strong>Installments continue until a replacement joins.</strong>
              <p>
                Submitting or approving this request does not stop dues or
                release the batch position. Refund decisions and payment are
                tracked separately.
              </p>
            </div>
          ) : row.status === "REPLACED" ? (
            <div className={styles.notice}>
              <strong>Replacement joined</strong>
              <p>
                The handover is recorded. Original payment history is retained,
                and refund resolution remains separate.
              </p>
            </div>
          ) : null}
          {stale && (
            <div className={styles.error} role="alert">
              <strong>This request has changed.</strong>
              <p>
                Your current draft is retained. Load the latest request and
                review its details before saving.
              </p>
              <button type="button" disabled={busy} onClick={reload}>
                Discard drafts and load latest request
              </button>
            </div>
          )}
          <section className={styles.section}>
            <div className={styles.journalHeading}>
              <h3>Member's explanation</h3>
              <time dateTime={row.submittedAt}>
                {new Date(row.submittedAt).toLocaleDateString("en-PH", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </time>
            </div>
            <p className={styles.reason}>{row.reason}</p>
          </section>
          {row.decisionNote && (
            <section className={styles.section}>
              <div className={styles.journalHeading}>
                <h3>COO decision</h3>
                {row.decidedAt && (
                  <time dateTime={row.decidedAt}>
                    {new Date(row.decidedAt).toLocaleDateString("en-PH", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </time>
                )}
              </div>
              <p className={styles.reason}>{row.decisionNote}</p>
            </section>
          )}
          {!customer && row.agentNote && (
            <section className={styles.section}>
              <div className={styles.journalHeading}>
                <h3>
                  Agent review <span>Internal</span>
                </h3>
                {row.reviewedAt && (
                  <time dateTime={row.reviewedAt}>
                    {new Date(row.reviewedAt).toLocaleDateString("en-PH", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </time>
                )}
              </div>
              <p className={styles.reason}>{row.agentNote}</p>
            </section>
          )}
          {!customer && row.replacementMode && (
            <WorkspaceDetails className={styles.section}>
              <summary>Approved replacement arrangement</summary>
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
            </WorkspaceDetails>
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
          <WorkspaceDetails className={styles.section}>
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
          </WorkspaceDetails>
          {row.payouts.length > 0 && (
            <WorkspaceDetails className={styles.section}>
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
            </WorkspaceDetails>
          )}
        </div>
      </div>
    </article>
  );
}
