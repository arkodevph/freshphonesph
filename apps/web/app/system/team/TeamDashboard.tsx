"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";
import {
  CaretLeft,
  CaretRight,
  CheckCircle,
  MagnifyingGlass,
  ShieldCheck,
  UserPlus,
  Users,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import {
  createEmployee,
  listEmployees,
  getEmployee,
  updateEmployee,
  ROLES,
  type Employee,
} from "@/lib/api";
import { can, useMe } from "@/lib/useMe";
import { useLiveRecords } from "@/lib/useLiveRecords";
import { ApiError } from "@/lib/ts-api";
import { TYPESCRIPT_API } from "@/lib/backend";
import HrAccessHistory from "./HrAccessHistory";

const PAGE_SIZE = 20;
const EMPTY_FORM = { email: "", full_name: "", role: "records_monitoring", password: "" };
const roleDescriptions: Record<string, string> = {
  owner: "Full oversight, account administration, and sensitive workflows.",
  coo: "Broad operations, records, payments, and reporting access.",
  general_manager: "Operations, clients, records, and management reporting.",
  hr_payroll: "Approved HR and payroll responsibilities.",
  finance_officer: "Payment recording, verification, and finance reporting.",
  records_monitoring: "Paluwagan batches, client records, and monitoring.",
  analytics: "Authorized summaries, reports, and trends.",
  cs_head: "Customer service oversight and resolution workflows.",
  cs_team: "Customer support work assigned to the service team.",
  core_handler: "Only assigned operational work and records.",
  customer: "Access to the customer’s own portal records only.",
};

const roleLabel = (value: string) =>
  value === "customer" ? "Customer" : ROLES.find(([key]) => key === value)?.[1] ?? value;

const initials = (name: string) => name
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0])
  .join("")
  .toUpperCase();

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric" }).format(date);
};

type Toast = { tone: "success" | "error"; title: string; message: string };
type CreateField = keyof typeof EMPTY_FORM;
type AccessDraft = { role: string; active: boolean; version?: number;
  hrConfidentialAccess: boolean; hrAccessReason: string; hrDecision: boolean };

