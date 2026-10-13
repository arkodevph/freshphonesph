"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "@phosphor-icons/react";
import { getStaffAlerts, readAllStaffAlerts, readStaffAlert, type StaffAlert, type StaffAlertPage, type StaffAlertScope } from "@/lib/api";
import { useLiveRecords } from "@/lib/useLiveRecords";
import { ApiError } from "@/lib/ts-api";
import styles from "./staff-alerts.module.css";

export function StaffAlerts({ open, onToggle, onClose, canFinance, canResults, canSupport, canAccounts }: { open: boolean; onToggle: () => void; onClose: () => void; canFinance: boolean; canResults: boolean; canSupport: boolean; canAccounts: boolean }) {
  const panelId = useId();
  const [snapshot, setSnapshot] = useState<StaffAlertPage | null>(null);
  const [scope, setScope] = useState<StaffAlertScope>("all");
  const [page, setPage] = useState(1); const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null); const [actionError, setActionError] = useState<string | null>(null);
  const sequence = useRef(0);
  const pendingReads = useRef(new Set<string>());
  const load = useCallback(async () => {
    if (scope === "finance" && !canFinance) { setScope("all"); return; }
    if (scope === "results" && !canResults) { setScope("all"); return; }
    if (scope === "support" && !canSupport) { setScope("all"); return; }
    if (scope === "accounts" && !canAccounts) { setScope("all"); return; }
    const request = ++sequence.current; setLoading(true);
    try {
      const result = await getStaffAlerts(page, unreadOnly, scope);
      if (request !== sequence.current) return;
      setError(null);
      const lastPage = Math.max(1, Math.ceil(result.total / result.pageSize));
      if (page > lastPage) { setPage(lastPage); return; }
      setSnapshot(result);
    } catch (error) {
      if (request !== sequence.current) return;
      if (error instanceof ApiError && [401, 403].includes(error.status)) setSnapshot(null);
      setError(error instanceof Error ? error.message : "Could not load staff alerts.");
    } finally { if (request === sequence.current) setLoading(false); }
  }, [page, unreadOnly, scope, canFinance, canResults, canSupport, canAccounts]);
  const currentLoad = useRef(load); currentLoad.current = load;
  useEffect(() => { void load(); return () => { sequence.current++; }; }, [load]);
  useEffect(() => { if (open) void load(); }, [open, load]);
  useLiveRecords(load);
  useEffect(() => {
    const timer = setInterval(() => { if (document.visibilityState === "visible") void load(); }, 30_000);
    return () => clearInterval(timer);
  }, [load]);

  async function read(alert?: StaffAlert) {
    const key = alert ? `${alert.entity}:${alert.id}:${alert.entity === "task" ? `${alert.kind}:${alert.deadline}` : alert.version}` : "all";
    if ((!alert && busy) || (alert && alert.readAt) || pendingReads.current.has(key)) return;
    pendingReads.current.add(key);
    setBusy(true); setActionError(null);
    try { if (alert) await readStaffAlert(alert); else await readAllStaffAlerts(scope); }
    catch (error) { setActionError(error instanceof Error ? error.message : "Could not update the alert. Please try again."); }
    finally { pendingReads.current.delete(key); setBusy(pendingReads.current.size > 0); void currentLoad.current(); }
  }
  const unread = snapshot?.unreadCount ?? 0;
  const label = error ? "Notifications: unable to refresh staff alerts" : !snapshot ? "Notifications: loading staff alerts" : `Notifications: ${unread} unread staff alerts`;
  return <div className="system-popover-anchor">
    <button type="button" className={`system-icon-button ${styles.bell}`} aria-label={label} aria-expanded={open} aria-controls={panelId} onClick={onToggle}>
      <Bell className="h-[19px] w-[19px]" />{(unread > 0 || error) && <span className={styles.badge} aria-hidden="true">{error ? "!" : unread > 99 ? "99+" : unread}</span>}
    </button>
    {open && <section id={panelId} className={`system-popover system-notifications-popover ${styles.panel}`} aria-label="Staff alerts">
      <header className={styles.heading}><div><h2>Staff alerts</h2><p>{snapshot ? `${snapshot.taskCount} task${snapshot.taskCount === 1 ? "" : "s"}${canFinance ? ` · ${snapshot.financeCount} pending payments` : ""}${canResults ? ` · ${snapshot.resultCount} Finance results` : ""}${canSupport ? ` · ${snapshot.supportCount} Support alerts` : ""}${canAccounts ? ` · ${snapshot.accountCount} account events` : ""} · ${unread} unread` : "Your tasks and reminders"}</p></div>
        <button type="button" disabled={busy || loading || Boolean(error) || !snapshot?.filteredUnreadCount} onClick={() => void read()}>{busy ? "Updating…" : "Mark all as read"}</button></header>
      <nav className={styles.tabs} aria-label="Alert type">{(["all", "tasks", ...(canFinance ? ["finance"] : []), ...(canResults ? ["results"] : []), ...(canSupport ? ["support"] : []), ...(canAccounts ? ["accounts"] : [])] as StaffAlertScope[]).map((value) =>
        <button type="button" key={value} aria-pressed={scope === value} onClick={() => { setScope(value); setPage(1); setActionError(null); }}>{value === "all" ? "All alerts" : value === "tasks" ? "Tasks" : value === "finance" ? "Finance" : value === "support" ? "Support" : value === "accounts" ? "Accounts" : "Results"}</button>)}</nav>
      <div className={styles.controls}><label><input type="checkbox" checked={unreadOnly} onChange={(event) => { setUnreadOnly(event.target.checked); setPage(1); }} />Unread only</label>
        <button type="button" disabled={loading} onClick={() => void load()}>Refresh alerts</button></div>
      {actionError && <p role="alert" className={styles.error}>{actionError}</p>}
      {error ? <p role="alert" className={styles.error}>{error} <button type="button" onClick={() => void load()}>Retry alerts</button></p>
        : loading ? <p role="status" className={styles.state}>Loading staff alerts…</p>
        : !snapshot?.items.length ? <div className={styles.state}><strong>{unreadOnly && snapshot?.filteredCount ? "No unread alerts in this view" : scope === "tasks" ? "No tasks awaiting your work" : scope === "finance" ? "No payments awaiting verification" : scope === "results" ? "No Finance results yet" : scope === "accounts" ? "No account events yet" : scope === "support" ? "No Support alerts awaiting your attention" : "No staff alerts"}</strong>
          <p>{unreadOnly && snapshot?.filteredCount ? "Read alerts stay available while their work is current. Finished or reassigned Support cases leave this view." : scope === "accounts" ? "Staff account creation, role changes and sign-in access changes will appear here." : scope === "results" ? "Verified, rejected and clarification decisions will appear here." : scope === "support" ? "New concerns, assignments and customer replies will appear for their responsible staff." : "New assignments, reminders and relevant Finance or Support updates will appear here."}</p></div>
        : <ul className={styles.list}>{snapshot.items.map((alert) => <li key={`${alert.entity}:${alert.id}`}>
          <Link href={alert.targetPath} className={styles.item} data-unread={!alert.readAt} data-kind={alert.kind} aria-label={`Open ${alert.entity === "payment-result" ? "Finance result" : alert.entity} alert: ${alert.message}`}
            onClick={() => { void read(alert); onClose(); }}>
            <span className={styles.dot} aria-hidden="true" /><div><strong>{alert.title}</strong><p>{alert.message}</p>
              <small>{alert.readAt ? "Read" : "Unread"} · {new Date(alert.occurredAt).toLocaleString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} PHT</small></div>
          </Link></li>)}</ul>}
      <footer className={styles.footer}><nav aria-label="Staff alert pages"><button type="button" disabled={loading || page === 1} onClick={() => setPage(page - 1)}>Previous alerts</button>
        <span>Page {page}</span><button type="button" disabled={loading || !snapshot || page * snapshot.pageSize >= snapshot.total} onClick={() => setPage(page + 1)}>Next alerts</button></nav>
        <div className={styles.links}><Link href="/system/tasks" onClick={onClose}>Open tasks</Link>{canFinance && <Link href="/system/payments?status=pending" onClick={onClose}>Open pending payments</Link>}</div>
        {canAccounts && <div className={styles.links}><Link href="/system/team" onClick={onClose}>Open account directory</Link></div>}
        {canSupport && <div className={styles.links}><Link href="/system/support" onClick={onClose}>Open Support cases</Link></div>}
        <p>Reading an alert does not complete a task, verify a payment, resolve a case or change account access.</p></footer>
    </section>}
  </div>;
}
