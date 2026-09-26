"use client";

import { useCallback, useEffect, useState } from "react";
import { Headset } from "@phosphor-icons/react";
import {
  listSupportCases,
  updateSupportCase,
  SUPPORT_STATUSES,
  type SupportCase,
} from "@/lib/api";
import { useMe, can } from "@/lib/useMe";

const STATUS_STYLES: Record<string, string> = {
  open: "bg-amber-100 text-amber-700",
  in_progress: "bg-sky-2/70 text-blue-ink",
  waiting_for_client: "bg-violet-100 text-violet-700",
  resolved: "bg-emerald-100 text-emerald-700",
  closed: "bg-ink-soft/15 text-ink-soft",
};

const FILTERS = [["", "All"], ...SUPPORT_STATUSES];

export default function SupportPage() {
  const me = useMe();
  const canManage = can(me, "SUPPORT_MANAGE");
  const [cases, setCases] = useState<SupportCase[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { status: string; resolution: string }>>({});
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCases((await listSupportCases(filter ? { status: filter } : {})).results);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load cases.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveCase(c: SupportCase) {
    setError(null);
    try {
      const draft = drafts[String(c.id)] ?? { status: c.status, resolution: c.resolution };
      await updateSupportCase(c.id, { status: draft.status, resolution: draft.resolution, version: c.version });
      await load();
      setDrafts((current) => { const next = { ...current }; delete next[String(c.id)]; return next; });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed.");
    }
  }

  async function assignToMe(c: SupportCase) {
    if (!me?.id) return;
    setError(null);
    try {
      await updateSupportCase(c.id, { assigned_staff: me.id, version: c.version });
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Assignment failed."); }
  }

  if (me && !canManage) {
    return (
      <section className="glass rounded-3xl p-10 text-center">
        <h1 className="font-display text-xl font-700 text-blue-ink">No access</h1>
        <p className="mt-2 text-sm text-ink-soft">Your role doesn&apos;t handle customer service.</p>
      </section>
    );
  }

  return (
    <>
      <header className="glass mb-4 flex items-center gap-3 rounded-3xl px-5 py-3.5">
        <span className="grid h-10 w-10 place-items-center rounded-2xl chrome">
          <Headset weight="fill" className="h-5 w-5 text-blue" />
        </span>
        <div>
          <h1 className="font-display text-lg font-700 tracking-tight text-blue-ink">
            Customer Service
          </h1>
          <p className="text-xs text-ink-soft">Concerns tracked as cases — not lost in chat</p>
        </div>
      </header>

      {error && (
        <div className="mb-4 rounded-2xl bg-rose-100 px-4 py-2.5 text-sm font-600 text-rose-700">{error}</div>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {FILTERS.map(([v, l]) => (
          <button
            key={v}
            onClick={() => setFilter(v)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-700 transition-colors ${
              filter === v ? "bg-blue text-white" : "bg-white/60 text-ink-soft hover:bg-white"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="glass overflow-x-auto rounded-3xl p-5">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-ink-soft">
            <tr className="border-b border-white/60">
              <th className="px-2 py-2">#</th>
              <th className="px-2 py-2">Client</th>
              <th className="px-2 py-2">Category</th>
              <th className="px-2 py-2">Concern</th>
              <th className="px-2 py-2">Received</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">Assignee</th>
              <th className="px-2 py-2">Resolution</th>
              <th className="px-2 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="px-2 py-6 text-center text-ink-soft">Loading…</td></tr>
            ) : cases.length === 0 ? (
              <tr><td colSpan={9} className="px-2 py-6 text-center text-ink-soft">No cases.</td></tr>
            ) : (
              cases.map((c) => (
                <tr key={c.id} className="border-b border-white/40">
                  <td className="px-2 py-2.5 font-600 text-blue-ink">{c.id}</td>
                  <td className="px-2 py-2.5 font-700 text-blue-ink">{c.client_name}</td>
                  <td className="px-2 py-2.5">{c.category}</td>
                  <td className="px-2 py-2.5 max-w-xs truncate text-ink-soft" title={c.description}>{c.description}</td>
                  <td className="px-2 py-2.5 text-ink-soft">{c.date_received.slice(0, 10)}</td>
                  <td className="px-2 py-2.5">
                    <select
                      value={drafts[String(c.id)]?.status ?? c.status}
                      onChange={(e) => setDrafts((current) => ({ ...current, [String(c.id)]: { status: e.target.value, resolution: current[String(c.id)]?.resolution ?? c.resolution } }))}
                      disabled={c.status === "closed"}
                      className={`rounded-full px-2.5 py-1 text-xs font-700 outline-none ${STATUS_STYLES[c.status] ?? ""}`}
                    >
                      {SUPPORT_STATUSES.map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2.5 text-xs text-ink-soft">{c.assigned_staff_name ?? <button type="button" onClick={() => assignToMe(c)} className="rounded-lg bg-white/80 px-2 py-1 font-700 text-blue">Assign to me</button>}</td>
                  <td className="px-2 py-2.5"><input aria-label={`Resolution for ${c.category}`} value={drafts[String(c.id)]?.resolution ?? c.resolution} onChange={(e) => setDrafts((current) => ({ ...current, [String(c.id)]: { status: current[String(c.id)]?.status ?? c.status, resolution: e.target.value } }))} disabled={c.status === "closed"} className="w-52 rounded-lg border border-white/70 bg-white/80 px-2 py-1 text-xs" placeholder="What was done?" /></td>
                  <td className="px-2 py-2.5"><button type="button" onClick={() => saveCase(c)} disabled={!drafts[String(c.id)] || c.status === "closed"} className="rounded-lg bg-blue px-3 py-1 text-xs font-700 text-white disabled:opacity-40">Save</button></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
