"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  SignOut,
  Wallet,
  CalendarBlank,
  CheckCircle,
  Package,
} from "@phosphor-icons/react";
import {
  getPortalSummary,
  getPortalSchedule,
  getPortalPayments,
  type PortalSummary,
  type PortalScheduleItem,
  type Payment,
} from "@/lib/api";
import { isAuthed, clearTokens } from "@/lib/auth";
import { useMe } from "@/lib/useMe";

const SCHED_STYLES: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-700",
  partial: "bg-amber-100 text-amber-700",
  overdue: "bg-rose-100 text-rose-700",
  upcoming: "bg-sky-2/70 text-blue-ink",
  due: "bg-sky-2/70 text-blue-ink",
};

export default function PortalPage() {
  const router = useRouter();
  const me = useMe();
  const [summary, setSummary] = useState<PortalSummary | null>(null);
  const [schedule, setSchedule] = useState<PortalScheduleItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState<string | null>(null);

  // guard: must be an authenticated customer
  useEffect(() => {
    if (!isAuthed()) router.replace("/login");
    else if (me && me.account_type && me.account_type !== "customer")
      router.replace("/system");
  }, [me, router]);

  useEffect(() => {
    Promise.all([getPortalSummary(), getPortalSchedule(), getPortalPayments()])
      .then(([s, sch, pay]) => {
        setSummary(s);
        setSchedule(sch);
        setPayments(pay);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load."));
  }, []);

  function logout() {
    clearTokens();
    router.replace("/login");
  }

  return (
    <div className="min-h-screen p-3 sm:p-5">
      <div className="mx-auto max-w-4xl">
        <header className="glass mb-4 flex items-center justify-between rounded-3xl px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-2xl chrome">
              <Image src="/brand/fresh-phones-logo.png" alt="Fresh Phones PH" width={40} height={40} className="h-9 w-9 scale-150 object-cover" />
            </span>
            <div>
              <h1 className="font-display text-base font-700 leading-none tracking-tight text-blue-ink">
                Fresh Phones <span className="holo-text">PH</span>
              </h1>
              <p className="text-xs text-ink-soft">
                {summary ? `Hi, ${summary.full_name}` : "My account"}
              </p>
            </div>
          </div>
          <button onClick={logout} className="btn-bubblegum inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-700">
            <SignOut weight="fill" className="h-4 w-4" /> Log out
          </button>
        </header>

        {error && (
          <div className="mb-4 rounded-2xl bg-rose-100 px-4 py-2.5 text-sm font-600 text-rose-700">{error}</div>
        )}

        {/* Membership + balance */}
        <div className="mb-4 grid gap-4 sm:grid-cols-3">
          <div className="glass rounded-3xl p-5 sm:col-span-1">
            <Package weight="fill" className="mb-2 h-6 w-6 text-blue" />
            <p className="text-xs font-600 text-ink-soft">Membership</p>
            <p className="font-display text-lg font-700 text-blue-ink">{summary?.unit_model ?? "…"}</p>
            <p className="text-sm text-ink-soft">Batch {summary?.batch_number ?? "…"}</p>
            <span className="mt-2 inline-block rounded-full bg-sky-2/70 px-2.5 py-1 text-xs font-700 capitalize text-blue-ink">
              {summary?.status ?? "…"}
            </span>
          </div>
          <div className="glass-tint rounded-3xl p-5">
            <Wallet weight="fill" className="mb-2 h-6 w-6 text-blue" />
            <p className="text-xs font-600 text-ink-soft">Remaining balance</p>
            <p className="font-display text-3xl font-800 text-blue-ink">
              ₱{summary?.remaining_balance ?? "…"}
            </p>
          </div>
          <div className="glass rounded-3xl p-5">
            <CheckCircle weight="fill" className="mb-2 h-6 w-6 text-emerald-600" />
            <p className="text-xs font-600 text-ink-soft">Verified paid</p>
            <p className="font-display text-3xl font-800 text-blue-ink">₱{summary?.verified_paid ?? "…"}</p>
            <p className="text-xs text-ink-soft">of ₱{summary?.total_due ?? "…"} total</p>
          </div>
        </div>

        {/* Schedule */}
        <div className="glass mb-4 overflow-x-auto rounded-3xl p-5">
          <h2 className="mb-3 flex items-center gap-2 font-display font-700 text-blue-ink">
            <CalendarBlank weight="fill" className="h-4 w-4" /> Payment schedule
          </h2>
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-ink-soft">
              <tr className="border-b border-white/60">
                <th className="px-2 py-2">#</th>
                <th className="px-2 py-2">Due date</th>
                <th className="px-2 py-2">Amount</th>
                <th className="px-2 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map((s) => (
                <tr key={s.sequence_no} className="border-b border-white/40">
                  <td className="px-2 py-2.5 font-600 text-blue-ink">{s.sequence_no}</td>
                  <td className="px-2 py-2.5 text-ink-soft">{s.due_date}</td>
                  <td className="px-2 py-2.5 font-700 text-blue-ink">₱{s.expected_amount}</td>
                  <td className="px-2 py-2.5">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-700 capitalize ${SCHED_STYLES[s.status] ?? ""}`}>
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Verified payments */}
        <div className="glass overflow-x-auto rounded-3xl p-5">
          <h2 className="mb-3 flex items-center gap-2 font-display font-700 text-blue-ink">
            <CheckCircle weight="fill" className="h-4 w-4" /> Verified payments
          </h2>
          {payments.length === 0 ? (
            <p className="py-3 text-center text-sm text-ink-soft">No verified payments yet.</p>
          ) : (
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-ink-soft">
                <tr className="border-b border-white/60">
                  <th className="px-2 py-2">Date</th>
                  <th className="px-2 py-2">Amount</th>
                  <th className="px-2 py-2">Method</th>
                  <th className="px-2 py-2">Reference</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-white/40">
                    <td className="px-2 py-2.5 text-ink-soft">{p.payment_date}</td>
                    <td className="px-2 py-2.5 font-700 text-blue-ink">₱{p.amount}</td>
                    <td className="px-2 py-2.5 capitalize">{p.method}</td>
                    <td className="px-2 py-2.5 text-ink-soft">{p.reference_no || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-ink-soft">
          Payments are coordinated in the Messenger group chat — this portal shows your verified
          records &amp; balance.
        </p>
      </div>
    </div>
  );
}
