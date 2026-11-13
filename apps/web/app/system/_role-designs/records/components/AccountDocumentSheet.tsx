"use client";

import type { Client } from "@freshphones/contracts";
import type { AccountDocument } from "@/lib/account-documents";
import { formatPeso as money } from "@/lib/currency";
import styles from "@/app/system/_role-designs/records/components/account-document-sheet.module.css";

const day = (value: string) => {
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString(
    "en-PH",
    { year: "numeric", month: "short", day: "numeric" },
  );
};

export function AccountDocumentSheet({
  client,
  record,
}: {
  client: Client;
  record: AccountDocument;
}) {
  const generated = new Date(record.generatedAt).toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
  });

  return (
    <article className={styles.sheet} data-account-document-sheet>
      <header className={styles.brandHeader}>
        <div className={styles.brand}>
          {/* Use the original brand asset, including its full artwork, in every output. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/fresh-phones-logo.png"
            width={88}
            height={88}
            alt="Fresh Phones PH logo"
            loading="eager"
          />
          <div>
            <p className={styles.brandName}>Fresh Phones PH</p>
            <p>Gadget Center</p>
          </div>
        </div>
        <div className={styles.metadata}>
          <strong>ACCOUNT DOCUMENT</strong>
          <span>Generated</span>
          <time dateTime={record.generatedAt}>{generated}</time>
          <span>Philippine time</span>
        </div>
      </header>
      <div className={styles.heading}>
        <h1>{record.title}</h1>
        <p>
          {"payment" in record
            ? `Finance-verified payment record · Payment ID: ${record.payment.id}`
            : `Account position as of ${generated} · Philippine time`}
        </p>
      </div>
      <dl className={styles.details}>
        <div>
          <dt>Customer</dt>
          <dd>{client.name}</dd>
        </div>
        <div>
          <dt>Member reference</dt>
          <dd>{client.id}</dd>
        </div>
        <div>
          <dt>Batch</dt>
          <dd>{client.batch.code}</dd>
        </div>
        <div>
          <dt>Unit</dt>
          <dd>{client.unitModel || client.batch.model || "—"}</dd>
        </div>
      </dl>
      {"balance" in record ? (
        <>
          <dl className={styles.totals}>
            <div>
              <dt>Current installment obligation</dt>
              <dd>{money(record.balance.totalDue)}</dd>
            </div>
            <div>
              <dt>Finance-verified credit</dt>
              <dd>{money(record.balance.verifiedPaid)}</dd>
            </div>
            <div>
              <dt>Remaining balance</dt>
              <dd>{money(record.balance.remainingBalance)}</dd>
            </div>
          </dl>
          {Number(record.balance.releasedDue ?? 0) > 0 && (
            <section className={styles.release}>
              <h2>Replacement release</h2>
              <dl className={styles.details}>
                <div>
                  <dt>Originally issued installment obligation</dt>
                  <dd>
                    {record.balance.originalDue != null
                      ? money(record.balance.originalDue)
                      : "Not captured"}
                  </dd>
                </div>
                <div>
                  <dt>Unpaid obligation released at replacement</dt>
                  <dd>{money(record.balance.releasedDue!)}</dd>
                </div>
              </dl>
              <p className={styles.note}>
                The replacement handover released the unpaid obligation shown
                above. This release is not a payment or refund. Original
                incoming payments remain in your history; refund decisions and
                external refund records are tracked separately.
              </p>
            </section>
          )}
          <h2>Verified payment history</h2>
          {record.verifiedPayments.length ? (
            <div
              className={styles.paymentTable}
              role="region"
              aria-label="Verified payments, scroll for complete amounts"
              tabIndex={0}
            >
              <table className={styles.statementTable}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Method</th>
                    <th>Reference</th>
                    <th data-numeric>Original</th>
                    <th data-numeric>Current credit</th>
                  </tr>
                </thead>
                <tbody>
                  {record.verifiedPayments.map((payment) => {
                    return (
                      <tr key={payment.id}>
                        <td>{day(payment.paymentDate)}</td>
                        <td>{payment.method}</td>
                        <td>{payment.referenceNumber || "—"}</td>
                        <td data-numeric>{money(payment.amount)}</td>
                        <td data-numeric>
                          {money(payment.effectiveAmount ?? payment.amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className={styles.note}>No verified payments yet.</p>
          )}
          <dl className={styles.summary}>
            <div>
              <dt>Total verified credit</dt>
              <dd>{money(record.balance.verifiedPaid)}</dd>
            </div>
            <div>
              <dt>Remaining balance</dt>
              <dd>{money(record.balance.remainingBalance)}</dd>
            </div>
          </dl>
          <p className={styles.note}>
            Pending and returned claims are excluded from verified credit.
          </p>
        </>
      ) : (
        <>
          <dl className={styles.details}>
            <div>
              <dt>Payment date</dt>
              <dd>{day(record.payment.paymentDate)}</dd>
            </div>
            <div>
              <dt>Method</dt>
              <dd>{record.payment.method || "—"}</dd>
            </div>
          </dl>
          <h2>Payment details</h2>
          <div
            className={styles.paymentTable}
            role="region"
            aria-label="Verified payment details, scroll for complete amounts"
            tabIndex={0}
          >
            <table className={styles.confirmationTable}>
              <thead>
                <tr>
                  <th>Payment / reference</th>
                  <th data-numeric>Original verified amount</th>
                  <th data-numeric>Current credit</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>Installment payment</strong>
                    <span className={styles.reference}>
                      {record.payment.referenceNumber || "—"}
                    </span>
                  </td>
                  <td data-numeric>{money(record.payment.amount)}</td>
                  <td data-numeric>
                    {money(
                      record.payment.effectiveAmount ?? record.payment.amount,
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className={styles.credit}>
            <span>Current verified credit</span>
            <strong>
              {money(record.payment.effectiveAmount ?? record.payment.amount)}
            </strong>
          </div>
          <p className={styles.note}>
            Original and current credit values remain visible when an adjustment
            changes the credited amount.
          </p>
        </>
      )}
      {("payment" in record ? [record.payment] : record.verifiedPayments)
        .filter((payment) => {
          return payment.adjustments?.length;
        })
        .map((payment) => {
          return (
            <section className={styles.adjustments} key={payment.id}>
              <h2>Adjustment history · {day(payment.paymentDate)}</h2>
              <p className={styles.note}>
                Payment ID: {payment.id} · Reference:{" "}
                {payment.referenceNumber || "—"}
              </p>
              <ul>
                {payment.adjustments?.map((entry) => {
                  return (
                    <li key={entry.id}>
                      Adjustment {entry.sequence}: {money(entry.amount)} ·{" "}
                      {money(entry.beforeAmount)} → {money(entry.afterAmount)} ·{" "}
                      {new Date(entry.createdAt).toLocaleString("en-PH", {
                        timeZone: "Asia/Manila",
                      })}{" "}
                      Philippine time
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      <footer className={styles.footer}>
        <strong>{record.notice}</strong>
        <p>
          Payments are coordinated externally. This document reflects the
          records verified by Finance at the time shown above.
        </p>
        <span>Fresh Phones PH · {record.title}</span>
      </footer>
    </article>
  );
}
