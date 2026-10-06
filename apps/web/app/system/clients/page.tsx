"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Users, Plus, CalendarBlank, Files, GearSix, UploadSimple, CheckCircle, WarningCircle } from "@phosphor-icons/react";
import {
  listClients,
  createClient,
  listBatchChoices,
  getSchedule,
  type ClientRecord,
  type Batch,
  type ScheduleItem,
  type RecordId,
  type RequirementType,
  type ClientRequirement,
  listRequirementTypes,
  createRequirementType,
  listClientRequirements,
  uploadClientDocument,
  reviewClientRequirement,
  getDocumentUrl,
} from "@/lib/api";
import { useMe, can } from "@/lib/useMe";
import { TYPESCRIPT_API } from "@/lib/backend";
import { useLiveRecords } from "@/lib/useLiveRecords";
import { RecordPagination } from "@/components/RecordPagination";

const today = () => new Date().toISOString().slice(0, 10);

export default function ClientsPage() {
  const me = useMe();
  const canManage = can(me, "CLIENT_MANAGE");
  const canRead = can(me, "CLIENT_READ", "CLIENT_MANAGE");
  const canReadDocuments = can(me, "DOCUMENT_READ");
  const canReviewDocuments = can(me, "DOCUMENT_REVIEW");
  const canConfigureRequirements = can(me, "REQUIREMENT_MANAGE");
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [hasNext, setHasNext] = useState(false);
  const requestVersion = useRef(0);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [schedule, setSchedule] = useState<{ id: RecordId; items: ScheduleItem[] } | null>(null);
  const [documentClient, setDocumentClient] = useState<ClientRecord | null>(null);
  const [requirementTypes, setRequirementTypes] = useState<RequirementType[]>([]);
  const [requirementForm, setRequirementForm] = useState({ code: "", label: "", description: "", customerCanUpload: true });
  const [form, setForm] = useState({
    batch: "",
    full_name: "",
    contact_email: "",
    joined_at: today(),
  });

  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true);
    setError(null);
    try {
      const [c, b] = await Promise.all([listClients(TYPESCRIPT_API ? { page: String(page), q: query } : {}), listBatchChoices()]);
      if (version !== requestVersion.current) return;
      setClients(c.results);
      setHasNext(Boolean(c.next));
      setBatches(b);
    } catch (e) {
      if (version === requestVersion.current) setError(e instanceof Error ? e.message : "Failed to load.");
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [page, query]);
  useLiveRecords(() => {
    void load();
    if (schedule) void getSchedule(schedule.id).then((items) =>
      setSchedule((current) => current?.id === schedule.id ? { id: current.id, items } : current)
    ).catch((e) => setError(e instanceof Error ? e.message : "Could not refresh schedule."));
  }, canRead);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (TYPESCRIPT_API && canConfigureRequirements) void listRequirementTypes().then(setRequirementTypes).catch((e) => setError(e instanceof Error ? e.message : "Could not load requirement types."));
  }, [canConfigureRequirements]);

  function flash(m: string) {
    setNotice(m);
    setTimeout(() => setNotice(null), 3000);
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createClient({
        batch: TYPESCRIPT_API ? form.batch : Number(form.batch),
        full_name: form.full_name,
        contact_email: form.contact_email,
        joined_at: form.joined_at,
      });
      flash("Client added — schedule generated.");
      setForm((f) => ({ ...f, full_name: "", contact_email: "" }));
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add client.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleSchedule(id: RecordId) {
    if (schedule?.id === id) {
      setSchedule(null);
      return;
    }
    try {
      setSchedule({ id, items: await getSchedule(id) });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load schedule.");
    }
  }

  async function addRequirementType(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const created = await createRequirementType({
        ...requirementForm,
        allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
        maxBytes: 5 * 1024 * 1024,
        active: true,
      });
      setRequirementTypes((items) => [...items, created].sort((a, b) => a.label.localeCompare(b.label)));
      setRequirementForm({ code: "", label: "", description: "", customerCanUpload: true });
      flash("Requirement added to the active checklist.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create requirement.");
    } finally {
      setSaving(false);
    }
  }

  if (me && !canRead) {
    return (
      <section className="glass rounded-3xl p-10 text-center">
        <h1 className="font-display text-xl font-700 text-blue-ink">No access</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Your role doesn&apos;t manage client records.
        </p>
      </section>
    );
  }

  return (
    <>
      <header className="glass mb-4 flex items-center gap-3 rounded-3xl px-5 py-3.5">
        <span className="grid h-10 w-10 place-items-center rounded-2xl chrome">
          <Users weight="fill" className="h-5 w-5 text-blue" />
        </span>
        <div>
          <h1 className="font-display text-lg font-700 tracking-tight text-blue-ink">Clients</h1>
          <p className="text-xs text-ink-soft">
            Members of a batch — adding one auto-generates their installment schedule
          </p>
        </div>
      </header>

      {(error || notice) && (
        <div
          className={`mb-4 rounded-2xl px-4 py-2.5 text-sm font-600 ${
            error ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
          }`}
        >
          {error ?? notice}
        </div>
      )}

      {canManage && <form onSubmit={onCreate} className="glass mb-4 rounded-3xl p-5">
        <h2 className="mb-3 flex items-center gap-2 font-display font-700 text-blue-ink">
          <Plus weight="bold" className="h-4 w-4" /> Add client to a batch
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Batch">
            <select required value={form.batch} onChange={(e) => setForm({ ...form, batch: e.target.value })} className={inputCls}>
              <option value="">Select batch…</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.batch_number} — {b.unit_model}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Full name">
            <input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className={inputCls} placeholder="Maria Cruz" />
          </Field>
          <Field label="Contact email">
            <input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} className={inputCls} placeholder="maria@example.com" />
          </Field>
          <Field label="Joined date">
            <input type="date" required value={form.joined_at} onChange={(e) => setForm({ ...form, joined_at: e.target.value })} className={inputCls} />
          </Field>
        </div>
        <button type="submit" disabled={saving || batches.length === 0} className="btn-candy mt-4 inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-700 disabled:opacity-70">
          <Plus weight="bold" className="h-4 w-4" />
          {saving ? "Adding…" : "Add client"}
        </button>
        {batches.length === 0 && (
          <p className="mt-2 text-xs text-ink-soft">Create a batch first (Paluwagan Records).</p>
        )}
      </form>}
      {TYPESCRIPT_API && canConfigureRequirements && <section className="glass mb-4 rounded-3xl p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div><h2 className="flex items-center gap-2 font-display font-700 text-blue-ink"><GearSix weight="fill" className="h-4 w-4" /> Requirement checklist</h2><p className="mt-1 text-xs text-ink-soft">Configure approved document types without exposing files publicly.</p></div>
          <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-700 text-blue-ink">{requirementTypes.filter((item) => item.active).length} active</span>
        </div>
        <form onSubmit={addRequirementType} className="grid gap-3 md:grid-cols-[10rem_14rem_1fr_auto]">
          <input required className={inputCls} value={requirementForm.code} onChange={(e) => setRequirementForm({ ...requirementForm, code: e.target.value })} placeholder="VALID_ID" aria-label="Requirement code" />
          <input required className={inputCls} value={requirementForm.label} onChange={(e) => setRequirementForm({ ...requirementForm, label: e.target.value })} placeholder="Valid ID" aria-label="Requirement label" />
          <input className={inputCls} value={requirementForm.description} onChange={(e) => setRequirementForm({ ...requirementForm, description: e.target.value })} placeholder="What the customer should provide" aria-label="Requirement instructions" />
          <button disabled={saving} className="btn-candy rounded-2xl px-4 py-2 text-sm font-700 disabled:opacity-60">Add type</button>
          <label className="flex items-center gap-2 text-xs text-ink-soft md:col-span-4"><input type="checkbox" checked={requirementForm.customerCanUpload} onChange={(e) => setRequirementForm({ ...requirementForm, customerCanUpload: e.target.checked })} /> Customer may upload and resubmit this document</label>
        </form>
      </section>}
      {TYPESCRIPT_API && <label className="mb-4 flex flex-col gap-1 text-sm text-blue-ink">
        Search clients
        <input className={inputCls} value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Name, email or batch number" />
      </label>}

      <div className="glass overflow-x-auto rounded-3xl p-5">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-ink-soft">
            <tr className="border-b border-white/60">
              <th className="px-2 py-2">#</th>
              <th className="px-2 py-2">Name</th>
              <th className="px-2 py-2">Batch</th>
              <th className="px-2 py-2">Email</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2 text-right">Records</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-2 py-6 text-center text-ink-soft">Loading…</td></tr>
            ) : clients.length === 0 ? (
              <tr><td colSpan={6} className="px-2 py-6 text-center text-ink-soft">No clients yet.</td></tr>
            ) : (
              clients.map((c) => (
                <Fragment key={c.id}>
                  <tr className="border-b border-white/40">
                    <td className="px-2 py-2.5 font-600 text-blue-ink" title={String(c.id)}>{typeof c.id === "string" ? c.id.slice(0, 8) : c.id}</td>
                    <td className="px-2 py-2.5 font-700 text-blue-ink">{c.full_name}</td>
                    <td className="px-2 py-2.5 text-ink-soft">{c.batch_number}</td>
                    <td className="px-2 py-2.5 text-ink-soft">{c.contact_email || "—"}</td>
                    <td className="px-2 py-2.5 capitalize">
                      <span className="rounded-full bg-sky-2/70 px-2.5 py-1 text-xs font-700 text-blue-ink">{c.status}</span>
                    </td>
                    <td className="px-2 py-2.5 text-right">
                      <button onClick={() => toggleSchedule(c.id)} className="mr-1 inline-flex items-center gap-1 rounded-full bg-white/70 px-2.5 py-1 text-xs font-700 text-blue hover:bg-white">
                        <CalendarBlank weight="bold" className="h-3.5 w-3.5" />
                        {schedule?.id === c.id ? "Hide" : "View"}
                      </button>
                      {canReadDocuments && <button onClick={() => setDocumentClient(documentClient?.id === c.id ? null : c)} className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2.5 py-1 text-xs font-700 text-blue hover:bg-white"><Files weight="bold" className="h-3.5 w-3.5" /> Documents</button>}
                    </td>
                  </tr>
                  {schedule?.id === c.id && (
                    <tr>
                      <td colSpan={6} className="px-2 pb-3">
                        <div className="glass-tint rounded-2xl p-3">
                          <table className="w-full text-left text-xs">
                            <thead className="text-ink-soft">
                              <tr>
                                <th className="px-2 py-1">#</th>
                                <th className="px-2 py-1">Due date</th>
                                <th className="px-2 py-1">Expected</th>
                              </tr>
                            </thead>
                            <tbody>
                              {schedule.items.map((s) => (
                                <tr key={s.id}>
                                  <td className="px-2 py-1">{s.sequence_no}</td>
                                  <td className="px-2 py-1">{s.due_date}</td>
                                  <td className="px-2 py-1 font-600 text-blue-ink">₱{s.expected_amount}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
      {TYPESCRIPT_API && <RecordPagination page={page} hasNext={hasNext} loading={loading} onPage={setPage} />}
      {TYPESCRIPT_API && documentClient && <RequirementsWorkspace
        client={documentClient}
        canReview={canReviewDocuments}
        onClose={() => setDocumentClient(null)}
        onError={(message) => setError(message)}
        onNotice={flash}
      />}
    </>
  );
}

function RequirementsWorkspace({ client, canReview, onClose, onError, onNotice }: {
  client: ClientRecord; canReview: boolean; onClose: () => void;
  onError: (message: string) => void; onNotice: (message: string) => void;
}) {
  const [requirements, setRequirements] = useState<ClientRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const load = useCallback(() => {
    setLoading(true);
    return listClientRequirements(client.id).then(setRequirements).catch((e) => onError(e instanceof Error ? e.message : "Could not load requirements.")).finally(() => setLoading(false));
  }, [client.id]);
  useEffect(() => { void load(); }, [load]);

  async function upload(item: ClientRequirement, file?: File) {
    if (!file) return;
    setBusy(item.type.id);
    try { await uploadClientDocument(client.id, item.type.id, file); await load(); onNotice(`${item.type.label} submitted for review.`); }
    catch (e) { onError(e instanceof Error ? e.message : "Upload failed."); }
    finally { setBusy(null); }
  }
  async function review(item: ClientRequirement, status: "APPROVED" | "NEEDS_CLARIFICATION") {
    if (!item.id) return;
    const customerNote = notes[item.id]?.trim() || (status === "APPROVED" ? "Document reviewed and approved." : "Please upload a clearer or corrected document.");
    setBusy(item.id);
    try { await reviewClientRequirement(item.id, { status, customerNote, version: item.version }); await load(); onNotice(status === "APPROVED" ? "Document approved." : "Clarification sent to the customer."); }
    catch (e) { onError(e instanceof Error ? e.message : "Review failed."); }
    finally { setBusy(null); }
  }

  return <section className="glass mt-4 rounded-3xl p-5">
    <div className="mb-4 flex items-start justify-between gap-4"><div><h2 className="font-display text-lg font-700 text-blue-ink">Documents · {client.full_name}</h2><p className="mt-1 text-xs text-ink-soft">Latest submission, review status, and prior revisions stay together.</p></div><button onClick={onClose} className="rounded-full bg-white/70 px-3 py-1.5 text-xs font-700 text-blue">Close</button></div>
    {loading ? <p className="py-8 text-center text-sm text-ink-soft">Loading checklist…</p> : requirements.length === 0 ? <p className="rounded-2xl bg-white/60 p-5 text-sm text-ink-soft">No active requirement types. Configure the checklist above first.</p> : <div className="grid gap-4 lg:grid-cols-2">{requirements.map((item) => {
      const statusTone = item.status === "APPROVED" ? "bg-emerald-100 text-emerald-700" : item.status === "NEEDS_CLARIFICATION" ? "bg-amber-100 text-amber-800" : item.status === "SUBMITTED" ? "bg-sky-100 text-sky-700" : "bg-slate-100 text-slate-600";
      return <article key={item.type.id} className="rounded-3xl border border-white/70 bg-white/55 p-4">
        <div className="flex items-start justify-between gap-3"><div><h3 className="font-700 text-blue-ink">{item.type.label}</h3><p className="mt-1 text-xs text-ink-soft">{item.type.description || "Private customer requirement"}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-800 ${statusTone}`}>{item.status.replaceAll("_", " ")}</span></div>
        {item.customerNote && <p className="mt-3 rounded-2xl bg-amber-50 px-3 py-2 text-xs text-amber-900">{item.customerNote}</p>}
        <label onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); void upload(item, e.dataTransfer.files[0]); }} className="mt-3 flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-dashed border-blue/30 bg-sky-50/70 px-4 py-3 transition hover:border-blue">
          <span><strong className="block text-xs text-blue-ink">Drop or choose a new revision</strong><small className="text-[10px] text-ink-soft">PDF, JPG, PNG or WebP · up to {Math.floor(item.type.maxBytes / 1024 / 1024)} MB</small></span><UploadSimple className="h-5 w-5 text-blue" /><input type="file" className="sr-only" accept={item.type.allowedMimeTypes.join(",")} disabled={busy !== null} onChange={(e) => void upload(item, e.target.files?.[0])} />
        </label>
        {item.documents.length > 0 && <div className="mt-3"><p className="text-[10px] font-700 uppercase tracking-wide text-ink-soft">Revision history</p><ul className="mt-1 space-y-1">{item.documents.map((document) => <li key={document.id} className="flex items-center justify-between gap-2 text-xs"><a className="truncate font-600 text-blue hover:underline" href={getDocumentUrl(document.id)} target="_blank" rel="noreferrer">v{document.revision} · {document.storedFile.originalName}</a><time className="shrink-0 text-ink-soft">{new Date(document.createdAt).toLocaleDateString()}</time></li>)}</ul></div>}
        {canReview && item.status === "SUBMITTED" && item.id && <div className="mt-3 border-t border-white/70 pt-3"><input className={inputCls} value={notes[item.id] ?? ""} onChange={(e) => setNotes({ ...notes, [item.id!]: e.target.value })} placeholder="Customer-visible review note" /><div className="mt-2 flex flex-wrap gap-2"><button disabled={busy !== null} onClick={() => review(item, "APPROVED")} className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-700 text-emerald-800"><CheckCircle weight="fill" /> Approve</button><button disabled={busy !== null} onClick={() => review(item, "NEEDS_CLARIFICATION")} className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-700 text-amber-900"><WarningCircle weight="fill" /> Clarify</button></div></div>}
      </article>;
    })}</div>}
  </section>;
}

const inputCls =
  "w-full rounded-2xl border border-white/70 bg-white/70 px-3 py-2 text-sm text-ink outline-none transition focus:border-blue focus:bg-white";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-600 text-ink-soft">{label}</span>
      {children}
    </label>
  );
}
