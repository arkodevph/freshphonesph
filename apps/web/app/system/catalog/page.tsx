"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Stack } from "@phosphor-icons/react";
import { catalogAvailability, catalogAvailabilityLabels, catalogConditionLabels, catalogAssets, catalogItemSchema,
  catalogPlanSchema, catalogPlanBreakdown, catalogPlanLabels,
  type CatalogInput, type CatalogItem, type CatalogQuery, type Page } from "@freshphones/contracts";
import { createCatalogItem, getCatalogItem, getCatalogItems, updateCatalogItem, uploadCatalogPhoto, removeCatalogPhoto } from "@/lib/api";
import { ApiError } from "@/lib/ts-api";
import { can, useMe } from "@/lib/useMe";
import { TYPESCRIPT_API } from "@/lib/backend";
import { useLiveRecords } from "@/lib/useLiveRecords";
import { catalogDraft, catalogPhoto, catalogPrice, emptyCatalogInput } from "@/lib/catalog";
import styles from "./catalog.module.css";

export default function CatalogPage() {
  const me = useMe();
  if (!me) return <p role="status">Loading catalog access…</p>;
  if (!TYPESCRIPT_API || !can(me, "CATALOG_MANAGE")) return <section className={styles.page}><h1>No access</h1><p>Your role cannot manage the public catalog.</p></section>;
  return <CatalogWorkspace key={me.id} />;
}

