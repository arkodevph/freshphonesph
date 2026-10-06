"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Users, Plus, CalendarBlank } from "@phosphor-icons/react";
import {
  listClients,
  createClient,
  addReleaseUpdate,
  listBatchChoices,
  getSchedule,
  type ClientRecord,
  type Batch,
  type ScheduleItem,
  type RecordId,
} from "@/lib/api";
import { useMe, can } from "@/lib/useMe";
import { TYPESCRIPT_API } from "@/lib/backend";
import { useLiveRecords } from "@/lib/useLiveRecords";
import { RecordPagination } from "@/components/RecordPagination";
import { ManagedClientRequirements, RequirementsManager } from "@/components/ManagedClientRequirements";
import { DocumentChecklist } from "@/components/DocumentChecklist";
import { RecordDetails } from "@/components/RecordDetails";
import { RecordFilters } from "@/components/RecordFilters";
import { emptyRecordFilters, recordFilterQuery, type RecordFiltersValue } from "@/lib/record-filters";
import { useRecordFilterText } from "@/lib/useRecordFilterText";
import { ApiError } from "@/lib/ts-api";

const today = () => new Date().toISOString().slice(0, 10);

export default function ClientsDashboard() {
  const me = useMe();
  const canManage = can(me, "CLIENT_MANAGE");
  const canRead = can(me, "CLIENT_READ", "CLIENT_MANAGE");
  const canReadDocuments = me?.role === 'owner' || me?.role === 'records';
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState(emptyRecordFilters);
  const text = useRecordFilterText(filters);
  const search = useSearchParams();
  const validId = (value: string | null) => value && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value) ? value : null;
  const focusedClient = TYPESCRIPT_API ? validId(search.get('client')) : null;
  const batchFilter = TYPESCRIPT_API ? validId(search.get('batch')) ?? '' : '';
  const linkedDocuments = search.get('documents');
  const filterError = recordFilterQuery('client', filters, page, batchFilter).error;
  const [total, setTotal] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const requestVersion = useRef(0);
  const choicesVersion = useRef(0);
  const scheduleVersion = useRef(0);
  const scheduleId = useRef<RecordId | null>(null);
  const privateVersion = useRef(0);
  const mutation = useRef(false);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [choicesError, setChoicesError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [details, setDetails] = useState<{ id: RecordId; mode: "edit" | "history" } | null>(null);
  const [schedule, setSchedule] = useState<{ id: RecordId; items: ScheduleItem[] } | null>(null);
  const [managedClient, setManagedClient] = useState<ClientRecord | null>(null);
  const [documentClient, setDocumentClient] = useState<RecordId | null>(null);
  const [releaseDraft, setReleaseDraft] = useState<{ id: RecordId; version?: number; status: "NOT_READY" | "PROCESSING" | "READY" | "RELEASED"; note: string; collectionDate: string } | null>(null);
  const [releasing, setReleasing] = useState(false);
  const [form, setForm] = useState({
    batch: "",
    full_name: "",
    contact_email: "",
    joined_at: today(),
  });

  const clearPrivate = useCallback(() => {
    ++privateVersion.current; ++requestVersion.current; ++choicesVersion.current; ++scheduleVersion.current; scheduleId.current = null;
    setClients([]); setBatches([]); setTotal(0); setHasNext(false); setDetails(null); setSchedule(null); setDocumentClient(null); setManagedClient(null); setReleaseDraft(null); setNotice(null);
    setLoading(false);
    setForm({ batch: '', full_name: '', contact_email: '', joined_at: today() });
  }, []);
  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    if (!canRead || (TYPESCRIPT_API && !focusedClient && (text.pending || filterError))) {
      setClients([]); setTotal(0); setHasNext(false); setLoading(text.pending || !me);
      ++scheduleVersion.current; scheduleId.current = null; setSchedule(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const c = await listClients(TYPESCRIPT_API ? focusedClient ? { id: focusedClient, page: '1' }
        : recordFilterQuery('client', { ...filters, q: text.q, model: text.model }, page, batchFilter).params! : {});
      if (version !== requestVersion.current) return;
      const lastPage = Math.max(1, Math.ceil(c.count / 20));
      if (TYPESCRIPT_API && !focusedClient && page > lastPage) { setPage(lastPage); return; }
      setClients(c.results);
      if (scheduleId.current && !c.results.some(client => client.id === scheduleId.current)) {
        ++scheduleVersion.current; scheduleId.current = null; setSchedule(null);
      }
      setTotal(c.count);
      setHasNext(Boolean(c.next));
    } catch (e) {
      if (version !== requestVersion.current) return;
      if (e instanceof ApiError && [401, 403].includes(e.status)) clearPrivate();
      setClients([]); setTotal(0); setHasNext(false); ++scheduleVersion.current; scheduleId.current = null; setSchedule(null);
      setError(e instanceof Error ? e.message : "Failed to load clients.");
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [canRead, me, page, focusedClient, batchFilter, filters, text.q, text.model, text.pending, filterError, clearPrivate]);
  const loadChoices = useCallback(async () => {
    if (!canManage) return;
    const version = ++choicesVersion.current;
    try {
      const items = await listBatchChoices();
      if (version === choicesVersion.current) { setBatches(items); setChoicesError(null); }
    } catch (e) {
      if (version !== choicesVersion.current) return;
      if (e instanceof ApiError && [401, 403].includes(e.status)) clearPrivate();
      setBatches([]); setChoicesError(e instanceof Error ? e.message : 'Could not load available batches.');
    }
  }, [canManage, clearPrivate]);
  const refreshSchedule = useCallback(async (id: RecordId) => {
    const version = ++scheduleVersion.current;
    try {
      const items = await getSchedule(id);
      if (version === scheduleVersion.current && scheduleId.current === id) setSchedule({ id, items });
    } catch (e) {
      if (version !== scheduleVersion.current || scheduleId.current !== id) return;
      if (e instanceof ApiError && [401, 403].includes(e.status)) clearPrivate();
      scheduleId.current = null; setSchedule(null); setError(e instanceof Error ? e.message : 'Could not load schedule.');
    }
  }, [clearPrivate]);
  useLiveRecords(() => {
    void load(); void loadChoices();
    if (scheduleId.current) void refreshSchedule(scheduleId.current);
  }, canRead);

  useEffect(() => {
    void load();
    return () => { ++requestVersion.current; };
  }, [load]);
  useEffect(() => { void loadChoices(); return () => { ++choicesVersion.current; }; }, [loadChoices]);
  useEffect(() => { if (me && !canRead) clearPrivate(); }, [me, canRead, clearPrivate]);
  useEffect(() => { if (me && !can(me, "DOCUMENT_READ")) setManagedClient(null); }, [me]);
  useEffect(() => {
    if (!me || canManage) return;
    ++privateVersion.current; ++choicesVersion.current; setBatches([]); setDetails(null); setReleaseDraft(null);
    setForm({ batch: '', full_name: '', contact_email: '', joined_at: today() });
  }, [me, canManage]);
  useEffect(() => () => { ++scheduleVersion.current; }, []);

  useEffect(() => {
    setPage(1); ++scheduleVersion.current; scheduleId.current = null; setSchedule(null);
    setDocumentClient(canReadDocuments && focusedClient && linkedDocuments === focusedClient ? focusedClient : null);
  }, [batchFilter, focusedClient, linkedDocuments, canReadDocuments]);

  function removeLink(...keys: string[]) {
    const params = new URLSearchParams(window.location.search);
    for (const key of keys) params.delete(key);
    window.history.replaceState(null, '', `/system/clients${params.size ? `?${params}` : ''}`);
    setPage(1);
  }
  function changeFilter(key: keyof RecordFiltersValue, value: string) {
    if (focusedClient) removeLink('client', 'documents');
    setFilters(current => ({ ...current, [key]: value })); setPage(1);
  }

  function flash(m: string) {
    setNotice(m);
    setTimeout(() => setNotice(null), 3000);
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (mutation.current) return;
    const access = privateVersion.current; mutation.current = true;
    setSaving(true);
    setError(null);
    try {
      await createClient({
        batch: TYPESCRIPT_API ? form.batch : Number(form.batch),
        full_name: form.full_name,
        contact_email: form.contact_email,
        joined_at: form.joined_at,
      });
      if (access !== privateVersion.current) return;
      flash("Client added — schedule generated.");
      setForm((f) => ({ ...f, full_name: "", contact_email: "" }));
      load();
    } catch (e) {
      if (access !== privateVersion.current) return;
      if (e instanceof ApiError && [401, 403].includes(e.status)) clearPrivate();
      setError(e instanceof Error ? e.message : "Could not add client.");
    } finally {
      setSaving(false);
      mutation.current = false;
    }
  }

  async function toggleSchedule(id: RecordId) {
    if (scheduleId.current === id) {
      ++scheduleVersion.current; scheduleId.current = null; setSchedule(null);
      return;
    }
    scheduleId.current = id; setSchedule({ id, items: [] });
    await refreshSchedule(id);
  }

  async function saveRelease(c: ClientRecord) {
    if (!releaseDraft || releaseDraft.id !== c.id || !c.version || releaseDraft.version !== c.version || mutation.current) return;
    const access = privateVersion.current; mutation.current = true; setReleasing(true);
    setError(null);
    try {
      await addReleaseUpdate(c.id, { version: releaseDraft.version, status: releaseDraft.status,
        note: releaseDraft.note.trim(), collectionDate: releaseDraft.collectionDate || null });
      if (access !== privateVersion.current) return;
      setReleaseDraft(null);
      flash("Release update posted. The customer has been notified.");
      await load();
    } catch (e) {
      if (access !== privateVersion.current) return;
      if (e instanceof ApiError && [401, 403].includes(e.status)) clearPrivate();
      setError(e instanceof Error ? e.message : "Could not update release status.");
    } finally { mutation.current = false; setReleasing(false); }
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
        <fieldset disabled={saving} className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Batch">
            <select required value={form.batch} onChange={(e) => setForm({ ...form, batch: e.target.value })} className={inputCls}>
              <option value="">Select batch…</option>
              {form.batch && !batches.some(batch => String(batch.id) === form.batch) && <option value={form.batch}>Selected batch unavailable</option>}
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
        </fieldset>
        <button type="submit" disabled={saving || releasing || batches.length === 0} className="btn-candy mt-4 inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-700 disabled:opacity-70">
          <Plus weight="bold" className="h-4 w-4" />
          {saving ? "Adding…" : "Add client"}
        </button>
        {batches.length === 0 && (
          <p className="mt-2 text-xs text-ink-soft">Create a batch first (Paluwagan Records).</p>
        )}
        {choicesError && <p role="alert" className="mt-2 text-sm text-rose-700">{choicesError} <button type="button" className="underline" onClick={() => void loadChoices()}>Retry batch choices</button></p>}
      </form>}
      {TYPESCRIPT_API && can(me, "REQUIREMENT_MANAGE") && <RequirementsManager />}
      {TYPESCRIPT_API && canRead && <RecordFilters kind="client" value={filters} onChange={changeFilter}
        hasContext={Boolean(focusedClient || batchFilter)}
        onClear={() => { setFilters(emptyRecordFilters); removeLink('client', 'documents', 'batch'); }}
        onRefresh={() => void load()} loading={loading} error={focusedClient ? null : filterError} />}
      {batchFilter && <div className="mb-4 flex items-center gap-3 rounded-xl bg-violet-100 px-4 py-2 text-sm text-violet-700">Viewing members of one batch
        <button type="button" className="font-700 underline" onClick={() => removeLink('batch')}>Show all batches</button></div>}

      {focusedClient && <div className="mb-4 flex items-center gap-3 rounded-xl bg-violet-100 px-4 py-2 text-sm text-violet-700">Viewing one linked client. Filters apply when you return to the list. <button type="button" onClick={() => removeLink('client', 'documents')} className="font-700 underline">Show all clients</button></div>}
      {TYPESCRIPT_API && canRead && <p role="status" className="mb-3 text-sm text-ink-soft">{!focusedClient && filterError ? 'Fix the date range to view clients.' : loading ? 'Loading clients…' : total ? `Showing ${focusedClient ? 1 : (page - 1) * 20 + 1}–${focusedClient ? total : Math.min(page * 20, total)} of ${total} clients` : '0 clients'}</p>}

      <div className="glass overflow-x-auto rounded-3xl p-5">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-ink-soft">
            <tr className="border-b border-white/60">
              <th className="px-2 py-2">#</th>
              <th className="px-2 py-2">Name</th>
              <th className="px-2 py-2">Batch</th>
              <th className="px-2 py-2">Email</th>
              <th className="px-2 py-2">Status</th>
              {TYPESCRIPT_API && <th className="px-2 py-2">Release</th>}
              <th className="px-2 py-2 text-right">Records</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={TYPESCRIPT_API ? 7 : 6} className="px-2 py-6 text-center text-ink-soft">Loading…</td></tr>
            ) : clients.length === 0 ? (
              <tr><td colSpan={TYPESCRIPT_API ? 7 : 6} className="px-2 py-6 text-center text-ink-soft">{me?.role === 'core_handler' ? 'No assigned clients match these filters.' : 'No clients match these filters.'}</td></tr>
            ) : (
              clients.map((c) => (
                <Fragment key={c.id}>
                  <tr className="border-b border-white/40">
                    <td className="px-2 py-2.5 font-600 text-blue-ink" title={String(c.id)}>{typeof c.id === "string" ? c.id.slice(0, 8) : c.id}</td>
                    <td className="px-2 py-2.5 font-700 text-blue-ink">{c.full_name}</td>
                    <td className="px-2 py-2.5 text-ink-soft">{c.batch_number}</td>
                    <td className="px-2 py-2.5 text-ink-soft">{c.contact_email || "—"}</td>
                    <td className="px-2 py-2.5 capitalize">
                      <span className="rounded-full bg-sky-2/70 px-2.5 py-1 text-xs font-700 text-blue-ink">{c.status.replaceAll("_", " ")}</span>
                    </td>
                    {TYPESCRIPT_API && <td className="px-2 py-2.5"><span className="text-xs capitalize">{(c.release_status ?? "not_ready").replaceAll("_", " ")}</span>{canManage && <button type="button" className="ml-2 rounded-lg bg-violet-100 px-2 py-1 text-xs font-700 text-violet-700" disabled={releasing} onClick={() => setReleaseDraft((current) => current?.id === c.id ? null : { id: c.id, version: c.version, status: (c.release_status ?? "not_ready").toUpperCase() as "NOT_READY" | "PROCESSING" | "READY" | "RELEASED", note: "", collectionDate: "" })}>{releaseDraft?.id === c.id ? "Cancel" : "Post update"}</button>}</td>}
                    <td className="px-2 py-2.5 text-right">
                      {TYPESCRIPT_API && canManage && <>
                        <button type="button" className="mr-2 rounded-lg bg-violet-100 px-2 py-1 text-xs font-700 text-violet-700" aria-label={`Edit client ${c.full_name}`} onClick={() => setDetails({ id: c.id, mode: "edit" })}>Edit</button>
                        <button type="button" className="mr-2 rounded-full bg-white/70 px-2.5 py-1 text-xs font-700 text-blue" aria-label={`Change history for client ${c.full_name}`} onClick={() => setDetails({ id: c.id, mode: "history" })}>History</button>
                      </>}
                      <button onClick={() => toggleSchedule(c.id)} className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2.5 py-1 text-xs font-700 text-blue hover:bg-white">
                        <CalendarBlank weight="bold" className="h-3.5 w-3.5" />
                        {schedule?.id === c.id ? "Hide" : "View"}
                      </button>
                      {TYPESCRIPT_API && can(me, "DOCUMENT_READ") && <button type="button" onClick={() => setManagedClient(c)} className="ml-2 rounded-full bg-white/70 px-2.5 py-1 text-xs text-blue">Configured requirements</button>}
                      {TYPESCRIPT_API && canReadDocuments && <button type="button" onClick={() => setDocumentClient((current) => current === c.id ? null : c.id)} className="ml-2 rounded-full bg-white/70 px-2.5 py-1 text-xs font-700 text-blue hover:bg-white">{documentClient === c.id ? "Hide documents" : "Documents"}</button>}
                    </td>
                  </tr>
                  {releaseDraft?.id === c.id && <tr><td colSpan={7} className="px-2 pb-3"><form onSubmit={(event) => { event.preventDefault(); void saveRelease(c); }} className="glass-tint grid gap-3 rounded-2xl p-4"><fieldset disabled={releasing} className="grid min-w-0 gap-3"><h2 className="text-sm font-700 text-blue-ink">Release update for {c.full_name}</h2><div className="grid gap-3 md:grid-cols-3"><label className="grid gap-1 text-xs text-blue-ink">Status<select value={releaseDraft.status} onChange={(event) => setReleaseDraft({ ...releaseDraft, status: event.target.value as typeof releaseDraft.status })} className={inputCls}><option value="NOT_READY">Not ready</option><option value="PROCESSING">Processing</option><option value="READY">Ready</option><option value="RELEASED">Released</option></select></label><label className="grid gap-1 text-xs text-blue-ink md:col-span-2">Collection date, if confirmed<input type="date" value={releaseDraft.collectionDate} onChange={(event) => setReleaseDraft({ ...releaseDraft, collectionDate: event.target.value })} disabled={!(["READY", "RELEASED"].includes(releaseDraft.status))} className={inputCls} /></label></div><label className="grid gap-1 text-xs text-blue-ink">Customer-visible update or collection instructions<textarea value={releaseDraft.note} onChange={(event) => setReleaseDraft({ ...releaseDraft, note: event.target.value })} maxLength={1000} rows={3} className={inputCls} placeholder="What changed, or how should the customer arrange collection?" /></label><div>{releaseDraft.version !== c.version && <p role="alert" className="text-sm text-rose-700">This client changed. Your release draft is retained; discard it and review the current record before posting.</p>}<button type="button" onClick={() => setReleaseDraft(null)} className="mr-3 text-xs underline">Discard release draft</button><button type="submit" disabled={releaseDraft.version !== c.version || releasing || saving} className="rounded-xl bg-blue px-4 py-2 text-xs font-700 text-white disabled:opacity-50">Post release update</button></div></fieldset></form></td></tr>}
                  {schedule?.id === c.id && (
                    <tr>
                      <td colSpan={TYPESCRIPT_API ? 7 : 6} className="px-2 pb-3">
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
                  {canReadDocuments && documentClient === c.id && <tr><td colSpan={TYPESCRIPT_API ? 7 : 6} className="px-2 pb-3"><div className="glass-tint rounded-2xl p-4"><DocumentChecklist clientId={c.id} reviewer /></div></td></tr>}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
      {TYPESCRIPT_API && <RecordPagination page={focusedClient ? 1 : page} total={total} hasNext={hasNext} loading={loading} onPage={setPage} />}
      {TYPESCRIPT_API && managedClient && can(me, "DOCUMENT_READ") && <ManagedClientRequirements key={`${me?.id}:${managedClient.id}:${can(me, "DOCUMENT_REVIEW")}:${can(me, "DOCUMENT_UPLOAD")}`} client={managedClient} canReview={can(me, "DOCUMENT_REVIEW")} canUpload={can(me, "DOCUMENT_UPLOAD")} onClose={() => setManagedClient(null)} onError={setError} onNotice={flash} />}
      {details && <RecordDetails key={String(details.id)} kind="client" id={details.id} mode={details.mode} onClose={() => setDetails(null)} onSaved={() => { flash("Client changes saved."); void load(); }} />}
    </>
  );
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
