"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, FileText, Headset, Receipt } from "@phosphor-icons/react";
import { can, useMe } from "@/lib/useMe";
import { useLiveRecords } from "@/lib/useLiveRecords";
import { getCustomerWork, type CustomerWorkKind, type CustomerWorkPage } from "@/lib/customer-work";
import { TYPESCRIPT_API } from "@/lib/backend";

const sections = {
  support: { title: "Customer concerns", description: "Open or in progress cases", Icon: Headset },
  documents: { title: "Document review", description: "Files submitted to Records", Icon: FileText },
  payments: { title: "Finance checks", description: "Payments awaiting verification", Icon: Receipt },
} as const;

function waitingFor(date: string) {
  const elapsed = Math.max(0, Date.now() - new Date(date).getTime());
  const hours = Math.floor(elapsed / 3600000);
  if (hours < 1) return "Less than 1 hour";
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
}

function WorkSection({ kind, compact }: { kind: CustomerWorkKind; compact: boolean }) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<CustomerWorkPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => {
    setLoading(true);
    void getCustomerWork(kind, page).then((result) => {
      if (page > 1 && result.results.length === 0) { setPage(Math.max(1, Math.ceil(result.count / 20))); return; }
      setData(result); setError(null);
    })
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load this queue."))
      .finally(() => setLoading(false));
  }, [kind, page]);
  useEffect(load, [load]);
  useLiveRecords(load);

  const { title, description, Icon } = sections[kind];
  const items = compact ? data?.results.slice(0, 3) : data?.results;
  return <section id={kind} className="glass rounded-3xl p-4 sm:p-5" aria-label={title}>
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-violet-100 text-violet-700"><Icon weight="duotone" className="h-5 w-5" /></span>
        <div><h3 className="font-display text-base font-700 text-blue-ink">{title}</h3><p className="text-xs text-ink-soft">{description}</p></div>
      </div>
      <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-700 text-violet-700" aria-label={`${data?.count ?? 0} ${title.toLowerCase()} waiting`}>{data?.count ?? "—"}</span>
    </div>
    {error && <p className="mt-4 rounded-xl bg-rose-100 p-3 text-sm text-rose-700" role="alert">{error}</p>}
    {loading && !data ? <p className="mt-4 text-sm text-ink-soft" role="status">Loading queue…</p> : !items?.length && !error ?
      <p className="mt-4 rounded-xl bg-white/60 p-3 text-sm text-ink-soft">Nothing waiting here.</p> :
      <ol className="mt-4 space-y-2">{items?.map((item) => <li key={item.id}>
        <Link href={item.href} className="group flex items-center justify-between gap-3 rounded-xl border border-violet-100 bg-white/75 p-3 transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600">
          <span className="min-w-0"><strong className="block truncate text-sm text-blue-ink">{item.clientName}</strong>
            <span className="block truncate text-xs text-ink-soft">{item.label}{item.customerReplied ? " · Customer replied" : ""}</span></span>
          <span className="flex shrink-0 items-center gap-2 text-xs font-700 text-violet-700"><span>{waitingFor(item.waitingSince)}</span><ArrowUpRight weight="bold" aria-hidden="true" /></span>
        </Link>
      </li>)}</ol>}
    {compact && (data?.count ?? 0) > 3 && <Link href={`/system/customer-work#${kind}`} className="mt-3 inline-flex items-center gap-1 text-xs font-700 text-violet-700 hover:underline">View all {data?.count} <ArrowRight weight="bold" aria-hidden="true" /></Link>}
    {!compact && data && data.count > 20 && <nav className="mt-4 flex items-center justify-between text-xs text-ink-soft" aria-label={`${title} pages`}>
      <button type="button" disabled={page === 1 || loading} onClick={() => setPage((current) => current - 1)} className="rounded-lg bg-white px-3 py-1.5 font-700 text-blue-ink disabled:opacity-40">Previous</button>
      <span>Page {page} of {Math.ceil(data.count / 20)}</span>
      <button type="button" disabled={!data.next || loading} onClick={() => setPage((current) => current + 1)} className="rounded-lg bg-white px-3 py-1.5 font-700 text-blue-ink disabled:opacity-40">Next</button>
    </nav>}
  </section>;
}

export default function CustomerWorkQueues({ compact = false }: { compact?: boolean }) {
  const me = useMe();
  if (!TYPESCRIPT_API || !me) return null;
  const kinds: CustomerWorkKind[] = [
    ...(can(me, "SUPPORT_MANAGE") ? ["support" as const] : []),
    ...(["owner", "records"].includes(me.role ?? "") ? ["documents" as const] : []),
    ...(can(me, "PAYMENT_VERIFY") ? ["payments" as const] : []),
  ];
  if (!kinds.length) return compact ? null : <p className="glass rounded-3xl p-6 text-sm text-ink-soft">Your role has no customer work queues.</p>;
  return <div className="grid gap-4 lg:grid-cols-3">{kinds.map((kind) => <WorkSection key={kind} kind={kind} compact={compact} />)}</div>;
}
