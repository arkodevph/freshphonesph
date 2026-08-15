"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  SignOut,
  SquaresFour,
  Users,
  Stack,
  Receipt,
  ChartBar,
  Headset,
  Briefcase,
  Bell,
  Sparkle,
} from "@phosphor-icons/react";
import { isAuthed, clearTokens } from "@/lib/auth";

const MODULES = [
  { icon: SquaresFour, label: "Dashboard", tag: "M7" },
  { icon: Stack, label: "Paluwagan Records", tag: "M3" },
  { icon: Receipt, label: "Payments & Finance", tag: "M4" },
  { icon: Users, label: "Clients", tag: "M3" },
  { icon: ChartBar, label: "Reports", tag: "M7" },
  { icon: Headset, label: "Customer Service", tag: "M8" },
  { icon: Briefcase, label: "Recruitment", tag: "M9" },
  { icon: Bell, label: "Notifications", tag: "M10" },
  { icon: Sparkle, label: "AI Assistant", tag: "M11" },
];

export default function SystemPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isAuthed()) {
      router.replace("/login");
    } else {
      setReady(true);
    }
  }, [router]);

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
        {/* Sidebar */}
        <aside className="glass h-fit rounded-3xl p-3 lg:w-64 lg:shrink-0">
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
            {MODULES.map(({ icon: Icon, label, tag }, i) => (
              <button
                key={label}
                className={`flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-left text-sm font-600 transition-colors ${
                  i === 0
                    ? "bg-white/70 text-blue"
                    : "text-ink-soft hover:bg-white/50 hover:text-blue"
                }`}
              >
                <Icon weight={i === 0 ? "fill" : "regular"} className="h-5 w-5" />
                <span className="flex-1">{label}</span>
                <span className="rounded-full bg-sky-2/70 px-1.5 py-0.5 text-[10px] font-700 text-blue-ink">
                  {tag}
                </span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Main */}
        <div className="flex-1">
          <header className="glass mb-4 flex items-center justify-between rounded-3xl px-5 py-3.5">
            <div>
              <h1 className="font-display text-lg font-700 tracking-tight text-blue-ink">
                System Dashboard
              </h1>
              <p className="text-xs text-ink-soft">Session active</p>
            </div>
            <button
              onClick={logout}
              className="btn-bubblegum inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-700"
            >
              <SignOut weight="fill" className="h-4 w-4" />
              Log out
            </button>
          </header>

          <section className="glass rounded-3xl p-6 sm:p-10">
            <div className="flex flex-col items-center text-center">
              <span className="mb-4 grid h-16 w-16 place-items-center rounded-2xl chrome">
                <SquaresFour weight="fill" className="h-8 w-8 text-blue" />
              </span>
              <h2 className="font-display text-2xl font-700 tracking-tight text-blue-ink">
                Welcome to the Fresh Phones PH system
              </h2>
              <p className="mt-2 max-w-lg text-sm text-ink-soft">
                You&apos;re signed in. This is the foundation shell — the module
                screens (Paluwagan records, payment recording &amp; Finance
                verification, reporting, and more) plug in here as each is built.
              </p>
              <div className="mt-6 grid w-full max-w-2xl grid-cols-2 gap-3 sm:grid-cols-3">
                {MODULES.slice(1, 7).map(({ icon: Icon, label, tag }) => (
                  <div
                    key={label}
                    className="glass-tint flex flex-col items-start gap-2 rounded-2xl p-4 text-left"
                  >
                    <Icon weight="fill" className="h-6 w-6 text-blue" />
                    <span className="text-sm font-700 text-blue-ink">
                      {label}
                    </span>
                    <span className="pill rounded-full px-2 py-0.5 text-[10px] font-700 text-ink-soft">
                      {tag} · coming soon
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
