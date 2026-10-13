"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowClockwise, FloppyDisk } from "@phosphor-icons/react";
import { staffEmailKinds, staffEmailStatuses, type Page, type StaffEmailDelivery, type StaffEmailKind, type StaffEmailSettings as Settings, type StaffEmailStatus, type StaffEmailTemplate } from "@freshphones/contracts";
import { getStaffEmailDeliveries, getStaffEmailSettings, retryStaffEmail, updateStaffEmailTemplate, updateStaffEmailTiming } from "@/lib/api";
import { ApiError } from "@/lib/ts-api";
import styles from "./staff-email-settings.module.css";

const labels: Record<StaffEmailKind, string> = { TASK_ASSIGNED: "Task assignment", TASK_DUE_SOON: "Task due soon", TASK_OVERDUE: "Task overdue",
  FINANCE_PENDING: "Finance pending review", PAYMENT_VERIFIED: "Finance verified", PAYMENT_REJECTED: "Finance rejected", PAYMENT_CLARIFICATION: "Finance clarification",
  SUPPORT_NEW_CASE: "Support case needs assignment", SUPPORT_ASSIGNED: "Support assignment", SUPPORT_CUSTOMER_REPLY: "Support customer reply",
  ACCOUNT_CREATED: "Staff account creation", ACCOUNT_ROLE_CHANGED: "Staff role change", ACCOUNT_ACTIVATED: "Staff access activation", ACCOUNT_DEACTIVATED: "Staff access deactivation" };
const statuses: Record<StaffEmailStatus, string> = { PENDING: "Queued", SENDING: "Sending", SENT: "Sent", FAILED: "Failed", SKIPPED: "Skipped" };
const date = (value: string) => new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
const message = (caught: unknown) => caught instanceof Error ? caught.message : "Could not load staff email settings.";

