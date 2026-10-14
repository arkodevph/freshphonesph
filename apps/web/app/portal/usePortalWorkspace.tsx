"use client";

import {
  createPortalSupport,
  getCustomerDocuments,
  getPendingCustomerPayments,
  getPortalNotifications,
  getPortalRecords,
  getPortalSupport,
  getReleaseUpdates,
  getSupportCaseDetail,
  readAllPortalNotifications,
  readPortalNotification,
  replySupportCase,
  type DocumentRequirement,
  type Payment,
  type PendingCustomerPayment,
  type PortalNotification,
  type PortalScheduleItem,
  type PortalSummary,
  type ReleaseUpdate,
  type SupportCase,
} from "@/lib/api";
import {
  createSupportConversation,
  type SupportConversationState,
} from "@/lib/support-conversation";
import { logoutSession } from "@/lib/auth";
import { portalAttention } from "@/lib/portal-attention";
import { signInDestination } from "@/lib/support-entry";
import { useLiveRecords } from "@/lib/useLiveRecords";
import { useMe } from "@/lib/useMe";
import { ArrowRight } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { useCustomerPortalTour } from "./CustomerPortalTour";
import {
  orderDeviceImage,
  PortalSection,
  SUPPORT_PAGE_SIZE,
  ViewTransitionDocument,
} from "./portal-view";
import styles from "./portal.module.css";
import { PortalLoadingRows } from "./PortalSkeleton";

