"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, CaretLeft, CaretRight, CheckCircle, Clock, FileText, Wallet } from "@phosphor-icons/react";
import type { Payment, PendingCustomerPayment, PortalSummary } from "@/lib/api";
import { TYPESCRIPT_API } from "@/lib/backend";
import { verifiedPaymentPercent } from "@/lib/portal-payment-overview";
import PortalBannerArt from "./PortalBannerArt";
import bannerStyles from "./portal-banner.module.css";
import styles from "./verified-payments.module.css";

const currency = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 2 });
const percent = new Intl.NumberFormat("en-PH", { maximumFractionDigits: 1 });
const date = new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric" });
const money = (value: string | null | undefined) => value != null && value !== "" && Number.isFinite(Number(value)) ? currency.format(Number(value)) : "—";
function paymentDate(value: string) {
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? value : date.format(parsed);
}
const methodName = (method: string) => method.toLowerCase() === "gcash" ? "GCash" : method.replaceAll("_", " ");

type Props = {
  summary: PortalSummary | null;
  payments: Payment[];
  pagination: { count: number; page: number; pageSize: number };
  loading: boolean;
  status: "ready" | "error";
  pendingPayments: PendingCustomerPayment[];
  pendingStatus: "loading" | "ready" | "error";
  onPageChange: (page: number) => void;
  onRetry: () => void;
  onRetryPending: () => void;
};

function LoadingRows({ rows = 3 }: { rows?: number }) {
  return <div className={styles.loadingRows} role="status"><span className={styles.srOnly}>Loading payment records…</span><div aria-hidden="true">{Array.from({ length: rows }, (_, index) => <div className={styles.loadingRow} key={index}><span className={styles.placeholder} /><span className={styles.placeholder} /><span className={styles.placeholder} /></div>)}</div></div>;
}

export function VerifiedPaymentsSkeleton() {
  return <div className={styles.workspace} aria-hidden="true">
    <div className={`${styles.card} ${styles.summaryCard} ${bannerStyles.banner} ${bannerStyles.night}`}><span className={`${styles.placeholder} ${styles.skeletonTitle}`} /><div className={styles.summaryBody}><div className={styles.skeletonBalance}><span className={styles.placeholder} /><span className={styles.placeholder} /><span className={styles.placeholder} /></div><span className={`${styles.placeholder} ${styles.skeletonRing}`} /><div className={styles.figures}><span className={`${styles.placeholder} ${styles.skeletonFigure}`} /><span className={`${styles.placeholder} ${styles.skeletonFigure}`} /></div></div></div>
    <div className={styles.card}><span className={`${styles.placeholder} ${styles.skeletonTitle}`} /><LoadingRows rows={4} /></div>
    {TYPESCRIPT_API && <div className={styles.card}><span className={`${styles.placeholder} ${styles.skeletonTitle}`} /><LoadingRows rows={2} /></div>}
  </div>;
}

