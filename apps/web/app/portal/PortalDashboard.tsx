"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowRight, Bell, CalendarBlank, ChatCircleText, CheckCircle, Clock, FileText, House, Info, List, Package, Plus, SignOut, SquaresFour, Truck, Wallet, X } from "@phosphor-icons/react";
import {
  getPortalSummary, getPortalRecords, getPortalSchedule, getPortalPayments,
  getPortalSupport, createPortalSupport, getCustomerDocuments,
  getPortalNotifications, readPortalNotification,
  type PortalSummary, type PortalScheduleItem, type Payment, type SupportCase, type PortalNotification, type DocumentRequirement,
} from "@/lib/api";
import { portalAttention } from "@/lib/portal-attention";
import { isAuthed, logoutSession } from "@/lib/auth";
import { useMe } from "@/lib/useMe";
import { TYPESCRIPT_API } from "@/lib/backend";
import { useLiveRecords } from "@/lib/useLiveRecords";
import { DocumentChecklist } from "@/components/DocumentChecklist";
import styles from "./portal.module.css";

const currency = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 2 });
const date = new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric" });
const portalNav = [
  { id: "overview", label: "Overview", icon: House, group: "Workspace" },
  { id: "membership", label: "My membership", icon: Package, group: "Workspace" },
  { id: "schedule", label: "Payment schedule", icon: CalendarBlank, group: "Workspace" },
  { id: "payments", label: "Verified payments", icon: Wallet, group: "Workspace" },
  { id: "documents", label: "My documents", icon: FileText, group: "Workspace", typescriptOnly: true },
  { id: "release", label: "Release status", icon: Truck, group: "Updates" },
  { id: "notifications", label: "Notifications", icon: Bell, group: "Updates", typescriptOnly: true },
  { id: "support", label: "Support", icon: ChatCircleText, group: "Updates" },
] as const;
const mobileNav = [
  { id: "overview", label: "Home", icon: House },
  { id: "membership", label: "Unit", icon: Package },
  { id: "schedule", label: "Plan", icon: CalendarBlank },
  { id: "payments", label: "Payments", icon: Wallet },
] as const;

export type PortalSection = typeof portalNav[number]["id"];
const moreToolDetails: Partial<Record<PortalSection, string>> = {
  documents: "Upload requirements",
  release: "Track your unit",
  notifications: "Recent account updates",
  support: "Get help with a concern",
};

const sectionCopy: Record<Exclude<PortalSection, "overview">, { eyebrow: string; title: string; description: string }> = {
  membership: { eyebrow: "Workspace", title: "My membership", description: "Your enrolled unit, batch, and current account balance." },
  schedule: { eyebrow: "Workspace", title: "Payment schedule", description: "See your installment dates and expected amounts." },
  payments: { eyebrow: "Workspace", title: "Verified payments", description: "Payments appear here after Finance verifies them." },
  documents: { eyebrow: "Workspace", title: "My documents", description: "Upload and track the documents needed for your account." },
  release: { eyebrow: "Updates", title: "Release status", description: "Follow the preparation and release of your unit." },
  notifications: { eyebrow: "Updates", title: "Notifications", description: "Your latest payment, release, and support updates." },
  support: { eyebrow: "Updates", title: "Support", description: "Send a concern and follow its status here." },
};

function formatMoney(value: string | number | null | undefined) {
  if (value == null || value === "") return "—";
  const amount = Number(String(value).replaceAll(",", ""));
  return Number.isFinite(amount) ? currency.format(amount) : "—";
}

function formatDate(value: string) {
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? value : date.format(parsed);
}

function displayModelName(model: string) {
  return model.replaceAll(" · ", "\u00a0· ").replace(/(\d+) (GB|TB)\b/gi, "$1\u00a0$2");
}

function statusClass(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "paid" || normalized === "completed") return styles.statusPaid;
  if (normalized === "overdue") return styles.statusOverdue;
  if (normalized === "partial") return styles.statusPartial;
  return styles.statusScheduled;
}

function orderDeviceImage(model: string): string | null {
  const name = model.toLowerCase().trim();
  if (/\bipad\b.*\ba16\b/.test(name)) return "/products/ipad-a16-overlap-transparent.png";
  if (/\bipad\s*10th\s*gen(?:eration)?\b/.test(name)) return "/products/ipad-10th-gen-overlap-transparent.png";

  const phone = name.match(/\biphone\s*(11|12|13|14|15|16|17)\b(?:\s*(pro\s*max|pro|plus|max|e))?/);
  if (!phone) return null;
  const variant = phone[2]?.replace(/\s+/g, "-") ?? "";
  if (variant && variant !== "pro" && variant !== "pro-max") return null;
  return `/products/iphone-${phone[1]}${variant ? `-${variant}` : ""}-overlap-transparent.png`;
}

