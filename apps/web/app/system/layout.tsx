"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Bell,
  Briefcase,
  CaretDown,
  ChartBar,
  Headset,
  ListChecks,
  MagnifyingGlass,
  Moon,
  Receipt,
  ShieldCheck,
  SignOut,
  Sparkle,
  SquaresFour,
  Stack,
  Sun,
  TrayArrowDown,
  Users,
} from "@phosphor-icons/react";
import { logoutSession, isAuthed } from "@/lib/auth";
import { listNotifications, readAllNotifications, readNotification, type NotificationRecord } from "@/lib/api";
import { availableRoute, TYPESCRIPT_API } from "@/lib/backend";
import { can, useMe } from "@/lib/useMe";

const NAV = [
  { icon: SquaresFour, label: "Dashboard", href: "/system", perms: [] as string[] },
  { icon: Stack, label: "Paluwagan Records", href: "/system/records", perms: ["BATCH_MANAGE", "BATCH_READ"] },
  { icon: Receipt, label: "Payments & Finance", href: "/system/payments", perms: ["PAYMENT_READ", "PAYMENT_RECORD", "PAYMENT_VERIFY"] },
  { icon: Users, label: "Clients", href: "/system/clients", perms: ["CLIENT_MANAGE", "CLIENT_READ"] },
  { icon: ListChecks, label: "Tasks & KPI", href: "/system/tasks", perms: ["TASK_READ"] },
  { icon: ChartBar, label: "Reports", href: "/system/reports", perms: ["REPORT_VIEW"] },
  { icon: Headset, label: "Customer Service", href: "/system/support", perms: ["SUPPORT_MANAGE"] },
  { icon: TrayArrowDown, label: "Customer work", href: "/system/customer-work", perms: ["SUPPORT_MANAGE", "PAYMENT_VERIFY", "CLIENT_MANAGE"] },
  { icon: Briefcase, label: "Recruitment", href: "/system/recruitment", perms: ["RECRUITMENT_MANAGE", "AGENT_MANAGE"] },
  { icon: Bell, label: "Notification settings", href: TYPESCRIPT_API ? "/system/notification-settings" : null, perms: ["ACCOUNT_MANAGE"] },
  { icon: Sparkle, label: "AI Assistant", href: null, perms: [] },
  { icon: ShieldCheck, label: "User Management", href: "/system/team", perms: ["ROLE_ASSIGN", "ACCOUNT_MANAGE"] },
] as const;

const formatRole = (role?: string | null) =>
  role ? role.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Staff";

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => { finished: Promise<void> };
};

