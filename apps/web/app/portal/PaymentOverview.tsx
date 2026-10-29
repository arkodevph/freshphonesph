"use client";

import { pesoFormat as currency } from "@/lib/currency";
import type { Payment, PortalScheduleItem, PortalSummary } from "@/lib/api";
import {
  ArrowRight,
  ArrowRightUp as ArrowUpRight,
  ChatRoundDots as ChatCircleText,
} from "@/components/SolarIcons";
import Link from "next/link";
import {
  installmentProgress,
  paymentStaff,
  verifiedPaymentPercent,
} from "@/lib/portal-payment-overview";
import styles from "./payment-overview.module.css";
import { formatDate } from "./portal-view";

const percentFormat = new Intl.NumberFormat("en-PH", {
  maximumFractionDigits: 1,
});

const money = (value: string | number | null | undefined) => {
  return value != null && Number.isFinite(Number(value))
    ? currency.format(Number(value))
    : "—";
};

const initials = (name: string) => {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => {
      return part.charAt(0);
    })
    .join("");
};

type Props = {
  summary: PortalSummary | null;
  schedule: PortalScheduleItem[];
  payments: Payment[];
  hasMorePayments: boolean;
  status: "ready" | "error";
  onRetry: () => void;
};

export function PaymentOverviewSkeleton() {
  return (
    <aside className={`${styles.panel} ${styles.skeleton}`} aria-hidden="true">
      <span className={styles.placeholder} />
      <span className={`${styles.placeholder} ${styles.skeletonRing}`} />
      <span className={styles.placeholder} />
      <span className={`${styles.placeholder} ${styles.skeletonAmount}`} />
      <span className={`${styles.placeholder} ${styles.skeletonChart}`} />
      <span className={styles.placeholder} />
      {Array.from({ length: 2 }, (_, index) => {
        return (
          <span
            className={`${styles.placeholder} ${styles.skeletonPerson}`}
            key={index}
          />
        );
      })}
      <span className={`${styles.placeholder} ${styles.skeletonAction}`} />
    </aside>
  );
}