export default function PortalDashboard({ section }: { section: PortalSection }) {
  const router = useRouter();
  const me = useMe();
  const [summary, setSummary] = useState<PortalSummary | null>(null);
  const [schedule, setSchedule] = useState<PortalScheduleItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentPage, setPaymentPage] = useState(1);
  const [morePayments, setMorePayments] = useState(false);
  const [cases, setCases] = useState<SupportCase[]>([]);
  const [supportStatus, setSupportStatus] = useState<"loading" | "ready" | "error">("loading");
  const [attentionDocuments, setAttentionDocuments] = useState<DocumentRequirement[]>([]);
  const [attentionCases, setAttentionCases] = useState<SupportCase[]>([]);
  const [attentionStatus, setAttentionStatus] = useState<"loading" | "ready" | "error">("loading");
  const [recordsStatus, setRecordsStatus] = useState<"loading" | "ready" | "error">("loading");
  const [notifications, setNotifications] = useState<PortalNotification[]>([]);
  const [concern, setConcern] = useState({ category: "Payment", description: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportText, setReportText] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportCaseId, setReportCaseId] = useState<string | null>(null);
  const moreSheetRef = useRef<HTMLElement>(null);
  const moreCloseRef = useRef<HTMLButtonElement>(null);
  const moreTriggerRef = useRef<HTMLButtonElement>(null);
  const reportInputRef = useRef<HTMLTextAreaElement>(null);
  const reportTriggerRef = useRef<HTMLButtonElement>(null);
  const scrolledHash = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthed()) router.replace("/login");
    else if (me && me.account_type && me.account_type !== "customer") router.replace("/system");
  }, [me, router]);

  useEffect(() => {
    if (!menuOpen && !moreOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") { setMenuOpen(false); setMoreOpen(false); } };
    const closeOnWideScreen = () => { if (window.innerWidth > 900) setMenuOpen(false); if (window.innerWidth > 700) setMoreOpen(false); };
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", closeOnWideScreen);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", closeOnWideScreen);
    };
  }, [menuOpen, moreOpen]);

  useEffect(() => {
    if (!moreOpen) return;
    moreCloseRef.current?.focus();
    const keepFocusInSheet = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const focusable = moreSheetRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", keepFocusInSheet);
    return () => { document.removeEventListener("keydown", keepFocusInSheet); moreTriggerRef.current?.focus(); };
  }, [moreOpen]);

  const loadSupport = useCallback(() => {
    void getPortalSupport().then((supportCases) => { setCases(supportCases); setSupportStatus("ready"); })
      .catch(() => setSupportStatus("error"));
  }, []);
  const loadNotifications = useCallback(() => { if (TYPESCRIPT_API) void getPortalNotifications().then(setNotifications).catch(() => {}); }, []);
  const loadAttention = useCallback(() => {
    if (!TYPESCRIPT_API || section !== "overview") return;
    void Promise.all([getCustomerDocuments(), getPortalSupport()])
      .then(([documents, supportCases]) => {
        setAttentionDocuments(documents);
        setAttentionCases(supportCases);
        setAttentionStatus("ready");
      })
      .catch(() => setAttentionStatus("error"));
  }, [section]);
  const loadRecords = useCallback(() => {
    void getPortalRecords(paymentPage).then(({ client, schedule: plan, balance, payments: verifiedPayments }) => {
      setSummary({
        full_name: client.name, batch_number: client.batch.code,
        unit_model: client.unitModel || client.batch.model, status: client.status.toLowerCase(),
        total_due: balance.total_due, verified_paid: balance.verified_paid,
        remaining_balance: balance.remaining_balance,
        release_status: client.releaseStatus.toLowerCase().replaceAll("_", " "),
        joined_at: client.joinedAt,
        batch_start_date: client.batch.startDate,
        batch_end_date: client.batch.endDate,
      });
      setPayments(verifiedPayments.results);
      setMorePayments(Boolean(verifiedPayments.next));
      setSchedule(plan?.items.map((item) => ({
        sequence_no: item.sequenceNo, due_date: item.dueDate, expected_amount: item.expectedAmount,
        paid_applied: item.paidApplied ?? "0.00", status: item.status?.toLowerCase() ?? "upcoming",
      })) ?? []);
      setError(null);
      setRecordsStatus("ready");
    }).catch((caughtError) => {
      setRecordsStatus("error");
      setError(caughtError instanceof Error ? caughtError.message : "Could not load membership.");
    });
  }, [paymentPage]);
  const refresh = useCallback(() => { loadRecords(); loadAttention(); if (section === "support") loadSupport(); loadNotifications(); }, [section, loadRecords, loadAttention, loadSupport, loadNotifications]);
  useLiveRecords(refresh, me?.account_type === "customer");

  useEffect(() => {
    if (TYPESCRIPT_API) { refresh(); return; }
    Promise.all([getPortalSummary(), getPortalSchedule(), getPortalPayments()])
      .then(([nextSummary, nextSchedule, nextPayments]) => {
        setSummary(nextSummary); setSchedule(nextSchedule); setPayments(nextPayments);
        setRecordsStatus("ready");
      })
      .catch((caughtError) => { setRecordsStatus("error"); setError(caughtError instanceof Error ? caughtError.message : "Failed to load."); });
    if (section === "support") loadSupport();
  }, [section, refresh, loadSupport]);

  useEffect(() => { if (reportOpen) reportInputRef.current?.focus(); }, [reportOpen]);

  useEffect(() => {
    const target = window.location.hash.slice(1);
    if (!target || scrolledHash.current === target) return;
    const element = document.getElementById(target);
    if (element) { element.scrollIntoView({ block: "start" }); scrolledHash.current = target; }
  }, [section, schedule, cases]);

  async function submitMembershipCorrection(event: React.FormEvent) {
    event.preventDefault();
    if (!summary || reportSubmitting) return;
    const request = reportText.trim();
    if (request.length < 10) { setReportError("Please describe what needs correcting in at least 10 characters."); return; }
    setReportSubmitting(true); setReportError(null);
    try {
      const created = await createPortalSupport({
        category: "Account",
        description: [
          "Membership details correction request",
          `Current unit: ${summary.unit_model}`,
          `Batch: ${summary.batch_number}`,
          `Joined: ${summary.joined_at?.slice(0, 10) ?? "Not recorded"}`,
          `Batch start: ${summary.batch_start_date?.slice(0, 10) ?? "Not recorded"}`,
          `Planned batch end: ${summary.batch_end_date?.slice(0, 10) ?? "Not recorded"}`,
          `Customer correction: ${request}`,
        ].join("\n"),
      });
      setReportCaseId(String(created.id));
      setReportText("");
      setReportOpen(false);
      reportTriggerRef.current?.focus();
    } catch (caughtError) {
      setReportError(caughtError instanceof Error ? caughtError.message : "Could not send your correction request.");
    } finally { setReportSubmitting(false); }
  }

  async function logout() {
    try { await logoutSession(); router.replace("/login"); }
    catch { setError("Could not sign out. Check your connection and try again."); }
  }

  async function submitConcern(event: React.FormEvent) {
    event.preventDefault(); setSubmitting(true); setError(null);
    try {
      await createPortalSupport(concern);
      setConcern((current) => ({ ...current, description: "" }));
      setNotice("Concern submitted — we'll follow up.");
      setTimeout(() => setNotice(null), 3000);
      loadSupport();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not submit.");
    } finally { setSubmitting(false); }
  }

  async function markRead(id: string) {
    try {
      const updated = await readPortalNotification(id);
      setNotifications((current) => current.map((item) => item.id === id ? updated : item));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not update notification.");
    }
  }

  const releaseStatus = summary?.release_status?.toLowerCase().replaceAll("_", " ") ?? "not ready";
  const releaseDetails: Record<string, string> = {
    "not ready": "Your unit is not ready for release yet. We’ll update this status as it progresses.",
    processing: "Your unit is being prepared. Watch this page for the next update.",
    ready: "Your unit is ready. Please coordinate collection details with Fresh Phones PH.",
    released: "Your unit has been marked as released.",
  };

  const featuredInstallment = schedule.find((item) => !["paid", "completed"].includes(item.status.toLowerCase()));
  const totalDue = Number(summary?.total_due ?? 0);
  const verifiedPaid = Number(summary?.verified_paid ?? 0);
  const paidPercent = Number.isFinite(totalDue) && totalDue > 0 && Number.isFinite(verifiedPaid)
    ? Math.max(0, Math.min(100, (verifiedPaid / totalDue) * 100)) : 0;
  const deviceImage = section === "overview" && summary?.unit_model ? orderDeviceImage(summary.unit_model) : null;
  const attentionItems = attentionStatus === "ready" && recordsStatus === "ready"
    ? portalAttention(attentionDocuments, attentionCases, schedule) : [];
  const trackedCases = attentionCases.filter((item) => ["open", "in_progress"].includes(item.status.toLowerCase()));

  return (
    <main className={styles.shell}>
      {(menuOpen || moreOpen) && <button type="button" className={styles.menuBackdrop} aria-label="Close navigation" onClick={() => { setMenuOpen(false); setMoreOpen(false); }} />}
      <aside id="customer-sidebar" className={`${styles.sidebar} ${menuOpen ? styles.sidebarOpen : ""}`} aria-label="Customer navigation">
        <div className={styles.sidebarBrand}>
          <span className={styles.sidebarBrandMark}><Image src="/brand/fresh-phones-logo.png" alt="" width={38} height={38} /></span>
          <span><strong>Fresh Phones <em>PH</em></strong><small>Customer portal</small></span>
          <button type="button" className={styles.closeMenu} aria-label="Close menu" onClick={() => setMenuOpen(false)}><X weight="bold" aria-hidden="true" /></button>
        </div>
        <nav className={styles.sidebarNav} aria-label="Customer sections">
          {["Workspace", "Updates"].map((group) => <div className={styles.navGroup} key={group}>
            <p className={styles.navLabel}>{group}</p>
            {portalNav.filter((item) => item.group === group && (!('typescriptOnly' in item) || TYPESCRIPT_API)).map((item) => {
              const Icon = item.icon;
              return <Link key={item.id} href={item.id === "overview" ? "/portal" : `/portal/${item.id}`} className={`${styles.navLink} ${section === item.id ? styles.navActive : ""}`} aria-current={section === item.id ? "page" : undefined} onClick={() => setMenuOpen(false)}><Icon weight={section === item.id ? "fill" : "regular"} aria-hidden="true" /><span>{item.label}</span>{item.id === "notifications" && notifications.some((notification) => !notification.readAt) && <i className={styles.navDot} aria-hidden="true" />}</Link>;
            })}
          </div>)}
        </nav>
        <div className={styles.sidebarFooter}>
          <div className={styles.sidebarAccount}><span className={styles.accountAvatar}>{summary?.full_name?.charAt(0) ?? "C"}</span><span><strong>{summary?.full_name ?? me?.full_name ?? "Customer"}</strong><small>Customer account</small></span></div>
          <button type="button" onClick={logout} className={styles.sidebarLogout}><SignOut weight="bold" aria-hidden="true" /> Log out</button>
        </div>
      </aside>
      <div className={styles.container}>
        <header className={styles.topbar}>
          <button type="button" className={styles.menuButton} aria-label="Open navigation" aria-controls="customer-sidebar" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}><List weight="bold" aria-hidden="true" /></button>
          <div className={styles.brand}>
            <span className={styles.brandMark}><Image src="/brand/fresh-phones-logo.png" alt="" width={44} height={44} /></span>
            <span><strong>Fresh Phones <span>PH</span></strong><small>Customer portal</small></span>
          </div>
          <div className={styles.mobileTopActions}>
            {TYPESCRIPT_API && <Link href="/portal/notifications" className={`${styles.mobileTopAction} ${section === "notifications" ? styles.mobileTopActionActive : ""}`} aria-label="Notifications"><Bell weight={section === "notifications" ? "fill" : "regular"} aria-hidden="true" />{notifications.some((item) => !item.readAt) && <span className={styles.mobileUnreadDot} />}</Link>}
            <button type="button" className={styles.mobileTopAction} aria-label="Open customer menu" aria-controls="customer-sidebar" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}><span className={styles.mobileAvatar}>{summary?.full_name?.charAt(0) ?? "C"}</span></button>
          </div>
          <button type="button" onClick={logout} className={styles.logout}><SignOut weight="bold" aria-hidden="true" /><span>Log out</span></button>
        </header>

        <div className={styles.intro}>
          <div><p className={styles.eyebrow}>{section === "overview" ? "My account" : sectionCopy[section].eyebrow}</p><h1>{section === "overview" ? <>Hi, {summary?.full_name?.split(" ")[0] ?? "there"} <span aria-hidden="true">✦</span></> : sectionCopy[section].title}</h1><p>{section === "overview" ? "Here's your membership and payment record in one place." : sectionCopy[section].description}</p></div>
          {section === "overview" && <span className={styles.liveLabel}><span aria-hidden="true" /> Your records</span>}
        </div>

        {(error || notice) && <div className={`${styles.message} ${error ? styles.messageError : styles.messageSuccess}`} role={error ? "alert" : "status"}>{error ?? notice}</div>}

        {(section === "overview" || section === "membership" || section === "payments") && <section className={`${styles.overview} ${section === "payments" ? styles.overviewSingle : ""}`} aria-label="Membership overview">
          {section !== "payments" && <div className={`${styles.membership} ${deviceImage ? styles.membershipWithArt : ""}`}>
            <div className={styles.membershipTop}><span className={styles.heroIcon}><Package weight="duotone" aria-hidden="true" /></span><span className={styles.membershipStatus}>{summary?.status ?? "Loading"}</span></div>
            <div className={styles.membershipCopy}><p>My membership</p><h2>{summary?.unit_model ? displayModelName(summary.unit_model) : "Loading your unit…"}</h2><span className={styles.batch}>Batch {summary?.batch_number ?? "—"}</span></div>
            {deviceImage && <Image src={deviceImage} alt="" width={1024} height={1536} sizes="(max-width: 700px) 130px, 190px" loading="eager" className={`${styles.deviceArt} ${/ipad/i.test(summary?.unit_model ?? "") ? styles.tabletArt : ""}`} />}
          </div>}
          <div className={styles.balance}>
            <div className={styles.balanceHeading}><span className={styles.balanceIcon}><Wallet weight="duotone" aria-hidden="true" /></span><span>Payment overview</span></div>
            <p className={styles.balanceLabel}>Remaining balance</p>
            <p className={styles.balanceAmount}>{formatMoney(summary?.remaining_balance)}</p>
            <div className={styles.progress} role="progressbar" aria-label="Verified portion of total due" aria-valuenow={Math.round(paidPercent)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${paidPercent}%` }} /></div>
            <div className={styles.balanceStats}><p><span>Verified paid</span><strong>{formatMoney(summary?.verified_paid)}</strong></p><p><span>Total due</span><strong>{formatMoney(summary?.total_due)}</strong></p></div>
            {section === "overview" && <Link href="/portal/payments" className={styles.balanceCta}>View payment history <ArrowRight weight="bold" aria-hidden="true" /></Link>}
            {TYPESCRIPT_API && section === "payments" && <Link href="/portal/financial-document" className={styles.documentLink}>Statement of account</Link>}
          </div>
        </section>}

        {section === "overview" && TYPESCRIPT_API && <section className={`${styles.sectionCard} ${styles.attentionCard}`} aria-labelledby="attention-title">
          <div className={styles.sectionHeading}><span className={`${styles.sectionIcon} ${styles.attentionIcon}`}><Bell weight="duotone" aria-hidden="true" /></span><div><p className={styles.eyebrow}>Your next steps</p><h2 id="attention-title">Needs your attention</h2></div>{attentionItems.length > 0 && <span className={styles.count}>{attentionItems.length} {attentionItems.length === 1 ? "item" : "items"}</span>}</div>
          {attentionStatus === "error" || recordsStatus === "error" ? <div className={styles.attentionState} role="alert"><p>We couldn’t check all of your records right now.</p><button type="button" onClick={refresh}>Try again</button></div>
            : attentionStatus === "loading" || recordsStatus === "loading" ? <p className={styles.attentionState} role="status">Checking your documents, requests, and installment plan…</p>
            : attentionItems.length === 0 ? <p className={styles.attentionState} role="status">No action needed from the records available right now. Check back for updates.</p>
            : <ul className={styles.attentionList}>{attentionItems.map((item) => <li key={item.key}>
              <div><h3>{item.title}</h3><p>{item.detail}</p></div>
              <Link href={item.href} className={styles.attentionAction}>{item.action} <ArrowRight weight="bold" aria-hidden="true" /></Link>
            </li>)}</ul>}
          {attentionStatus === "ready" && recordsStatus === "ready" && trackedCases.length > 0 && <div className={styles.attentionTracking}><div><strong>{trackedCases.length === 1 ? "1 open support request" : `${trackedCases.length} open support requests`}</strong><p>Track the status and any update from Customer Service.</p></div><Link href={`/portal/support#case-${trackedCases[0].id}`}>Track support {trackedCases.length === 1 ? "request" : "requests"} <ArrowRight weight="bold" aria-hidden="true" /></Link></div>}
        </section>}

        {section === "membership" && summary && <section className={styles.sectionCard} aria-labelledby="membership-dates-title">
          <div className={styles.sectionHeading}><span className={`${styles.sectionIcon} ${styles.scheduleIcon}`}><CalendarBlank weight="duotone" aria-hidden="true" /></span><div><p className={styles.eyebrow}>Membership details</p><h2 id="membership-dates-title">Key dates</h2></div></div>
          <dl className={styles.membershipDates}>
            <div><dt>Joined</dt><dd>{summary.joined_at ? formatDate(summary.joined_at) : "Not recorded"}</dd></div>
            <div><dt>Batch start</dt><dd>{summary.batch_start_date ? formatDate(summary.batch_start_date) : "Not recorded"}</dd></div>
            <div><dt>Planned batch end</dt><dd>{summary.batch_end_date ? formatDate(summary.batch_end_date) : "Not recorded"}</dd></div>
          </dl>
          <div className={styles.membershipGuidance}><Info weight="fill" aria-hidden="true" /><p><strong>About the planned batch end</strong> This is the batch’s planned end date. It does not set a collection date for your unit. <Link href="/portal/release">Check your release status</Link> for the latest stage; Fresh Phones PH will coordinate collection when your unit is ready.</p></div>
          <div className={styles.correctionArea}>
            <div><h3>Something incorrect?</h3><p>Tell Customer Service which membership detail needs to change. Your current unit, batch, and dates will be included.</p></div>
            {TYPESCRIPT_API ? <button ref={reportTriggerRef} type="button" className={styles.correctionTrigger} aria-expanded={reportOpen} aria-controls={reportOpen ? "membership-correction-form" : undefined} disabled={reportSubmitting} onClick={() => { setReportOpen((open) => !open); setReportError(null); setReportCaseId(null); }}>{reportOpen ? "Close form" : "Report incorrect details"}</button> : <Link href="/portal/support" className={styles.correctionTrigger}>Report incorrect details</Link>}
          </div>
          {reportOpen && TYPESCRIPT_API && <form id="membership-correction-form" className={styles.correctionForm} onSubmit={submitMembershipCorrection}>
            <label htmlFor="membership-correction">What should we correct?</label>
            <textarea ref={reportInputRef} id="membership-correction" required minLength={10} maxLength={4000} value={reportText} onChange={(event) => setReportText(event.target.value)} placeholder="For example: My unit should be iPhone 16 Pro, not iPhone 16." />
            <p>Customer Service will review your request. Changes to the record are made by staff.</p>
            {reportError && <p className={styles.correctionError} role="alert">{reportError}</p>}
            <button type="submit" disabled={reportSubmitting}>{reportSubmitting ? "Sending…" : "Send correction request"}</button>
          </form>}
          {reportCaseId && <p className={styles.correctionSuccess} role="status">Request sent to Customer Service. <Link href={`/portal/support#case-${reportCaseId}`}>View your support request</Link>.</p>}
        </section>}

        {(section === "overview" || section === "release") && <section className={`${styles.releaseCard} ${section === "release" ? styles.standaloneCard : ""}`} aria-labelledby="release-title">
          <span className={styles.releaseIcon}><Truck weight="duotone" aria-hidden="true" /></span>
          <div><p className={styles.eyebrow}>Unit status</p><h2 id="release-title">Release &amp; fulfillment</h2><p>{releaseDetails[releaseStatus] ?? "Your unit status will appear here when updated."}</p></div>
          <strong className={styles.releaseBadge}>{releaseStatus}</strong>
        </section>}

        {(section === "overview" || section === "schedule") && <section className={styles.nextPayment} aria-labelledby="next-payment-title">
          <span className={styles.nextIcon}><Clock weight="duotone" aria-hidden="true" /></span>
          <div className={styles.nextCopy}><h2 id="next-payment-title">Your installment plan</h2><p>{featuredInstallment ? `Installment ${featuredInstallment.sequence_no} · ${formatDate(featuredInstallment.due_date)}` : schedule.length ? "All installments in this schedule are marked paid." : "Installments will appear here when a schedule is available."}</p></div>
          {featuredInstallment && <strong>{formatMoney(Math.max(0, Number(featuredInstallment.expected_amount) - Number(featuredInstallment.paid_applied || 0)))}</strong>}
        </section>}

        {(section === "schedule" || section === "payments") && <div className={`${styles.detailsGrid} ${styles.detailsGridSingle}`}>
          {section === "schedule" && <section className={styles.sectionCard} aria-labelledby="schedule-title">
            <div className={styles.sectionHeading}><span className={`${styles.sectionIcon} ${styles.scheduleIcon}`}><CalendarBlank weight="duotone" aria-hidden="true" /></span><div><p className={styles.eyebrow}>Your plan</p><h2 id="schedule-title">Payment schedule</h2></div><span className={styles.count}>{schedule.length} installments</span></div>
            {schedule.length === 0 ? <p className={styles.emptyText}>Your schedule has not been issued yet. Please contact Records.</p> : (
              <ol className={styles.scheduleList}>{schedule.map((item) => (
                <li key={item.sequence_no} id={`installment-${item.sequence_no}`} className={styles.scheduleRow}>
                  <span className={styles.sequence}>{item.sequence_no}</span>
                  <div className={styles.scheduleDate}><span>Due date</span><strong>{formatDate(item.due_date)}</strong></div>
                  <div className={styles.scheduleAmount}><span>Amount</span><strong>{formatMoney(item.expected_amount)}</strong>{Number(item.paid_applied) > 0 && <small>{formatMoney(item.paid_applied)} applied</small>}</div>
                  <span className={`${styles.status} ${statusClass(item.status)}`}>{item.status.replaceAll("_", " ")}</span>
                </li>
              ))}</ol>
            )}
          </section>}

          {section === "payments" && <section className={styles.sectionCard} aria-labelledby="payments-title">
            <div className={styles.sectionHeading}><span className={`${styles.sectionIcon} ${styles.paymentIcon}`}><CheckCircle weight="duotone" aria-hidden="true" /></span><div><p className={styles.eyebrow}>Payment history</p><h2 id="payments-title">Verified payments</h2></div></div>
            {payments.length === 0 ? (
              <div className={styles.paymentEmpty}><span><CheckCircle weight="duotone" aria-hidden="true" /></span><h3>No verified payments yet</h3><p>Payments will appear here once Finance verifies them.</p></div>
            ) : (
              <><ul className={styles.paymentsList}>{payments.map((payment) => (
                <li key={payment.id}><span className={styles.paymentCheck}><CheckCircle weight="fill" aria-hidden="true" /></span><div><strong>{formatMoney(payment.amount)}</strong><span>{formatDate(payment.payment_date)} · {payment.method}</span>{payment.reference_no && <small>Ref: {payment.reference_no}</small>}{TYPESCRIPT_API && <Link href={`/portal/financial-document?payment=${payment.id}`} className={styles.documentLink}>Payment confirmation</Link>}</div></li>
              ))}</ul>{TYPESCRIPT_API && (paymentPage > 1 || morePayments) && <div className={styles.pageActions}><button type="button" disabled={paymentPage === 1} onClick={() => setPaymentPage((page) => page - 1)}>Previous</button><span>Page {paymentPage}</span><button type="button" disabled={!morePayments} onClick={() => setPaymentPage((page) => page + 1)}>Next</button></div>}</>
            )}
          </section>}
        </div>}

        {section === "documents" && TYPESCRIPT_API && <section className={`${styles.sectionCard} ${styles.support} ${styles.standaloneCard}`} aria-label="Documents"><DocumentChecklist /></section>}

        {section === "notifications" && TYPESCRIPT_API && <section className={`${styles.sectionCard} ${styles.support} ${styles.standaloneCard}`} aria-labelledby="notifications-title">
          <div className={styles.sectionHeading}><span className={`${styles.sectionIcon} ${styles.notificationIcon}`}><Bell weight="duotone" aria-hidden="true" /></span><div><p className={styles.eyebrow}>Updates</p><h2 id="notifications-title">Notifications</h2></div>{notifications.some((item) => !item.readAt) && <span className={styles.count}>{notifications.filter((item) => !item.readAt).length} new</span>}</div>
          {notifications.length === 0 ? <p className={styles.emptyText}>No updates yet. Payment, release, and support changes will appear here.</p> : <ul className={styles.notificationList}>{notifications.map((item) => <li key={item.id} className={item.readAt ? "" : styles.unread}><div><strong>{item.title}</strong><p>{item.message}</p><small>{new Date(item.createdAt).toLocaleString("en-PH")}</small></div>{!item.readAt && <button type="button" onClick={() => markRead(item.id)}>Mark read</button>}</li>)}</ul>}
        </section>}

        {section === "support" && <section className={`${styles.sectionCard} ${styles.support} ${styles.standaloneCard}`} aria-labelledby="support-title">
          <div className={styles.sectionHeading}><span className={`${styles.sectionIcon} ${styles.supportIcon}`}><ChatCircleText weight="duotone" aria-hidden="true" /></span><div><p className={styles.eyebrow}>Need help?</p><h2 id="support-title">Support</h2></div></div>
          <form onSubmit={submitConcern} className={styles.supportForm}>
            <select aria-label="Concern category" value={concern.category} onChange={(event) => setConcern({ ...concern, category: event.target.value })}><option>Payment</option><option>Unit / device</option><option>Account</option><option>Other</option></select>
            <input required minLength={10} maxLength={5000} aria-label="Describe your concern" value={concern.description} onChange={(event) => setConcern({ ...concern, description: event.target.value })} placeholder="Describe your concern…" />
            <button type="submit" disabled={submitting}><Plus weight="bold" aria-hidden="true" /> {submitting ? "Sending…" : "Submit"}</button>
          </form>
          {supportStatus === "error" ? <div className={styles.attentionState} role="alert"><p>Couldn’t load your support requests.</p><button type="button" onClick={loadSupport}>Try again</button></div>
            : supportStatus === "loading" ? <p className={styles.emptyText} role="status">Loading your support requests…</p>
            : cases.length === 0 ? <p className={styles.emptyText}>No concerns raised yet.</p> : <ul className={styles.supportList}>{cases.map((item) => <li key={item.id} id={`case-${item.id}`}><div><strong>{item.category}</strong><span>{item.description}</span>{item.assigned_staff_name && <small>Assigned to {item.assigned_staff_name}</small>}{item.resolution && <small>Resolution: {item.resolution}</small>}{item.status.toLowerCase() === "waiting_for_client" && <small>Customer Service is waiting for details. <a href="https://m.me/FreshPhonesPh" target="_blank" rel="noopener noreferrer">Contact Fresh Phones PH in Messenger</a> and include this request ID: {String(item.id).slice(0, 8)}.</small>}</div><span>{item.status.replaceAll("_", " ")}</span></li>)}</ul>}
        </section>}

        {(section === "overview" || section === "schedule" || section === "payments") && <p className={styles.note}><Info weight="fill" aria-hidden="true" /> Payments are coordinated in Messenger. This portal shows Finance-verified records and your derived balance.</p>}
      </div>
      <nav className={styles.mobileBottomNav} aria-label="Mobile customer navigation">
        {mobileNav.map((item) => {
          const Icon = item.icon;
          return <Link key={item.id} href={item.id === "overview" ? "/portal" : `/portal/${item.id}`} className={`${styles.mobileNavItem} ${section === item.id ? styles.mobileNavActive : ""}`} aria-current={section === item.id ? "page" : undefined}><Icon weight={section === item.id ? "fill" : "regular"} aria-hidden="true" /><span>{item.label}</span></Link>;
        })}
        <button ref={moreTriggerRef} type="button" className={`${styles.mobileNavItem} ${!mobileNav.some((item) => item.id === section) ? styles.mobileNavActive : ""}`} aria-label="More customer pages" aria-controls="customer-more-sheet" aria-expanded={moreOpen} onClick={() => setMoreOpen(true)}><SquaresFour weight={!mobileNav.some((item) => item.id === section) ? "fill" : "regular"} aria-hidden="true" /><span>More</span></button>
      </nav>
      {moreOpen && <section ref={moreSheetRef} id="customer-more-sheet" className={styles.moreSheet} role="dialog" aria-modal="true" aria-labelledby="customer-more-title">
        <div className={styles.moreSheetHeader}><div><p>Fresh Phones PH</p><h2 id="customer-more-title">More tools</h2></div><button ref={moreCloseRef} type="button" aria-label="Close more tools" onClick={() => setMoreOpen(false)}><X weight="bold" aria-hidden="true" /></button></div>
        <div className={styles.moreAccount}><span className={styles.moreAccountAvatar}>{summary?.full_name?.charAt(0) ?? "C"}</span><div><strong>{summary?.full_name ?? me?.full_name ?? "Customer"}</strong><small>{me?.email ?? "Customer account"}</small></div></div>
        <div className={styles.moreTools}>
          {portalNav.filter((item) => moreToolDetails[item.id] && (!('typescriptOnly' in item) || TYPESCRIPT_API)).map((item) => {
            const Icon = item.icon;
            return <Link key={item.id} href={`/portal/${item.id}`} className={styles.moreTool} onClick={() => setMoreOpen(false)}><span className={styles.moreToolIcon}><Icon weight="regular" aria-hidden="true" /></span><span><strong>{item.label}</strong><small>{moreToolDetails[item.id]}</small></span><span className={styles.moreToolArrow} aria-hidden="true">→</span></Link>;
          })}
        </div>
        <button type="button" className={styles.moreLogout} onClick={logout}><SignOut weight="regular" aria-hidden="true" /><span>Log out</span><span aria-hidden="true">→</span></button>
      </section>}
    </main>
  );
}