export default function VerifiedPaymentsWorkspace({ summary, payments, pagination, loading, status, pendingPayments, pendingStatus, onPageChange, onRetry, onRetryPending }: Props) {
  const percentage = verifiedPaymentPercent(summary);
  const pageCount = Math.max(1, Math.ceil(pagination.count / pagination.pageSize));
  const firstRecord = payments.length ? (pagination.page - 1) * pagination.pageSize + 1 : 0;
  const lastRecord = payments.length ? firstRecord + payments.length - 1 : 0;
  const titleRef = useRef<HTMLHeadingElement>(null);
  const requestedPage = useRef<number | null>(null);

  function changePage(page: number) {
    requestedPage.current = page;
    onPageChange(page);
  }

  useEffect(() => {
    if (loading || requestedPage.current == null) return;
    if (status === "error") { requestedPage.current = null; return; }
    if (pagination.page !== requestedPage.current) return;
    requestedPage.current = null;
    titleRef.current?.focus({ preventScroll: true });
    titleRef.current?.scrollIntoView({ block: "start" });
  }, [loading, status, pagination.page]);

  return <div className={styles.workspace}>
    <section className={`${styles.card} ${styles.summaryCard} ${bannerStyles.banner} ${bannerStyles.night}`} aria-labelledby="verified-balance-title">
      <PortalBannerArt variant="balance" />
      <header className={styles.header}><div className={styles.heading}><span className={styles.icon}><Wallet weight="duotone" aria-hidden="true" /></span><div><p className={styles.eyebrow}>Your account</p><h2 id="verified-balance-title">Payment overview</h2></div></div><span className={styles.verifiedBadge}><CheckCircle weight="fill" aria-hidden="true" />Finance-verified</span></header>
      {status === "error" ? <div className={styles.state}><p>Your payment overview is unavailable right now.</p><button type="button" onClick={onRetry} disabled={loading}>Try again</button></div> : <div className={styles.summaryBody}>
        <div className={styles.balance}><p>Remaining balance</p><strong>{money(summary?.remaining_balance)}</strong>{TYPESCRIPT_API && <Link href="/portal/financial-document" className={styles.statement}><FileText aria-hidden="true" />Statement of account<ArrowRight aria-hidden="true" /></Link>}</div>
        <div className={styles.ring} role="progressbar" aria-label="Finance-verified portion of total due" aria-valuenow={percentage ?? undefined} aria-valuemin={0} aria-valuemax={100} aria-valuetext={percentage == null ? "Total due is not available" : `${percent.format(percentage)} percent verified paid`}>
          <svg viewBox="0 0 120 120" aria-hidden="true"><circle className={styles.ringTrack} cx="60" cy="60" r="52" /><circle className={styles.ringFill} cx="60" cy="60" r="52" pathLength="100" strokeDasharray={`${percentage ?? 0} 100`} /></svg>
          <div><strong>{percentage == null ? "—" : `${percent.format(percentage)}%`}</strong><span>verified paid</span></div>
        </div>
        <dl className={styles.figures}><div><dt><span className={styles.verifiedDot} />Verified paid</dt><dd>{money(summary?.verified_paid)}</dd></div><div><dt><span className={styles.totalDot} />Total due</dt><dd>{money(summary?.total_due)}</dd></div></dl>
      </div>}
    </section>

    <section className={styles.card} aria-labelledby="payments-title" aria-busy={loading}>
      <header className={styles.header}><div className={styles.heading}><span className={`${styles.icon} ${styles.tealIcon}`}><CheckCircle weight="duotone" aria-hidden="true" /></span><div><p className={styles.eyebrow}>Payment history</p><h2 ref={titleRef} id="payments-title" tabIndex={-1}>Verified payments</h2></div></div>{status === "ready" && <span className={styles.count}>{pagination.count} {pagination.count === 1 ? "payment" : "payments"}</span>}</header>
      {status === "error" ? <div className={styles.state} role="alert"><p>Could not load verified payments.</p><button type="button" onClick={onRetry} disabled={loading}>{loading ? "Loading…" : "Try again"}</button></div> : loading ? <LoadingRows rows={Math.min(4, Math.max(1, payments.length))} /> : payments.length === 0 ? <div className={styles.empty}><CheckCircle weight="duotone" aria-hidden="true" /><h3>No verified payments yet</h3><p>Payments will appear here once Finance verifies them.</p></div> : <>
        <div className={styles.listLabels} aria-hidden="true"><span>Payment</span><span>Reference number</span>{TYPESCRIPT_API && <span>Confirmation</span>}</div>
        <ul className={styles.paymentsList}>{payments.map(payment => <li key={payment.id}>
          <div className={styles.payment}><span className={styles.paymentCheck}><CheckCircle weight="fill" aria-hidden="true" /></span><div><strong>{money(payment.amount)}</strong><span>{paymentDate(payment.payment_date)} · {methodName(payment.method)}</span>{Boolean(payment.adjustments?.length) && <small>Adjusted credit · original {money(payment.original_amount)}</small>}</div></div>
          <div className={styles.reference}><span>Reference number</span><strong>{payment.reference_no || "Not provided"}</strong></div>
          {TYPESCRIPT_API && <Link href={`/portal/financial-document?payment=${payment.id}`} className={styles.confirmation} aria-label={`Payment confirmation for ${money(payment.amount)} on ${paymentDate(payment.payment_date)}, reference ${payment.reference_no || "not provided"}`}>Payment confirmation<ArrowRight weight="bold" aria-hidden="true" /></Link>}
        </li>)}</ul>
      </>}
      {status === "ready" && <nav className={styles.pagination} aria-label="Verified payment pages"><span role="status" aria-live="polite">{loading ? "Loading payment records…" : pagination.count === 0 ? "0 verified payments" : `Showing ${firstRecord}–${lastRecord} of ${pagination.count} payments`}</span><div><button type="button" disabled={loading || pagination.page === 1} onClick={() => changePage(pagination.page - 1)}><CaretLeft weight="bold" aria-hidden="true" />Previous</button><span>Page {pagination.page} of {pageCount}</span><button type="button" disabled={loading || pagination.page >= pageCount} onClick={() => changePage(pagination.page + 1)}>Next<CaretRight weight="bold" aria-hidden="true" /></button></div></nav>}
    </section>

    {TYPESCRIPT_API && <section className={styles.card} aria-labelledby="pending-title"><header className={styles.header}><div className={styles.heading}><span className={`${styles.icon} ${styles.pendingIcon}`}><Clock weight="duotone" aria-hidden="true" /></span><div><p className={styles.eyebrow}>Recorded by staff</p><h2 id="pending-title">Awaiting Finance review</h2></div></div>{pendingStatus === "ready" && pendingPayments.length > 0 && <span className={styles.pendingBadge}>{pendingPayments.length} awaiting review</span>}</header>
      <p className={styles.pendingNote}>These records have not changed your verified paid amount or remaining balance. If you paid but do not see a record, contact Fresh Phones PH in Messenger with your reference.</p>
      {pendingStatus === "loading" ? <LoadingRows rows={2} /> : pendingStatus === "error" ? <div className={styles.state} role="alert"><p>Could not check payments awaiting review.</p><button type="button" onClick={onRetryPending}>Try again</button></div> : pendingPayments.length === 0 ? <p className={styles.pendingEmpty}>No staff-recorded payments are awaiting Finance review.</p> : <ul className={styles.pendingList}>{pendingPayments.map(item => <li key={item.id}><div><strong>{money(item.amount)}</strong><span>{paymentDate(item.payment_date)} · {methodName(item.method)}</span>{item.reference_no && <small>Ref: {item.reference_no}</small>}</div><span className={styles.pendingBadge}>Pending review</span></li>)}</ul>}
    </section>}
  </div>;
}
