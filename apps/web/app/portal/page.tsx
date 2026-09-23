"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  SignOut,
  Wallet,
  CalendarBlank,
  CheckCircle,
  Package,
  ChatCircleText,
  Plus,
} from "@phosphor-icons/react";
import {
  getPortalSummary,
  getPortalRecords,
  getPortalSchedule,
  getPortalPayments,
  getPortalSupport,
  createPortalSupport,
  type PortalSummary,
  type PortalScheduleItem,
  type Payment,
  type SupportCase,
} from "@/lib/api";
import { isAuthed, logoutSession } from "@/lib/auth";
import { useMe } from "@/lib/useMe";
import { TYPESCRIPT_API } from "@/lib/backend";
import { useLiveRecords } from "@/lib/useLiveRecords";

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
  const [cases, setCases] = useState<SupportCase[]>([]);
  const [concern, setConcern] = useState({ category: "Payment", description: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // guard: must be an authenticated customer
  useEffect(() => {
    if (!isAuthed()) router.replace("/login");
    else if (me && me.account_type && me.account_type !== "customer")
      router.replace("/system");
  }, [me, router]);

  const loadSupport = () => getPortalSupport().then(setCases).catch(() => {});
  const loadRecords = useCallback(() => {
    void getPortalRecords().then(({ client, schedule: plan, balance, payments: verifiedPayments }) => {
      setSummary({ full_name: client.name, batch_number: client.batch.code,
        unit_model: client.unitModel || client.batch.model, status: client.status.toLowerCase(),
        total_due: balance.total_due, verified_paid: balance.verified_paid,
        remaining_balance: balance.remaining_balance,
        release_status: client.releaseStatus.toLowerCase().replaceAll("_", " ") });
      setPayments(verifiedPayments);
      setSchedule(plan?.items.map((item) => ({
        sequence_no: item.sequenceNo, due_date: item.dueDate, expected_amount: item.expectedAmount,
        paid_applied: "", status: "scheduled",
      })) ?? []);
      setError(null);
    }).catch((e) => setError(e instanceof Error ? e.message : "Could not load membership."));
  }, []);
  useLiveRecords(loadRecords, me?.account_type === "customer");

  useEffect(() => {
    if (TYPESCRIPT_API) {
      loadRecords();
      return;
    }
    Promise.all([getPortalSummary(), getPortalSchedule(), getPortalPayments()])
      .then(([s, sch, pay]) => {
        setSummary(s);
        setSchedule(sch);
        setPayments(pay);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load."));
    loadSupport();
  }, [loadRecords]);

  async function logout() {
    try {
      await logoutSession();
      router.replace("/login");
    } catch {
      setError("Could not sign out. Check your connection and try again.");
    }
  }

  async function submitConcern(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await createPortalSupport(concern);
      setConcern((c) => ({ ...c, description: "" }));
      setNotice("Concern submitted — we'll follow up.");
      setTimeout(() => setNotice(null), 3000);
      loadSupport();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit.");
    } finally {
      setSubmitting(false);
    }
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

        {(error || notice) && (
          <div className={`mb-4 rounded-2xl px-4 py-2.5 text-sm font-600 ${error ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
            {error ?? notice}
          </div>
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
            <p className="font-display text-3xl font-800 capitalize text-blue-ink">₱{summary?.verified_paid ?? "…"}</p>
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
              {TYPESCRIPT_API && schedule.length === 0 && <tr><td colSpan={4} className="px-2 py-3 text-ink-soft">Your schedule has not been issued yet. Please contact Records.</td></tr>}
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

        {/* Support */}
        {!TYPESCRIPT_API && <div className="glass mt-4 rounded-3xl p-5">
          <h2 className="mb-3 flex items-center gap-2 font-display font-700 text-blue-ink">
            <ChatCircleText weight="fill" className="h-4 w-4" /> Support
          </h2>
          <form onSubmit={submitConcern} className="mb-4 grid gap-3 sm:grid-cols-[10rem_1fr_auto]">
            <select
              value={concern.category}
              onChange={(e) => setConcern({ ...concern, category: e.target.value })}
              className="rounded-2xl border border-white/70 bg-white/70 px-3 py-2 text-sm text-ink outline-none focus:border-blue"
            >
              <option>Payment</option>
              <option>Unit / device</option>
              <option>Account</option>
              <option>Other</option>
            </select>
            <input
              required
              value={concern.description}
              onChange={(e) => setConcern({ ...concern, description: e.target.value })}
              placeholder="Describe your concern…"
              className="rounded-2xl border border-white/70 bg-white/70 px-3 py-2 text-sm text-ink outline-none focus:border-blue"
            />
            <button type="submit" disabled={submitting} className="btn-candy inline-flex items-center justify-center gap-1.5 rounded-2xl px-4 py-2 text-sm font-700 disabled:opacity-70">
              <Plus weight="bold" className="h-4 w-4" /> {submitting ? "Sending…" : "Submit"}
            </button>
          </form>
          {cases.length === 0 ? (
            <p className="text-center text-sm text-ink-soft">No concerns raised yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {cases.map((c) => (
                <li key={c.id} className="glass-tint flex items-center justify-between gap-3 rounded-2xl px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-700 text-blue-ink">{c.category}</p>
                    <p className="truncate text-xs text-ink-soft">{c.description}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-white/70 px-2.5 py-1 text-xs font-700 capitalize text-blue-ink">
                    {c.status.replace(/_/g, " ")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>}

        <p className="mt-4 text-center text-xs text-ink-soft">
          Payments are coordinated in the Messenger group chat — this portal shows only Finance-verified records and the derived balance.
        </p>
      </div>
    </div>
  );
}