function CatalogWorkspace() {
  const [query, setQuery] = useState<CatalogQuery>({ page: 1, q: "" });
  const [result, setResult] = useState<Page<CatalogItem> | null>(null);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<CatalogItem | "new" | null>(null);
  const sequence = useRef(0);
  const load = useCallback(async () => {
    const request = ++sequence.current; setLoading(true); setError("");
    try {
      const page = await getCatalogItems(query);
      if (request !== sequence.current) return;
      if (query.page > 1 && page.items.length === 0) { setQuery(current => ({ ...current, page: 1 })); return; }
      setResult(page);
    } catch (failure) { if (request === sequence.current) { setResult(null); setError(failure instanceof Error ? failure.message : "Could not load catalog."); } }
    finally { if (request === sequence.current) setLoading(false); }
  }, [query]);
  useEffect(() => { const timer = setTimeout(() => void load(), 200); return () => { clearTimeout(timer); sequence.current++; }; }, [load]);
  useLiveRecords(load);
  return <div className={styles.page}>
    <header className={styles.heading}><span className={styles.icon}><Stack weight="duotone" /></span><div><p>Public website</p><h1>Unit catalog</h1><p>Manage the models, daily rates and availability customers can browse.</p></div><button className={styles.primary} type="button" onClick={() => { setNotice(""); setEditing("new"); }}>Add listing</button></header>
    <section className={styles.panel} aria-label="Catalog filters"><div className={styles.filters}>
      <label>Search listings<input value={query.q} maxLength={100} placeholder="Model or listing code" onChange={event => setQuery({ ...query, q: event.target.value, page: 1 })} /></label>
      <label>Visibility<select value={query.visibility ?? ""} onChange={event => setQuery({ ...query, visibility: event.target.value as CatalogQuery['visibility'] || undefined, page: 1 })}><option value="">All listings</option><option value="PUBLISHED">Published</option><option value="HIDDEN">Hidden</option></select></label>
      <label>Availability<select value={query.availability ?? ""} onChange={event => setQuery({ ...query, availability: event.target.value as CatalogQuery['availability'] || undefined, page: 1 })}><option value="">All availability</option>{catalogAvailability.map(value => <option key={value} value={value}>{catalogAvailabilityLabels[value]}</option>)}</select></label>
      <button type="button" disabled={loading} onClick={() => void load()}>Refresh</button>
    </div><p className={styles.help}>Availability is maintained by your team. Hiding a listing removes it from the public catalog. Existing batch agreements and customer balances stay separate.</p></section>
    {notice && <p role="status" className={styles.notice}>{notice}</p>}
    {error && <p role="alert" className={styles.error}>{error} <button type="button" onClick={() => void load()}>Retry catalog</button></p>}
    <section className={styles.panel} aria-busy={loading} aria-label="Catalog listings">
      <div className={styles.tableWrap}><table><thead><tr><th>Unit</th><th>Daily rate</th><th>Availability</th><th>Visibility</th><th>Order</th><th>Action</th></tr></thead><tbody>
        {loading ? <tr><td colSpan={6}>Loading listings…</td></tr> : !result?.items.length ? <tr><td colSpan={6}>No listings match your filters.</td></tr> : result.items.map(item => <tr key={item.id}>
          <th scope="row">{item.name}<small>{item.code} · {catalogConditionLabels[item.condition]}</small></th><td>{catalogPrice(item.dailyAmount)}</td><td>{catalogAvailabilityLabels[item.availability]}</td><td><span className={item.published ? styles.published : styles.hidden}>{item.published ? "Published" : "Hidden"}</span></td><td>{item.sortOrder}</td><td><button type="button" aria-label={`Edit ${item.name}`} onClick={() => { setNotice(""); setEditing(item); }}>Edit</button></td>
        </tr>)}
      </tbody></table></div>
      <nav className={styles.pagination} aria-label="Catalog directory pages"><span>{result ? `${result.total} matching listings` : ""}</span><button type="button" disabled={loading || query.page <= 1} onClick={() => setQuery({ ...query, page: query.page - 1 })}>Previous</button><span>Page {query.page}</span><button type="button" disabled={loading || !result || query.page * result.pageSize >= result.total} onClick={() => setQuery({ ...query, page: query.page + 1 })}>Next</button></nav>
    </section>
    {editing && <CatalogEditor key={editing === "new" ? "new" : editing.id} initial={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={item => { setNotice(`${item.name} saved${item.published ? " and published" : " as a hidden listing"}.`); void load(); }} />}
  </div>;
}

function CatalogEditor({ initial, onClose, onSaved }: { initial: CatalogItem | null; onClose: () => void; onSaved: (item: CatalogItem) => void }) {
  const dialog = useRef<HTMLDialogElement>(null); const alive = useRef(true); const busy = useRef(false); const checkSequence = useRef(0);
  const [item, setItem] = useState(initial); const itemRef = useRef(item); itemRef.current = item;
  const [draft, setDraft] = useState<CatalogInput>(initial ? catalogDraft(initial) : { ...emptyCatalogInput });
  const [saving, setSaving] = useState(false); const [outdated, setOutdated] = useState(false); const [error, setError] = useState(""); const [saved, setSaved] = useState("");
  const [confirm, setConfirm] = useState<"close" | "reload" | "photo" | null>(null);
  const [file, setFile] = useState<File | null>(null); const [fileKey, setFileKey] = useState(0);
  const dirty = JSON.stringify(draft) !== JSON.stringify(item ? catalogDraft(item) : emptyCatalogInput);
  const check = useCallback(async () => {
    const current = itemRef.current; if (!current || busy.current) return;
    const request = ++checkSequence.current;
    try { const latest = await getCatalogItem(current.id); if (alive.current && !busy.current && request === checkSequence.current && itemRef.current?.version === current.version && latest.version !== current.version) setOutdated(true); }
    catch (failure) { if (alive.current && failure instanceof ApiError && [401, 403, 404].includes(failure.status)) { setOutdated(true); setError(failure.message); } }
  }, []);
  useEffect(() => { alive.current = true; dialog.current?.showModal(); const overflow = document.body.style.overflow; document.body.style.overflow = "hidden"; void check();
    return () => { alive.current = false; checkSequence.current++; document.body.style.overflow = overflow; }; }, [check]);
  useLiveRecords(check);
  function close() { if (!busy.current) dirty || file ? setConfirm("close") : onClose(); }
  function accept(row: CatalogItem) { setItem(row); itemRef.current = row; setDraft(catalogDraft(row)); setOutdated(false); setSaved("Listing saved."); onSaved(row); }
  async function run(work: () => Promise<CatalogItem>, photo = false) {
    if (busy.current) return; busy.current = true; checkSequence.current++; setSaving(true); setError(""); setSaved("");
    try { const row = await work(); if (alive.current) { accept(row); if (photo) { setFile(null); setFileKey(value => value + 1); } } }
    catch (failure) { if (alive.current) { if (failure instanceof ApiError && failure.status === 409 && failure.message.includes("This listing changed")) setOutdated(true); setError(failure instanceof Error ? failure.message : "Could not save listing."); } }
    finally { busy.current = false; if (alive.current) setSaving(false); }
  }
  async function reload() {
    if (!item || busy.current) return;
    busy.current = true; checkSequence.current++; setSaving(true); setError("");
    try { const latest = await getCatalogItem(item.id); if (alive.current) { setItem(latest); itemRef.current = latest; setDraft(catalogDraft(latest)); setOutdated(false); setFile(null); setFileKey(value => value + 1); setSaved(""); } }
    catch (failure) { if (alive.current) setError(failure instanceof Error ? failure.message : "Could not reload listing."); }
    finally { busy.current = false; if (alive.current) setSaving(false); }
  }
  function save(event: React.FormEvent) {
    event.preventDefault(); if (outdated || busy.current) return;
    const parsed = catalogItemSchema.safeParse(draft);
    if (!parsed.success) { setError(parsed.error.issues.map(issue => issue.message).join(" ")); return; }
    void run(() => item ? updateCatalogItem(item.id, item.version, parsed.data) : createCatalogItem(parsed.data));
  }
  const photo = item ? catalogPhoto(item, true) : null;
  const parsedPlan = catalogPlanSchema.safeParse(draft.installmentPlan);
  const planPreview = parsedPlan.success ? catalogPlanBreakdown(parsedPlan.data) : null;
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="catalog-editor-title" onCancel={event => { event.preventDefault(); close(); }}>
    <header className={styles.editorHeading}><div><h2 id="catalog-editor-title">{item ? `Edit ${item.name}` : "Add catalog listing"}</h2><p>Published details appear on the public website.</p></div><button type="button" disabled={saving} onClick={close}>Close listing</button></header>
    {confirm && <div role="alert" className={styles.warning}><p>{confirm === "photo" ? "Remove the current product photo?" : "Discard unsaved changes?"}</p><div className={styles.actions}><button type="button" onClick={() => setConfirm(null)}>Keep editing</button><button type="button" onClick={() => { const action = confirm; setConfirm(null); if (action === "close") onClose(); else if (action === "reload") void reload(); else if (item) void run(() => removeCatalogPhoto(item), true); }}>{confirm === "photo" ? "Remove photo" : "Discard changes"}</button></div></div>}
    {outdated && <div className={styles.warning} role="alert">This listing changed. Your draft is preserved. Review the latest version before saving. <button type="button" disabled={saving} onClick={() => dirty || file ? setConfirm("reload") : void reload()}>Load latest listing</button></div>}
    {error && <p className={styles.error} role="alert">{error}</p>}{saved && <p className={styles.notice} role="status">{saved}</p>}
    <form onSubmit={save}><fieldset disabled={saving || Boolean(confirm)} className={styles.form}>
      <label>Model / listing name<input required minLength={2} maxLength={100} value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} /></label>
      <label>Listing code<input required minLength={2} maxLength={40} pattern="[A-Za-z0-9-]+" placeholder="IPHONE-13-128-PRE" value={draft.code} onChange={event => setDraft({ ...draft, code: event.target.value })} /><small>Use a different code for each model, storage or condition offer.</small></label>
      <label>Condition<select value={draft.condition} onChange={event => setDraft({ ...draft, condition: event.target.value as CatalogInput['condition'] })}>{Object.entries(catalogConditionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>Daily advertised rate (PHP)<input type="number" min="0.01" max="9999999999.99" step="0.01" inputMode="decimal" value={draft.dailyAmount ?? ""} onChange={event => setDraft({ ...draft, dailyAmount: event.target.value || null })} /><small>Leave blank to show “Ask for pricing”.</small></label>
      <label>Availability<select value={draft.availability} onChange={event => setDraft({ ...draft, availability: event.target.value as CatalogInput['availability'] })}>{catalogAvailability.map(value => <option key={value} value={value}>{catalogAvailabilityLabels[value]}</option>)}</select></label>
      <label>Display order<input type="number" min="0" max="9999" step="1" required value={Number.isFinite(draft.sortOrder) ? draft.sortOrder : ""} onChange={event => setDraft({ ...draft, sortOrder: event.target.value === "" ? NaN : Number(event.target.value) })} /><small>Lower numbers appear first.</small></label>
      <label className={styles.wide}>Public details<textarea maxLength={240} rows={3} value={draft.description} placeholder="Storage, color or details customers should know" onChange={event => setDraft({ ...draft, description: event.target.value })} /></label>
      <label>Existing product artwork<select value={draft.imageAsset ?? ""} onChange={event => setDraft({ ...draft, imageAsset: event.target.value as CatalogInput['imageAsset'] || null })}><option value="">Generic device illustration</option>{catalogAssets.map(asset => <option key={asset} value={asset}>{asset.replaceAll("-", " ")}</option>)}</select><small>An uploaded photo takes priority.</small></label>
      <label className={styles.check}><input type="checkbox" checked={draft.published} onChange={event => setDraft({ ...draft, published: event.target.checked })} />Published on the public website</label>
      <section className={`${styles.planSection} ${styles.wide}`} aria-label="Sample payment terms">
        <h3>Sample payment breakdown</h3>
        <p>Enter the full terms for this offer. Customers can preview payments and example dates before joining.</p>
        <label className={styles.check}><input type="checkbox" checked={draft.installmentPlan !== null} onChange={event => setDraft({ ...draft,
          installmentPlan: event.target.checked ? { totalAmount: "", installmentCount: NaN, cadence: "WEEKLY" } : null })} />Show a sample payment plan</label>
        {draft.installmentPlan ? <>
          <div className={styles.planFields}>
            <label>Total payable for this offer (PHP)<input required type="number" min="0.01" max="9999999999.99" step="0.01" inputMode="decimal" value={draft.installmentPlan.totalAmount} onChange={event => setDraft({ ...draft, installmentPlan: { ...draft.installmentPlan!, totalAmount: event.target.value } })} /><small>Enter the complete payable total. The daily advertisement does not calculate this amount.</small></label>
            <label>Number of installments<input required type="number" min="1" max="600" step="1" value={Number.isFinite(draft.installmentPlan.installmentCount) ? draft.installmentPlan.installmentCount : ""} onChange={event => setDraft({ ...draft, installmentPlan: { ...draft.installmentPlan!, installmentCount: event.target.value === "" ? NaN : Number(event.target.value) } })} /></label>
            <label>Payment interval<select value={draft.installmentPlan.cadence} onChange={event => setDraft({ ...draft, installmentPlan: { ...draft.installmentPlan!, cadence: event.target.value as NonNullable<CatalogInput['installmentPlan']>['cadence'] } })}>{Object.entries(catalogPlanLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><small>Fixed day intervals, matching the current records system.</small></label>
          </div>
          {planPreview && <p className={styles.planPreview} role="status">{draft.installmentPlan.installmentCount === 1 ? `1 payment of ${catalogPrice(planPreview.totalAmount)}` : `${draft.installmentPlan.installmentCount - 1} payment${draft.installmentPlan.installmentCount === 2 ? "" : "s"} of ${catalogPrice(planPreview.regularAmount)}, then ${catalogPrice(planPreview.finalAmount)}`}. Total {catalogPrice(planPreview.totalAmount)} over {planPreview.durationDays} days. The first payment falls one interval after the example start.</p>}
          <p>Use a separate listing for a different offer. Saving these terms does not issue a customer schedule or change an existing agreement.</p>
        </> : <p>Customers will be invited to contact the team for a breakdown. No term is inferred from the daily rate.</p>}
      </section>
      <div className={`${styles.actions} ${styles.wide}`}><button className={styles.primary} type="submit" disabled={outdated || (!dirty && Boolean(item))}>{saving ? "Saving…" : item ? "Save listing" : "Create listing"}</button><span>{draft.published ? "Customers can see this listing after saving." : "This listing will be hidden from customers."}</span></div>
    </fieldset></form>
    <section className={styles.photoSection} aria-label="Product photo"><h3>Product photo</h3><p>Upload a JPG, PNG or WebP up to 5 MB. Use a product photo suitable for public display.</p>
      {photo && <img src={photo} crossOrigin={item?.hasImage ? "use-credentials" : undefined} alt={`${item?.name} current product photo`} className={styles.photo} />}
      {!item ? <p>Save the listing first to upload a photo.</p> : <><label className={styles.file}>Choose product photo<input key={fileKey} type="file" accept="image/jpeg,image/png,image/webp" disabled={saving || outdated || Boolean(confirm)} onChange={event => { setFile(event.target.files?.[0] ?? null); setSaved(""); }} /></label>
        {dirty && <p>Save your listing changes before changing the photo.</p>}
        <div className={styles.actions}><button type="button" disabled={!file || saving || outdated || dirty || Boolean(confirm)} onClick={() => { if (file) void run(() => uploadCatalogPhoto(item, file), true); }}>Upload photo</button><button type="button" disabled={!photo || saving || outdated || dirty || Boolean(confirm)} onClick={() => setConfirm("photo")}>Remove current photo</button></div></>}
    </section>
  </dialog>;
}
