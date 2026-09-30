"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CheckCircle, X } from "@phosphor-icons/react";
import type { Payment } from "@freshphones/contracts";
import { getCustomerDocuments, getReleaseUpdates, getSupportCaseDetail, type DocumentRequirement, type PortalNotification, type PortalScheduleItem, type PortalSummary, type RecordId, type ReleaseUpdate, type SupportCaseDetail } from "@/lib/api";
import { tsRequest } from "@/lib/ts-api";
import { installmentState } from "@/lib/portal-schedule";
import { manilaToday } from "@/lib/portal-attention";
import styles from "./notification-record.module.css";

type Confirmation = { title: string; notice: string; generatedAt: string; payment: Payment };
type RecordDetail =
  | { kind: "payment"; value: Confirmation }
  | { kind: "release"; value: ReleaseUpdate }
  | { kind: "support"; value: SupportCaseDetail }
  | { kind: "document"; value: DocumentRequirement }
  | { kind: "installment"; value: PortalScheduleItem }
  | { kind: "generic" };

const money = (value: string | number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(value));
const day = (value: string) => new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
const stamp = (value: string) => new Date(value).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
const methodLabel = (value: string) => value.toLowerCase() === "gcash" ? "GCash" : value;

function recordTarget(path: string | null) {
  if (!path?.startsWith("/portal/")) return { kind: "generic" as const };
  const url = new URL(path, "https://freshphones.local");
  if (url.pathname === "/portal/financial-document" && /^[0-9a-f-]{36}$/i.test(url.searchParams.get("payment") ?? ""))
    return { kind: "payment" as const, id: url.searchParams.get("payment")! };
  if (url.pathname === "/portal/release" && /^#release-update-[0-9a-f-]{36}$/i.test(url.hash))
    return { kind: "release" as const, id: url.hash.slice("#release-update-".length) };
  if (url.pathname === "/portal/support" && /^#case-[0-9a-f-]{36}$/i.test(url.hash))
    return { kind: "support" as const, id: url.hash.slice("#case-".length) };
  if (url.pathname === "/portal/documents" && url.hash.startsWith("#document-"))
    return { kind: "document" as const, key: decodeURIComponent(url.hash.slice("#document-".length)) };
  if (url.pathname === "/portal/schedule" && /^#installment-\d+$/.test(url.hash))
    return { kind: "installment" as const, sequence: Number(url.hash.slice("#installment-".length)) };
  return { kind: "generic" as const };
}

export function NotificationRecordPanel({ notification, summary, schedule, clientId, onClose }: {
  notification: PortalNotification;
  summary: PortalSummary | null;
  schedule: PortalScheduleItem[];
  clientId?: RecordId | null;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<RecordDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (window.innerWidth <= 1100) panelRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [notification.id]);

  useEffect(() => {
    let cancelled = false;
    const target = recordTarget(notification.targetPath);
    setLoading(true);
    setDetail(null);
    setError(null);
    const load = async (): Promise<RecordDetail> => {
      if (target.kind === "payment") return { kind: "payment", value: await tsRequest<Confirmation>(`/payments/${target.id}/confirmation`) };
      if (target.kind === "release") {
        if (clientId == null) throw new Error("Could not find your unit record.");
        const value = (await getReleaseUpdates(clientId)).find((item) => item.id === target.id);
        if (!value) throw new Error("This release update is no longer available.");
        return { kind: "release", value };
      }
      if (target.kind === "support") return { kind: "support", value: await getSupportCaseDetail(target.id) };
      if (target.kind === "document") {
        const value = (await getCustomerDocuments()).find((item) => item.key === target.key);
        if (!value) throw new Error("This document requirement is no longer available.");
        return { kind: "document", value };
      }
      if (target.kind === "installment") {
        const value = schedule.find((item) => item.sequence_no === target.sequence);
        if (!value) throw new Error("This installment is no longer available.");
        return { kind: "installment", value };
      }
      return { kind: "generic" };
    };
    void load().then((value) => { if (!cancelled) setDetail(value); })
      .catch((caught) => { if (!cancelled) setError(caught instanceof Error ? caught.message : "Could not load this record."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [notification.id, notification.targetPath, schedule, clientId, retry]);

  const fullPath = notification.targetPath?.startsWith("/portal/") ? notification.targetPath : null;
  return <aside id="notification-record-panel" ref={panelRef} className={styles.panel} aria-labelledby="notification-record-title">
    <header className={styles.panelHeader}><div><p>Record details</p><h2 id="notification-record-title">{notification.title}</h2></div><button type="button" onClick={onClose} aria-label="Close record details"><X weight="bold" aria-hidden="true" /></button></header>
    <div className={styles.notificationContext}><p>{notification.message}</p><small>{stamp(notification.createdAt)}</small></div>
    {loading ? <p className={styles.state} role="status">Loading record…</p>
      : error ? <div className={styles.state} role="alert"><p>{error}</p><button type="button" onClick={() => setRetry((value) => value + 1)}>Try again</button></div>
      : detail?.kind === "payment" ? <article className={styles.sheet} aria-label={detail.value.title}>
        <div className={styles.sheetTop}>
          <div className={styles.sheetBrand}>
            <Image src="/brand/fresh-phones-logo.png" alt="" width={40} height={40} />
            <div><strong>Fresh Phones <span>PH</span></strong><small>FP Gadget Center</small></div>
          </div>
          <span className={styles.sheetType}>Payment confirmation</span>
        </div>
        <div className={styles.sheetHero}>
          <div>
            <p>Verified payment</p>
            <strong>{money(detail.value.payment.amount)}</strong>
            <span>Payment date · {day(detail.value.payment.paymentDate)}</span>
          </div>
          <span className={styles.verifiedBadge}><CheckCircle weight="fill" aria-hidden="true" /> Finance verified</span>
        </div>
        <dl className={styles.sheetDetails}>
          <div><dt>Reference number</dt><dd>{detail.value.payment.referenceNumber || "—"}</dd></div>
          <div><dt>Payment method</dt><dd>{methodLabel(detail.value.payment.method)}</dd></div>
          <div><dt>Customer</dt><dd>{summary?.full_name ?? "Customer"}</dd></div>
          <div><dt>Batch</dt><dd>{summary?.batch_number ?? "—"}</dd></div>
          <div className={styles.sheetDetailWide}><dt>Unit</dt><dd>{summary?.unit_model ?? "—"}</dd></div>
        </dl>
        <footer className={styles.sheetFooter}>
          <p>Generated {stamp(detail.value.generatedAt)}</p>
          <strong>{detail.value.notice}</strong>
          <p>Payments are coordinated externally. This document reflects the record verified by Finance at the time shown above.</p>
        </footer>
      </article>
      : detail?.kind === "release" ? <div className={styles.recordCard}><span className={styles.recordLabel}>Release update</span><h3>{detail.value.status}</h3><dl><div><dt>Updated</dt><dd>{stamp(detail.value.updated_at)}</dd></div>{detail.value.collection_date && <div><dt>Collection date</dt><dd>{day(detail.value.collection_date)}</dd></div>}</dl>{detail.value.note && <p>{detail.value.note}</p>}</div>
      : detail?.kind === "support" ? <div className={styles.recordCard}><span className={styles.recordLabel}>Support request</span><h3>{detail.value.category}</h3><dl><div><dt>Status</dt><dd>{detail.value.status.replaceAll("_", " ")}</dd></div><div><dt>Received</dt><dd>{stamp(detail.value.date_received)}</dd></div></dl><p>{detail.value.description}</p>{detail.value.resolution && <p><strong>Resolution: </strong>{detail.value.resolution}</p>}{detail.value.messages.length > 0 && <div className={styles.messages}><h4>Conversation</h4>{detail.value.messages.map((message) => <div key={message.id}><strong>{message.author_type === "customer" ? "You" : "Customer Service"}</strong><small>{stamp(message.created_at)}</small><p>{message.body}</p></div>)}</div>}</div>
      : detail?.kind === "document" ? <div className={styles.recordCard}><span className={styles.recordLabel}>Document requirement</span><h3>{detail.value.label}</h3><dl><div><dt>Status</dt><dd>{detail.value.status.replaceAll("_", " ").toLowerCase()}</dd></div>{detail.value.latest && <div><dt>Latest file</dt><dd>{detail.value.latest.fileName}</dd></div>}</dl><p>{detail.value.description}</p>{detail.value.latest?.clarification && <p><strong>Records note: </strong>{detail.value.latest.clarification}</p>}</div>
      : detail?.kind === "installment" ? <div className={styles.recordCard}><span className={styles.recordLabel}>Payment schedule</span><h3>Installment {detail.value.sequence_no}</h3><dl><div><dt>Due date</dt><dd>{day(detail.value.due_date)}</dd></div><div><dt>Installment</dt><dd>{money(detail.value.expected_amount)}</dd></div><div><dt>Verified paid</dt><dd>{money(detail.value.paid_applied)}</dd></div><div><dt>Remaining</dt><dd>{money(installmentState(detail.value, manilaToday()).remaining)}</dd></div><div><dt>Status</dt><dd>{installmentState(detail.value, manilaToday()).payment}</dd></div></dl></div>
      : <p className={styles.state}>This update is linked to your customer record.</p>}
    {fullPath && <Link className={styles.fullLink} href={fullPath}>{detail?.kind === "payment" ? "Open document for PDF or print" : "Open full record"} <ArrowRight weight="bold" aria-hidden="true" /></Link>}
  </aside>;
}
