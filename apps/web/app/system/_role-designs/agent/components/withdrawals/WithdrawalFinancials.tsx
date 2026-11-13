import type { WithdrawalCase } from "@freshphones/contracts";
import { withdrawalMoney, withdrawalRefundLabel } from "@/lib/withdrawals";
import styles from "@/app/system/_role-designs/agent/components/withdrawals/workspace.module.css";

export default function WithdrawalFinancials({ row }: { row: WithdrawalCase }) {
  return (
    <aside
      className={styles.caseLedger}
      aria-label="Withdrawal financial record"
    >
      <section>
        <h3>External refund</h3>
        <p className={styles.ledgerStatus}>{withdrawalRefundLabel(row)}</p>
        <dl className={styles.ledgerAmount}>
          <dt>Approved refund</dt>
          <dd>{withdrawalMoney(row.refundAmount)}</dd>
        </dl>
        <dl className={styles.ledgerRows}>
          <div>
            <dt>Recorded as paid</dt>
            <dd>{withdrawalMoney(row.refundPaid)}</dd>
          </div>
          <div>
            <dt>Still unpaid</dt>
            <dd>{withdrawalMoney(row.refundRemaining)}</dd>
          </div>
          <div>
            <dt>Target payment date</dt>
            <dd>{row.refundTargetDate ?? "Not scheduled"}</dd>
          </div>
        </dl>
        {row.refundNote && (
          <div className={styles.ledgerNote}>
            <h4>Refund decision note</h4>
            <p className={styles.reason}>{row.refundNote}</p>
          </div>
        )}
      </section>
      <section>
        <h3>Installment record</h3>
        <dl className={styles.ledgerRows}>
          <div>
            <dt>Current obligation</dt>
            <dd>{withdrawalMoney(row.financial.totalDue)}</dd>
          </div>
          <div>
            <dt>Verified payments</dt>
            <dd>{withdrawalMoney(row.financial.verifiedPaid)}</dd>
          </div>
          <div>
            <dt>Remaining installments</dt>
            <dd>{withdrawalMoney(row.financial.remaining)}</dd>
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
      </section>
    </aside>
  );
}
