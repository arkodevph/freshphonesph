"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle, MagnifyingGlass, ShieldCheck, XCircle } from "@phosphor-icons/react";
import { verifyAgent, type AgentVerifyResult } from "@/lib/api";

export default function AgentVerification() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<AgentVerifyResult | null>(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search(event: FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setSearched(true);
    try {
      setResult(await verifyAgent(query.trim()));
    } catch {
      setError("Could not check the agent directory. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass rounded-[2rem] p-6 sm:p-7">
      <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl chrome"><ShieldCheck weight="fill" className="h-6 w-6 text-blue" /></span><div><h3 className="font-display text-xl font-700 text-blue-ink">Verify an agent</h3><p className="text-sm text-ink-soft">Search by complete name or Agent ID.</p></div></div>
      <form onSubmit={search} className="mt-5 flex flex-col gap-2 sm:flex-row">
        <input value={query} maxLength={200} disabled={loading} onChange={(event) => { setQuery(event.target.value); setResult(null); setError(null); setSearched(false); }} placeholder="Agent code or complete name" aria-label="Agent code or name" className="w-full rounded-2xl border border-white/70 bg-white/70 px-4 py-3 text-sm text-ink outline-none focus:border-blue focus:bg-white" />
        <button type="submit" disabled={loading || !query.trim()} className="btn-candy inline-flex shrink-0 items-center justify-center gap-1.5 rounded-2xl px-5 py-3 text-sm font-700 disabled:opacity-60"><MagnifyingGlass weight="bold" />{loading ? "Checking…" : "Verify"}</button>
      </form>
      {error && <p role="alert" className="mt-4 rounded-2xl bg-rose-100 p-4 text-sm text-rose-700">{error}</p>}
      {searched && !loading && result && <div className="mt-5" aria-live="polite">{result.found ? <div className="glass-tint flex items-center gap-3 rounded-2xl p-4"><CheckCircle weight="fill" className="h-8 w-8 shrink-0 text-emerald-600"/><div><p className="font-display text-lg font-700 text-blue-ink">{result.full_name}</p><p className="text-xs text-ink-soft">Code {result.agent_code}</p><span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-700 ${result.is_active ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{result.is_active ? "Active agent" : "Inactive"}</span></div></div> : <div className="flex items-center gap-3 rounded-2xl bg-rose-100 p-4 text-rose-700"><XCircle weight="fill" className="h-8 w-8 shrink-0"/><p className="text-sm font-600">No matching agent found. Be cautious and verify before sending money.</p></div>}</div>}
      <p className="mt-4 text-center text-xs text-ink-soft">Only the agent&apos;s name, masked code, and status are shown.</p>
    </div>
  );
}