export default function SystemLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const me = useMe();
  const [ready, setReady] = useState(false);
  const [openPanel, setOpenPanel] = useState<"search" | "notifications" | "profile" | null>(null);
  const [query, setQuery] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [unread, setUnread] = useState(0);
  const actionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAuthed()) router.replace("/login");
    else setReady(true);
  }, [router]);

  useEffect(() => {
    if (me?.account_type === "customer") router.replace("/portal");
  }, [me, router]);

  useEffect(() => {
    setTheme(document.documentElement.dataset.systemTheme === "dark" ? "dark" : "light");
  }, []);

  useEffect(() => {
    if (!TYPESCRIPT_API || !me || !can(me, "NOTIFICATION_READ")) return;
    const load = () => listNotifications().then((page) => {
      setNotifications(page.items); setUnread(page.unread);
    }).catch(() => undefined);
    void load();
    const timer = window.setInterval(load, 30_000);
    return () => window.clearInterval(timer);
  }, [me]);

  async function openNotification(item: NotificationRecord) {
    if (!item.readAt) {
      await readNotification(item.id);
      setNotifications((items) => items.map((candidate) => candidate.id === item.id ? { ...candidate, readAt: new Date().toISOString() } : candidate));
      setUnread((value) => Math.max(0, value - 1));
    }
    setOpenPanel(null);
    if (item.link) router.push(item.link);
  }

  async function markAllRead() {
    await readAllNotifications();
    setNotifications((items) => items.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })));
    setUnread(0);
  }

  useEffect(() => {
    function closeOnOutsideClick(event: PointerEvent) {
      if (!actionsRef.current?.contains(event.target as Node)) setOpenPanel(null);
    }
    function handleKeyboard(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenPanel(null);
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpenPanel("search");
      }
    }
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", handleKeyboard);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", handleKeyboard);
    };
  }, []);

  async function logout() {
    try {
      await logoutSession();
      router.replace("/login");
    } catch {
      window.alert("Could not sign out. Check your connection and try again.");
    }
  }

  function toggleTheme(event: MouseEvent<HTMLButtonElement>) {
    const nextTheme = theme === "dark" ? "light" : "dark";
    const root = document.documentElement;
    const radius = Math.hypot(
      Math.max(event.clientX, window.innerWidth - event.clientX),
      Math.max(event.clientY, window.innerHeight - event.clientY),
    );
    root.style.setProperty("--theme-iris-x", `${event.clientX}px`);
    root.style.setProperty("--theme-iris-y", `${event.clientY}px`);
    root.style.setProperty("--theme-iris-radius", `${radius}px`);

    const applyTheme = () => {
      root.dataset.systemTheme = nextTheme;
      localStorage.setItem("freshphones-system-theme", nextTheme);
      setTheme(nextTheme);
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      applyTheme();
      return;
    }
    const transition = (document as ViewTransitionDocument).startViewTransition?.(applyTheme);
    if (!transition) {
      applyTheme();
      return;
    }
    root.classList.add("system-theme-iris-transition");
    void transition.finished.finally(() => root.classList.remove("system-theme-iris-transition"));
  }

  if (!ready || (TYPESCRIPT_API && !me)) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f4f5f7]">
        <p className="text-sm font-600 text-[#70727a]">Checking session…</p>
      </main>
    );
  }

  const visibleNav = NAV.filter((item) =>
    (!TYPESCRIPT_API || (item.href && availableRoute(item.href))) &&
    (item.href !== "/system/customer-work" || can(me, "SUPPORT_MANAGE", "PAYMENT_VERIFY") || me?.role === "owner" || me?.role === "records") &&
    (item.perms.length === 0 || can(me, ...item.perms)));
  const current = visibleNav.find((item) => item.href === pathname)?.label ?? "Workspace";
  const searchResults = visibleNav.filter(
    (item) => item.href && item.label.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const initials = (me?.full_name ?? "Fresh Phones")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="system-shell">
      <aside className="system-sidebar">
        <Link href="/system" className="system-brand" aria-label="Fresh Phones PH dashboard">
          <span className="system-brand-mark">
            <Image
              src="/brand/fresh-phones-logo.png"
              alt=""
              width={38}
              height={38}
              className="h-9 w-9 scale-150 object-cover"
            />
          </span>
          <span>
            <strong>Fresh Phones</strong>
            <small>Operations</small>
          </span>
        </Link>

        <div className="system-workspace-label">Workspace</div>
        <nav className="system-nav" aria-label="System navigation">
          {visibleNav.map(({ icon: Icon, label, href }) => {
            const active = href === pathname;
            const content = (
              <>
                <Icon weight={active ? "fill" : "regular"} className="h-[18px] w-[18px]" />
                <span>{label}</span>
                {!href && <span className="system-soon">Soon</span>}
              </>
            );

            return href ? (
              <Link key={label} href={href} className={`system-nav-item${active ? " is-active" : ""}`}>
                {content}
              </Link>
            ) : (
              <span key={label} className="system-nav-item is-disabled" title="Coming soon">
                {content}
              </span>
            );
          })}
        </nav>

        <div className="system-sidebar-footer">
          <div className="system-profile">
            <span className="system-avatar">{initials}</span>
            <span className="min-w-0 flex-1">
              <strong className="block truncate">{me?.full_name ?? "Loading profile"}</strong>
              <small className="block truncate">{formatRole(me?.role)}</small>
            </span>
            <button onClick={logout} className="system-icon-button" aria-label="Log out" title="Log out">
              <SignOut className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
      </aside>

      <section className="system-main">
        <header className="system-topbar">
          <div>
            <p className="system-eyebrow">Fresh Phones PH</p>
            <h1>{current}</h1>
          </div>
          <div className="system-topbar-actions" ref={actionsRef}>
            <div className="system-search-wrap">
              <button className="system-search" type="button" aria-expanded={openPanel === "search"} aria-controls="workspace-search-panel" onClick={() => setOpenPanel(openPanel === "search" ? null : "search")}>
                <MagnifyingGlass className="h-4 w-4" /><span>Search workspace</span><kbd>⌘ K</kbd>
              </button>
              {openPanel === "search" && (
                <section id="workspace-search-panel" className="system-popover system-search-popover" aria-label="Workspace search">
                  <div className="system-popover-search"><MagnifyingGlass className="h-4 w-4" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search accessible pages" aria-label="Search accessible pages" /></div>
                  <div className="system-search-results">
                    {searchResults.length ? searchResults.map(({ icon: Icon, label, href }) => (
                      <Link key={label} href={href!} onClick={() => setOpenPanel(null)}><Icon className="h-[18px] w-[18px]" /><span>{label}</span><span>Open</span></Link>
                    )) : <p>No accessible pages match “{query}”.</p>}
                  </div>
                </section>
              )}
            </div>
            <button className="system-icon-button" type="button" onClick={toggleTheme} title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
              {theme === "dark" ? <Sun className="h-[19px] w-[19px]" /> : <Moon className="h-[19px] w-[19px]" />}
            </button>
            <div className="system-popover-anchor">
              <button className="system-icon-button system-notification-button" aria-label={`${unread} unread notifications`} aria-expanded={openPanel === "notifications"} aria-controls="notifications-panel" onClick={() => setOpenPanel(openPanel === "notifications" ? null : "notifications")}><Bell className="h-[19px] w-[19px]" />{unread > 0 && <span>{unread > 9 ? "9+" : unread}</span>}</button>
              {openPanel === "notifications" && (
                <section id="notifications-panel" className="system-popover system-notifications-popover" aria-label="Notifications">
                  <div className="system-popover-heading"><strong>Notifications</strong>{unread > 0 ? <button type="button" onClick={markAllRead}>Mark all read</button> : <small>All read</small>}</div>
                  {notifications.length ? <div className="system-notification-list">{notifications.slice(0, 8).map((item) => (
                    <button key={item.id} type="button" className={item.readAt ? "" : "is-unread"} onClick={() => openNotification(item)}>
                      <span aria-hidden="true" /><div><strong>{item.title}</strong><p>{item.body}</p><time>{new Date(item.createdAt).toLocaleString()}</time></div>
                    </button>
                  ))}</div> : <div className="system-notification-empty"><span><Bell weight="fill" /></span><strong>You&apos;re all caught up</strong><p>No new staff notifications.</p></div>}
                </section>
              )}
            </div>
            <div className="system-popover-anchor">
              <button className="system-top-profile system-profile-button" type="button" aria-expanded={openPanel === "profile"} aria-controls="profile-panel" onClick={() => setOpenPanel(openPanel === "profile" ? null : "profile")}>
                <span className="system-avatar">{initials}</span><span className="hidden min-w-0 sm:block"><strong className="block max-w-36 truncate">{me?.full_name ?? "Staff"}</strong><small>{formatRole(me?.role)}</small></span><CaretDown className="hidden h-3.5 w-3.5 sm:block" />
              </button>
              {openPanel === "profile" && (
                <section id="profile-panel" className="system-popover system-profile-popover" aria-label="Account menu">
                  <div className="system-profile-summary"><span className="system-avatar">{initials}</span><div><strong>{me?.full_name ?? "Staff"}</strong><small>{me?.email}</small></div></div>
                  <div className="system-profile-role"><span>Access level</span><strong>{formatRole(me?.role)}</strong></div>
                  <button type="button" onClick={logout}><SignOut /> Log out</button>
                </section>
              )}
            </div>
          </div>
        </header>

        <main className="system-content">{availableRoute(pathname) ? children : (
          <section className="glass rounded-3xl p-10 text-center">
            <h1 className="font-display text-xl font-700 text-blue-ink">This section is not available yet.</h1>
            <Link href="/system" className="mt-3 inline-block text-blue">Return to dashboard</Link>
          </section>
        )}</main>
      </section>
    </div>
  );
}