export default function TeamDashboard() {
  const me = useMe();
  const canAdmin = can(me, "ROLE_ASSIGN", "ACCOUNT_MANAGE");
  const search = useSearchParams();
  const queryAccount = search.get("account");
  const focusedAccount = queryAccount && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(queryAccount) ? queryAccount : null;
  const [accounts, setAccounts] = useState<Employee[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState<Toast | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<CreateField, string>>>({});
  const [saving, setSaving] = useState(false);
  const [managed, setManaged] = useState<Employee | null>(null);
  const [drafts, setDrafts] = useState<Record<string, AccessDraft>>({});
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [managing, setManaging] = useState(false);
  const createDialogRef = useRef<HTMLDialogElement>(null);
  const manageDialogRef = useRef<HTMLDialogElement>(null);
  const requestRef = useRef(0);
  const statsRef = useRef(0);
  const detailRef = useRef(0);
  const selectedRef = useRef<string | null>(null);
  const mutationRef = useRef(false);
  const privateVersionRef = useRef(0);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = Boolean(query || roleFilter || statusFilter);
  const accessDraft = managed ? drafts[String(managed.id)] : null;
  const managedRole = accessDraft?.role ?? managed?.role ?? "";
  const managedActive = accessDraft?.active ?? (managed?.status === "active");
  const hrEligible = ["hr_payroll", "coo"].includes(managedRole);
  const managedHrAccess = hrEligible && managedActive && (accessDraft?.hrConfidentialAccess ?? managed?.hr_confidential_access ?? false);
  const explicitHrDecision = Boolean(accessDraft?.hrDecision && hrEligible && managedActive &&
    (managedHrAccess !== Boolean(managed?.hr_confidential_access) || managedRole !== managed?.role));
  const staleDraft = Boolean(accessDraft && accessDraft.version !== managed?.version);

  const showToast = useCallback((next: Toast) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(next);
    toastTimerRef.current = setTimeout(() => setToast(null), 5000);
  }, []);

  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);

  const clearPrivate = useCallback(() => {
    ++privateVersionRef.current;
    ++requestRef.current; ++statsRef.current; ++detailRef.current; selectedRef.current = null;
    manageDialogRef.current?.close(); createDialogRef.current?.close();
    setAccounts([]); setTotal(0); setStats({ total: 0, active: 0, inactive: 0 }); setManaged(null); setDrafts({}); setForm(EMPTY_FORM);
    setLoading(false); setDetailLoading(false);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(null); setFieldErrors({});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const loadDirectory = useCallback(async () => {
    if (!canAdmin) return;
    const request = ++requestRef.current;
    setLoading(true);
    try {
      const result = await listEmployees({
        page: String(page),
        ...(debouncedQuery ? { q: debouncedQuery } : {}),
        ...(roleFilter ? { role: roleFilter } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      });
      if (request !== requestRef.current) return;
      setAccounts(result.results);
      setTotal(result.count);
      if (page > Math.max(1, Math.ceil(result.count / PAGE_SIZE))) setPage(Math.max(1, Math.ceil(result.count / PAGE_SIZE)));
    } catch (error) {
      if (request !== requestRef.current) return;
      if (error instanceof ApiError && [401, 403].includes(error.status)) clearPrivate();
      setAccounts([]); setTotal(0);
      showToast({
        tone: "error",
        title: "Could not load accounts",
        message: error instanceof Error ? error.message : "Check your connection and try again.",
      });
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  }, [canAdmin, clearPrivate, debouncedQuery, page, roleFilter, showToast, statusFilter]);

  const loadStats = useCallback(async () => {
    if (!canAdmin) return;
    const request = ++statsRef.current;
    try {
      const [all, active, inactive] = await Promise.all([
        listEmployees({ page: "1" }),
        listEmployees({ page: "1", status: "active" }),
        listEmployees({ page: "1", status: "inactive" }),
      ]);
      if (request === statsRef.current) setStats({ total: all.count, active: active.count, inactive: inactive.count });
    } catch (error) {
      if (request !== statsRef.current) return;
      if (error instanceof ApiError && [401, 403].includes(error.status)) clearPrivate();
      // The searchable directory remains usable when summary counts are unavailable.
    }
  }, [canAdmin, clearPrivate]);

  const loadManaged = useCallback(async (id: string) => {
    if (!canAdmin || selectedRef.current !== id) return;
    const request = ++detailRef.current;
    setDetailLoading(true); setDetailError(null);
    try {
      const account = await getEmployee(id);
      if (request === detailRef.current && selectedRef.current === id) setManaged(account);
    } catch (error) {
      if (request !== detailRef.current || selectedRef.current !== id) return;
      setManaged(null); manageDialogRef.current?.close();
      if (error instanceof ApiError && [401, 403].includes(error.status)) clearPrivate();
      setDetailError(error instanceof Error ? error.message : "Could not load this account.");
    } finally { if (request === detailRef.current) setDetailLoading(false); }
  }, [canAdmin, clearPrivate]);

  useEffect(() => {
    if (canAdmin) void loadDirectory();
    return () => { ++requestRef.current; };
  }, [canAdmin, loadDirectory]);

  useEffect(() => {
    if (canAdmin) void loadStats();
    return () => { ++statsRef.current; };
  }, [canAdmin, loadStats]);

  useEffect(() => {
    if (!canAdmin || !focusedAccount) return;
    manageDialogRef.current?.close(); createDialogRef.current?.close();
    ++detailRef.current; selectedRef.current = focusedAccount; setManaged(null);
    void loadManaged(focusedAccount);
    return () => { ++detailRef.current; };
  }, [canAdmin, focusedAccount, loadManaged]);
  useEffect(() => {
    if (!canAdmin) clearPrivate();
  }, [canAdmin, clearPrivate]);
  useEffect(() => {
    if (!managed || !canAdmin || selectedRef.current !== String(managed.id)) return;
    if (!manageDialogRef.current?.open) manageDialogRef.current?.showModal();
    requestAnimationFrame(() => {
      const roleSelect = manageDialogRef.current?.querySelector<HTMLSelectElement>("#managed-role");
      if (roleSelect && !roleSelect.disabled) roleSelect.focus();
      else manageDialogRef.current?.querySelector<HTMLButtonElement>(".team-dialog-heading button")?.focus();
    });
  }, [managed?.id, canAdmin]);
  useLiveRecords(() => {
    void loadDirectory(); void loadStats();
    if (selectedRef.current) void loadManaged(selectedRef.current);
  }, canAdmin);

  const resultSummary = useMemo(() => {
    if (loading) return "Loading accounts…";
    if (total === 0) return hasFilters ? "No matching accounts" : "No accounts yet";
    const start = (page - 1) * PAGE_SIZE + 1;
    const end = Math.min(page * PAGE_SIZE, total);
    return `Showing ${start}–${end} of ${total} accounts`;
  }, [hasFilters, loading, page, total]);

  function clearFilters() {
    setQuery("");
    setDebouncedQuery("");
    setRoleFilter("");
    setStatusFilter("");
    setPage(1);
  }

  function openCreate() {
    if (mutationRef.current) return;
    setForm(EMPTY_FORM);
    setFieldErrors({});
    createDialogRef.current?.showModal();
    requestAnimationFrame(() => createDialogRef.current?.querySelector<HTMLInputElement>("#staff-name")?.focus());
  }

  function validateField(name: CreateField, value: string) {
    let message = "";
    if (name === "full_name" && value.trim().length < 2) message = "Enter the person’s full name.";
    if (name === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) message = "Enter a valid email address.";
    if (name === "password" && value.length < 12) message = "Use at least 12 characters.";
    if (name === "role" && !ROLES.some(([role]) => role === value)) message = "Choose a staff role.";
    setFieldErrors((current) => ({ ...current, [name]: message || undefined }));
    return message;
  }

  async function createAccount(event: FormEvent) {
    event.preventDefault();
    if (mutationRef.current) return;
    const errors = (Object.keys(form) as CreateField[]).reduce<Partial<Record<CreateField, string>>>((result, name) => {
      const message = validateField(name, form[name]);
      if (message) result[name] = message;
      return result;
    }, {});
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      showToast({ tone: "error", title: "Review the highlighted fields", message: "The account has not been created." });
      return;
    }
    const privateVersion = privateVersionRef.current;
    mutationRef.current = true; setSaving(true);
    try {
      const created = await createEmployee({ ...form, full_name: form.full_name.trim(), email: form.email.trim() });
      if (privateVersion !== privateVersionRef.current) return;
      createDialogRef.current?.close();
      setPage(1);
      await Promise.all([loadDirectory(), loadStats()]);
      if (privateVersion !== privateVersionRef.current) return;
      showToast({ tone: "success", title: "Staff account created", message: `${created.full_name} can now sign in with the temporary password.` });
    } catch (error) {
      if (privateVersion !== privateVersionRef.current) return;
      if (error instanceof ApiError && [401, 403].includes(error.status)) clearPrivate();
      showToast({
        tone: "error",
        title: "Could not create the account",
        message: error instanceof Error ? error.message : "Check the details and try again.",
      });
    } finally {
      mutationRef.current = false; setSaving(false);
    }
  }

  function openManage(account: Employee) {
    ++detailRef.current; selectedRef.current = String(account.id); setDetailError(null);
    setManaged(account);
    void loadManaged(String(account.id));
  }
  function closeManage() {
    if (mutationRef.current) return;
    ++detailRef.current; selectedRef.current = null; setManaged(null); setDetailError(null); setDetailLoading(false);
    manageDialogRef.current?.close();
    if (focusedAccount) window.history.replaceState(null, "", "/system/team");
  }
  function editAccess(patch: Partial<AccessDraft>) {
    if (!managed) return;
    setDrafts((current) => {
      const previous = current[String(managed.id)] ?? { role: managed.role, active: managed.status === "active", version: managed.version,
        hrConfidentialAccess: managed.hr_confidential_access ?? false, hrAccessReason: "", hrDecision: false };
      const next = { ...previous, ...patch };
      if ((patch.role !== undefined && patch.role !== previous.role) || (patch.active !== undefined && patch.active !== previous.active)) {
        next.hrConfidentialAccess = next.role === managed.role && next.active ? managed.hr_confidential_access ?? false : false;
        next.hrDecision = false; next.hrAccessReason = "";
      }
      return { ...current, [String(managed.id)]: next };
    });
  }
  function discardAccess(id: string) {
    setDrafts((current) => { const next = { ...current }; delete next[id]; return next; });
  }

  async function saveManagedAccount(event: FormEvent) {
    event.preventDefault();
    if (!managed || staleDraft || detailLoading || mutationRef.current) return;
    const nextStatus = managedActive ? "active" : "inactive";
    const roleChanged = managedRole !== managed.role;
    const statusChanged = nextStatus !== managed.status;
    if (!roleChanged && !statusChanged && !explicitHrDecision) {
      closeManage();
      return;
    }
    const account = managed;
    const privateVersion = privateVersionRef.current;
    mutationRef.current = true; setManaging(true);
    try {
      await updateEmployee(account.id, {
        ...(roleChanged ? { role: managedRole } : {}),
        ...(statusChanged ? { status: nextStatus } : {}),
        ...(explicitHrDecision ? { hr_confidential_access: managedHrAccess, hr_access_reason: accessDraft?.hrAccessReason } : {}),
        version: accessDraft?.version ?? account.version,
      });
      if (privateVersion !== privateVersionRef.current) return;
      discardAccess(String(account.id));
      if (selectedRef.current === String(account.id)) {
        ++detailRef.current; selectedRef.current = null; setManaged(null); manageDialogRef.current?.close();
        if (focusedAccount) window.history.replaceState(null, "", "/system/team");
      }
      await Promise.all([loadDirectory(), loadStats()]);
      if (privateVersion !== privateVersionRef.current) return;
      showToast({ tone: "success", title: "Account updated", message: `${account.full_name} now has the selected access.` });
    } catch (error) {
      if (privateVersion !== privateVersionRef.current) return;
      const accessDenied = error instanceof ApiError && [401, 403].includes(error.status);
      if (accessDenied) clearPrivate();
      showToast({
        tone: "error",
        title: "Could not update the account",
        message: error instanceof Error ? error.message : "Refresh the account and try again.",
      });
      if (accessDenied) return;
      await loadDirectory();
      if (privateVersion !== privateVersionRef.current) return;
      if (selectedRef.current === String(account.id)) await loadManaged(String(account.id));
    } finally {
      mutationRef.current = false; setManaging(false);
    }
  }

  if (me && !canAdmin) {
    return (
      <section className="team-access-denied">
        <span><ShieldCheck weight="fill" /></span>
        <h2>Owner access required</h2>
        <p>User accounts and role assignments are limited to the Owner.</p>
      </section>
    );
  }

  return (
    <div className="team-page">
      <section className="team-page-heading">
        <div>
          <p className="team-kicker">Access control</p>
          <h2>User management</h2>
          <p>Find people, review their role, and control access from one directory.</p>
        </div>
        <button type="button" className="team-primary-button" disabled={saving || managing} onClick={openCreate}>
          <UserPlus weight="bold" /> Add staff account
        </button>
      </section>

      <section className="team-summary-grid" aria-label="Account summary">
        <SummaryCard label="All accounts" value={stats.total} detail="Staff and customer access" tone="violet" />
        <SummaryCard label="Active" value={stats.active} detail="Can currently sign in" tone="green" />
        <SummaryCard label="Inactive" value={stats.inactive} detail="Access has been paused" tone="slate" />
      </section>

      <section className="team-directory" aria-labelledby="account-directory-title">
        {(detailLoading || detailError) && <div className="team-dialog-body" role={detailError ? "alert" : "status"}>
          <p>{detailError ?? "Loading current account settings…"}</p>
          {detailError && selectedRef.current && <button type="button" className="team-secondary-button" onClick={() => { if (selectedRef.current) void loadManaged(selectedRef.current); }}>Retry account</button>}
        </div>}
        <div className="team-directory-heading">
          <div>
            <h3 id="account-directory-title">Account directory</h3>
            <p>{resultSummary}</p>
          </div>
          <button type="button" className="team-secondary-button" disabled={loading} onClick={() => { void loadDirectory(); void loadStats(); }}>Refresh accounts</button>
        </div>

        <div className="team-toolbar">
          <label className="team-search-field">
            <span className="sr-only">Search accounts</span>
            <MagnifyingGlass aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => { setQuery(event.target.value); setPage(1); }}
              placeholder="Search by name or email"
            />
          </label>
          <label className="team-filter-field">
            <span>Role</span>
            <select value={roleFilter} onChange={(event) => { setRoleFilter(event.target.value); setPage(1); }}>
              <option value="">All roles</option>
              {ROLES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              <option value="customer">Customer</option>
            </select>
          </label>
          <label className="team-filter-field">
            <span>Status</span>
            <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}>
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          {hasFilters && <button type="button" className="team-clear-button" onClick={clearFilters}><X /> Clear</button>}
        </div>

        <div className="team-table-wrap">
          <table className="team-table">
            <thead>
              <tr>
                <th>Person</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }, (_, index) => <SkeletonRow key={index} />)
              ) : accounts.length ? (
                accounts.map((account) => {
                  const isSelf = String(account.id) === String(me?.id);
                  return (
                    <tr key={account.id}>
                      <td data-label="Person">
                        <div className="team-person">
                          <span className="team-person-avatar">{initials(account.full_name)}</span>
                          <span>
                            <strong>{account.full_name}{isSelf && <small> You</small>}</strong>
                            <em>{account.email}</em>
                          </span>
                        </div>
                      </td>
                      <td data-label="Role"><span className="team-role-badge">{roleLabel(account.role)}</span></td>
                      <td data-label="Status"><span className={`team-status-badge is-${account.status}`}><i />{account.status}</span></td>
                      <td data-label="Created" className="team-created-cell">{formatDate(account.created_at)}</td>
                      <td data-label="Action" className="team-action-cell">
                        <button type="button" onClick={() => openManage(account)} aria-label={`Manage ${account.full_name}`}>Manage</button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="team-empty-cell">
                    <span><Users /></span>
                    <strong>{hasFilters ? "No accounts match these filters" : "No accounts yet"}</strong>
                    <p>{hasFilters ? "Try a broader search or clear the filters." : "Add the first staff account to start the directory."}</p>
                    {hasFilters && <button type="button" onClick={clearFilters}>Clear filters</button>}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <footer className="team-pagination">
          <p>Page {page} of {pageCount}</p>
          <div>
            <button type="button" onClick={() => setPage((current) => current - 1)} disabled={page <= 1} aria-label="Previous page"><CaretLeft /></button>
            <button type="button" onClick={() => setPage((current) => current + 1)} disabled={page >= pageCount} aria-label="Next page"><CaretRight /></button>
          </div>
        </footer>
      </section>

      <dialog ref={createDialogRef} className="team-dialog" aria-labelledby="create-account-title" onClose={() => setFieldErrors({})} onCancel={(event) => { if (saving) event.preventDefault(); }}>
        <form onSubmit={createAccount} noValidate>
          <DialogHeading headingId="create-account-title" title="Add staff account" description="Create individual access and assign the person’s least-privilege role." onClose={() => createDialogRef.current?.close()} disabled={saving} />
          <fieldset disabled={saving || managing} className="team-dialog-body">
            <Field label="Full name" error={fieldErrors.full_name} inputId="staff-name">
              <input id="staff-name" autoFocus required value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} onBlur={(event) => validateField("full_name", event.target.value)} aria-invalid={Boolean(fieldErrors.full_name)} aria-describedby={fieldErrors.full_name ? "staff-name-error" : undefined} placeholder="Juan Dela Cruz" />
            </Field>
            <Field label="Work email" error={fieldErrors.email} inputId="staff-email">
              <input id="staff-email" type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} onBlur={(event) => validateField("email", event.target.value)} aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? "staff-email-error" : undefined} placeholder="name@freshphones.ph" />
            </Field>
            <Field label="Role" error={fieldErrors.role} inputId="staff-role">
              <select id="staff-role" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} onBlur={(event) => validateField("role", event.target.value)}>
                {ROLES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <small>{roleDescriptions[form.role]}</small>
            </Field>
            <Field label="Temporary password" error={fieldErrors.password} inputId="staff-password">
              <input id="staff-password" type="password" required minLength={12} autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} onBlur={(event) => validateField("password", event.target.value)} aria-invalid={Boolean(fieldErrors.password)} aria-describedby={fieldErrors.password ? "staff-password-error" : "staff-password-help"} placeholder="At least 12 characters" />
              {!fieldErrors.password && <small id="staff-password-help">Share it privately and ask the person to replace it after signing in.</small>}
            </Field>
          </fieldset>
          <div className="team-dialog-actions">
            <button type="button" disabled={saving} className="team-secondary-button" onClick={() => createDialogRef.current?.close()}>Cancel</button>
            <button type="submit" className="team-primary-button" disabled={saving}>{saving ? "Creating account…" : "Create account"}</button>
          </div>
        </form>
      </dialog>

      <dialog ref={manageDialogRef} className="team-dialog team-manage-dialog" aria-labelledby="manage-account-title" onCancel={(event) => { event.preventDefault(); closeManage(); }}>
        {managed && (
          <form onSubmit={saveManagedAccount}>
            <DialogHeading headingId="manage-account-title" title="Manage account" description="Review current access before making changes. Changes are audited." onClose={closeManage} disabled={managing || saving} />
            <div className="team-dialog-body">
              <div className="team-managed-person">
                <span className="team-person-avatar">{initials(managed.full_name)}</span>
                <div><strong>{managed.full_name}</strong><small>{managed.email}</small></div>
              </div>
              <Field label="Role" inputId="managed-role">
                <select
                  id="managed-role"
                  value={managedRole}
                  onChange={(event) => editAccess({ role: event.target.value })}
                  disabled={managing || saving || managed.role === "customer" || String(managed.id) === String(me?.id)}
                >
                  {managed.role === "customer" && <option value="customer">Customer</option>}
                  {ROLES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <small>{managed.role === "customer" ? "Customer access is linked from the client record." : roleDescriptions[managedRole]}</small>
              </Field>
              <label className={`team-access-switch${!managedActive ? " is-paused" : ""}`}>
                <span><strong>Sign-in access</strong><small>{managedActive ? "This person can sign in." : "This person’s access is paused."}</small></span>
                <input type="checkbox" checked={managedActive} onChange={(event) => editAccess({ active: event.target.checked })} disabled={managing || saving || String(managed.id) === String(me?.id)} />
                <i aria-hidden="true" />
              </label>
              {String(managed.id) === String(me?.id) && <p className="team-self-note">For safety, you cannot change your own role or deactivate your own account here.</p>}
              {TYPESCRIPT_API && <>
                <label className={`team-access-switch${!managedHrAccess && managedRole !== "owner" ? " is-paused" : ""}`}>
                  <span><strong>Confidential HR access</strong><small>{managedRole === "owner" ? "Owner access is automatic."
                    : !hrEligible ? "Only HR / Payroll and COO can receive an Owner grant."
                    : !managedActive ? "Activate sign-in before granting confidential access."
                    : "Allow private KPI evaluations and applicant records, notes and attachments."}</small></span>
                  <input type="checkbox" checked={managedRole === "owner" || managedHrAccess}
                    onChange={(event) => editAccess({ hrConfidentialAccess: event.target.checked, hrDecision: true })}
                    disabled={managing || saving || !hrEligible || !managedActive} />
                  <i aria-hidden="true" />
                </label>
                {explicitHrDecision && <Field label="Reason for HR access decision" inputId="managed-hr-reason">
                  <textarea id="managed-hr-reason" required minLength={3} maxLength={1000} rows={3}
                    value={accessDraft?.hrAccessReason ?? ""} onChange={(event) => editAccess({ hrAccessReason: event.target.value })}
                    disabled={managing || saving} />
                  <small>The decision, reason, Owner and date are recorded. The person must sign in again.</small>
                </Field>}
                {managed.hr_confidential_access && !managedHrAccess && !explicitHrDecision &&
                  <p className="team-self-note">Saving this role or sign-in change will revoke the existing HR grant. A new grant requires an Owner decision.</p>}
                <HrAccessHistory key={`${managed.id}:${managed.version}`} accountId={managed.id} />
              </>}
              {detailLoading && <p role="status">Refreshing current account settings…</p>}
              {staleDraft && <p className="team-self-note" role="alert">This account changed. Your draft is retained; discard it and review current access before saving.</p>}
              {accessDraft && <button type="button" className="team-secondary-button" disabled={managing || saving} onClick={() => discardAccess(String(managed.id))}>Discard access draft</button>}
            </div>
            <div className="team-dialog-actions">
              <button type="button" className="team-secondary-button" disabled={managing || saving} onClick={closeManage}>Cancel</button>
              <button type="submit" className="team-primary-button" disabled={managing || saving || staleDraft || detailLoading || (explicitHrDecision && (accessDraft?.hrAccessReason.trim().length ?? 0) < 3)}>{managing ? "Saving changes…" : "Save changes"}</button>
            </div>
          </form>
        )}
      </dialog>

      {toast && (
        <div className="team-toast-region" aria-live={toast.tone === "error" ? "assertive" : "polite"}>
          <div className={`team-toast is-${toast.tone}`} role={toast.tone === "error" ? "alert" : "status"}>
            <span className="team-toast-icon">{toast.tone === "error" ? <WarningCircle weight="fill" /> : <CheckCircle weight="fill" />}</span>
            <div><strong>{toast.title}</strong><p>{toast.message}</p></div>
            <button type="button" onClick={() => setToast(null)} aria-label="Dismiss notification"><X /></button>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, detail, tone }: { label: string; value: number; detail: string; tone: string }) {
  return (
    <article className="team-summary-card">
      <span className={`team-summary-icon is-${tone}`}><Users weight="fill" /></span>
      <div><p>{label}</p><strong>{value}</strong><small>{detail}</small></div>
    </article>
  );
}

function Field({ label, error, inputId, children }: { label: string; error?: string; inputId: string; children: ReactNode }) {
  return (
    <label className="team-form-field" htmlFor={inputId}>
      <span>{label}</span>
      {children}
      {error && <em id={`${inputId}-error`}>{error}</em>}
    </label>
  );
}

function DialogHeading({ headingId, title, description, onClose, disabled = false }: { headingId: string; title: string; description: string; onClose: () => void; disabled?: boolean }) {
  return (
    <header className="team-dialog-heading">
      <div><h3 id={headingId}>{title}</h3><p>{description}</p></div>
      <button type="button" disabled={disabled} onClick={onClose} aria-label="Close dialog"><X /></button>
    </header>
  );
}

function SkeletonRow() {
  return (
    <tr className="team-skeleton-row" aria-hidden="true">
      <td><span className="team-skeleton is-person" /></td>
      <td><span className="team-skeleton" /></td>
      <td><span className="team-skeleton is-short" /></td>
      <td><span className="team-skeleton" /></td>
      <td><span className="team-skeleton is-short" /></td>
    </tr>
  );
}