export default function PaymentOverview({
  summary,
  schedule,
  payments,
  hasMorePayments,
  status,
  onRetry,
}: Props) {
  const percentage = verifiedPaymentPercent(summary);

  const progress = installmentProgress(schedule);

  const staff = paymentStaff(payments);

  const visibleStaff = staff.slice(0, 3);

  return (
    <aside
      data-portal-material="summary"
      className={styles.panel}
      aria-labelledby="payment-overview-title"
    >
      <header className={styles.header}>
        <h2 id="payment-overview-title">Payment overview</h2>
        <Link
          href="/portal/payments"
          aria-label="View verified payment history"
          title="View verified payment history"
        >
          <ArrowUpRight aria-hidden="true" />
        </Link>
      </header>
      {status === "error" ? (
        <div className={styles.emptyState} role="alert">
          <p>Payment records are unavailable right now.</p>
          <button type="button" onClick={onRetry}>
            Try again
          </button>
        </div>
      ) : (
        <>
          <div className={styles.progressSummary}>
            <div
              className={styles.ring}
              role="progressbar"
              aria-label="Finance-verified portion of total due"
              aria-valuenow={percentage ?? undefined}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuetext={
                percentage == null
                  ? "Total due is not available"
                  : `${percentFormat.format(percentage)} percent verified paid`
              }
            >
              <svg viewBox="0 0 120 120" aria-hidden="true">
                <circle className={styles.ringTrack} cx="60" cy="60" r="52" />
                <circle
                  className={styles.ringFill}
                  cx="60"
                  cy="60"
                  r="52"
                  pathLength="100"
                  strokeDasharray={`${percentage ?? 0} 100`}
                />
              </svg>
              <div>
                <strong>
                  {percentage == null
                    ? "—"
                    : `${percentFormat.format(percentage)}%`}
                </strong>
                <span>verified paid</span>
              </div>
            </div>
            <p className={styles.balanceLabel}>Remaining balance</p>
            <p className={styles.balanceAmount}>
              {money(summary?.remaining_balance)}
            </p>
            <dl className={styles.figures}>
              <div>
                <dt>Verified paid</dt>
                <dd>{money(summary?.verified_paid)}</dd>
              </div>
              <div>
                <dt>Total due</dt>
                <dd>{money(summary?.total_due)}</dd>
              </div>
            </dl>
          </div>

          <section
            className={styles.chartSection}
            aria-labelledby="installment-chart-title"
          >
            <div className={styles.sectionHeading}>
              <h3 id="installment-chart-title">Installment progress</h3>
              <Link
                href="/portal/schedule"
                aria-label="View installment schedule"
              >
                <ArrowUpRight aria-hidden="true" />
              </Link>
            </div>
            {progress.installments.length === 0 ? (
              <p className={styles.emptyState}>
                Your progress will appear when a schedule is issued.
              </p>
            ) : (
              <div className={styles.installmentCard}>
                <div className={styles.installmentSummary}>
                  <p>
                    <strong>{progress.completed}</strong>
                    <span> of {progress.installments.length}</span>
                  </p>
                  <span>installments fully paid</span>
                </div>
                <ol
                  className={styles.installmentSteps}
                  style={{
                    gridTemplateColumns: `repeat(${Math.ceil(progress.installments.length / Math.ceil(progress.installments.length / 12))}, minmax(0, 1fr))`,
                  }}
                  aria-label="Finance-verified installment progress"
                >
                  {progress.installments.map((item) => (
                    <li key={item.sequence}>
                      <span
                        className={styles.installmentStep}
                        aria-hidden="true"
                        title={`Installment ${item.sequence}: ${money(item.verified)} verified of ${money(item.expected)}`}
                      >
                        <span style={{ width: `${item.percentage}%` }} />
                      </span>
                      <span className={styles.srOnly}>
                        Installment {item.sequence}: {money(item.verified)}{" "}
                        verified of {money(item.expected)} scheduled.
                        {item.complete
                          ? " Fully paid."
                          : ` ${money(item.remaining)} remaining.`}
                      </span>
                    </li>
                  ))}
                </ol>
                <div className={styles.installmentLegend} aria-hidden="true">
                  <span>
                    <i className={styles.paidKey} />
                    Verified paid
                  </span>
                  <span>
                    <i className={styles.unpaidKey} />
                    Remaining
                  </span>
                </div>
                {progress.next ? (
                  <Link
                    className={styles.nextInstallment}
                    href={`/portal/schedule#installment-${progress.next.sequence}`}
                  >
                    <div>
                      <span>Next unpaid installment</span>
                      <strong>{money(progress.next.remaining)}</strong>
                      <small>
                        Installment {progress.next.sequence} ·{" "}
                        {formatDate(progress.next.dueDate)}
                      </small>
                    </div>
                    <ArrowUpRight aria-hidden="true" />
                  </Link>
                ) : (
                  <p className={styles.installmentsComplete}>
                    All installments fully paid.
                  </p>
                )}
                <p className={styles.installmentNote}>
                  Progress includes Finance-verified payments only.
                </p>
              </div>
            )}
          </section>

          <section
            className={styles.staffSection}
            aria-labelledby="payment-staff-title"
          >
            <div className={styles.sectionHeading}>
              <h3 id="payment-staff-title">Staff / recorder</h3>
              <Link
                href="/portal/support#new-request"
                aria-label="Contact staff"
                title="Contact staff"
              >
                <ChatCircleText aria-hidden="true" />
              </Link>
            </div>
            <div className={styles.staffCard}>
              {visibleStaff.length === 0 ? (
                <p className={styles.emptyState}>
                  Recorder names will appear with your verified payment records.
                </p>
              ) : (
                <ul className={styles.staffList}>
                  {visibleStaff.map((person, index) => {
                    return (
                      <li key={person.id}>
                        <span
                          className={`${styles.staffAvatar} ${index % 2 ? styles.financeAvatar : ""}`}
                          aria-hidden="true"
                        >
                          {initials(person.name)}
                        </span>
                        <div className={styles.staffCopy}>
                          <strong>{person.name}</strong>
                          <span>{person.roles.join(" · ")}</span>
                        </div>
                        <Link
                          href={`/portal/financial-document?payment=${person.paymentId}`}
                          className={styles.staffRecord}
                          aria-label={`View payment record involving ${person.name}`}
                        >
                          View
                          <ArrowUpRight aria-hidden="true" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
              <Link href="/portal/payments" className={styles.viewAll}>
                View all records
                <ArrowRight aria-hidden="true" />
              </Link>
            </div>
            {hasMorePayments && (
              <p className={styles.staffNote}>
                Staff shown from your latest payment records.
              </p>
            )}
          </section>
        </>
      )}
    </aside>
  );
}
