"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowRight, Bell, CalendarBlank, CaretDown, ChatCircleText, CheckCircle, Clock, Compass, FileText, GearSix, House, Info, List, MagnifyingGlass, Moon, Package, Plus, SignOut, SquaresFour, Sun, Truck, UserCircle, Wallet, X } from "@phosphor-icons/react";
import {
  getPortalSummary, getPortalRecords, getPortalSchedule, getPortalPayments,
  getPortalSupport, createPortalSupport, getSupportCaseDetail, replySupportCase, getCustomerDocuments,
  getPortalNotifications, readPortalNotification, readAllPortalNotifications, getPendingCustomerPayments, getReleaseUpdates,
  type PortalSummary, type PortalScheduleItem, type Payment, type PendingCustomerPayment, type SupportCase, type SupportCaseDetail, type PortalNotification, type DocumentRequirement, type ReleaseUpdate,
} from "@/lib/api";
import { portalAttention } from "@/lib/portal-attention";
import { isAuthed, logoutSession } from "@/lib/auth";
import { useMe } from "@/lib/useMe";
import { signInDestination, supportSignInHref } from "@/lib/support-entry";
import { TYPESCRIPT_API } from "@/lib/backend";
import { useLiveRecords } from "@/lib/useLiveRecords";
import { DocumentChecklist } from "@/components/DocumentChecklist";
import PortalSkeleton, { PortalLoadingRows } from "./PortalSkeleton";
import DashboardNextSteps from "./DashboardNextSteps";
import PaymentOverview from "./PaymentOverview";
import MembershipDatesCalendar from "./MembershipDatesCalendar";
import PaymentScheduleWorkspace from "./PaymentScheduleWorkspace";
import VerifiedPaymentsWorkspace from "./VerifiedPaymentsWorkspace";
import { useCustomerPortalTour } from "./CustomerPortalTour";
import { NotificationRecordPanel } from "./NotificationRecordPanel";
import { CustomerSecuritySettings } from "./CustomerSecuritySettings";
import styles from "./portal.module.css";

const currency = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 2 });
const date = new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric" });
const SUPPORT_PAGE_SIZE = 3;
const portalNav = [
  { id: "overview", label: "Overview", icon: House, group: "Workspace" },
  { id: "membership", label: "My membership", icon: Package, group: "Workspace" },
  { id: "schedule", label: "Payment schedule", icon: CalendarBlank, group: "Workspace" },
  { id: "payments", label: "Verified payments", icon: Wallet, group: "Workspace" },
  { id: "documents", label: "My documents", icon: FileText, group: "Workspace", typescriptOnly: true },
  { id: "release", label: "Release status", icon: Truck, group: "Updates" },
  { id: "notifications", label: "Notifications", icon: Bell, group: "Updates", typescriptOnly: true },
  { id: "support", label: "Support", icon: ChatCircleText, group: "Updates" },
  { id: "settings", label: "Settings", icon: GearSix, group: "Account" },
] as const;
const mobileNav = [
  { id: "overview", label: "Home", icon: House },
  { id: "membership", label: "Unit", icon: Package },
  { id: "schedule", label: "Plan", icon: CalendarBlank },
  { id: "payments", label: "Payments", icon: Wallet },
] as const;

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => { finished: Promise<void> };
};

export type PortalSection = typeof portalNav[number]["id"];
const moreToolDetails: Partial<Record<PortalSection, string>> = {
  documents: "Upload requirements",
  release: "Track your unit",
  notifications: "Recent account updates",
  support: "Get help with a concern",
  settings: "Profile, appearance, and security",
};

const sectionCopy: Record<Exclude<PortalSection, "overview">, { eyebrow: string; title: string; description: string }> = {
  membership: { eyebrow: "Workspace", title: "My membership", description: "Your enrolled unit, batch, and current account balance." },
  schedule: { eyebrow: "Workspace", title: "Payment schedule", description: "See your installment dates and expected amounts." },
  payments: { eyebrow: "Workspace", title: "Verified payments", description: "Payments appear here after Finance verifies them." },
  documents: { eyebrow: "Workspace", title: "My documents", description: "Upload and track the documents needed for your account." },
  release: { eyebrow: "Updates", title: "Release status", description: "Follow the preparation and release of your unit." },
  notifications: { eyebrow: "Updates", title: "Notifications", description: "Your latest payment, release, and support updates." },
  support: { eyebrow: "Updates", title: "Support", description: "Send a concern and follow its status here." },
  settings: { eyebrow: "Account", title: "Settings", description: "View your profile, choose an appearance, and manage your password." },
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

function ProfileAvatar({ className, name, image }: { className: string; name: string; image?: string | null }) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  return <span className={className}>
    {name.charAt(0) || "C"}
    {image && image !== failedImage && <Image src={image} alt="" width={42} height={42} unoptimized className={styles.profilePhoto} onError={() => setFailedImage(image)} />}
  </span>;
}

