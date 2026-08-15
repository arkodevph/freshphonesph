"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  SignOut,
  SquaresFour,
  Stack,
  Receipt,
  Users,
  ChartBar,
  Headset,
  Briefcase,
  Bell,
  Sparkle,
  ShieldCheck,
  ListChecks,
} from "@phosphor-icons/react";
import { isAuthed, clearTokens } from "@/lib/auth";
import { useMe, can } from "@/lib/useMe";

const NAV = [
  { icon: SquaresFour, label: "Dashboard", tag: "M7", href: "/system", perms: [] as string[] },
  { icon: Stack, label: "Paluwagan Records", tag: "M3", href: "/system/records", perms: ["BATCH_MANAGE"] },
  { icon: Receipt, label: "Payments & Finance", tag: "M4", href: "/system/payments", perms: ["PAYMENT_RECORD", "PAYMENT_VERIFY"] },
  { icon: Users, label: "Clients", tag: "M3", href: "/system/clients", perms: ["CLIENT_MANAGE"] },
  { icon: ListChecks, label: "Tasks & KPI", tag: "M6", href: "/system/tasks", perms: [] },
  { icon: ChartBar, label: "Reports", tag: "M7", href: null, perms: [] },
  { icon: Headset, label: "Customer Service", tag: "M8", href: "/system/support", perms: ["SUPPORT_MANAGE"] },
  { icon: Briefcase, label: "Recruitment", tag: "M9", href: "/system/recruitment", perms: ["RECRUITMENT_MANAGE", "CLIENT_MANAGE"] },
  { icon: Bell, label: "Notifications", tag: "M10", href: null, perms: [] },
  { icon: Sparkle, label: "AI Assistant", tag: "M11", href: null, perms: [] },
  { icon: ShieldCheck, label: "Users & Roles", tag: "M2", href: "/system/team", perms: ["ROLE_ASSIGN"] },
] as const;

export default function SystemLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const me = useMe();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isAuthed()) router.replace("/login");
    else setReady(true);
  }, [router]);

  // Customers belong in the portal, not the staff system.
  useEffect(() => {
    if (me && me.account_type === "customer") router.replace("/portal");
  }, [me, router]);

  function logout() {
    clearTokens();
    router.replace("/login");
  }

  if (!ready) {
    return (
      <main className="grid min-h-screen place-items-center">
        <p className="text-ink-soft">Checking session…</p>
      </main>
    );
  }

  return (
    <div className="min-h-screen p-3 sm:p-5">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row">
        <aside className="glass flex h-fit flex-col rounded-3xl p-3 lg:w-64 lg:shrink-0">
          <div className="mb-3 flex items-center gap-2.5 px-2 pt-1">
            <span className="grid h-9 w-9 place-items-center overflow-hidden rounded-xl chrome">
              <Image
                src="/brand/fresh-phones-logo.png"
                alt="Fresh Phones PH"
                width={36}
                height={36}
                className="h-8 w-8 scale-150 object-cover"
              />
            </span>
            <span className="font-display text-base font-700 leading-none tracking-tight text-blue-ink">
              Fresh Phones <span className="holo-text">PH</span>
            </span>
          </div>

          <nav className="flex flex-col gap-0.5">
            {NAV.filter((item) => item.perms.length === 0 || can(me, ...item.perms)).map(
              ({ icon: Icon, label, tag, href }) => {
              const active = href && pathname === href;
              const rowClass = `flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-left text-sm font-600 transition-colors ${
                active
                  ? "bg-white/70 text-blue"
                  : href
                    ? "text-ink-soft hover:bg-white/50 hover:text-blue"
                    : "cursor-not-allowed text-ink-soft/50"
              }`;
              const inner = (
                <>
                  <Icon weight={active ? "fill" : "regular"} className="h-5 w-5" />
                  <span className="flex-1">{label}</span>
                  <span className="rounded-full bg-sky-2/70 px-1.5 py-0.5 text-[10px] font-700 text-blue-ink">
                    {tag}
                  </span>
                </>
              );
              return href ? (
                <Link key={label} href={href} className={rowClass}>
                  {inner}
                </Link>
              ) : (
                <span key={label} className={rowClass} title="Coming soon">
                  {inner}
                </span>
              );
            })}
          </nav>

          <button
            onClick={logout}
            className="btn-bubblegum mt-3 inline-flex items-center justify-center gap-1.5 rounded-2xl px-4 py-2.5 text-sm font-700"
          >
            <SignOut weight="fill" className="h-4 w-4" />
            Log out
          </button>
        </aside>

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
