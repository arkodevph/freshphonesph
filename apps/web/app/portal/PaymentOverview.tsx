"use client";

import Link from "next/link";
import { ArrowRight, ArrowUpRight, ChatCircleText } from "@phosphor-icons/react";
import type { Payment, PortalScheduleItem, PortalSummary } from "@/lib/api";
import { TYPESCRIPT_API } from "@/lib/backend";
import { installmentChart, paymentStaff, verifiedPaymentPercent } from "@/lib/portal-payment-overview";
import styles from "./payment-overview.module.css";

const currency = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 2 });
const compact = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", notation: "compact", maximumFractionDigits: 1 });
const percentFormat = new Intl.NumberFormat("en-PH", { maximumFractionDigits: 1 });
const money = (value: string | number | null | undefined) => value != null && Number.isFinite(Number(value)) ? currency.format(Number(value)) : "—";
const initials = (name: string) => name.split(/\s+/).slice(0, 2).map(part => part.charAt(0)).join("");

type Props = {
  summary: PortalSummary | null;
  schedule: PortalScheduleItem[];
  payments: Payment[];
  hasMorePayments: boolean;
  status: "ready" | "error";
  onRetry: () => void;
};

export function PaymentOverviewSkeleton() {
  return <aside className={`${styles.panel} ${styles.skeleton}`} aria-hidden="true">
    <span className={styles.placeholder} /><span className={`${styles.placeholder} ${styles.skeletonRing}`} />
    <span className={styles.placeholder} /><span className={`${styles.placeholder} ${styles.skeletonAmount}`} />
    <span className={`${styles.placeholder} ${styles.skeletonChart}`} />
    <span className={styles.placeholder} />
    {Array.from({ length: 2 }, (_, index) => <span className={`${styles.placeholder} ${styles.skeletonPerson}`} key={index} />)}
    <span className={`${styles.placeholder} ${styles.skeletonAction}`} />
  </aside>;
}

export default function PaymentOverview({ summary, schedule, payments, hasMorePayments, status, onRetry }: Props) {
  const percentage = verifiedPaymentPercent(summary);
  const chart = installmentChart(schedule);
  const maximum = Math.max(1, ...chart.flatMap(item => [item.expected, item.verified]));
  const staff = paymentStaff(payments);
  const visibleStaff = staff.slice(0, 3);

  return <aside className={styles.panel} aria-labelledby="payment-overview-title">
    <header className={styles.header}><h2 id="payment-overview-title">Payment overview</h2><Link href="/portal/payments" aria-label="View verified payment history" title="View verified payment history"><ArrowUpRight weight="bold" aria-hidden="true" /></Link></header>
    {status === "error" ? <div className={styles.emptyState} role="alert"><p>Payment records are unavailable right now.</p><button type="button" onClick={onRetry}>Try again</button></div> : <>
      <div className={styles.progressSummary}>
        <div className={styles.ring} role="progressbar" aria-label="Finance-verified portion of total due" aria-valuenow={percentage ?? undefined} aria-valuemin={0} aria-valuemax={100} aria-valuetext={percentage == null ? "Total due is not available" : `${percentFormat.format(percentage)} percent verified paid`}>
          <svg viewBox="0 0 120 120" aria-hidden="true"><circle className={styles.ringTrack} cx="60" cy="60" r="52" /><circle className={styles.ringFill} cx="60" cy="60" r="52" pathLength="100" strokeDasharray={`${percentage ?? 0} 100`} /></svg>
          <div><strong>{percentage == null ? "—" : `${percentFormat.format(percentage)}%`}</strong><span>verified paid</span></div>
        </div>
        <p className={styles.balanceLabel}>Remaining balance</p><p className={styles.balanceAmount}>{money(summary?.remaining_balance)}</p>
        <dl className={styles.figures}><div><dt>Verified paid</dt><dd>{money(summary?.verified_paid)}</dd></div><div><dt>Total due</dt><dd>{money(summary?.total_due)}</dd></div></dl>
      </div>

      <section className={styles.chartSection} aria-labelledby="installment-chart-title">
        <div className={styles.sectionHeading}><h3 id="installment-chart-title">Installment progress</h3><Link href="/portal/schedule" aria-label="View installment schedule"><ArrowUpRight weight="bold" aria-hidden="true" /></Link></div>
        {chart.length === 0 ? <p className={styles.emptyState}>Your chart will appear when a schedule is issued.</p> : <>
          <div className={styles.chart}>
            <div className={styles.axis} aria-hidden="true"><span>{compact.format(maximum)}</span><span>{compact.format(maximum / 2)}</span><span>₱0</span></div>
            <div className={styles.plot}>
              <div className={styles.gridLines} aria-hidden="true"><span /><span /><span /></div>
              <ul className={styles.bars} aria-label="Verified payment applied to each installment">{chart.map(item => <li key={item.sequence}>
                <Link href={`/portal/schedule#installment-${item.sequence}`} aria-label={`Installment ${item.sequence}: ${money(item.verified)} verified of ${money(item.expected)} scheduled`} title={`Installment ${item.sequence}: ${money(item.verified)} verified of ${money(item.expected)} scheduled`}>
                  <span className={styles.barColumn} aria-hidden="true"><span className={styles.expectedBar} style={{ height: `${(item.expected / maximum) * 100}%` }} /><span className={styles.verifiedBar} style={{ height: `${(item.verified / maximum) * 100}%` }} /></span>
                  <span className={styles.barLabel} aria-hidden="true">{item.sequence}</span>
                </Link>
              </li>)}</ul>
            </div>
          </div>
          <div className={styles.chartCaption}><span>Installments {chart[0].sequence}{chart.length > 1 ? `–${chart.at(-1)?.sequence}` : ""}</span><span><i className={styles.verifiedKey} />Verified<i className={styles.expectedKey} />Scheduled</span></div>
        </>}
      </section>

      <section className={styles.staffSection} aria-labelledby="payment-staff-title">
        <div className={styles.sectionHeading}><h3 id="payment-staff-title">Staff / recorder</h3><Link href="/portal/support#new-request" aria-label="Contact staff" title="Contact staff"><ChatCircleText aria-hidden="true" /></Link></div>
        <div className={styles.staffCard}>
          {visibleStaff.length === 0 ? <p className={styles.emptyState}>Recorder names will appear with your verified payment records.</p> : <ul className={styles.staffList}>{visibleStaff.map((person, index) => <li key={person.id}>
            <span className={`${styles.staffAvatar} ${index % 2 ? styles.financeAvatar : ""}`} aria-hidden="true">{initials(person.name)}</span>
            <div className={styles.staffCopy}><strong>{person.name}</strong><span>{person.roles.join(" · ")}</span></div>
            <Link href={TYPESCRIPT_API ? `/portal/financial-document?payment=${person.paymentId}` : "/portal/payments"} className={styles.staffRecord} aria-label={`View payment record involving ${person.name}`}>View<ArrowUpRight aria-hidden="true" /></Link>
          </li>)}</ul>}
          <Link href="/portal/payments" className={styles.viewAll}>View all records<ArrowRight weight="bold" aria-hidden="true" /></Link>
        </div>
        {hasMorePayments && <p className={styles.staffNote}>Staff shown from your latest payment records.</p>}
      </section>
    </>}
  </aside>;
}