export function usePortalWorkspace({ section }: { section: PortalSection }) {
  const router = useRouter();

  const me = useMe();

  const [summary, setSummary] = useState<PortalSummary | null>(null);

  const [schedule, setSchedule] = useState<PortalScheduleItem[]>([]);

  const [payments, setPayments] = useState<Payment[]>([]);

  const [pendingPayments, setPendingPayments] = useState<
    PendingCustomerPayment[]
  >([]);

  const [pendingStatus, setPendingStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");

  const [releaseUpdates, setReleaseUpdates] = useState<ReleaseUpdate[]>([]);

  const [releaseUpdatesStatus, setReleaseUpdatesStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");

  const [paymentPage, setPaymentPage] = useState(1);

  const [supportPage, setSupportPage] = useState(1);

  const [morePayments, setMorePayments] = useState(false);

  const [paymentPagination, setPaymentPagination] = useState({
    count: 0,
    page: 1,
    pageSize: 20,
  });

  const [paymentsLoading, setPaymentsLoading] = useState(false);

  const recordsRequestRef = useRef(0);

  const [cases, setCases] = useState<SupportCase[]>([]);

  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);

  const [caseState, setCaseState] = useState<SupportConversationState>({
    status: "idle",
  });

  const caseDetail = caseState.status === "ready" ? caseState.detail : null;

  const caseLoading = caseState.status === "loading";

  const [replyText, setReplyText] = useState("");

  const [replying, setReplying] = useState(false);

  const [supportStatus, setSupportStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");

  const [attentionDocuments, setAttentionDocuments] = useState<
    DocumentRequirement[]
  >([]);

  const [attentionCases, setAttentionCases] = useState<SupportCase[]>([]);

  const [attentionStatus, setAttentionStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");

  const [recordsStatus, setRecordsStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");

  const [notifications, setNotifications] = useState<PortalNotification[]>([]);

  const [notificationsStatus, setNotificationsStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");

  const [selectedNotificationId, setSelectedNotificationId] = useState<
    string | null
  >(null);

  const [markingAllNotifications, setMarkingAllNotifications] = useState(false);

  const [notificationActionError, setNotificationActionError] = useState<
    string | null
  >(null);

  const [concern, setConcern] = useState({
    category: "Payment",
    description: "",
  });

  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [conversation] = useState(() => {
    return createSupportConversation(getSupportCaseDetail, (state) => {
      setCaseState(state);

      if (state.status === "error") {
        setError(state.message);
      }
    });
  });

  useEffect(() => {
    void conversation.select(null);

    setActiveCaseId(null);

    setReplyText("");

    return () => {
      conversation.cancel();
    };
  }, [conversation, section, me?.id]);

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
    autoStart:
      section !== "support" &&
      recordsStatus === "ready" &&
      me?.account_type === "customer",
    accountId: me?.id,
  });

  useEffect(() => {
    if (me && me.account_type && me.account_type !== "customer") {
      router.replace(
        signInDestination(me, section === "support" ? "/portal/support" : null),
      );
    }
  }, [me, router, section]);

  useEffect(() => {
    setTheme(
      document.documentElement.dataset.systemTheme === "dark"
        ? "dark"
        : "light",
    );

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!topbarActionsRef.current?.contains(event.target as Node)) {
        setSearchOpen(false);

        setProfileOpen(false);
      }

      if (
        !desktopNotificationsRef.current?.contains(event.target as Node) &&
        !mobileNotificationsRef.current?.contains(event.target as Node)
      ) {
        setNotificationsOpen(false);
      }
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSearchOpen(false);

        setProfileOpen(false);

        setNotificationsOpen(false);

        if (desktopNotificationsRef.current?.contains(document.activeElement)) {
          desktopNotificationButtonRef.current?.focus();
        } else if (
          mobileNotificationsRef.current?.contains(document.activeElement)
        ) {
          mobileNotificationButtonRef.current?.focus();
        }
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

  useEffect(() => {
    if (searchOpen) {
      searchInputRef.current?.focus();
    }
  }, [searchOpen]);

  function toggleTheme(event: MouseEvent<HTMLButtonElement>) {
    if (themeTransitioning.current) {
      return;
    }

    const next = theme === "dark" ? "light" : "dark";

    const root = document.documentElement;

    const button = event.currentTarget.getBoundingClientRect();

    const x =
      event.detail === 0 ? button.left + button.width / 2 : event.clientX;

    const y =
      event.detail === 0 ? button.top + button.height / 2 : event.clientY;

    root.style.setProperty("--theme-iris-x", `${x}px`);

    root.style.setProperty("--theme-iris-y", `${y}px`);

    root.style.setProperty(
      "--theme-iris-radius",
      `${Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))}px`,
    );

    const applyTheme = () => {
      root.dataset.systemTheme = next;

      localStorage.setItem("freshphones-system-theme", next);

      setTheme(next);
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      applyTheme();

      return;
    }

    const transition = (
      document as ViewTransitionDocument
    ).startViewTransition?.(applyTheme);

    if (!transition) {
      applyTheme();

      return;
    }

    themeTransitioning.current = true;

    root.classList.add("portal-theme-iris-transition");

    const finishTransition = () => {
      root.classList.remove("portal-theme-iris-transition");

      themeTransitioning.current = false;
    };

    void transition.finished.then(finishTransition, finishTransition);
  }

  useEffect(() => {
    if (!menuOpen && !moreOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);

        setMoreOpen(false);
      }
    };

    const closeOnWideScreen = () => {
      if (window.innerWidth > 900) {
        setMenuOpen(false);
      }

      if (window.innerWidth > 700) {
        setMoreOpen(false);
      }
    };

    document.addEventListener("keydown", closeOnEscape);

    window.addEventListener("resize", closeOnWideScreen);

    return () => {
      document.body.style.overflow = previousOverflow;

      document.removeEventListener("keydown", closeOnEscape);

      window.removeEventListener("resize", closeOnWideScreen);
    };
  }, [menuOpen, moreOpen]);

  useEffect(() => {
    if (!moreOpen) {
      return;
    }

    moreCloseRef.current?.focus();

    const keepFocusInSheet = (event: KeyboardEvent) => {
      if (event.key !== "Tab") {
        return;
      }

      const focusable = moreSheetRef.current?.querySelectorAll<HTMLElement>(
        "a[href], button:not([disabled])",
      );

      if (!focusable?.length) {
        return;
      }

      const first = focusable[0];

      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();

        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();

        first.focus();
      }
    };

    document.addEventListener("keydown", keepFocusInSheet);

    return () => {
      document.removeEventListener("keydown", keepFocusInSheet);

      moreTriggerRef.current?.focus();
    };
  }, [moreOpen]);

  const loadSupport = useCallback(() => {
    void getPortalSupport()
      .then((supportCases) => {
        setCases(supportCases);

        setSupportStatus("ready");
      })
      .catch(() => {
        return setSupportStatus("error");
      });
  }, []);

  const loadNotifications = useCallback(() => {
    void getPortalNotifications()
      .then((items) => {
        setNotifications(items);

        setNotificationsStatus("ready");
      })
      .catch(() => {
        return setNotificationsStatus("error");
      });
  }, []);

  const loadPending = useCallback(() => {
    if (!["payments", "notifications"].includes(section)) {
      return;
    }

    void getPendingCustomerPayments()
      .then((items) => {
        setPendingPayments(items);

        setPendingStatus("ready");
      })
      .catch(() => {
        return setPendingStatus("error");
      });
  }, [section]);

  const loadReleaseUpdates = useCallback(() => {
    if (!me?.client_id || !["overview", "release"].includes(section)) {
      return;
    }

    void getReleaseUpdates(me.client_id)
      .then((updates) => {
        setReleaseUpdates(updates);

        setReleaseUpdatesStatus("ready");
      })
      .catch(() => {
        return setReleaseUpdatesStatus("error");
      });
  }, [me?.client_id, section]);

  const loadAttention = useCallback(() => {
    if (section !== "overview") {
      return;
    }

    void Promise.all([getCustomerDocuments(), getPortalSupport()])
      .then(([documents, supportCases]) => {
        setAttentionDocuments(documents);

        setAttentionCases(supportCases);

        setAttentionStatus("ready");
      })
      .catch(() => {
        return setAttentionStatus("error");
      });
  }, [section]);

  const loadRecords = useCallback(() => {
    const request = ++recordsRequestRef.current;

    setPaymentsLoading(true);

    void getPortalRecords(paymentPage)
      .then(
        ({ client, schedule: plan, balance, payments: verifiedPayments }) => {
          if (request !== recordsRequestRef.current) {
            return;
          }

          const pageSize = verifiedPayments.page_size ?? 20;

          const lastPage = Math.max(
            1,
            Math.ceil(verifiedPayments.count / pageSize),
          );

          if (paymentPage > lastPage) {
            setPaymentPage(lastPage);

            return;
          }

          setSummary({
            full_name: client.name,
            batch_number: client.batch.code,
            unit_model: client.unitModel || client.batch.model,
            status: client.status.toLowerCase(),
            total_due: balance.total_due,
            verified_paid: balance.verified_paid,
            remaining_balance: balance.remaining_balance,
            release_status: client.releaseStatus
              .toLowerCase()
              .replaceAll("_", " "),
            joined_at: client.joinedAt,
            batch_start_date: client.batch.startDate,
            batch_end_date: client.batch.endDate,
          });

          setPayments(verifiedPayments.results);

          setMorePayments(Boolean(verifiedPayments.next));

          setPaymentPagination({
            count: verifiedPayments.count,
            page: verifiedPayments.page ?? paymentPage,
            pageSize,
          });

          setSchedule(
            plan?.items.map((item) => {
              return {
                sequence_no: item.sequenceNo,
                due_date: item.dueDate,
                expected_amount: item.expectedAmount,
                paid_applied: item.paidApplied ?? "0.00",
                status: item.status?.toLowerCase() ?? "upcoming",
              };
            }) ?? [],
          );

          setError(null);

          setRecordsStatus("ready");
        },
      )
      .catch((caughtError) => {
        if (request !== recordsRequestRef.current) {
          return;
        }

        setRecordsStatus("error");

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Could not load membership.",
        );
      })
      .finally(() => {
        if (request === recordsRequestRef.current) {
          setPaymentsLoading(false);
        }
      });
  }, [paymentPage]);

  const refresh = useCallback(() => {
    loadRecords();

    loadAttention();

    loadPending();

    loadReleaseUpdates();

    if (section === "support" || section === "membership") {
      loadSupport();
    }

    if (section === "support") {
      void conversation.reload();
    }

    loadNotifications();
  }, [
    section,
    conversation,
    loadRecords,
    loadAttention,
    loadPending,
    loadReleaseUpdates,
    loadSupport,
    loadNotifications,
  ]);

  useLiveRecords(refresh, me?.account_type === "customer");

  useEffect(() => {
    if (me?.account_type !== "customer") {
      return;
    }

    refresh();
  }, [section, refresh, loadSupport, me?.id, me?.account_type]);

  useEffect(() => {
    if (reportOpen) {
      reportInputRef.current?.focus();
    }
  }, [reportOpen]);

  useEffect(() => {
    const target = window.location.hash.slice(1);

    if (!target || scrolledHash.current === target) {
      return;
    }

    if (section === "support" && target.startsWith("case-")) {
      const targetIndex = cases.findIndex((item) => {
        return `case-${item.id}` === target;
      });

      if (targetIndex >= 0) {
        const targetPage = Math.floor(targetIndex / SUPPORT_PAGE_SIZE) + 1;

        if (
          targetPage !==
          Math.min(
            supportPage,
            Math.max(1, Math.ceil(cases.length / SUPPORT_PAGE_SIZE)),
          )
        ) {
          setSupportPage(targetPage);

          return;
        }
      }
    }

    const element = document.getElementById(target);

    if (element) {
      element.scrollIntoView({ block: "start" });

      scrolledHash.current = target;

      if (
        section === "support" &&
        ["new-request", "request-history"].includes(target)
      ) {
        element.focus({ preventScroll: true });
      }

      if (section === "support" && target.startsWith("case-")) {
        void openCase(target.slice(5));
      }
    }
  }, [
    section,
    supportPage,
    cases,
    releaseUpdates,
    recordsStatus,
    supportStatus,
  ]);

  async function submitMembershipCorrection(event: React.FormEvent) {
    event.preventDefault();

    if (!summary || reportSubmitting) {
      return;
    }

    const request = reportText.trim();

    if (request.length < 10) {
      setReportError(
        "Please describe what needs correcting in at least 10 characters.",
      );

      return;
    }

    setReportSubmitting(true);

    setReportError(null);

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
      setReportError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not send your correction request.",
      );
    } finally {
      setReportSubmitting(false);
    }
  }

  async function logout() {
    try {
      await logoutSession();

      router.replace("/login");
    } catch {
      setError("Could not sign out. Check your connection and try again.");
    }
  }

  async function submitConcern(event: React.FormEvent) {
    event.preventDefault();

    setSubmitting(true);

    setError(null);

    try {
      await createPortalSupport(concern);

      setConcern((current) => {
        return { ...current, description: "" };
      });

      setSupportPage(1);

      setNotice("Concern submitted — we'll follow up.");

      setTimeout(() => {
        return setNotice(null);
      }, 3000);

      loadSupport();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not submit.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function changeSupportPage(page: number) {
    setSupportPage(page);

    setActiveCaseId(null);

    void conversation.select(null);

    setReplyText("");

    document
      .getElementById("support-requests-title")
      ?.scrollIntoView({ block: "start" });
  }

  async function openCase(id: string) {
    const nextId = conversation.selected?.id === id ? null : id;

    setActiveCaseId(nextId);

    setReplyText("");

    setError(null);

    await conversation.select(nextId);
  }

  async function submitReply(event: React.FormEvent) {
    event.preventDefault();

    const selection = conversation.selected;

    if (!selection || !replyText.trim() || replying) {
      return;
    }

    setReplying(true);

    setError(null);

    try {
      await replySupportCase(selection.id, replyText.trim());

      loadSupport();

      if (conversation.selected === selection) {
        setReplyText("");

        await conversation.reload();

        if (conversation.selected === selection) {
          setNotice("Reply sent to Customer Service.");
        }
      }
    } catch (caughtError) {
      if (conversation.selected === selection) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Could not send your reply.",
        );
      }
    } finally {
      setReplying(false);
    }
  }

  async function markRead(id: string) {
    try {
      const updated = await readPortalNotification(id);

      setNotifications((current) => {
        return current.map((item) => {
          return item.id === id ? updated : item;
        });
      });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not update notification.",
      );
    }
  }

  async function markAllRead() {
    if (markingAllNotifications) {
      return;
    }

    setMarkingAllNotifications(true);

    setNotificationActionError(null);

    try {
      await readAllPortalNotifications();

      const readAt = new Date().toISOString();

      setNotifications((current) => {
        return current.map((item) => {
          return item.readAt ? item : { ...item, readAt };
        });
      });

      void getPortalNotifications()
        .then(setNotifications)
        .catch(() => {});
    } catch (caught) {
      setNotificationActionError(
        caught instanceof Error
          ? caught.message
          : "Could not mark notifications as read.",
      );
    } finally {
      setMarkingAllNotifications(false);
    }
  }

  function closeNotificationRecord() {
    setSelectedNotificationId(null);

    window.requestAnimationFrame(() => {
      return notificationTriggerRef.current?.focus();
    });
  }

  const releaseStatus =
    summary?.release_status?.toLowerCase().replaceAll("_", " ") ?? "not ready";

  const releaseStatusLabel =
    recordsStatus === "loading"
      ? "Checking"
      : recordsStatus === "error"
        ? "Unavailable"
        : releaseStatus;

  const releaseStatusDescription =
    recordsStatus === "loading"
      ? "Checking your unit status…"
      : recordsStatus === "error"
        ? "Could not load your unit status. Please try again."
        : null;

  const releaseDetails: Record<string, string> = {
    "not ready":
      "Your unit is not ready for release yet. We’ll update this status as it progresses.",
    processing:
      "Your unit is being prepared. Watch this page for the next update.",
    ready:
      "Your unit is ready. Please coordinate collection details with Fresh Phones PH.",
    released: "Your unit has been marked as released.",
  };

  const featuredInstallment = schedule.find((item) => {
    return !["paid", "completed"].includes(item.status.toLowerCase());
  });

  const supportPageCount = Math.max(
    1,
    Math.ceil(cases.length / SUPPORT_PAGE_SIZE),
  );

  const currentSupportPage = Math.min(supportPage, supportPageCount);

  const visibleCases = cases.slice(
    (currentSupportPage - 1) * SUPPORT_PAGE_SIZE,
    currentSupportPage * SUPPORT_PAGE_SIZE,
  );

  const showMembershipWorkspace =
    section === "overview" || section === "membership";

  const deviceImage =
    showMembershipWorkspace && summary?.unit_model
      ? orderDeviceImage(summary.unit_model)
      : null;

  const profileName = summary?.full_name ?? me?.full_name ?? "Customer";

  const attentionItems =
    attentionStatus === "ready" && recordsStatus === "ready"
      ? portalAttention(attentionDocuments, attentionCases, schedule)
      : [];

  const trackedCases = attentionCases.filter((item) => {
    return ["open", "in_progress"].includes(item.status.toLowerCase());
  });

  const unreadNotifications = notifications.filter((item) => {
    return !item.readAt;
  }).length;

  const selectedNotification = notifications.find((item) => {
    return item.id === selectedNotificationId;
  });

  const notificationPreview = [...notifications]
    .sort((a, b) => {
      return Date.parse(b.createdAt) - Date.parse(a.createdAt);
    })
    .slice(0, 3);

  const notificationPanel = (id: string) => {
    return (
      <section
        id={id}
        className={`${styles.notificationPreview} ${notificationsOpen ? styles.notificationPreviewOpen : ""}`}
        aria-labelledby={`${id}-title`}
        aria-hidden={!notificationsOpen}
        inert={!notificationsOpen}
      >
        <header className={styles.notificationPreviewHeader}>
          <div>
            <p>Recent activity</p>
            <h2 id={`${id}-title`}>Notifications</h2>
          </div>
          {unreadNotifications > 0 && <span>{unreadNotifications} new</span>}
        </header>
        {notificationsStatus === "loading" ? (
          <PortalLoadingRows rows={2} label="Loading notifications" />
        ) : notificationsStatus === "error" ? (
          <div className={styles.notificationPreviewState}>
            <p>Could not load your updates.</p>
            <button
              type="button"
              onClick={() => {
                setNotificationsStatus("loading");

                loadNotifications();
              }}
            >
              Try again
            </button>
          </div>
        ) : notificationPreview.length === 0 ? (
          <p className={styles.notificationPreviewEmpty}>
            No notifications yet. Updates will appear here.
          </p>
        ) : (
          <ul className={styles.notificationPreviewList}>
            {notificationPreview.map((item) => {
              return (
                <li
                  key={item.id}
                  className={
                    item.readAt ? "" : styles.notificationPreviewUnread
                  }
                >
                  <Link
                    href={
                      item.targetPath?.startsWith("/portal/")
                        ? item.targetPath
                        : "/portal/notifications"
                    }
                    onClick={() => {
                      setNotificationsOpen(false);

                      if (!item.readAt) {
                        void markRead(item.id);
                      }
                    }}
                  >
                    <span
                      className={styles.notificationPreviewDot}
                      aria-hidden="true"
                    />
                    <span>
                      <strong>{item.title}</strong>
                      <span>{item.message}</span>
                      <small>
                        {new Date(item.createdAt).toLocaleString("en-PH", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                          timeZone: "Asia/Manila",
                        })}
                      </small>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        <Link
          href="/portal/notifications"
          className={styles.notificationPreviewMore}
          onClick={() => {
            return setNotificationsOpen(false);
          }}
        >
          View more <ArrowRight weight="bold" aria-hidden="true" />
        </Link>
      </section>
    );
  };

  return {
    portalTopbarProps: {
      menuOpen,
      setMenuOpen,
      topbarActionsRef,
      searchOpen,
      setSearchOpen,
      setProfileOpen,
      setNotificationsOpen,
      searchInputRef,
      pageQuery,
      setPageQuery,
      toggleTheme,
      theme,
      desktopNotificationsRef,
      desktopNotificationButtonRef,
      notificationsOpen,
      section,
      unreadNotifications,
      notificationPanel,
      profileOpen,
      profileName,
      me,
      summary,
      logout,
    },
    portalSidebarProps: {
      menuOpen,
      setMenuOpen,
      section,
      notifications,
      startTour,
    },
    membershipOverviewProps: { deviceImage, summary, section },
    membershipDatesPanelProps: {
      summary,
      schedule,
      reportTriggerRef,
      reportOpen,
      reportSubmitting,
      setReportOpen,
      setReportError,
      setReportCaseId,
      submitMembershipCorrection,
      reportInputRef,
      reportText,
      setReportText,
      reportError,
      reportCaseId,
      cases,
    },
    portalNotificationsWorkspaceProps: {
      selectedNotification,
      unreadNotifications,
      markingAllNotifications,
      markAllRead,
      notificationActionError,
      notificationsStatus,
      loadNotifications,
      notifications,
      selectedNotificationId,
      notificationTriggerRef,
      setSelectedNotificationId,
      markRead,
      summary,
      schedule,
      me,
      closeNotificationRecord,
    },
    portalSupportWorkspaceProps: {
      submitConcern,
      concern,
      setConcern,
      submitting,
      supportStatus,
      cases,
      loadSupport,
      visibleCases,
      activeCaseId,
      openCase,
      caseLoading,
      caseDetail,
      submitReply,
      replyText,
      setReplyText,
      replying,
      supportPageCount,
      currentSupportPage,
      changeSupportPage,
    },
    portalSettingsWorkspaceProps: { summary, me, theme, toggleTheme, logout },
    portalMoreSheetProps: {
      moreSheetRef,
      moreCloseRef,
      setMoreOpen,
      profileName,
      me,
      startTour,
      logout,
    },
    me,
    recordsStatus,
    menuOpen,
    moreOpen,
    setMenuOpen,
    setMoreOpen,
    setNotificationsOpen,
    toggleTheme,
    theme,
    notificationsOpen,
    unreadNotifications,
    notificationPanel,
    profileName,
    summary,
    mobileNotificationsRef,
    mobileNotificationButtonRef,
    error,
    notice,
    showMembershipWorkspace,
    attentionItems,
    attentionStatus,
    trackedCases,
    releaseStatusLabel,
    releaseStatusDescription,
    releaseDetails,
    releaseStatus,
    releaseUpdates,
    featuredInstallment,
    schedule,
    refresh,
    payments,
    morePayments,
    loadRecords,
    releaseUpdatesStatus,
    loadReleaseUpdates,
    paymentPagination,
    paymentsLoading,
    pendingPayments,
    pendingStatus,
    setPaymentsLoading,
    setPaymentPage,
    loadPending,
    moreTriggerRef,
    customerTourOverlay,
  };
}
