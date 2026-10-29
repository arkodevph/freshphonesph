"use client";

import {
  createEmployee,
  getEmployee,
  listEmployees,
  ROLES,
  updateEmployee,
  type Employee,
} from "@/lib/api";
import { ApiError } from "@/lib/ts-api";
import { useLiveRecords } from "@/lib/useLiveRecords";
import { can, useMe } from "@/lib/useMe";
import {
  CheckCircle,
  ShieldCheck,
  UserPlus,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import AccountDirectory from "./AccountDirectory";
import CreateAccountDialog from "./CreateAccountDialog";
import ManageAccountDialog from "./ManageAccountDialog";
import {
  AccessDraft,
  CreateField,
  EMPTY_FORM,
  PAGE_SIZE,
  SummaryCard,
  Toast,
} from "./team-view";

export default function TeamDashboard() {
  const me = useMe();

  const canAdmin = can(me, "ROLE_ASSIGN", "ACCOUNT_MANAGE");

  const search = useSearchParams();

  const queryAccount = search.get("account");

  const focusedAccount =
    queryAccount &&
    /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(queryAccount)
      ? queryAccount
      : null;

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

  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<CreateField, string>>
  >({});

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

  const managedActive = accessDraft?.active ?? managed?.status === "active";

  const hrEligible = ["hr_payroll", "coo"].includes(managedRole);

  const managedHrAccess =
    hrEligible &&
    managedActive &&
    (accessDraft?.hrConfidentialAccess ??
      managed?.hr_confidential_access ??
      false);

  const explicitHrDecision = Boolean(
    accessDraft?.hrDecision &&
    hrEligible &&
    managedActive &&
    (managedHrAccess !== Boolean(managed?.hr_confidential_access) ||
      managedRole !== managed?.role),
  );

  const staleDraft = Boolean(
    accessDraft && accessDraft.version !== managed?.version,
  );

  const showToast = useCallback((next: Toast) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }

    setToast(next);

    toastTimerRef.current = setTimeout(() => {
      return setToast(null);
    }, 5000);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const clearPrivate = useCallback(() => {
    ++privateVersionRef.current;

    ++requestRef.current;

    ++statsRef.current;

    ++detailRef.current;

    selectedRef.current = null;

    manageDialogRef.current?.close();

    createDialogRef.current?.close();

    setAccounts([]);

    setTotal(0);

    setStats({ total: 0, active: 0, inactive: 0 });

    setManaged(null);

    setDrafts({});

    setForm(EMPTY_FORM);

    setLoading(false);

    setDetailLoading(false);

    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }

    setToast(null);

    setFieldErrors({});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      return setDebouncedQuery(query.trim());
    }, 300);

    return () => {
      return clearTimeout(timer);
    };
  }, [query]);

  const loadDirectory = useCallback(async () => {
    if (!canAdmin) {
      return;
    }

    const request = ++requestRef.current;

    setLoading(true);

    try {
      const result = await listEmployees({
        page: String(page),
        ...(debouncedQuery ? { q: debouncedQuery } : {}),
        ...(roleFilter ? { role: roleFilter } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      });

      if (request !== requestRef.current) {
        return;
      }

      setAccounts(result.results);

      setTotal(result.count);

      if (page > Math.max(1, Math.ceil(result.count / PAGE_SIZE))) {
        setPage(Math.max(1, Math.ceil(result.count / PAGE_SIZE)));
      }
    } catch (error) {
      if (request !== requestRef.current) {
        return;
      }

      if (error instanceof ApiError && [401, 403].includes(error.status)) {
        clearPrivate();
      }

      setAccounts([]);

      setTotal(0);

      showToast({
        tone: "error",
        title: "Could not load accounts",
        message:
          error instanceof Error
            ? error.message
            : "Check your connection and try again.",
      });
    } finally {
      if (request === requestRef.current) {
        setLoading(false);
      }
    }
  }, [
    canAdmin,
    clearPrivate,
    debouncedQuery,
    page,
    roleFilter,
    showToast,
    statusFilter,
  ]);

  const loadStats = useCallback(async () => {
    if (!canAdmin) {
      return;
    }

    const request = ++statsRef.current;

    try {
      const [all, active, inactive] = await Promise.all([
        listEmployees({ page: "1" }),
        listEmployees({ page: "1", status: "active" }),
        listEmployees({ page: "1", status: "inactive" }),
      ]);

      if (request === statsRef.current) {
        setStats({
          total: all.count,
          active: active.count,
          inactive: inactive.count,
        });
      }
    } catch (error) {
      if (request !== statsRef.current) {
        return;
      }

      if (error instanceof ApiError && [401, 403].includes(error.status)) {
        clearPrivate();
      }
      // The searchable directory remains usable when summary counts are unavailable.
    }
  }, [canAdmin, clearPrivate]);

  const loadManaged = useCallback(
    async (id: string) => {
      if (!canAdmin || selectedRef.current !== id) {
        return;
      }

      const request = ++detailRef.current;

      setDetailLoading(true);

      setDetailError(null);

      try {
        const account = await getEmployee(id);

        if (request === detailRef.current && selectedRef.current === id) {
          setManaged(account);
        }
      } catch (error) {
        if (request !== detailRef.current || selectedRef.current !== id) {
          return;
        }

        setManaged(null);

        manageDialogRef.current?.close();

        if (error instanceof ApiError && [401, 403].includes(error.status)) {
          clearPrivate();
        }

        setDetailError(
          error instanceof Error
            ? error.message
            : "Could not load this account.",
        );
      } finally {
        if (request === detailRef.current) {
          setDetailLoading(false);
        }
      }
    },
    [canAdmin, clearPrivate],
  );

  useEffect(() => {
    if (canAdmin) {
      void loadDirectory();
    }

    return () => {
      ++requestRef.current;
    };
  }, [canAdmin, loadDirectory]);

  useEffect(() => {
    if (canAdmin) {
      void loadStats();
    }

    return () => {
      ++statsRef.current;
    };
  }, [canAdmin, loadStats]);

  useEffect(() => {
    if (!canAdmin || !focusedAccount) {
      return;
    }

    manageDialogRef.current?.close();

    createDialogRef.current?.close();

    ++detailRef.current;

    selectedRef.current = focusedAccount;

    setManaged(null);

    void loadManaged(focusedAccount);

    return () => {
      ++detailRef.current;
    };
  }, [canAdmin, focusedAccount, loadManaged]);

  useEffect(() => {
    if (!canAdmin) {
      clearPrivate();
    }
  }, [canAdmin, clearPrivate]);

  useEffect(() => {
    if (!managed || !canAdmin || selectedRef.current !== String(managed.id)) {
      return;
    }

    if (!manageDialogRef.current?.open) {
      manageDialogRef.current?.showModal();
    }

    requestAnimationFrame(() => {
      const roleSelect =
        manageDialogRef.current?.querySelector<HTMLSelectElement>(
          "#managed-role",
        );

      if (roleSelect && !roleSelect.disabled) {
        roleSelect.focus();
      } else {
        manageDialogRef.current
          ?.querySelector<HTMLButtonElement>(".team-dialog-heading button")
          ?.focus();
      }
    });
  }, [managed?.id, canAdmin]);

  useLiveRecords(() => {
    void loadDirectory();

    void loadStats();

    if (selectedRef.current) {
      void loadManaged(selectedRef.current);
    }
  }, canAdmin);

  const resultSummary = useMemo(() => {
    if (loading) {
      return "Loading accounts…";
    }

    if (total === 0) {
      return hasFilters ? "No matching accounts" : "No accounts yet";
    }

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
    if (mutationRef.current) {
      return;
    }

    setForm(EMPTY_FORM);

    setFieldErrors({});

    createDialogRef.current?.showModal();

    requestAnimationFrame(() => {
      return createDialogRef.current
        ?.querySelector<HTMLInputElement>("#staff-name")
        ?.focus();
    });
  }

  function validateField(name: CreateField, value: string) {
    let message = "";

    if (name === "full_name" && value.trim().length < 2) {
      message = "Enter the person’s full name.";
    }

    if (name === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      message = "Enter a valid email address.";
    }

    if (name === "password" && value.length < 12) {
      message = "Use at least 12 characters.";
    }

    if (
      name === "role" &&
      !ROLES.some(([role]) => {
        return role === value;
      })
    ) {
      message = "Choose a staff role.";
    }

    setFieldErrors((current) => {
      return { ...current, [name]: message || undefined };
    });

    return message;
  }

  async function createAccount(event: FormEvent) {
    event.preventDefault();

    if (mutationRef.current) {
      return;
    }

    const errors = (Object.keys(form) as CreateField[]).reduce<
      Partial<Record<CreateField, string>>
    >((result, name) => {
      const message = validateField(name, form[name]);

      if (message) {
        result[name] = message;
      }

      return result;
    }, {});

    if (Object.keys(errors).length) {
      setFieldErrors(errors);

      showToast({
        tone: "error",
        title: "Review the highlighted fields",
        message: "The account has not been created.",
      });

      return;
    }

    const privateVersion = privateVersionRef.current;

    mutationRef.current = true;

    setSaving(true);

    try {
      const created = await createEmployee({
        ...form,
        full_name: form.full_name.trim(),
        email: form.email.trim(),
      });

      if (privateVersion !== privateVersionRef.current) {
        return;
      }

      createDialogRef.current?.close();

      setPage(1);

      await Promise.all([loadDirectory(), loadStats()]);

      if (privateVersion !== privateVersionRef.current) {
        return;
      }

      showToast({
        tone: "success",
        title: "Staff account created",
        message: `${created.full_name} can now sign in with the temporary password.`,
      });
    } catch (error) {
      if (privateVersion !== privateVersionRef.current) {
        return;
      }

      if (error instanceof ApiError && [401, 403].includes(error.status)) {
        clearPrivate();
      }

      showToast({
        tone: "error",
        title: "Could not create the account",
        message:
          error instanceof Error
            ? error.message
            : "Check the details and try again.",
      });
    } finally {
      mutationRef.current = false;

      setSaving(false);
    }
  }

  function openManage(account: Employee) {
    ++detailRef.current;

    selectedRef.current = String(account.id);

    setDetailError(null);

    setManaged(account);

    void loadManaged(String(account.id));
  }

  function closeManage() {
    if (mutationRef.current) {
      return;
    }

    ++detailRef.current;

    selectedRef.current = null;

    setManaged(null);

    setDetailError(null);

    setDetailLoading(false);

    manageDialogRef.current?.close();

    if (focusedAccount) {
      window.history.replaceState(null, "", "/system/team");
    }
  }

  function editAccess(patch: Partial<AccessDraft>) {
    if (!managed) {
      return;
    }

    setDrafts((current) => {
      const previous = current[String(managed.id)] ?? {
        role: managed.role,
        active: managed.status === "active",
        version: managed.version,
        hrConfidentialAccess: managed.hr_confidential_access ?? false,
        hrAccessReason: "",
        hrDecision: false,
      };

      const next = { ...previous, ...patch };

      if (patch.role !== undefined && patch.role !== previous.role) {
        next.supervisorId = null;

        next.agentProfileId = null;
      }

      if (
        (patch.role !== undefined && patch.role !== previous.role) ||
        (patch.active !== undefined && patch.active !== previous.active)
      ) {
        next.hrConfidentialAccess =
          next.role === managed.role && next.active
            ? (managed.hr_confidential_access ?? false)
            : false;

        next.hrDecision = false;

        next.hrAccessReason = "";
      }

      return { ...current, [String(managed.id)]: next };
    });
  }

  function discardAccess(id: string) {
    setDrafts((current) => {
      const next = { ...current };

      delete next[id];

      return next;
    });
  }

  async function saveManagedAccount(event: FormEvent) {
    event.preventDefault();

    if (!managed || staleDraft || detailLoading || mutationRef.current) {
      return;
    }

    const nextStatus = managedActive ? "active" : "inactive";

    const roleChanged = managedRole !== managed.role;

    const statusChanged = nextStatus !== managed.status;

    const assignmentsChanged =
      accessDraft?.supervisorId !== undefined ||
      accessDraft?.agentProfileId !== undefined;

    if (
      !roleChanged &&
      !statusChanged &&
      !explicitHrDecision &&
      !assignmentsChanged
    ) {
      closeManage();

      return;
    }

    const account = managed;

    const privateVersion = privateVersionRef.current;

    mutationRef.current = true;

    setManaging(true);

    try {
      await updateEmployee(account.id, {
        ...(roleChanged ? { role: managedRole } : {}),
        ...(statusChanged ? { status: nextStatus } : {}),
        ...(explicitHrDecision
          ? {
              hr_confidential_access: managedHrAccess,
              hr_access_reason: accessDraft?.hrAccessReason,
            }
          : {}),
        ...(accessDraft?.supervisorId !== undefined
          ? { supervisor_id: accessDraft.supervisorId }
          : {}),
        ...(accessDraft?.agentProfileId !== undefined
          ? { agent_profile_id: accessDraft.agentProfileId }
          : {}),
        version: accessDraft?.version ?? account.version,
      });

      if (privateVersion !== privateVersionRef.current) {
        return;
      }

      discardAccess(String(account.id));

      if (selectedRef.current === String(account.id)) {
        ++detailRef.current;

        selectedRef.current = null;

        setManaged(null);

        manageDialogRef.current?.close();

        if (focusedAccount) {
          window.history.replaceState(null, "", "/system/team");
        }
      }

      await Promise.all([loadDirectory(), loadStats()]);

      if (privateVersion !== privateVersionRef.current) {
        return;
      }

      showToast({
        tone: "success",
        title: "Account updated",
        message: `${account.full_name} now has the selected access.`,
      });
    } catch (error) {
      if (privateVersion !== privateVersionRef.current) {
        return;
      }

      const accessDenied =
        error instanceof ApiError && [401, 403].includes(error.status);

      if (accessDenied) {
        clearPrivate();
      }

      showToast({
        tone: "error",
        title: "Could not update the account",
        message:
          error instanceof Error
            ? error.message
            : "Refresh the account and try again.",
      });

      if (accessDenied) {
        return;
      }

      await loadDirectory();

      if (privateVersion !== privateVersionRef.current) {
        return;
      }

      if (selectedRef.current === String(account.id)) {
        await loadManaged(String(account.id));
      }
    } finally {
      mutationRef.current = false;

      setManaging(false);
    }
  }

  if (me && !canAdmin) {
    return (
      <section className="team-access-denied">
        <span>
          <ShieldCheck weight="fill" />
        </span>
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
          <p>
            Find people, review their role, and control access from one
            directory.
          </p>
        </div>
        <button
          type="button"
          className="team-primary-button"
          disabled={saving || managing}
          onClick={openCreate}
        >
          <UserPlus weight="bold" /> Add staff account
        </button>
      </section>

      <section className="team-summary-grid" aria-label="Account summary">
        <SummaryCard
          label="All accounts"
          value={stats.total}
          detail="Staff and customer access"
          tone="violet"
        />
        <SummaryCard
          label="Active"
          value={stats.active}
          detail="Can currently sign in"
          tone="green"
        />
        <SummaryCard
          label="Inactive"
          value={stats.inactive}
          detail="Access has been paused"
          tone="slate"
        />
      </section>

      <AccountDirectory
        detailLoading={detailLoading}
        detailError={detailError}
        selectedRef={selectedRef}
        loadManaged={loadManaged}
        resultSummary={resultSummary}
        loading={loading}
        loadDirectory={loadDirectory}
        loadStats={loadStats}
        query={query}
        setQuery={setQuery}
        setPage={setPage}
        roleFilter={roleFilter}
        setRoleFilter={setRoleFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        hasFilters={hasFilters}
        clearFilters={clearFilters}
        accounts={accounts}
        me={me}
        openManage={openManage}
        page={page}
        pageCount={pageCount}
      />

      <CreateAccountDialog
        createDialogRef={createDialogRef}
        setFieldErrors={setFieldErrors}
        saving={saving}
        createAccount={createAccount}
        managing={managing}
        fieldErrors={fieldErrors}
        form={form}
        setForm={setForm}
        validateField={validateField}
      />

      <ManageAccountDialog
        manageDialogRef={manageDialogRef}
        closeManage={closeManage}
        managed={managed}
        saveManagedAccount={saveManagedAccount}
        managing={managing}
        saving={saving}
        managedRole={managedRole}
        editAccess={editAccess}
        me={me}
        managedActive={managedActive}
        managedHrAccess={managedHrAccess}
        hrEligible={hrEligible}
        explicitHrDecision={explicitHrDecision}
        accessDraft={accessDraft}
        detailLoading={detailLoading}
        staleDraft={staleDraft}
        discardAccess={discardAccess}
      />

      {toast && (
        <div
          className="team-toast-region"
          aria-live={toast.tone === "error" ? "assertive" : "polite"}
        >
          <div
            className={`team-toast is-${toast.tone}`}
            role={toast.tone === "error" ? "alert" : "status"}
          >
            <span className="team-toast-icon">
              {toast.tone === "error" ? (
                <WarningCircle weight="fill" />
              ) : (
                <CheckCircle weight="fill" />
              )}
            </span>
            <div>
              <strong>{toast.title}</strong>
              <p>{toast.message}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                return setToast(null);
              }}
              aria-label="Dismiss notification"
            >
              <X />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
