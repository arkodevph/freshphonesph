"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, MagnifyingGlass, CheckCircle, XCircle } from "@phosphor-icons/react";
import { verifyAgent, type AgentVerifyResult } from "@/lib/api";

export default function VerifyAgentPage() {
  const [q, setQ] = useState("");
  const [result, setResult] = useState<AgentVerifyResult | null>(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setSearched(true);
    try {
      setResult(await verifyAgent(q.trim()));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not check the agent directory. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <Link href="/" className="mb-6 inline-flex items-center gap-1.5 text-sm font-600 text-ink-soft hover:text-blue">
        <ArrowLeft className="h-4 w-4" /> Back to site
      </Link>

      <div className="glass rounded-blob p-8">
        <div className="mb-4 flex flex-col items-center text-center">
          <span className="mb-3 grid h-14 w-14 place-items-center rounded-2xl chrome">
            <ShieldCheck weight="fill" className="h-7 w-7 text-blue" />
          </span>
          <h1 className="font-display text-2xl font-800 tracking-tight text-blue-ink">Verify an agent</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Confirm a Fresh Phones PH agent by their code or complete name before transacting.
          </p>
        </div>

        <form onSubmit={search} className="flex gap-2">
          <input
            value={q}
            maxLength={200}
            disabled={loading}
            aria-label="Agent code or name"
            onChange={(e) => { setQ(e.target.value); setResult(null); setError(null); setSearched(false); }}
            placeholder="Agent code or complete name"
            className="w-full rounded-2xl border border-white/70 bg-white/70 px-4 py-3 text-sm text-ink outline-none focus:border-blue focus:bg-white"
          />
          <button type="submit" disabled={loading || !q.trim()} className="btn-candy inline-flex shrink-0 items-center gap-1.5 rounded-2xl px-4 py-3 text-sm font-700 disabled:opacity-60">
            <MagnifyingGlass weight="bold" className="h-4 w-4" /> {loading ? "Checking…" : "Verify"}
          </button>
        </form>
        {error && <p role="alert" className="mt-4 rounded-2xl bg-rose-100 p-4 text-sm text-rose-700">{error}</p>}

        {searched && !loading && result && (
          <div className="mt-5" aria-live="polite">
            {result.found ? (
              <div className="glass-tint flex items-center gap-3 rounded-2xl p-4">
                <CheckCircle weight="fill" className="h-8 w-8 shrink-0 text-emerald-600" />
                <div>
                  <p className="font-display text-lg font-700 text-blue-ink">{result.full_name}</p>
                  <p className="text-xs text-ink-soft">Code {result.agent_code}</p>
                  <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-700 ${result.is_active ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                    {result.is_active ? "Active agent" : "Inactive"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-2xl bg-rose-100 p-4 text-rose-700">
                <XCircle weight="fill" className="h-8 w-8 shrink-0" />
                <p className="text-sm font-600">
                  No matching agent found. Be cautious — verify before sending money.
                </p>
              </div>
            )}
          </div>
        )}

        <p className="mt-4 text-center text-xs text-ink-soft">
          For your privacy, only the agent&apos;s name, a masked code, and status are shown.
        </p>
      </div>
    </main>
  );
}
