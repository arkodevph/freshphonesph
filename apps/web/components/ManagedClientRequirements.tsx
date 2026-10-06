"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle, UploadSimple, WarningCircle, GearSix } from '@phosphor-icons/react';
import { createRequirementType, listRequirementTypes, listClientRequirements, uploadClientDocument, reviewClientRequirement, getDocumentUrl,
  type ClientRecord, type ClientRequirement, type RequirementType } from '@/lib/api';

export function RequirementsManager() {
  const [types, setTypes] = useState<RequirementType[]>([]);
  const [form, setForm] = useState({ code: '', label: '', description: '', customerCanUpload: true });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    void listRequirementTypes().then(items => { if (alive.current) setTypes(items); })
      .catch(error => { if (alive.current) setError(error instanceof Error ? error.message : 'Could not load requirement types.'); });
    return () => { alive.current = false; };
  }, []);
  async function add(event: React.FormEvent) {
    event.preventDefault(); if (saving) return;
    setSaving(true); setError(null);
    try {
      const created = await createRequirementType({ ...form, allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'], maxBytes: 5 * 1024 * 1024, active: true });
      if (!alive.current) return;
      setTypes(current => [...current, created].sort((a, b) => a.label.localeCompare(b.label)));
      setForm({ code: '', label: '', description: '', customerCanUpload: true });
    } catch (error) { if (alive.current) setError(error instanceof Error ? error.message : 'Could not create requirement.'); }
    finally { if (alive.current) setSaving(false); }
  }
  return <section className="glass mb-4 rounded-3xl p-5">
    <h2 className="mb-2 flex items-center gap-2 font-display font-700 text-blue-ink"><GearSix /> Requirement checklist</h2>
    <p className="mb-3 text-xs text-ink-soft">Configure approved document types. Existing client documents remain available in Documents.</p>
    {error && <p role="alert" className="mb-3 text-sm text-rose-700">{error}</p>}
    <form onSubmit={add}><fieldset disabled={saving} className="grid min-w-0 gap-3 md:grid-cols-3">
      <input required aria-label="Requirement code" className={inputCls} value={form.code} maxLength={40} onChange={event => setForm({ ...form, code: event.target.value })} placeholder="Requirement code" />
      <input required aria-label="Requirement label" className={inputCls} value={form.label} maxLength={120} onChange={event => setForm({ ...form, label: event.target.value })} placeholder="Requirement label" />
      <input aria-label="Requirement instructions" className={inputCls} value={form.description} maxLength={500} onChange={event => setForm({ ...form, description: event.target.value })} placeholder="What the customer should provide" />
      <label className="flex items-center gap-2 text-xs text-ink-soft md:col-span-3"><input type="checkbox" checked={form.customerCanUpload} onChange={event => setForm({ ...form, customerCanUpload: event.target.checked })} /> Customer may upload and resubmit this document</label>
      <button type="submit" className="btn-candy rounded-xl px-3 py-2 text-xs font-700">{saving ? 'Adding…' : 'Add requirement'}</button>
    </fieldset></form>
    <div className="mt-3 flex flex-wrap gap-2">{types.map(type => <span key={type.id} className="rounded-full bg-sky-2/70 px-3 py-1 text-xs text-blue-ink">{type.label}{type.active ? '' : ' (inactive)'}</span>)}</div>
  </section>;
}

export function ManagedClientRequirements({ client, canReview, canUpload, onClose, onError, onNotice }: {
  client: ClientRecord; canReview: boolean; canUpload: boolean; onClose: () => void;
  onError: (message: string) => void; onNotice: (message: string) => void;
}) {
  const [requirements, setRequirements] = useState<ClientRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const sequence = useRef(0);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; ++sequence.current; }; }, []);
  const load = useCallback(() => {
    const current = ++sequence.current; setLoading(true);
    return listClientRequirements(client.id).then(items => { if (current === sequence.current) setRequirements(items); })
      .catch(error => { if (current === sequence.current) { setRequirements([]); onError(error instanceof Error ? error.message : "Could not load requirements."); } })
      .finally(() => { if (current === sequence.current) setLoading(false); });
  }, [client.id]);
  useEffect(() => { void load(); }, [load]);

  async function upload(item: ClientRequirement, file?: File) {
    if (!file || busy || !canUpload) return;
    setBusy(item.type.id);
    try { await uploadClientDocument(client.id, item.type.id, file); if (!mounted.current) return; await load(); if (!mounted.current) return; onNotice(`${item.type.label} submitted for review.`); }
    catch (e) { if (mounted.current) onError(e instanceof Error ? e.message : "Upload failed."); }
    finally { if (mounted.current) setBusy(null); }
  }
  async function review(item: ClientRequirement, status: "APPROVED" | "NEEDS_CLARIFICATION") {
    if (!item.id || busy || !canReview) return;
    const customerNote = notes[item.id]?.trim() || (status === "APPROVED" ? "Document reviewed and approved." : "Please upload a clearer or corrected document.");
    setBusy(item.id);
    try { await reviewClientRequirement(item.id, { status, customerNote, version: item.version }); if (!mounted.current) return; await load(); if (!mounted.current) return; onNotice(status === "APPROVED" ? "Document approved." : "Clarification sent to the customer."); }
    catch (e) { if (mounted.current) onError(e instanceof Error ? e.message : "Review failed."); }
    finally { if (mounted.current) setBusy(null); }
  }

  return <section className="glass mt-4 rounded-3xl p-5">
    <div className="mb-4 flex items-start justify-between gap-4"><div><h2 className="font-display text-lg font-700 text-blue-ink">Documents · {client.full_name}</h2><p className="mt-1 text-xs text-ink-soft">Latest submission, review status, and prior revisions stay together.</p></div><button disabled={busy !== null} onClick={onClose} className="rounded-full bg-white/70 px-3 py-1.5 text-xs font-700 text-blue">Close</button></div>
    {loading ? <p className="py-8 text-center text-sm text-ink-soft">Loading checklist…</p> : requirements.length === 0 ? <p className="rounded-2xl bg-white/60 p-5 text-sm text-ink-soft">No active requirement types. Configure the checklist above first.</p> : <div className="grid gap-4 lg:grid-cols-2">{requirements.map((item) => {
      const statusTone = item.status === "APPROVED" ? "bg-emerald-100 text-emerald-700" : item.status === "NEEDS_CLARIFICATION" ? "bg-amber-100 text-amber-800" : item.status === "SUBMITTED" ? "bg-sky-100 text-sky-700" : "bg-slate-100 text-slate-600";
      return <article key={item.type.id} className="rounded-3xl border border-white/70 bg-white/55 p-4">
        <div className="flex items-start justify-between gap-3"><div><h3 className="font-700 text-blue-ink">{item.type.label}</h3><p className="mt-1 text-xs text-ink-soft">{item.type.description || "Private customer requirement"}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-800 ${statusTone}`}>{item.status.replaceAll("_", " ")}</span></div>
        {item.customerNote && <p className="mt-3 rounded-2xl bg-amber-50 px-3 py-2 text-xs text-amber-900">{item.customerNote}</p>}
        {canUpload && <label onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); void upload(item, e.dataTransfer.files[0]); }} className="mt-3 flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-dashed border-blue/30 bg-sky-50/70 px-4 py-3 transition hover:border-blue">
          <span><strong className="block text-xs text-blue-ink">Drop or choose a new revision</strong><small className="text-[10px] text-ink-soft">PDF, JPG, PNG or WebP · up to {Math.floor(item.type.maxBytes / 1024 / 1024)} MB</small></span><UploadSimple className="h-5 w-5 text-blue" /><input type="file" className="sr-only" accept={item.type.allowedMimeTypes.join(",")} disabled={busy !== null} onChange={(e) => void upload(item, e.target.files?.[0])} />
        </label>}
        {item.documents.length > 0 && <div className="mt-3"><p className="text-[10px] font-700 uppercase tracking-wide text-ink-soft">Revision history</p><ul className="mt-1 space-y-1">{item.documents.map((document) => <li key={document.id} className="flex items-center justify-between gap-2 text-xs"><a className="truncate font-600 text-blue hover:underline" href={getDocumentUrl(document.id)} target="_blank" rel="noreferrer">v{document.revision} · {document.storedFile.originalName}</a><time className="shrink-0 text-ink-soft">{new Date(document.createdAt).toLocaleDateString()}</time></li>)}</ul></div>}
        {canReview && item.status === "SUBMITTED" && item.id && <div className="mt-3 border-t border-white/70 pt-3"><input className={inputCls} value={notes[item.id] ?? ""} onChange={(e) => setNotes({ ...notes, [item.id!]: e.target.value })} placeholder="Customer-visible review note" /><div className="mt-2 flex flex-wrap gap-2"><button disabled={busy !== null} onClick={() => review(item, "APPROVED")} className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-700 text-emerald-800"><CheckCircle weight="fill" /> Approve</button><button disabled={busy !== null} onClick={() => review(item, "NEEDS_CLARIFICATION")} className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-700 text-amber-900"><WarningCircle weight="fill" /> Clarify</button></div></div>}
      </article>;
    })}</div>}
  </section>;
}

const inputCls = "w-full rounded-2xl border border-white/70 bg-white/70 px-3 py-2 text-sm text-ink outline-none focus:border-blue";
