"use client";

import {
  addReleaseUpdate,
  createClient,
  getSchedule,
  listBatchChoices,
  listClients,
  type Batch,
  type ClientRecord,
  type RecordId,
  type ScheduleItem,
} from "@/lib/api";
import {
  emptyRecordFilters,
  recordFilterQuery,
  type RecordFiltersValue,
} from "@/lib/record-filters";
import { ApiError } from "@/lib/ts-api";
import { useLiveRecords } from "@/lib/useLiveRecords";
import { can, useMe } from "@/lib/useMe";
import { useRecordFilterText } from "@/lib/useRecordFilterText";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { today } from "@/lib/date";

export function useClientsWorkspace() {
  const me = useMe();

  const canManage = can(me, "CLIENT_MANAGE");

  const canRead = can(me, "CLIENT_READ", "CLIENT_MANAGE");

  const canReadDocuments = me?.role === "owner" || me?.role === "records";

  const [page, setPage] = useState(1);

  const [filters, setFilters] = useState(emptyRecordFilters);

  const text = useRecordFilterText(filters);

  const search = useSearchParams();

  const validId = (value: string | null) => {
    return value && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value)
      ? value
      : null;
  };

  const focusedClient = validId(search.get("client"));

  const batchFilter = validId(search.get("batch")) ?? "";

  const linkedDocuments = search.get("documents");

  const filterError = recordFilterQuery(
    "client",
    filters,
    page,
    batchFilter,
  ).error;

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

  const [details, setDetails] = useState<{
    id: RecordId;
    mode: "edit" | "history";
  } | null>(null);

  const [schedule, setSchedule] = useState<{
    id: RecordId;
    items: ScheduleItem[];
  } | null>(null);

  const [managedClient, setManagedClient] = useState<ClientRecord | null>(null);

  const [documentClient, setDocumentClient] = useState<RecordId | null>(null);

  const [releaseDraft, setReleaseDraft] = useState<{
    id: RecordId;
    version?: number;
    status: "NOT_READY" | "PROCESSING" | "READY" | "RELEASED";
    note: string;
    collectionDate: string;
  } | null>(null);

  const [releasing, setReleasing] = useState(false);

  const [form, setForm] = useState({
    batch: "",
    full_name: "",
    contact_email: "",
    joined_at: today(),
  });

  const clearPrivate = useCallback(() => {
    ++privateVersion.current;

    ++requestVersion.current;

    ++choicesVersion.current;

    ++scheduleVersion.current;

    scheduleId.current = null;

    setClients([]);

    setBatches([]);

    setTotal(0);

    setHasNext(false);

    setDetails(null);

    setSchedule(null);

    setDocumentClient(null);

    setManagedClient(null);

    setReleaseDraft(null);

    setNotice(null);

    setLoading(false);

    setForm({
      batch: "",
      full_name: "",
      contact_email: "",
      joined_at: today(),
    });
  }, []);

  const load = useCallback(async () => {
    const version = ++requestVersion.current;

    if (!canRead || (!focusedClient && (text.pending || filterError))) {
      setClients([]);

      setTotal(0);

      setHasNext(false);

      setLoading(text.pending || !me);

      ++scheduleVersion.current;

      scheduleId.current = null;

      setSchedule(null);

      return;
    }
    setLoading(true);

    setError(null);

    try {
      const c = await listClients(
        focusedClient
          ? { id: focusedClient, page: "1" }
          : recordFilterQuery(
              "client",
              { ...filters, q: text.q, model: text.model },
              page,
              batchFilter,
            ).params!,
      );

      if (version !== requestVersion.current) {
        return;
      }
      const lastPage = Math.max(1, Math.ceil(c.count / 20));

      if (!focusedClient && page > lastPage) {
        setPage(lastPage);

        return;
      }
      setClients(c.results);

      if (
        scheduleId.current &&
        !c.results.some((client) => {
          return client.id === scheduleId.current;
        })
      ) {
        ++scheduleVersion.current;

        scheduleId.current = null;

        setSchedule(null);
      }
      setTotal(c.count);

      setHasNext(Boolean(c.next));
    } catch (e) {
      if (version !== requestVersion.current) {
        return;
      }
      if (e instanceof ApiError && [401, 403].includes(e.status)) {
        clearPrivate();
      }
      setClients([]);

      setTotal(0);

      setHasNext(false);

      ++scheduleVersion.current;

      scheduleId.current = null;

      setSchedule(null);

      setError(e instanceof Error ? e.message : "Failed to load clients.");
    } finally {
      if (version === requestVersion.current) {
        setLoading(false);
      }
    }
  }, [
    canRead,
    me,
    page,
    focusedClient,
    batchFilter,
    filters,
    text.q,
    text.model,
    text.pending,
    filterError,
    clearPrivate,
  ]);

  const loadChoices = useCallback(async () => {
    if (!canManage) {
      return;
    }
    const version = ++choicesVersion.current;

    try {
      const items = await listBatchChoices();

      if (version === choicesVersion.current) {
        setBatches(items);

        setChoicesError(null);
      }
    } catch (e) {
      if (version !== choicesVersion.current) {
        return;
      }
      if (e instanceof ApiError && [401, 403].includes(e.status)) {
        clearPrivate();
      }
      setBatches([]);

      setChoicesError(
        e instanceof Error ? e.message : "Could not load available batches.",
      );
    }
  }, [canManage, clearPrivate]);

  const refreshSchedule = useCallback(
    async (id: RecordId) => {
      const version = ++scheduleVersion.current;

      try {
        const items = await getSchedule(id);

        if (version === scheduleVersion.current && scheduleId.current === id) {
          setSchedule({ id, items });
        }
      } catch (e) {
        if (version !== scheduleVersion.current || scheduleId.current !== id) {
          return;
        }
        if (e instanceof ApiError && [401, 403].includes(e.status)) {
          clearPrivate();
        }
        scheduleId.current = null;

        setSchedule(null);

        setError(e instanceof Error ? e.message : "Could not load schedule.");
      }
    },
    [clearPrivate],
  );

  useLiveRecords(() => {
    void load();

    void loadChoices();

    if (scheduleId.current) {
      void refreshSchedule(scheduleId.current);
    }
  }, canRead);

  useEffect(() => {
    void load();

    return () => {
      ++requestVersion.current;
    };
  }, [load]);

  useEffect(() => {
    void loadChoices();

    return () => {
      ++choicesVersion.current;
    };
  }, [loadChoices]);

  useEffect(() => {
    if (me && !canRead) {
      clearPrivate();
    }
  }, [me, canRead, clearPrivate]);

  useEffect(() => {
    if (me && !can(me, "DOCUMENT_READ")) {
      setManagedClient(null);
    }
  }, [me]);

  useEffect(() => {
    if (!me || canManage) {
      return;
    }
    ++privateVersion.current;

    ++choicesVersion.current;

    setBatches([]);

    setDetails(null);

    setReleaseDraft(null);

    setForm({
      batch: "",
      full_name: "",
      contact_email: "",
      joined_at: today(),
    });
  }, [me, canManage]);

  useEffect(() => {
    return () => {
      ++scheduleVersion.current;
    };
  }, []);

  useEffect(() => {
    setPage(1);

    ++scheduleVersion.current;

    scheduleId.current = null;

    setSchedule(null);

    setDocumentClient(
      canReadDocuments && focusedClient && linkedDocuments === focusedClient
        ? focusedClient
        : null,
    );
  }, [batchFilter, focusedClient, linkedDocuments, canReadDocuments]);

  function removeLink(...keys: string[]) {
    const params = new URLSearchParams(window.location.search);

    for (const key of keys) {
      params.delete(key);
    }
    window.history.replaceState(
      null,
      "",
      `/system/clients${params.size ? `?${params}` : ""}`,
    );

    setPage(1);
  }

  function changeFilter(key: keyof RecordFiltersValue, value: string) {
    if (focusedClient) {
      removeLink("client", "documents");
    }
    setFilters((current) => {
      return { ...current, [key]: value };
    });

    setPage(1);
  }

  function flash(m: string) {
    setNotice(m);

    setTimeout(() => {
      return setNotice(null);
    }, 3000);
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();

    if (mutation.current) {
      return;
    }
    const access = privateVersion.current;

    mutation.current = true;

    setSaving(true);

    setError(null);

    try {
      await createClient({
        batch: form.batch,
        full_name: form.full_name,
        contact_email: form.contact_email,
        joined_at: form.joined_at,
      });

      if (access !== privateVersion.current) {
        return;
      }
      flash("Client added — schedule generated.");

      setForm((f) => {
        return { ...f, full_name: "", contact_email: "" };
      });

      load();
    } catch (e) {
      if (access !== privateVersion.current) {
        return;
      }
      if (e instanceof ApiError && [401, 403].includes(e.status)) {
        clearPrivate();
      }
      setError(e instanceof Error ? e.message : "Could not add client.");
    } finally {
      setSaving(false);

      mutation.current = false;
    }
  }

  async function toggleSchedule(id: RecordId) {
    if (scheduleId.current === id) {
      ++scheduleVersion.current;

      scheduleId.current = null;

      setSchedule(null);

      return;
    }
    scheduleId.current = id;

    setSchedule({ id, items: [] });

    await refreshSchedule(id);
  }

  async function saveRelease(c: ClientRecord) {
    if (
      !releaseDraft ||
      releaseDraft.id !== c.id ||
      !c.version ||
      releaseDraft.version !== c.version ||
      mutation.current
    ) {
      return;
    }
    const access = privateVersion.current;

    mutation.current = true;

    setReleasing(true);

    setError(null);

    try {
      await addReleaseUpdate(c.id, {
        version: releaseDraft.version,
        status: releaseDraft.status,
        note: releaseDraft.note.trim(),
        collectionDate: releaseDraft.collectionDate || null,
      });

      if (access !== privateVersion.current) {
        return;
      }
      setReleaseDraft(null);

      flash("Release update posted. The customer has been notified.");

      await load();
    } catch (e) {
      if (access !== privateVersion.current) {
        return;
      }
      if (e instanceof ApiError && [401, 403].includes(e.status)) {
        clearPrivate();
      }
      setError(
        e instanceof Error ? e.message : "Could not update release status.",
      );
    } finally {
      mutation.current = false;

      setReleasing(false);
    }
  }
  return {
    createClientFormProps: {
      onCreate,
      saving,
      form,
      setForm,
      batches,
      releasing,
      choicesError,
      loadChoices,
    },
    clientRecordsTableProps: {
      loading,
      clients,
      me,
      canManage,
      releasing,
      setReleaseDraft,
      releaseDraft,
      setDetails,
      toggleSchedule,
      schedule,
      setManagedClient,
      canReadDocuments,
      setDocumentClient,
      documentClient,
      saveRelease,
      saving,
    },
    me,
    canRead,
    error,
    notice,
    canManage,
    filters,
    changeFilter,
    focusedClient,
    batchFilter,
    setFilters,
    removeLink,
    load,
    loading,
    filterError,
    total,
    page,
    setDetails,
    setManagedClient,
    hasNext,
    setPage,
    managedClient,
    setError,
    flash,
    details,
  };
}