export default function StaffEmailSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [settingsError, setSettingsError] = useState("");
  const [deliveryError, setDeliveryError] = useState("");
  const [notice, setNotice] = useState("");
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(() => new Set());
  const [saving, setSaving] = useState("");
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [deliveries, setDeliveries] = useState<Page<StaffEmailDelivery> | null>(null);
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);
  const [status, setStatus] = useState<StaffEmailStatus | "">("");
  const [kind, setKind] = useState<StaffEmailKind | "">("");
  const [page, setPage] = useState(1);
  const [retrying, setRetrying] = useState("");
  const settingsSequence = useRef(0), deliverySequence = useRef(0), mounted = useRef(true);
  const accessDenied = useRef(false);
  function clearRevokedAccess(caught: unknown) {
    if (!(caught instanceof ApiError) || ![401, 403].includes(caught.status)) return;
    accessDenied.current = true; settingsSequence.current++; deliverySequence.current++;
    setSettings(null); setDeliveries(null); setLoadingSettings(false); setLoadingDeliveries(false); setSettingsError(message(caught));
  }
  const loadSettings = useCallback(async () => {
    if (accessDenied.current) return;
    const sequence = ++settingsSequence.current;
    setLoadingSettings(true); setSettingsError("");
    try { const loaded = await getStaffEmailSettings(); if (mounted.current && sequence === settingsSequence.current) { setSettings(loaded); setDirtyKeys(new Set()); } }
    catch (caught) { if (mounted.current && sequence === settingsSequence.current) { setSettingsError(message(caught)); clearRevokedAccess(caught); } }
    finally { if (mounted.current && sequence === settingsSequence.current) setLoadingSettings(false); }
  }, []);
  const loadDeliveries = useCallback(async () => {
    if (accessDenied.current) return;
    const sequence = ++deliverySequence.current;
    setLoadingDeliveries(true); setDeliveryError("");
    try { const loaded = await getStaffEmailDeliveries({ page, status: status || undefined, kind: kind || undefined });
      if (mounted.current && sequence === deliverySequence.current) setDeliveries(loaded); }
    catch (caught) { if (mounted.current && sequence === deliverySequence.current) { setDeliveries(null); setDeliveryError(message(caught));
      clearRevokedAccess(caught); } }
    finally { if (mounted.current && sequence === deliverySequence.current) setLoadingDeliveries(false); }
  }, [page, status, kind]);
  const currentLoad = useRef(loadDeliveries); currentLoad.current = loadDeliveries;
  useEffect(() => { mounted.current = true; void loadSettings(); return () => { mounted.current = false; settingsSequence.current++; deliverySequence.current++; }; }, [loadSettings]);
  useEffect(() => {
    setDeliveries(null); void loadDeliveries();
    const refresh = () => { if (document.visibilityState === "visible") void loadDeliveries(); };
    const timer = setInterval(refresh, 30_000); window.addEventListener("focus", refresh);
    return () => { clearInterval(timer); window.removeEventListener("focus", refresh); deliverySequence.current++; };
  }, [loadDeliveries]);
  function edit(kind: StaffEmailKind, changes: Partial<StaffEmailTemplate>) {
    setDirtyKeys((current) => new Set(current).add(kind)); setSettings((current) => current ? { ...current, templates: current.templates.map((row) => row.kind === kind ? { ...row, ...changes } : row) } : current);
  }
  async function saveTemplate(template: StaffEmailTemplate) {
    setSaving(template.kind); setSettingsError(""); setNotice("");
    try { const saved = await updateStaffEmailTemplate(template); if (!mounted.current) return;
      setSettings((current) => current ? { ...current, templates: current.templates.map((row) => row.kind === saved.kind ? saved : row) } : current);
      setDirtyKeys((current) => { const next = new Set(current); next.delete(saved.kind); return next; });
      setNotice(`${labels[template.kind]} email saved. New events use this wording.`); }
    catch (caught) { if (mounted.current) { setSettingsError(message(caught)); clearRevokedAccess(caught); } }
    finally { if (mounted.current) setSaving(""); }
  }
  async function saveTiming(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!settings) return;
    setSaving("timing"); setSettingsError(""); setNotice("");
    try { const saved = await updateStaffEmailTiming({ version: settings.timingVersion, dueSoonHours: settings.dueSoonHours, overdueHours: settings.overdueHours });
      if (!mounted.current) return;
      setSettings((current) => current ? { ...current, dueSoonHours: saved.dueSoonHours, overdueHours: saved.overdueHours, timingVersion: saved.version } : current);
      setDirtyKeys((current) => { const next = new Set(current); next.delete('timing'); return next; });
      setNotice("Staff reminder timing saved. The next scheduled check uses these values."); }
    catch (caught) { if (mounted.current) { setSettingsError(message(caught)); clearRevokedAccess(caught); } }
    finally { if (mounted.current) setSaving(""); }
  }
  async function retry(row: StaffEmailDelivery) {
    setRetrying(row.id); setDeliveryError(""); setNotice("");
    try { await retryStaffEmail(row); if (mounted.current) setNotice("Email queued for retry. Its existing recipient and wording are preserved."); }
    catch (caught) { if (mounted.current) { setDeliveryError(message(caught)); clearRevokedAccess(caught); } }
    finally { if (mounted.current) { setRetrying(""); void currentLoad.current(); } }
  }
  return <section className={styles.panel} aria-label="Staff email settings">
    <div className={styles.heading}><div><h2>Staff email</h2><p>Keep staff informed about tasks, Finance reviews, Support cases and Owner account events when they are away from the system.</p></div>
      <button type="button" className={styles.secondary} disabled={Boolean(saving) || loadingSettings} onClick={() => { accessDenied.current = false; setNotice(""); void loadSettings(); void currentLoad.current(); }}><ArrowClockwise aria-hidden="true" />{dirtyKeys.size ? "Discard changes and reload settings" : "Reload staff settings"}</button></div>
    {settingsError && <p role="alert" className={styles.error}>{settingsError}</p>}{notice && <p role="status" className={styles.success}>{notice}</p>}
    {!settings ? <p>{loadingSettings ? "Loading staff settings…" : "Staff settings are unavailable. Use Reload staff settings to try again."}</p> : <>
      <p className={styles.note}>{settings.deliveryMode === "local" ? "Local preview: messages are saved locally for inspection. They are not sent to inboxes." : "Production emails use the configured email provider."} In-app alerts remain available. Finance notes and customer details are viewed after signing in.</p>
      <form className={styles.card} onSubmit={saveTiming}><h3>Task reminder timing</h3><p>One email per reminder stage and task deadline. Submitted or completed tasks stop reminders. In-app due-soon alerts continue to use their 24-hour window.</p>
        <div className={styles.timing}><label>Hours before the deadline<input type="number" required min={1} max={168} step={1} disabled={Boolean(saving) || loadingSettings} value={Number.isNaN(settings.dueSoonHours) ? "" : settings.dueSoonHours} onChange={(event) => { setDirtyKeys((current) => new Set(current).add('timing')); setSettings({ ...settings, dueSoonHours: event.target.value === "" ? NaN : Number(event.target.value) }); }} /></label>
          <label>Hours after the deadline<input type="number" required min={0} max={168} step={1} disabled={Boolean(saving) || loadingSettings} value={Number.isNaN(settings.overdueHours) ? "" : settings.overdueHours} onChange={(event) => { setDirtyKeys((current) => new Set(current).add('timing')); setSettings({ ...settings, overdueHours: event.target.value === "" ? NaN : Number(event.target.value) }); }} /></label></div>
        <p>Use 0 hours after the deadline for the first overdue check. Reminder checks run every 30 seconds while the API is running.</p><button type="submit" disabled={Boolean(saving) || loadingSettings}><FloppyDisk aria-hidden="true" />{saving === "timing" ? "Saving…" : "Save staff timing"}</button></form>
      <p className={styles.note}>Subjects need <code>{'{title}'}</code>; bodies need <code>{'{message}'}</code> and <code>{'{url}'}</code>. Wording is captured when an event is queued. Pausing a type stops new emails and holds queued ones within their 23-hour delivery window.</p>
      <div className={styles.grid}>{settings.templates.map((template) => <section className={styles.card} key={template.kind}><h3>{labels[template.kind]}</h3>
        <label className={styles.check}><input type="checkbox" checked={template.enabled} disabled={Boolean(saving) || loadingSettings} onChange={(event) => edit(template.kind, { enabled: event.target.checked })} />Enable {labels[template.kind].toLowerCase()} emails</label>
        <label htmlFor={`staff-subject-${template.kind}`}>Subject</label><input id={`staff-subject-${template.kind}`} value={template.subject} disabled={Boolean(saving) || loadingSettings} maxLength={180} onChange={(event) => edit(template.kind, { subject: event.target.value })} />
        <label htmlFor={`staff-body-${template.kind}`}>Email body</label><textarea id={`staff-body-${template.kind}`} value={template.body} disabled={Boolean(saving) || loadingSettings} maxLength={2500} rows={6} onChange={(event) => edit(template.kind, { body: event.target.value })} />
        <button type="button" disabled={Boolean(saving) || loadingSettings} onClick={() => void saveTemplate(template)}><FloppyDisk aria-hidden="true" />{saving === template.kind ? "Saving…" : `Save ${labels[template.kind].toLowerCase()} email`}</button>
      </section>)}</div>
    </>}
    <section className={`${styles.card} ${styles.delivery}`} aria-label="Staff email delivery history"><div className={styles.heading}><div><h3>Delivery history</h3><p>All times are Philippine time. Failed emails can be retried within 23 hours if the recipient still has access and the event is current.</p></div>
      <button type="button" className={styles.secondary} disabled={loadingDeliveries} onClick={() => void loadDeliveries()}><ArrowClockwise aria-hidden="true" />Refresh deliveries</button></div>
      <div className={styles.filters}><label>Delivery status<select value={status} onChange={(event) => { setStatus(event.target.value as StaffEmailStatus | ""); setPage(1); }}><option value="">All statuses</option>{staffEmailStatuses.map((value) => <option key={value} value={value}>{statuses[value]}</option>)}</select></label>
        <label>Email type<select value={kind} onChange={(event) => { setKind(event.target.value as StaffEmailKind | ""); setPage(1); }}><option value="">All email types</option>{staffEmailKinds.map((value) => <option key={value} value={value}>{labels[value]}</option>)}</select></label></div>
      {deliveryError && <p role="alert" className={styles.error}>{deliveryError}</p>}
      {!deliveries ? <p aria-live="polite">{loadingDeliveries ? "Loading delivery history…" : "Delivery history is unavailable. Refresh to try again."}</p> : <>
        <p aria-live="polite">{deliveries.total} {deliveries.total === 1 ? "delivery" : "deliveries"}{loadingDeliveries ? " · Refreshing…" : ""}</p>
        {!deliveries.items.length ? <p>No staff email deliveries match these filters.</p> : <ul className={styles.list}>{deliveries.items.map((row) => <li key={row.id} className={styles.item}>
          <div><strong>{labels[row.kind]}</strong><span>{row.recipient.name}</span><span className={styles.email}>{row.recipient.email}</span></div>
          <div><span className={`${styles.badge} ${styles[row.status.toLowerCase()]}`}>{statuses[row.status]}</span><span>{row.totalAttempts} total {row.totalAttempts === 1 ? "attempt" : "attempts"}</span></div>
          <div><span>Queued {date(row.createdAt)}</span>{row.sentAt && <span>Sent {date(row.sentAt)}</span>}{row.status === "PENDING" && <span>Next check {date(row.nextAt)}</span>}{row.error && <span>{row.error}</span>}</div>
          <div>{row.canRetry && <button type="button" disabled={Boolean(retrying)} aria-label={`Retry ${labels[row.kind].toLowerCase()} email to ${row.recipient.name}`} onClick={() => void retry(row)}>{retrying === row.id ? "Queuing…" : "Retry email"}</button>}</div>
        </li>)}</ul>}
        <div className={styles.pagination}><button type="button" className={styles.secondary} disabled={page === 1 || loadingDeliveries} onClick={() => setPage(page - 1)}>Previous deliveries</button><span>Page {page} of {Math.max(1, Math.ceil(deliveries.total / 20))}</span><button type="button" className={styles.secondary} disabled={page * 20 >= deliveries.total || loadingDeliveries} onClick={() => setPage(page + 1)}>Next deliveries</button></div>
      </>}
    </section>
  </section>;
}
