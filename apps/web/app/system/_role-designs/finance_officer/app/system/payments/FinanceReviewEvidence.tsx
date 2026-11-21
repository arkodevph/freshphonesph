import type { FinanceReviewEvidence } from "@/lib/finance-review";
import { formatPeso } from "@/lib/currency";
import PaymentTransactionSummary from "./PaymentTransactionSummary";
import { AdjustmentHistory } from "./PaymentAdjustmentDialog";
import { formatTimestamp } from "./payment-view";
import styles from "./finance-review.module.css";

export default function ReviewEvidence({
  data,
  proofUrl,
}: {
  data: FinanceReviewEvidence;
  proofUrl: string | null;
}) {
  const { payment, checklist, duplicates } = data;

  return (
    <div className={styles.evidence}>
      <PaymentTransactionSummary payment={payment} />
      <section aria-labelledby="finance-proof-title">
        <h3 id="finance-proof-title">Receipt proof</h3>
        {proofUrl ? (
          <>
            {data.proof?.type.startsWith("image/") ? (
              <img
                className={styles.receipt}
                src={proofUrl}
                alt={`Receipt proof for ${payment.client_name || "this payment"}`}
              />
            ) : (
              <p>
                Receipt attached. Open the original file to inspect its
                contents.
              </p>
            )}
            <a href={proofUrl} target="_blank" rel="noopener noreferrer">
              Open original receipt
            </a>
            <p className={styles.muted}>
              Compare the amount, method, date and reference with the claim. A
              receipt image alone does not confirm actual funds.
            </p>
          </>
        ) : (
          <p>Receipt missing. Finance decisions are unavailable.</p>
        )}
        {(payment.receipt_time ||
          payment.receipt_name ||
          payment.receipt_phone) && (
          <dl className={styles.facts}>
            <div>
              <dt>Receipt time</dt>
              <dd>{payment.receipt_time || "—"}</dd>
            </div>
            <div>
              <dt>Receipt name</dt>
              <dd>{payment.receipt_name || "—"}</dd>
            </div>
            <div>
              <dt>Receipt number</dt>
              <dd>{payment.receipt_phone || "—"}</dd>
            </div>
          </dl>
        )}
      </section>
      <section aria-labelledby="finance-duplicates-title">
        <h3 id="finance-duplicates-title">Duplicate-reference evidence</h3>
        {data.searchable ? (
          duplicates.length ? (
            <>
              <p>
                Potential matches require investigation. They do not establish
                duplicate funds.
              </p>
              <ul className={styles.history}>
                {duplicates.map((match) => {
                  return (
                    <li key={match.id}>
                      <strong>{match.clientName}</strong>
                      <p>
                        {formatPeso(match.amount)} · {match.paymentDate} ·{" "}
                        {match.status.replaceAll("_", " ")}
                      </p>
                      <p>
                        {match.method} · {match.referenceNumber}
                      </p>
                      <p className={styles.muted}>Payment {match.id}</p>
                    </li>
                  );
                })}
              </ul>
              <p className={styles.muted}>
                Up to 10 recent matches are returned by the existing lookup.
              </p>
            </>
          ) : (
            <p>No matching payment references found.</p>
          )
        ) : (
          <p>
            No searchable reference supplied; duplicate-reference checking is
            unavailable.
          </p>
        )}
      </section>
      <section aria-labelledby="finance-approvals-title">
        <h3 id="finance-approvals-title">Records and Manager reviews</h3>
        {payment.workflow ? (
          <>
            <p>
              Current evidence revision {payment.workflow.evidenceVersion} ·
              Records{" "}
              {payment.workflow.recordsApproved ? "approved" : "not approved"} ·
              assigned Manager{" "}
              {payment.workflow.managerApproved ? "approved" : "not approved"}
            </p>
            {payment.workflow.history.length ? (
              <ul className={styles.history}>
                {payment.workflow.history.map((review) => {
                  return (
                    <li key={review.id}>
                      <strong>
                        {review.stage} · {review.decision}
                      </strong>
                      <p>
                        {review.reviewer.name} ·{" "}
                        {formatTimestamp(review.createdAt)}
                      </p>
                      <p>
                        Evidence revision {review.evidenceVersion}
                        {review.evidenceVersion !==
                        payment.workflow!.evidenceVersion
                          ? " · historical"
                          : ""}
                      </p>
                      <p>{review.notes}</p>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p>No operational review history recorded.</p>
            )}
          </>
        ) : (
          <p>Current review status is unavailable.</p>
        )}
      </section>
      <section aria-labelledby="finance-checklist-title">
        <h3 id="finance-checklist-title">Submission evidence</h3>
        <p>
          Batch {payment.batch_code} · payment date {payment.payment_date}
        </p>
        <p>
          {payment.workflow?.submissionComplete === true
            ? "Required submission evidence is complete for verification."
            : "Required evidence is incomplete or unavailable; verification is blocked."}
        </p>
        {checklist.requirements.length ? (
          <ul className={styles.history}>
            {checklist.requirements.map((item) => {
              return (
                <li key={item.id}>
                  <strong>{item.description}</strong>
                  <p>
                    {item.kind} · {item.state.toLowerCase()} ·{" "}
                    {item.periodStart} to {item.periodEnd}
                  </p>
                </li>
              );
            })}
          </ul>
        ) : (
          <p>No declared submission requirements overlap this payment date.</p>
        )}
        {checklist.statements.length > 0 && (
          <ul className={styles.history}>
            {checklist.statements.map((statement) => {
              return (
                <li key={statement.id}>
                  {statement.label} · {statement.state.toLowerCase()} ·{" "}
                  {statement.from} to {statement.to}
                </li>
              );
            })}
          </ul>
        )}
        <p className={styles.muted}>
          Records or COO maintains declared requirements. Statement review and
          payment verification are separate decisions.
        </p>
      </section>
      <AdjustmentHistory payment={payment} />
      {payment.verification_notes && (
        <section>
          <h3>Previous Finance note</h3>
          <p>{payment.verification_notes}</p>
        </section>
      )}
      {payment.notes && (
        <section>
          <h3>Recording note</h3>
          <p>{payment.notes}</p>
        </section>
      )}
    </div>
  );
}