export default function PortalDashboard({ section }: { section: PortalSection }) {
  const router = useRouter();
  const me = useMe();
  const [summary, setSummary] = useState<PortalSummary | null>(null);
  const [schedule, setSchedule] = useState<PortalScheduleItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [pendingPayments, setPendingPayments] = useState<PendingCustomerPayment[]>([]);
  const [pendingStatus, setPendingStatus] = useState<"loading" | "ready" | "error">("loading");
  const [releaseUpdates, setReleaseUpdates] = useState<ReleaseUpdate[]>([]);
  const [releaseUpdatesStatus, setReleaseUpdatesStatus] = useState<"loading" | "ready" | "error">("loading");
  const [paymentPage, setPaymentPage] = useState(1);
  const [supportPage, setSupportPage] = useState(1);
  const [morePayments, setMorePayments] = useState(false);
  const [paymentPagination, setPaymentPagination] = useState({ count: 0, page: 1, pageSize: 20 });
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const recordsRequestRef = useRef(0);
  const [cases, setCases] = useState<SupportCase[]>([]);
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [caseDetail, setCaseDetail] = useState<SupportCaseDetail | null>(null);
  const [caseLoading, setCaseLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);
  const [supportStatus, setSupportStatus] = useState<"loading" | "ready" | "error">("loading");
  const [attentionDocuments, setAttentionDocuments] = useState<DocumentRequirement[]>([]);
  const [attentionCases, setAttentionCases] = useState<SupportCase[]>([]);
  const [attentionStatus, setAttentionStatus] = useState<"loading" | "ready" | "error">("loading");
  const [recordsStatus, setRecordsStatus] = useState<"loading" | "ready" | "error">("loading");
  const [notifications, setNotifications] = useState<PortalNotification[]>([]);
  const [notificationsStatus, setNotificationsStatus] = useState<"loading" | "ready" | "error">("loading");
  const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>(null);
  const [markingAllNotifications, setMarkingAllNotifications] = useState(false);
  const [notificationActionError, setNotificationActionError] = useState<string | null>(null);
  const [concern, setConcern] = useState({ category: "Payment", description: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [pageQuery, setPageQuery] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportText, setReportText] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportCaseId, setReportCaseId] = useState<string | null>(null);
  const moreSheetRef = useRef<HTMLElement>(null);
  const topbarActionsRef = useRef<HTMLDivElement>(null);
  const desktopNotificationsRef = useRef<HTMLDivElement>(null);
  const mobileNotificationsRef = useRef<HTMLDivElement>(null);
  const desktopNotificationButtonRef = useRef<HTMLButtonElement>(null);
  const mobileNotificationButtonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const moreCloseRef = useRef<HTMLButtonElement>(null);
  const moreTriggerRef = useRef<HTMLButtonElement>(null);
  const reportInputRef = useRef<HTMLTextAreaElement>(null);
  const reportTriggerRef = useRef<HTMLButtonElement>(null);
  const notificationTriggerRef = useRef<HTMLButtonElement>(null);
  const scrolledHash = useRef<string | null>(null);
  const themeTransitioning = useRef(false);
  const { startTour, overlay: customerTourOverlay } = useCustomerPortalTour({
    autoStart: section !== "support" && recordsStatus === "ready" && me?.account_type === "customer",
    accountId: me?.id,
  });

  useEffect(() => {
    if (!isAuthed()) router.replace(supportSignInHref(window.location.pathname, window.location.hash));
    else if (me && me.account_type && me.account_type !== "customer") router.replace(signInDestination(me, section === "support" ? "/portal/support" : null));
  }, [me, router, section]);

  useEffect(() => {
    setTheme(document.documentElement.dataset.systemTheme === "dark" ? "dark" : "light");
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!topbarActionsRef.current?.contains(event.target as Node)) {
        setSearchOpen(false);
        setProfileOpen(false);
      }
      if (!desktopNotificationsRef.current?.contains(event.target as Node) &&
          !mobileNotificationsRef.current?.contains(event.target as Node)) setNotificationsOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSearchOpen(false); setProfileOpen(false); setNotificationsOpen(false);
        if (desktopNotificationsRef.current?.contains(document.activeElement)) desktopNotificationButtonRef.current?.focus();
        else if (mobileNotificationsRef.current?.contains(document.activeElement)) mobileNotificationButtonRef.current?.focus();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
        setProfileOpen(false);
        setNotificationsOpen(false);
      }
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  useEffect(() => { if (searchOpen) searchInputRef.current?.focus(); }, [searchOpen]);

  function toggleTheme(event: MouseEvent<HTMLButtonElement>) {
    if (themeTransitioning.current) return;
    const next = theme === "dark" ? "light" : "dark";
    const root = document.documentElement;
    const button = event.currentTarget.getBoundingClientRect();
    const x = event.detail === 0 ? button.left + button.width / 2 : event.clientX;
    const y = event.detail === 0 ? button.top + button.height / 2 : event.clientY;
    root.style.setProperty("--theme-iris-x", `${x}px`);
    root.style.setProperty("--theme-iris-y", `${y}px`);
    root.style.setProperty("--theme-iris-radius", `${Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))}px`);

    const applyTheme = () => {
      root.dataset.systemTheme = next;
      localStorage.setItem("freshphones-system-theme", next);
      setTheme(next);
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { applyTheme(); return; }
    const transition = (document as ViewTransitionDocument).startViewTransition?.(applyTheme);
    if (!transition) { applyTheme(); return; }
    themeTransitioning.current = true;
    root.classList.add("portal-theme-iris-transition");
    const finishTransition = () => {
      root.classList.remove("portal-theme-iris-transition");
      themeTransitioning.current = false;
    };
    void transition.finished.then(finishTransition, finishTransition);
  }

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
  const loadNotifications = useCallback(() => {
    if (!TYPESCRIPT_API) return;
    void getPortalNotifications().then((items) => { setNotifications(items); setNotificationsStatus("ready"); })
      .catch(() => setNotificationsStatus("error"));
  }, []);
  const loadPending = useCallback(() => {
    if (!TYPESCRIPT_API || !["payments", "notifications"].includes(section)) return;
    void getPendingCustomerPayments().then((items) => { setPendingPayments(items); setPendingStatus("ready"); })
      .catch(() => setPendingStatus("error"));
  }, [section]);
  const loadReleaseUpdates = useCallback(() => {
    if (!TYPESCRIPT_API || !me?.client_id || !["overview", "release"].includes(section)) return;
    void getReleaseUpdates(me.client_id).then((updates) => { setReleaseUpdates(updates); setReleaseUpdatesStatus("ready"); })
      .catch(() => setReleaseUpdatesStatus("error"));
  }, [me?.client_id, section]);
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
    const request = ++recordsRequestRef.current;
    setPaymentsLoading(true);
    void getPortalRecords(paymentPage).then(({ client, schedule: plan, balance, payments: verifiedPayments }) => {
      if (request !== recordsRequestRef.current) return;
      const pageSize = verifiedPayments.page_size ?? 20;
      const lastPage = Math.max(1, Math.ceil(verifiedPayments.count / pageSize));
      if (paymentPage > lastPage) { setPaymentPage(lastPage); return; }
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
      setPaymentPagination({ count: verifiedPayments.count, page: verifiedPayments.page ?? paymentPage, pageSize });
      setSchedule(plan?.items.map((item) => ({
        sequence_no: item.sequenceNo, due_date: item.dueDate, expected_amount: item.expectedAmount,
        paid_applied: item.paidApplied ?? "0.00", status: item.status?.toLowerCase() ?? "upcoming",
      })) ?? []);
      setError(null);
      setRecordsStatus("ready");
    }).catch((caughtError) => {
      if (request !== recordsRequestRef.current) return;
      setRecordsStatus("error");
      setError(caughtError instanceof Error ? caughtError.message : "Could not load membership.");
    }).finally(() => {
      if (request === recordsRequestRef.current) setPaymentsLoading(false);
    });
  }, [paymentPage]);
  const refresh = useCallback(() => {
    loadRecords(); loadAttention(); loadPending(); loadReleaseUpdates();
    if (section === "support" || section === "membership") loadSupport();
    if (section === "support" && activeCaseId) void getSupportCaseDetail(activeCaseId).then(setCaseDetail).catch(() => {});
    loadNotifications();
  }, [section, activeCaseId, loadRecords, loadAttention, loadPending, loadReleaseUpdates, loadSupport, loadNotifications]);
  useLiveRecords(refresh, me?.account_type === "customer");

  useEffect(() => {
    if (me?.account_type !== "customer") return;
    if (TYPESCRIPT_API) { refresh(); return; }
    Promise.all([getPortalSummary(), getPortalSchedule(), getPortalPayments()])
      .then(([nextSummary, nextSchedule, nextPayments]) => {
        setSummary(nextSummary); setSchedule(nextSchedule); setPayments(nextPayments);
        setPaymentPagination({ count: nextPayments.length, page: 1, pageSize: Math.max(1, nextPayments.length) });
        setRecordsStatus("ready");
      })
      .catch((caughtError) => { setRecordsStatus("error"); setError(caughtError instanceof Error ? caughtError.message : "Failed to load."); });
    if (section === "support") loadSupport();
  }, [section, refresh, loadSupport, me?.id, me?.account_type]);

  useEffect(() => { if (reportOpen) reportInputRef.current?.focus(); }, [reportOpen]);

  useEffect(() => {
    const target = window.location.hash.slice(1);
    if (!target || scrolledHash.current === target) return;
    if (section === "support" && target.startsWith("case-")) {
      const targetIndex = cases.findIndex((item) => `case-${item.id}` === target);
      if (targetIndex >= 0) {
        const targetPage = Math.floor(targetIndex / SUPPORT_PAGE_SIZE) + 1;
        if (targetPage !== Math.min(supportPage, Math.max(1, Math.ceil(cases.length / SUPPORT_PAGE_SIZE)))) {
          setSupportPage(targetPage);
          return;
        }
      }
    }
    const element = document.getElementById(target);
    if (element) {
      element.scrollIntoView({ block: "start" }); scrolledHash.current = target;
      if (section === "support" && ["new-request", "request-history"].includes(target)) element.focus({ preventScroll: true });
      if (section === "support" && target.startsWith("case-") && TYPESCRIPT_API) void openCase(target.slice(5));
    }
  }, [section, supportPage, cases, releaseUpdates, recordsStatus, supportStatus]);

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
      setSupportPage(1);
      setNotice("Concern submitted — we'll follow up.");
      setTimeout(() => setNotice(null), 3000);
      loadSupport();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not submit.");
    } finally { setSubmitting(false); }
  }

  function changeSupportPage(page: number) {
    setSupportPage(page);
    setActiveCaseId(null);
    setCaseDetail(null);
    setReplyText("");
    document.getElementById("support-requests-title")?.scrollIntoView({ block: "start" });
  }

  async function openCase(id: string) {
    if (activeCaseId === id) { setActiveCaseId(null); setCaseDetail(null); return; }
    setActiveCaseId(id); setCaseDetail(null); setCaseLoading(true); setError(null);
    try { setCaseDetail(await getSupportCaseDetail(id)); }
    catch (caughtError) { setError(caughtError instanceof Error ? caughtError.message : "Could not load this request."); }
    finally { setCaseLoading(false); }
  }

  async function submitReply(event: React.FormEvent) {
    event.preventDefault();
    if (!activeCaseId || !replyText.trim() || replying) return;
    setReplying(true); setError(null);
    try {
      await replySupportCase(activeCaseId, replyText.trim());
      setReplyText("");
      setCaseDetail(await getSupportCaseDetail(activeCaseId));
      loadSupport();
      setNotice("Reply sent to Customer Service.");
    } catch (caughtError) { setError(caughtError instanceof Error ? caughtError.message : "Could not send your reply."); }
    finally { setReplying(false); }
  }

  async function markRead(id: string) {
    try {
      const updated = await readPortalNotification(id);
      setNotifications((current) => current.map((item) => item.id === id ? updated : item));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not update notification.");
    }
  }

  async function markAllRead() {
    if (markingAllNotifications) return;
    setMarkingAllNotifications(true);
    setNotificationActionError(null);
    try {
      await readAllPortalNotifications();
      const readAt = new Date().toISOString();
      setNotifications((current) => current.map((item) => item.readAt ? item : { ...item, readAt }));
      void getPortalNotifications().then(setNotifications).catch(() => {});
    } catch (caught) {
      setNotificationActionError(caught instanceof Error ? caught.message : "Could not mark notifications as read.");
    } finally { setMarkingAllNotifications(false); }
  }

  function closeNotificationRecord() {
    setSelectedNotificationId(null);
    window.requestAnimationFrame(() => notificationTriggerRef.current?.focus());
  }

  const releaseStatus = summary?.release_status?.toLowerCase().replaceAll("_", " ") ?? "not ready";
  const releaseStatusLabel = recordsStatus === "loading" ? "Checking" : recordsStatus === "error" ? "Unavailable" : releaseStatus;
  const releaseStatusDescription = recordsStatus === "loading" ? "Checking your unit status…" : recordsStatus === "error" ? "Could not load your unit status. Please try again." : null;
  const releaseDetails: Record<string, string> = {
    "not ready": "Your unit is not ready for release yet. We’ll update this status as it progresses.",
    processing: "Your unit is being prepared. Watch this page for the next update.",
    ready: "Your unit is ready. Please coordinate collection details with Fresh Phones PH.",
    released: "Your unit has been marked as released.",
  };

  const featuredInstallment = schedule.find((item) => !["paid", "completed"].includes(item.status.toLowerCase()));
  const supportPageCount = Math.max(1, Math.ceil(cases.length / SUPPORT_PAGE_SIZE));
  const currentSupportPage = Math.min(supportPage, supportPageCount);
  const visibleCases = cases.slice((currentSupportPage - 1) * SUPPORT_PAGE_SIZE, currentSupportPage * SUPPORT_PAGE_SIZE);
  const showMembershipWorkspace = section === "overview" || section === "membership";
  const deviceImage = showMembershipWorkspace && summary?.unit_model ? orderDeviceImage(summary.unit_model) : null;
  const profileName = summary?.full_name ?? me?.full_name ?? "Customer";
  const attentionItems = attentionStatus === "ready" && recordsStatus === "ready"
    ? portalAttention(attentionDocuments, attentionCases, schedule) : [];
  const trackedCases = attentionCases.filter((item) => ["open", "in_progress"].includes(item.status.toLowerCase()));
  const unreadNotifications = notifications.filter((item) => !item.readAt).length;
  const selectedNotification = notifications.find((item) => item.id === selectedNotificationId);
  const notificationPreview = [...notifications]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 3);

  const notificationPanel = (id: string) => <section id={id} className={`${styles.notificationPreview} ${notificationsOpen ? styles.notificationPreviewOpen : ""}`} aria-labelledby={`${id}-title`} aria-hidden={!notificationsOpen} inert={!notificationsOpen}>
    <header className={styles.notificationPreviewHeader}><div><p>Recent activity</p><h2 id={`${id}-title`}>Notifications</h2></div>{unreadNotifications > 0 && <span>{unreadNotifications} new</span>}</header>
    {notificationsStatus === "loading" ? <PortalLoadingRows rows={2} label="Loading notifications" />
      : notificationsStatus === "error" ? <div className={styles.notificationPreviewState}><p>Could not load your updates.</p><button type="button" onClick={() => { setNotificationsStatus("loading"); loadNotifications(); }}>Try again</button></div>
      : notificationPreview.length === 0 ? <p className={styles.notificationPreviewEmpty}>No notifications yet. Updates will appear here.</p>
      : <ul className={styles.notificationPreviewList}>{notificationPreview.map((item) => <li key={item.id} className={item.readAt ? "" : styles.notificationPreviewUnread}>
        <Link href={item.targetPath?.startsWith("/portal/") ? item.targetPath : "/portal/notifications"} onClick={() => { setNotificationsOpen(false); if (!item.readAt) void markRead(item.id); }}>
          <span className={styles.notificationPreviewDot} aria-hidden="true" /><span><strong>{item.title}</strong><span>{item.message}</span><small>{new Date(item.createdAt).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" })}</small></span>
        </Link>
      </li>)}</ul>}
    <Link href="/portal/notifications" className={styles.notificationPreviewMore} onClick={() => setNotificationsOpen(false)}>View more <ArrowRight weight="bold" aria-hidden="true" /></Link>
  </section>;

  if (me?.account_type !== "customer" || recordsStatus === "loading") return <PortalSkeleton section={section} />;

  return (
    <main className={`${styles.shell} portal-shell`}>
      {(menuOpen || moreOpen) && <button type="button" className={styles.menuBackdrop} aria-label="Close navigation" onClick={() => { setMenuOpen(false); setMoreOpen(false); }} />}
      <header className={styles.topbar}>
        <button type="button" className={styles.menuButton} data-customer-tour-tablet="menu" aria-label="Open navigation" aria-controls="customer-sidebar" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}><List weight="bold" aria-hidden="true" /></button>
        <div className={styles.brand}>
          <span className={styles.brandMark}><Image src="/brand/fresh-phones-logo.png" alt="" width={44} height={44} /></span>
          <span><strong>Fresh Phones</strong><small>Customer portal</small></span>
        </div>
        <div className={styles.topbarActions} ref={topbarActionsRef}>
          <div className={styles.searchWrap}>
            <button type="button" className={styles.searchTrigger} data-customer-tour-tablet="search" aria-expanded={searchOpen} aria-controls="customer-page-search" onClick={() => { setSearchOpen((open) => !open); setProfileOpen(false); setNotificationsOpen(false); }}><MagnifyingGlass aria-hidden="true" /><span>Search pages</span><kbd>⌘ K</kbd></button>
            {searchOpen && <div id="customer-page-search" className={styles.searchMenu}>
              <label><MagnifyingGlass aria-hidden="true" /><input ref={searchInputRef} value={pageQuery} onChange={(event) => setPageQuery(event.target.value)} placeholder="Find a customer page" aria-label="Find a customer page" /></label>
              <div>{portalNav.filter((item) => (!('typescriptOnly' in item) || TYPESCRIPT_API) && item.label.toLowerCase().includes(pageQuery.trim().toLowerCase())).map((item) => {
                const Icon = item.icon;
                return <Link key={item.id} href={item.id === "overview" ? "/portal" : `/portal/${item.id}`} onClick={() => setSearchOpen(false)}><Icon aria-hidden="true" />{item.label}</Link>;
              })}</div>
            </div>}
          </div>
          <button type="button" className={`${styles.topbarIcon} ${styles.themeToggle}`} onClick={toggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>{theme === "dark" ? <Sun key="sun" aria-hidden="true" /> : <Moon key="moon" aria-hidden="true" />}</button>
          {TYPESCRIPT_API && <div className={styles.notificationWrap} ref={desktopNotificationsRef}>
            <button ref={desktopNotificationButtonRef} type="button" className={styles.topbarIcon} data-customer-tour-tablet="notifications" aria-label="Preview notifications" aria-expanded={notificationsOpen} aria-controls="customer-notification-preview" onClick={() => { setNotificationsOpen((open) => !open); setSearchOpen(false); setProfileOpen(false); }}><Bell weight={section === "notifications" ? "fill" : "regular"} aria-hidden="true" />{unreadNotifications > 0 && <span className={styles.topbarDot} />}</button>
            {notificationPanel("customer-notification-preview")}
          </div>}
          <div className={styles.profileWrap}>
            <button type="button" className={styles.profileButton} data-customer-tour-tablet="account" aria-expanded={profileOpen} aria-controls="customer-profile-menu" onClick={() => { setProfileOpen((open) => !open); setSearchOpen(false); setNotificationsOpen(false); }}><ProfileAvatar className={styles.accountAvatar} name={profileName} image={me?.image} /><span><strong>{profileName}</strong><small>Customer</small></span><CaretDown aria-hidden="true" /></button>
            {profileOpen && <div id="customer-profile-menu" className={styles.profileMenu}><p><strong>{summary?.full_name ?? me?.full_name ?? "Customer"}</strong><small>{me?.email}</small></p><Link href="/portal/settings" onClick={() => setProfileOpen(false)}><GearSix aria-hidden="true" /> Settings</Link><button type="button" onClick={logout}><SignOut aria-hidden="true" /> Log out</button></div>}
          </div>
        </div>
      </header>
      <aside id="customer-sidebar" className={`${styles.sidebar} ${menuOpen ? styles.sidebarOpen : ""}`} aria-label="Customer navigation">
        <button type="button" className={styles.closeMenu} aria-label="Close menu" onClick={() => setMenuOpen(false)}><X weight="bold" aria-hidden="true" /></button>
        <nav className={styles.sidebarNav} aria-label="Customer sections">
          {["Workspace", "Updates", "Account"].map((group) => <div className={styles.navGroup} key={group} data-customer-tour-desktop={group === "Updates" ? "updates" : undefined}>
            <p className={styles.navLabel}>{group}</p>
            {portalNav.filter((item) => item.group === group && (!('typescriptOnly' in item) || TYPESCRIPT_API)).map((item) => {
              const Icon = item.icon;
              return <Link key={item.id} href={item.id === "overview" ? "/portal" : `/portal/${item.id}`} className={`${styles.navLink} ${section === item.id ? styles.navActive : ""}`} data-customer-tour-desktop={item.id} aria-current={section === item.id ? "page" : undefined} onClick={() => setMenuOpen(false)}><Icon weight={section === item.id ? "fill" : "regular"} aria-hidden="true" /><span>{item.label}</span>{item.id === "notifications" && notifications.some((notification) => !notification.readAt) && <i className={styles.navDot} aria-hidden="true" />}</Link>;
            })}
          </div>)}
        </nav>
        <div className={styles.sidebarFooter}>
          <button type="button" data-customer-tour-replay="desktop" className={styles.tourReplay} onClick={(event) => { setMenuOpen(false); startTour(event); }}><Compass aria-hidden="true" /> Take a quick tour</button>
        </div>
      </aside>
      <div className={`${styles.container} ${section === "membership" || section === "payments" ? styles.membershipWorkspace : ""}`}>

        <div className={styles.intro}>
          <div className={styles.introCopy}>
            {section === "overview" ? <>
              <nav className={styles.eyebrow} aria-label="Breadcrumb"><span aria-current="page">Dashboard</span></nav>
              <h1>Hi, {summary?.full_name?.split(" ")[0] ?? "there"} <span aria-hidden="true">✦</span></h1>
            </> : <>
              <p className={styles.eyebrow}>{sectionCopy[section].eyebrow}</p>
              <h1>{sectionCopy[section].title}</h1>
              <p>{sectionCopy[section].description}</p>
            </>}
          </div>
          {section === "overview" && <span className={styles.liveLabel}><span aria-hidden="true" /> Your records</span>}
          <div className={styles.mobileTopActions}>
            <button type="button" className={`${styles.mobileTopAction} ${styles.themeToggle}`} onClick={toggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>{theme === "dark" ? <Sun key="sun" aria-hidden="true" /> : <Moon key="moon" aria-hidden="true" />}</button>
            {TYPESCRIPT_API && <div className={`${styles.notificationWrap} ${styles.mobileNotificationWrap}`} ref={mobileNotificationsRef}>
              <button ref={mobileNotificationButtonRef} type="button" className={`${styles.mobileTopAction} ${section === "notifications" ? styles.mobileTopActionActive : ""}`} aria-label="Preview notifications" aria-expanded={notificationsOpen} aria-controls="customer-mobile-notification-preview" onClick={() => setNotificationsOpen((open) => !open)}><Bell weight={section === "notifications" ? "fill" : "regular"} aria-hidden="true" />{unreadNotifications > 0 && <span className={styles.mobileUnreadDot} />}</button>
              {notificationPanel("customer-mobile-notification-preview")}
            </div>}
            <button type="button" className={styles.mobileTopAction} aria-label="Open customer menu" aria-controls="customer-sidebar" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}><ProfileAvatar className={styles.mobileAvatar} name={profileName} image={me?.image} /></button>
          </div>
        </div>

        {(error || notice) && <div className={`${styles.message} ${error ? styles.messageError : styles.messageSuccess}`} role={error ? "alert" : "status"}>{error ?? notice}</div>}

        <div className={showMembershipWorkspace ? styles.dashboardLayout : undefined}>
          <div className={showMembershipWorkspace ? styles.dashboardMain : undefined}>
        {showMembershipWorkspace && <section className={`${styles.overview} ${styles.overviewSingle}`} aria-label="Membership overview">
          <div className={`${styles.membership} ${styles.membershipDashboard} ${deviceImage ? styles.membershipWithArt : ""}`}>
            <div className={styles.membershipSky} aria-hidden="true">
              <Image src="/brand/doodles/cloud-soft.png" alt="" width={1024} height={1024} sizes="(max-width: 700px) 120px, 220px" className={`${styles.membershipCloud} ${styles.membershipCloudOne}`} />
              <Image src="/brand/doodles/cloud-round.png" alt="" width={1024} height={1024} sizes="(max-width: 700px) 144px, 210px" className={`${styles.membershipCloud} ${styles.membershipCloudTwo}`} />
              <Image src="/brand/doodles/bird-flight.png" alt="" width={1024} height={1024} sizes="(max-width: 700px) 55px, 86px" className={styles.membershipBird} />
              <Image src="/about/glossy-heart.webp" alt="" width={1248} height={1248} sizes="(max-width: 700px) 28px, 60px" className={styles.membershipHeart} />
              <Image src="/about/glass-bubble.webp" alt="" width={1248} height={1248} sizes="(max-width: 700px) 22px, 38px" className={styles.membershipBubble} />
            </div>
            <div className={styles.membershipTop}>
              <dl className={styles.membershipMobileSummary}>
                <div><dt>Remaining balance</dt><dd>{formatMoney(summary?.remaining_balance)}</dd></div>
                <div><dt>Membership</dt><dd className={styles.membershipMobileStatus}>{summary?.status ?? "—"}</dd></div>
              </dl>
              <span className={styles.heroIcon}><Package weight="duotone" aria-hidden="true" /></span><span className={styles.membershipStatus}>{summary?.status ?? "Loading"}</span>
            </div>
            <div className={styles.membershipCopy}><p>My membership</p><h2>{summary?.unit_model ? displayModelName(summary.unit_model) : "Loading your unit…"}</h2><span className={styles.batch}>Batch {summary?.batch_number ?? "—"}</span></div>
            <div className={styles.membershipMobileFooter}>
              <span className={styles.membershipMobileBatch}>Batch <strong>{summary?.batch_number ?? "—"}</strong></span>
              {section === "overview" && <Link href="/portal/membership" className={styles.membershipDetails}>View details <ArrowRight weight="bold" aria-hidden="true" /></Link>}
            </div>
            {deviceImage && <Image src={deviceImage} alt="" width={1024} height={1536} sizes="(max-width: 700px) 120px, 230px" loading="eager" className={`${styles.deviceArt} ${/ipad/i.test(summary?.unit_model ?? "") ? styles.tabletArt : ""}`} />}
          </div>
        </section>}

        {section === "overview" && TYPESCRIPT_API && <DashboardNextSteps
          items={attentionItems}
          attentionStatus={attentionStatus}
          recordsStatus={recordsStatus}
          support={{ count: trackedCases.length, href: trackedCases.length ? `/portal/support#case-${trackedCases[0].id}` : "/portal/support" }}
          release={{ status: releaseStatusLabel, description: releaseStatusDescription ?? releaseDetails[releaseStatus] ?? "Your unit status will appear here when updated.", updatedAt: releaseUpdates[0] ? new Date(releaseUpdates[0].updated_at).toLocaleString("en-PH") : undefined }}
          installment={{
            amount: recordsStatus === "ready" && featuredInstallment ? formatMoney(Math.max(0, Number(featuredInstallment.expected_amount) - Number(featuredInstallment.paid_applied || 0))) : "—",
            description: recordsStatus === "error" ? "Installment plan unavailable" : featuredInstallment ? `Installment ${featuredInstallment.sequence_no} · ${formatDate(featuredInstallment.due_date)}` : schedule.length ? "All installments marked paid" : "No schedule issued yet",
          }}
          onRetry={refresh}
        />}
        {section === "membership" && summary && <section className={`${styles.sectionCard} ${styles.membershipDatesCard}`} aria-labelledby="membership-dates-title">
          <div className={styles.sectionHeading}><span className={`${styles.sectionIcon} ${styles.scheduleIcon}`}><CalendarBlank weight="duotone" aria-hidden="true" /></span><div><p className={styles.eyebrow}>Membership details</p><h2 id="membership-dates-title">Key dates</h2></div></div>
          <MembershipDatesCalendar summary={summary} schedule={schedule} />
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
          {cases.some((item) => item.description.startsWith("Membership details correction request")) && <div className={styles.correctionHistory}><h3>Correction requests</h3><ul>{cases.filter((item) => item.description.startsWith("Membership details correction request")).map((item) => <li key={item.id}><span>Request #{String(item.id).slice(0, 8)} · {item.status.replaceAll("_", " ")}{item.resolution ? ` · ${item.resolution}` : ""}</span><Link href={`/portal/support#case-${item.id}`}>View request</Link></li>)}</ul></div>}
        </section>}
          </div>
          {showMembershipWorkspace && <PaymentOverview summary={summary} schedule={schedule} payments={payments} hasMorePayments={morePayments} status={recordsStatus} onRetry={loadRecords} />}
        </div>

        {((section === "overview" && !TYPESCRIPT_API) || section === "release") && <section className={styles.releaseCard} aria-labelledby="release-title">
          <span className={styles.releaseIcon}><Truck weight="duotone" aria-hidden="true" /></span>
          <div><p className={styles.eyebrow}>Unit status</p><h2 id="release-title">Release &amp; fulfillment</h2><p>{releaseStatusDescription ?? releaseDetails[releaseStatus] ?? "Your unit status will appear here when updated."}</p>{releaseUpdates[0] && <small>Last release update: {new Date(releaseUpdates[0].updated_at).toLocaleString("en-PH")}</small>}</div>
          <strong className={styles.releaseBadge}>{releaseStatusLabel}</strong>
        </section>}
        {section === "release" && TYPESCRIPT_API && <section className={`${styles.sectionCard} ${styles.releaseUpdatesSection}`} aria-labelledby="release-updates-title"><div className={styles.sectionHeading}><span className={`${styles.sectionIcon} ${styles.scheduleIcon}`}><Truck weight="duotone" aria-hidden="true" /></span><div><p className={styles.eyebrow}>Staff updates</p><h2 id="release-updates-title">Release updates</h2></div></div>
          {releaseUpdatesStatus === "loading" ? <PortalLoadingRows rows={3} label="Checking release updates" /> : releaseUpdatesStatus === "error" ? <div className={styles.attentionState} role="alert"><p>Could not load release updates.</p><button type="button" onClick={loadReleaseUpdates}>Try again</button></div> : releaseUpdates.length === 0 ? <p className={styles.emptyText}>No release milestones have been posted yet. The current status is shown above; Fresh Phones PH will share collection details when available.</p> : <ol className={styles.releaseTimeline}>{releaseUpdates.map((update, index) => <li id={`release-update-${update.id}`} key={update.id}><div><strong>{update.status}</strong><small>{new Date(update.updated_at).toLocaleString("en-PH")}</small></div>{update.note && <p>{update.note}</p>}{update.collection_date && <p><strong>{index === 0 ? "Collection date" : "Earlier collection date"}: {formatDate(update.collection_date)}</strong>{index === 0 ? " · Coordinate collection details with Fresh Phones PH." : " · Check the latest update for current instructions."}</p>}</li>)}</ol>}
        </section>}

        {section === "schedule" && <PaymentScheduleWorkspace schedule={schedule} status={recordsStatus} onRetry={loadRecords} />}

        {section === "overview" && !TYPESCRIPT_API && <section className={styles.nextPayment} aria-labelledby="next-payment-title">
          <span className={styles.nextIcon}><Clock weight="duotone" aria-hidden="true" /></span>
          <div className={styles.nextCopy}><h2 id="next-payment-title">Your installment plan</h2><p>{recordsStatus === "error" ? "Could not load your installment plan." : featuredInstallment ? `Installment ${featuredInstallment.sequence_no} · ${formatDate(featuredInstallment.due_date)}` : schedule.length ? "All installments in this schedule are marked paid." : "Installments will appear here when a schedule is available."}</p></div>
          {recordsStatus === "ready" && featuredInstallment && <strong>{formatMoney(Math.max(0, Number(featuredInstallment.expected_amount) - Number(featuredInstallment.paid_applied || 0)))}</strong>}
        </section>}

        {section === "payments" && <VerifiedPaymentsWorkspace
          summary={summary}
          payments={payments}
          pagination={paymentPagination}
          loading={paymentsLoading}
          status={recordsStatus}
          pendingPayments={pendingPayments}
          pendingStatus={pendingStatus}
          onPageChange={(page) => { setPaymentsLoading(true); setPaymentPage(page); }}
          onRetry={loadRecords}
          onRetryPending={loadPending}
        />}

        {section === "documents" && TYPESCRIPT_API && <section className={`${styles.sectionCard} ${styles.support}`} aria-label="Documents"><DocumentChecklist /></section>}

        {section === "notifications" && TYPESCRIPT_API && <div className={`${styles.notificationWorkspace} ${selectedNotification ? styles.notificationWorkspaceOpen : ""}`}>
          <section className={styles.sectionCard} aria-labelledby="notifications-title">
            <div className={styles.sectionHeading}>
              <span className={`${styles.sectionIcon} ${styles.notificationIcon}`}><Bell weight="duotone" aria-hidden="true" /></span>
              <div><p className={styles.eyebrow}>Updates</p><h2 id="notifications-title">Notifications</h2></div>
              <div className={styles.notificationHeaderActions}>
                {unreadNotifications > 0 && <span className={styles.count}>{unreadNotifications} new</span>}
                <button type="button" disabled={markingAllNotifications} onClick={() => void markAllRead()}>
                  {markingAllNotifications ? "Marking…" : "Mark all read"}
                </button>
              </div>
            </div>
            {notificationActionError && <p className={styles.notificationActionError} role="alert">{notificationActionError}</p>}
            {notificationsStatus === "loading" ? <PortalLoadingRows rows={3} label="Checking your updates" />
              : notificationsStatus === "error" ? <div className={styles.attentionState} role="alert"><p>Could not load notifications.</p><button type="button" onClick={loadNotifications}>Try again</button></div>
              : notifications.length === 0 ? <p className={styles.emptyText}>No updates yet. Payment, release, and support changes will appear here.</p>
              : <ul className={styles.notificationList}>{notifications.map((item) =>
                <li key={item.id} className={`${styles.notificationRow} ${item.readAt ? "" : styles.unread} ${selectedNotificationId === item.id ? styles.notificationSelected : ""}`}>
                  <div className={styles.notificationCopy}>
                    <strong>{item.title}</strong>
                    <p>{item.message}</p>
                    <small>{new Date(item.createdAt).toLocaleString("en-PH")}</small>
                  </div>
                  <div className={styles.notificationActions}>
                    {item.targetPath?.startsWith("/portal/") && <button type="button"
                      aria-controls={selectedNotificationId ? "notification-record-panel" : undefined}
                      aria-expanded={selectedNotificationId === item.id}
                      onClick={(event) => { notificationTriggerRef.current = event.currentTarget; setSelectedNotificationId(item.id); }}>
                      View record <ArrowRight weight="bold" aria-hidden="true" />
                    </button>}
                    {!item.readAt && <button type="button" onClick={() => markRead(item.id)}>Mark read</button>}
                  </div>
                </li>)}</ul>}
          </section>
          <div className={`${styles.notificationPanelSlot} ${selectedNotification ? styles.notificationPanelSlotOpen : ""}`}>
            {selectedNotification && <NotificationRecordPanel key={selectedNotification.id} notification={selectedNotification} summary={summary} schedule={schedule} clientId={me?.client_id} onClose={closeNotificationRecord} />}
          </div>
        </div>}

        {section === "support" && <div className={styles.supportWorkspace}>
          <section id="new-request" tabIndex={-1} className={`${styles.sectionCard} ${styles.supportCompose}`} aria-labelledby="support-compose-title">
            <div className={styles.sectionHeading}><span className={`${styles.sectionIcon} ${styles.supportIcon}`}><ChatCircleText weight="duotone" aria-hidden="true" /></span><div><p className={styles.eyebrow}>Need help?</p><h2 id="support-compose-title">Send a request</h2></div></div>
            <form onSubmit={submitConcern} className={styles.supportForm}>
              <label className={styles.supportField}>Category
                <select value={concern.category} onChange={(event) => setConcern({ ...concern, category: event.target.value })}><option>Payment</option><option>Unit / device</option><option>Account</option><option>Other</option></select>
              </label>
              <label className={styles.supportField}>Describe your concern
                <textarea required minLength={10} maxLength={5000} value={concern.description} onChange={(event) => setConcern({ ...concern, description: event.target.value })} placeholder="Tell us what happened and include any useful details…" />
              </label>
              <div className={styles.supportFormActions}><button type="submit" disabled={submitting}><Plus weight="bold" aria-hidden="true" /> {submitting ? "Sending…" : "Send request"}</button></div>
            </form>
          </section>
          <section id="request-history" tabIndex={-1} className={`${styles.sectionCard} ${styles.supportRequests}`} aria-labelledby="support-requests-title">
            <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Follow up</p><h2 id="support-requests-title">Your requests</h2></div>{supportStatus === "ready" && cases.length > 0 && <span className={styles.count}>{cases.length} {cases.length === 1 ? "request" : "requests"}</span>}</div>
            {supportStatus === "error" ? <div className={styles.attentionState} role="alert"><p>Couldn’t load your support requests.</p><button type="button" onClick={loadSupport}>Try again</button></div>
              : supportStatus === "loading" ? <PortalLoadingRows rows={2} label="Loading support requests" />
              : cases.length === 0 ? <div className={styles.supportEmpty}><span><ChatCircleText weight="duotone" aria-hidden="true" /></span><h3>No requests yet</h3><p>Requests and replies from Customer Service will appear here.</p></div> : <><ul className={styles.supportList}>{visibleCases.map((item) => <li key={item.id} id={`case-${item.id}`}>
              <div className={styles.supportCaseContent}><div className={styles.supportCaseHeader}><div><strong>{item.category}</strong><small>Request #{String(item.id).slice(0, 8)}</small></div><span className={styles.supportCaseStatus}>{item.status.replaceAll("_", " ")}</span></div>
                <span>{item.description}</span>{item.assigned_staff_name && <small>Assigned to {item.assigned_staff_name}</small>}{item.resolution && <small>Resolution: {item.resolution}</small>}
                {item.status.toLowerCase() === "waiting_for_client" && <p className={styles.replyPrompt}>Customer Service is waiting for your reply on this request.</p>}
                {TYPESCRIPT_API && <button type="button" className={styles.caseToggle} aria-controls={`conversation-${item.id}`} aria-expanded={activeCaseId === String(item.id)} onClick={() => void openCase(String(item.id))}>{activeCaseId === String(item.id) ? "Hide conversation" : item.status.toLowerCase() === "waiting_for_client" ? "Reply to this request" : "View conversation"}</button>}
                {activeCaseId === String(item.id) && <div id={`conversation-${item.id}`} className={styles.conversation}>
                  {caseLoading ? <PortalLoadingRows rows={2} label="Loading conversation" /> : caseDetail?.id === item.id ? <>
                    <ol>{caseDetail.messages.map((message) => <li key={message.id} className={message.author_type === "customer" ? styles.customerReply : ""}><strong>{message.author_type === "customer" ? "You" : "Customer Service"}</strong><p>{message.body}</p><small>{new Date(message.created_at).toLocaleString("en-PH")}</small></li>)}</ol>
                    {!(["closed", "resolved"].includes(caseDetail.status.toLowerCase())) && <form onSubmit={submitReply} className={styles.replyForm}><label htmlFor={`reply-${item.id}`}>Your reply</label><textarea id={`reply-${item.id}`} value={replyText} onChange={(event) => setReplyText(event.target.value)} maxLength={5000} required placeholder="Add the details Customer Service needs…" /><button type="submit" disabled={replying || !replyText.trim()}>{replying ? "Sending…" : "Send reply"}</button></form>}
                  </> : <p>Could not load this conversation. Try opening it again.</p>}
                </div>}
              </div>
            </li>)}</ul>
              {supportPageCount > 1 && <nav className={styles.supportPagination} aria-label="Support request pages">
                <span>Showing {(currentSupportPage - 1) * SUPPORT_PAGE_SIZE + 1}–{Math.min(currentSupportPage * SUPPORT_PAGE_SIZE, cases.length)} of {cases.length} requests</span>
                <div>
                  <button type="button" disabled={currentSupportPage === 1} onClick={() => changeSupportPage(currentSupportPage - 1)}>Previous</button>
                  <span aria-live="polite">Page {currentSupportPage} of {supportPageCount}</span>
                  <button type="button" disabled={currentSupportPage === supportPageCount} onClick={() => changeSupportPage(currentSupportPage + 1)}>Next</button>
                </div>
              </nav>}</>}
          </section>
        </div>}

        {section === "settings" && <div className={styles.settingsWorkspace}>
          <section className={styles.sectionCard} aria-labelledby="settings-profile-title">
            <div className={styles.sectionHeading}><span className={`${styles.sectionIcon} ${styles.settingsIcon}`}><UserCircle weight="duotone" aria-hidden="true" /></span><div><p className={styles.eyebrow}>Account</p><h2 id="settings-profile-title">Profile details</h2></div></div>
            <dl className={styles.settingsDetails}>
              <div><dt>Name</dt><dd>{summary?.full_name ?? me?.full_name ?? "—"}</dd></div>
              <div><dt>Email</dt><dd>{me?.email ?? "—"}</dd></div>
            </dl>
            <p className={styles.settingsDescription}>If a detail is incorrect, Customer Service can help review your account record.</p>
            <Link className={styles.settingsLink} href="/portal/support">Contact support <ArrowRight weight="bold" aria-hidden="true" /></Link>
          </section>
          <section className={styles.sectionCard} aria-labelledby="settings-appearance-title">
            <div className={styles.sectionHeading}><span className={`${styles.sectionIcon} ${styles.settingsIcon}`}><Sun weight="duotone" aria-hidden="true" /></span><div><p className={styles.eyebrow}>Display</p><h2 id="settings-appearance-title">Appearance</h2></div></div>
            <p className={styles.settingsDescription}>Choose how the portal looks on this browser.</p>
            <div className={styles.appearanceOptions} role="group" aria-label="Portal appearance">
              <button type="button" aria-pressed={theme === "light"} onClick={(event) => { if (theme !== "light") toggleTheme(event); }}><Sun aria-hidden="true" /><span>Light</span>{theme === "light" && <CheckCircle weight="fill" aria-hidden="true" />}</button>
              <button type="button" aria-pressed={theme === "dark"} onClick={(event) => { if (theme !== "dark") toggleTheme(event); }}><Moon aria-hidden="true" /><span>Dark</span>{theme === "dark" && <CheckCircle weight="fill" aria-hidden="true" />}</button>
            </div>
          </section>
          <CustomerSecuritySettings email={me?.email} onSignOut={logout} />
          <section className={styles.sectionCard} aria-labelledby="settings-privacy-title">
            <div className={styles.sectionHeading}><span className={`${styles.sectionIcon} ${styles.settingsIcon}`}><FileText weight="duotone" aria-hidden="true" /></span><div><p className={styles.eyebrow}>Your information</p><h2 id="settings-privacy-title">Privacy and portal terms</h2></div></div>
            <p className={styles.settingsDescription}>Read the customer notice and portal terms that apply to this workspace.</p>
            <Link className={styles.settingsLink} href="/privacy/customer">Customer Privacy Notice <ArrowRight weight="bold" aria-hidden="true" /></Link>
            <Link className={styles.settingsLink} href="/terms">Portal Terms of Use <ArrowRight weight="bold" aria-hidden="true" /></Link>
          </section>
        </div>}

        {(section === "overview" || section === "schedule" || section === "payments") && <p className={styles.note}><Info weight="fill" aria-hidden="true" /> Payments are coordinated in Messenger. This portal shows Finance-verified records and your derived balance.</p>}
      </div>
      <nav className={styles.mobileBottomNav} aria-label="Mobile customer navigation">
        {mobileNav.map((item) => {
          const Icon = item.icon;
          return <Link key={item.id} href={item.id === "overview" ? "/portal" : `/portal/${item.id}`} className={`${styles.mobileNavItem} ${section === item.id ? styles.mobileNavActive : ""}`} data-customer-tour-mobile={item.id} aria-current={section === item.id ? "page" : undefined}><Icon weight={section === item.id ? "fill" : "regular"} aria-hidden="true" /><span>{item.label}</span></Link>;
        })}
        <button ref={moreTriggerRef} type="button" className={`${styles.mobileNavItem} ${!mobileNav.some((item) => item.id === section) ? styles.mobileNavActive : ""}`} data-customer-tour-mobile="more" aria-label="More customer pages" aria-controls="customer-more-sheet" aria-expanded={moreOpen} onClick={() => setMoreOpen(true)}><SquaresFour weight={!mobileNav.some((item) => item.id === section) ? "fill" : "regular"} aria-hidden="true" /><span>More</span></button>
      </nav>
      {moreOpen && <section ref={moreSheetRef} id="customer-more-sheet" className={styles.moreSheet} role="dialog" aria-modal="true" aria-labelledby="customer-more-title">
        <div className={styles.moreSheetHeader}><div><p>Fresh Phones PH</p><h2 id="customer-more-title">More tools</h2></div><button ref={moreCloseRef} type="button" aria-label="Close more tools" onClick={() => setMoreOpen(false)}><X weight="bold" aria-hidden="true" /></button></div>
        <div className={styles.moreAccount}><ProfileAvatar className={styles.moreAccountAvatar} name={profileName} image={me?.image} /><div><strong>{profileName}</strong><small>{me?.email ?? "Customer account"}</small></div></div>
        <div className={styles.moreTools}>
          {portalNav.filter((item) => moreToolDetails[item.id] && (!('typescriptOnly' in item) || TYPESCRIPT_API)).map((item) => {
            const Icon = item.icon;
            return <Link key={item.id} href={`/portal/${item.id}`} className={styles.moreTool} onClick={() => setMoreOpen(false)}><span className={styles.moreToolIcon}><Icon weight="regular" aria-hidden="true" /></span><span><strong>{item.label}</strong><small>{moreToolDetails[item.id]}</small></span><span className={styles.moreToolArrow} aria-hidden="true">→</span></Link>;
          })}
        </div>
        <button type="button" className={styles.moreTourReplay} onClick={(event) => { setMoreOpen(false); startTour(event); }}><Compass aria-hidden="true" /><span>Take a quick tour</span><span aria-hidden="true">→</span></button>
        <button type="button" className={styles.moreLogout} onClick={logout}><SignOut weight="regular" aria-hidden="true" /><span>Log out</span><span aria-hidden="true">→</span></button>
      </section>}
      {customerTourOverlay}
    </main>
  );
}
