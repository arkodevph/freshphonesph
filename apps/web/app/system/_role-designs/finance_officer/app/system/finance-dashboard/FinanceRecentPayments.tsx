"use client";
import Link from "next/link";
import { formatPeso } from "@/lib/currency";
import { financePaymentStage } from "@/lib/finance-workspace";
import Select from "@/app/system/_role-designs/finance_officer/components/Select";
import type { useFinanceActivity } from "./useFinanceActivity";
import { FinanceSlot } from "./FinanceSkeleton";
import styles from "./finance-dashboard.module.css";

export default function FinanceRecentPayments({
  state,
}: {
  state: ReturnType<typeof useFinanceActivity>;
}) {
  const loading = !state.data && !state.error;
  const rows = state.data ?? Array.from({ length: 5 }, () => null);
  return (
    <section
      className={`${styles.panel} ${styles.activityPanel}`}
      aria-labelledby="finance-activity-title"
      aria-busy={state.pending}
    >
      <header className={styles.activityHeader}>
        <h3 id="finance-activity-title">Recent payments</h3>
        <div className={styles.activityControls}>
          <label className={styles.search}>
            <span className="sr-only">Search payments</span>
            <input
              type="search"
              value={state.query}
              onChange={(e) => state.setQuery(e.target.value)}
              placeholder="Search payments"
              maxLength={100}
            />
          </label>
          <div className={styles.statusFilter}>
            <span id="finance-status-label" className="sr-only">
              Payment status
            </span>
            <Select
              id="finance-status"
              labelId="finance-status-label"
              value={state.status}
              onValueChange={state.setStatus}
              options={[
                { value: "all", label: "All statuses" },
                { value: "pending", label: "Pending" },
                { value: "verified", label: "Verified" },
                { value: "needs_clarification", label: "Clarification" },
                { value: "rejected", label: "Rejected" },
              ]}
            />
          </div>
        </div>
      </header>
      {state.error ? (
        <p className={styles.inlineError} role="alert">
          {state.error}{" "}
          <button onClick={() => void state.refresh()}>Retry</button>
        </p>
      ) : null}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Reference</th>
              <th>Client</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Payment date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((payment, index) => (
              <tr key={payment?.id ?? index}>
                <td>
                  <FinanceSlot loading={loading}>
                    {payment ? (
                      <Link
                        href={`/system/payments?queue=all&payment=${payment.id}`}
                        title={payment.reference_no || "No reference"}
                      >
                        {payment.reference_no || "No reference"}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </FinanceSlot>
                </td>
                <td>
                  <FinanceSlot loading={loading}>
                    {payment?.client_name ?? "—"}
                  </FinanceSlot>
                </td>
                <td>
                  <FinanceSlot loading={loading} width="80%">
                    {payment ? formatPeso(payment.amount) : "—"}
                  </FinanceSlot>
                </td>
                <td>
                  <FinanceSlot loading={loading} width="85%">
                    {payment ? (
                      <span
                        className={styles.paymentStatus}
                        data-status={payment.status}
                      >
                        {financePaymentStage(payment)}
                      </span>
                    ) : (
                      "—"
                    )}
                  </FinanceSlot>
                </td>
                <td>
                  <FinanceSlot loading={loading}>
                    {payment
                      ? new Date(
                          `${payment.payment_date.slice(0, 10)}T00:00:00+08:00`,
                        ).toLocaleDateString("en-PH", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          timeZone: "Asia/Manila",
                        })
                      : "—"}
                  </FinanceSlot>
                </td>
              </tr>
            ))}
            {state.data?.length === 0 ? (
              <tr>
                <td colSpan={5} className={styles.empty}>
                  {state.query || state.status !== "all"
                    ? "No payments match these filters."
                    : "No payments recorded yet."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <footer className={styles.tableFooter}>
        <span>
          <FinanceSlot loading={loading} width="12ch">
            {state.count !== null
              ? `${state.data?.length ?? 0} of ${state.count} payments`
              : "Unavailable"}
          </FinanceSlot>
        </span>
        <Link
          href={`/system/payments?queue=all${state.status !== "all" ? `&status=${state.status}` : ""}${state.query ? `&q=${encodeURIComponent(state.query)}` : ""}`}
        >
          View all payments
        </Link>
      </footer>
    </section>
  );
}
