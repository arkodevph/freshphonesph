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
  updateEmployee,
  ROLES,
  type Employee,
} from "@/lib/api";
import { can, useMe } from "@/lib/useMe";

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

export default function TeamPage() {
  const me = useMe();
  const canAdmin = can(me, "ROLE_ASSIGN", "ACCOUNT_MANAGE");
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
  const [managedRole, setManagedRole] = useState("");
  const [managedActive, setManagedActive] = useState(true);
  const [managing, setManaging] = useState(false);
  const createDialogRef = useRef<HTMLDialogElement>(null);
  const manageDialogRef = useRef<HTMLDialogElement>(null);
  const requestRef = useRef(0);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = Boolean(query || roleFilter || statusFilter);

  const showToast = useCallback((next: Toast) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(next);
    toastTimerRef.current = setTimeout(() => setToast(null), 5000);
  }, []);

  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const loadDirectory = useCallback(async () => {
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
    } catch (error) {
      if (request !== requestRef.current) return;
      showToast({
        tone: "error",
        title: "Could not load accounts",
        message: error instanceof Error ? error.message : "Check your connection and try again.",
      });
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  }, [debouncedQuery, page, roleFilter, showToast, statusFilter]);

  const loadStats = useCallback(async () => {
    try {
      const [all, active, inactive] = await Promise.all([
        listEmployees({ page: "1" }),
        listEmployees({ page: "1", status: "active" }),
        listEmployees({ page: "1", status: "inactive" }),
      ]);
      setStats({ total: all.count, active: active.count, inactive: inactive.count });
    } catch {
      // The searchable directory remains usable when summary counts are unavailable.
    }
  }, []);

  useEffect(() => {
    if (canAdmin) void loadDirectory();
  }, [canAdmin, loadDirectory]);

  useEffect(() => {
    if (canAdmin) void loadStats();
  }, [canAdmin, loadStats]);

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
    setSaving(true);
    try {
      const created = await createEmployee({ ...form, full_name: form.full_name.trim(), email: form.email.trim() });
      createDialogRef.current?.close();
      setPage(1);
      await Promise.all([loadDirectory(), loadStats()]);
      showToast({ tone: "success", title: "Staff account created", message: `${created.full_name} can now sign in with the temporary password.` });
    } catch (error) {
      showToast({
        tone: "error",
        title: "Could not create the account",
        message: error instanceof Error ? error.message : "Check the details and try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  function openManage(account: Employee) {
    setManaged(account);
    setManagedRole(account.role);
    setManagedActive(account.status === "active");
    manageDialogRef.current?.showModal();
    requestAnimationFrame(() => {
      const dialog = manageDialogRef.current;
      const roleSelect = dialog?.querySelector<HTMLSelectElement>("#managed-role");
      if (roleSelect && !roleSelect.disabled) roleSelect.focus();
      else dialog?.querySelector<HTMLButtonElement>(".team-dialog-heading button")?.focus();
    });
  }

  async function saveManagedAccount(event: FormEvent) {
    event.preventDefault();
    if (!managed) return;
    const nextStatus = managedActive ? "active" : "inactive";
    const roleChanged = managedRole !== managed.role;
    const statusChanged = nextStatus !== managed.status;
    if (!roleChanged && !statusChanged) {
      manageDialogRef.current?.close();
      return;
    }
    setManaging(true);
    try {
      await updateEmployee(managed.id, {
        ...(roleChanged ? { role: managedRole } : {}),
        ...(statusChanged ? { status: nextStatus } : {}),
        version: managed.version,
      });
      manageDialogRef.current?.close();
      await Promise.all([loadDirectory(), loadStats()]);
      showToast({ tone: "success", title: "Account updated", message: `${managed.full_name} now has the selected access.` });
    } catch (error) {
      showToast({
        tone: "error",
        title: "Could not update the account",
        message: error instanceof Error ? error.message : "Refresh the account and try again.",
      });
      await loadDirectory();
    } finally {
      setManaging(false);
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
        <button type="button" className="team-primary-button" onClick={openCreate}>
          <UserPlus weight="bold" /> Add staff account
        </button>
      </section>

      <section className="team-summary-grid" aria-label="Account summary">
        <SummaryCard label="All accounts" value={stats.total} detail="Staff and customer access" tone="violet" />
        <SummaryCard label="Active" value={stats.active} detail="Can currently sign in" tone="green" />
        <SummaryCard label="Inactive" value={stats.inactive} detail="Access has been paused" tone="slate" />
      </section>

      <section className="team-directory" aria-labelledby="account-directory-title">
        <div className="team-directory-heading">
          <div>
            <h3 id="account-directory-title">Account directory</h3>
            <p>{resultSummary}</p>
          </div>
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

      <dialog ref={createDialogRef} className="team-dialog" aria-labelledby="create-account-title" onClose={() => setFieldErrors({})}>
        <form onSubmit={createAccount} noValidate>
          <DialogHeading headingId="create-account-title" title="Add staff account" description="Create individual access and assign the person’s least-privilege role." onClose={() => createDialogRef.current?.close()} />
          <div className="team-dialog-body">
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
          </div>
          <div className="team-dialog-actions">
            <button type="button" className="team-secondary-button" onClick={() => createDialogRef.current?.close()}>Cancel</button>
            <button type="submit" className="team-primary-button" disabled={saving}>{saving ? "Creating account…" : "Create account"}</button>
          </div>
        </form>
      </dialog>

      <dialog ref={manageDialogRef} className="team-dialog team-manage-dialog" aria-labelledby="manage-account-title">
        {managed && (
          <form onSubmit={saveManagedAccount}>
            <DialogHeading headingId="manage-account-title" title="Manage account" description="Changes to roles and sign-in access are audited." onClose={() => manageDialogRef.current?.close()} />
            <div className="team-dialog-body">
              <div className="team-managed-person">
                <span className="team-person-avatar">{initials(managed.full_name)}</span>
                <div><strong>{managed.full_name}</strong><small>{managed.email}</small></div>
              </div>
              <Field label="Role" inputId="managed-role">
                <select
                  id="managed-role"
                  value={managedRole}
                  onChange={(event) => setManagedRole(event.target.value)}
                  disabled={managed.role === "customer" || String(managed.id) === String(me?.id)}
                >
                  {managed.role === "customer" && <option value="customer">Customer</option>}
                  {ROLES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <small>{managed.role === "customer" ? "Customer access is linked from the client record." : roleDescriptions[managedRole]}</small>
              </Field>
              <label className={`team-access-switch${!managedActive ? " is-paused" : ""}`}>
                <span><strong>Sign-in access</strong><small>{managedActive ? "This person can sign in." : "This person’s access is paused."}</small></span>
                <input type="checkbox" checked={managedActive} onChange={(event) => setManagedActive(event.target.checked)} disabled={String(managed.id) === String(me?.id)} />
                <i aria-hidden="true" />
              </label>
              {String(managed.id) === String(me?.id) && <p className="team-self-note">For safety, you cannot change your own role or deactivate your own account here.</p>}
            </div>
            <div className="team-dialog-actions">
              <button type="button" className="team-secondary-button" onClick={() => manageDialogRef.current?.close()}>Cancel</button>
              <button type="submit" className="team-primary-button" disabled={managing}>{managing ? "Saving changes…" : "Save changes"}</button>
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

function DialogHeading({ headingId, title, description, onClose }: { headingId: string; title: string; description: string; onClose: () => void }) {
  return (
    <header className="team-dialog-heading">
      <div><h3 id={headingId}>{title}</h3><p>{description}</p></div>
      <button type="button" onClick={onClose} aria-label="Close dialog"><X /></button>
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
