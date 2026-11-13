import type { Payment } from "@/lib/api";
import { formatPeso } from "@/lib/currency";
import { STATUS_STYLES } from "@/app/system/_role-designs/finance_officer/app/system/payments/payment-view";

export default function PaymentTransactionSummary({
  payment,
}: {
  payment: Payment;
}) {
  const date = new Date(`${payment.payment_date}T12:00:00+08:00`);

  const paymentDate = Number.isNaN(date.getTime())
    ? payment.payment_date
    : new Intl.DateTimeFormat("en-PH", {
        dateStyle: "medium",
        timeZone: "Asia/Manila",
      }).format(date);

  return (
    <section className="payment-transaction-summary" aria-label="Transaction">
      <div className="payment-transaction-hero">
        <div>
          <p className="payment-amount-label">
            {payment.status === "verified"
              ? "Current verified credit"
              : "Payment claim"}
          </p>
          <p className="payment-transaction-amount">
            {formatPeso(payment.amount)}
          </p>
          <p className="payment-transaction-client">
            {payment.client_name ?? String(payment.client)}
          </p>
        </div>
        <span
          className={`payment-details-status ${STATUS_STYLES[payment.status]}`}
        >
          {payment.status.replaceAll("_", " ")}
        </span>
      </div>
      <dl className="payment-details-grid payment-transaction-facts">
        <div>
          <dt>Batch</dt>
          <dd>{payment.batch_code ?? String(payment.batch)}</dd>
        </div>
        <div>
          <dt>Payment date</dt>
          <dd>{paymentDate}</dd>
        </div>
        <div>
          <dt>Method</dt>
          <dd className="capitalize">{payment.method}</dd>
        </div>
        <div>
          <dt>Reference number</dt>
          <dd>{payment.reference_no || "—"}</dd>
        </div>
      </dl>
    </section>
  );
}
