"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Headset } from "@phosphor-icons/react";
import {
  STAFF_SUPPORT_SOURCES,
  SUPPORT_SOURCES,
  SUPPORT_STATUSES,
  createStaffSupportCase,
  getSupportCaseDetail,
  listSupportCases,
  replySupportCase,
  searchSupportClients,
  updateSupportCase,
  type SupportCase,
  type SupportCaseDetail,
  type SupportClientOption,
} from "@/lib/api";
import { can, useMe } from "@/lib/useMe";
import { useLiveRecords } from "@/lib/useLiveRecords";
import { ApiError } from "@/lib/ts-api";
import CustomerLookup from "./CustomerLookup";
import CreateSupportConcern from "./CreateSupportConcern";
import { ReplyDraft, ResolutionDraft, emptyReply } from "./support-view";
import SupportCasesTable from "./SupportCasesTable";
import SupportConversationPanel from "./SupportConversationPanel";

export default function SupportDashboard() {
  const me = useMe();

  const canManage = can(me, "SUPPORT_MANAGE");

  const search = useSearchParams();

  const queryCase = search.get("case");

  const focusedCase =
    queryCase &&
    /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(queryCase)
      ? queryCase
      : null;

  const [cases, setCases] = useState<SupportCase[]>([]);

  const [drafts, setDrafts] = useState<Record<string, ResolutionDraft>>({});

  const [replies, setReplies] = useState<Record<string, ReplyDraft>>({});

  const [filter, setFilter] = useState("");

  const [sourceFilter, setSourceFilter] = useState("");

  const [clientQuery, setClientQuery] = useState("");

  const [clientOptions, setClientOptions] = useState<SupportClientOption[]>([]);

  const [clientSearchDone, setClientSearchDone] = useState(false);

  const [selectedClient, setSelectedClient] =
    useState<SupportClientOption | null>(null);

  const [category, setCategory] = useState("");

  const [description, setDescription] = useState("");

  const [newSource, setNewSource] = useState("");

  const [lookupError, setLookupError] = useState<string | null>(null);

  const [page, setPage] = useState(1);

  const [count, setCount] = useState(0);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);

  const [caseDetail, setCaseDetail] = useState<SupportCaseDetail | null>(null);

  const [caseLoading, setCaseLoading] = useState(false);

  const [detailError, setDetailError] = useState<string | null>(null);

  const [pending, setPending] = useState<string | null>(null);

  const loadVersion = useRef(0);

  const detailVersion = useRef(0);

  const lookupVersion = useRef(0);

  const activeCase = useRef<string | null>(null);

  const mutation = useRef(false);

  const clearPrivate = useCallback(() => {
    ++loadVersion.current;

    ++detailVersion.current;

    ++lookupVersion.current;

    activeCase.current = null;

    setCases([]);

    setCount(0);

    setCaseDetail(null);

    setActiveCaseId(null);

    setDrafts({});

    setReplies({});

    setClientOptions([]);

    setSelectedClient(null);

    setLoading(false);

    setCaseLoading(false);
  }, []);

  const load = useCallback(async () => {
    if (!canManage) {
      return;
    }

    const version = ++loadVersion.current;

    setLoading(true);

    try {
      const result = await listSupportCases(
        focusedCase
          ? { case: focusedCase }
          : {
              ...(filter ? { status: filter } : {}),
              ...(sourceFilter ? { source: sourceFilter } : {}),
              page: String(page),
            },
      );

      if (version !== loadVersion.current) {
        return;
      }

      setCases(result.results);

      setCount(result.count);

      if (!focusedCase && page > Math.max(1, Math.ceil(result.count / 20))) {
        setPage(Math.max(1, Math.ceil(result.count / 20)));
      }
    } catch (caught) {
      if (version !== loadVersion.current) {
        return;
      }

      if (caught instanceof ApiError && [401, 403].includes(caught.status)) {
        clearPrivate();
      }

      setCases([]);

      setCount(0);

      setError(
        caught instanceof Error ? caught.message : "Failed to load cases.",
      );
    } finally {
      if (version === loadVersion.current) {
        setLoading(false);
      }
    }
  }, [canManage, clearPrivate, filter, focusedCase, page, sourceFilter]);

  const loadDetail = useCallback(
    async (id: string) => {
      if (!canManage || activeCase.current !== id) {
        return;
      }

      const version = ++detailVersion.current;

      setCaseLoading(true);

      setDetailError(null);

      try {
        const detail = await getSupportCaseDetail(id, true);

        if (version === detailVersion.current && activeCase.current === id) {
          setCaseDetail(detail);
        }
      } catch (caught) {
        if (version !== detailVersion.current || activeCase.current !== id) {
          return;
        }

        if (caught instanceof ApiError && [401, 403].includes(caught.status)) {
          clearPrivate();

          setError(caught.message);

          return;
        }

        setCaseDetail(null);

        setDetailError(
          caught instanceof Error
            ? caught.message
            : "Could not load conversation.",
        );
      } finally {
        if (version === detailVersion.current) {
          setCaseLoading(false);
        }
      }
    },
    [canManage, clearPrivate],
  );

  useEffect(() => {
    void load();

    return () => {
      ++loadVersion.current;
    };
  }, [load]);

  useEffect(() => {
    if (!canManage) {
      return;
    }

    ++detailVersion.current;

    activeCase.current = focusedCase;

    setActiveCaseId(focusedCase);

    setCaseDetail(null);

    setDetailError(null);

    setCaseLoading(false);

    if (focusedCase) {
      setFilter("");

      setPage(1);
    }
  }, [focusedCase, canManage]);

  useEffect(() => {
    if (activeCaseId) {
      void loadDetail(activeCaseId);
    }

    return () => {
      ++detailVersion.current;
    };
  }, [activeCaseId, loadDetail]);

  useEffect(() => {
    if (canManage) {
      return;
    }

    clearPrivate();
  }, [canManage, clearPrivate]);

  useLiveRecords(() => {
    void load();

    if (activeCase.current) {
      void loadDetail(activeCase.current);
    }
  }, canManage);

  function closeThread() {
    ++detailVersion.current;

    activeCase.current = null;

    setActiveCaseId(null);

    setCaseDetail(null);

    setDetailError(null);

    setCaseLoading(false);

    if (focusedCase) {
      window.history.replaceState(null, "", "/system/support");
    }
  }

  function openCase(id: string) {
    if (activeCase.current === id) {
      closeThread();

      return;
    }

    ++detailVersion.current;

    activeCase.current = id;

    setActiveCaseId(id);

    setCaseDetail(null);

    setDetailError(null);
  }

  function editCase(c: SupportCase, patch: Partial<ResolutionDraft>) {
    setDrafts((current) => {
      return {
        ...current,
        [String(c.id)]: {
          ...(current[String(c.id)] ?? {
            status: c.status,
            resolution: c.resolution,
            version: c.version,
          }),
          ...patch,
        },
      };
    });
  }

  function discardDraft(id: string) {
    setDrafts((current) => {
      const next = { ...current };

      delete next[id];

      return next;
    });
  }

  async function sendReply(event: React.FormEvent) {
    event.preventDefault();

    const id = activeCase.current;

    const draft = id ? replies[id] : null;

    if (!id || !draft?.text.trim() || mutation.current) {
      return;
    }

    mutation.current = true;

    setPending("reply");

    setError(null);

    try {
      await replySupportCase(id, draft.text.trim(), true, draft.needsReply);

      setReplies((current) => {
        const next = { ...current };

        delete next[id];

        return next;
      });

      await Promise.all([load(), loadDetail(id)]);
    } catch (caught) {
      if (caught instanceof ApiError && [401, 403].includes(caught.status)) {
        clearPrivate();
      }

      setError(
        caught instanceof Error ? caught.message : "Could not send reply.",
      );
    } finally {
      mutation.current = false;

      setPending(null);
    }
  }

  async function saveCase(c: SupportCase) {
    const draft = drafts[String(c.id)];

    if (!draft || draft.version !== c.version || mutation.current) {
      return;
    }

    mutation.current = true;

    setPending(`save:${c.id}`);

    setError(null);

    try {
      await updateSupportCase(c.id, draft);

      discardDraft(String(c.id));

      await Promise.all([load(), loadDetail(String(c.id))]);
    } catch (caught) {
      if (caught instanceof ApiError && [401, 403].includes(caught.status)) {
        clearPrivate();
      }

      setError(
        caught instanceof Error
          ? caught.message
          : "Update failed. Your draft is retained.",
      );
    } finally {
      mutation.current = false;

      setPending(null);
    }
  }

  async function assignToMe(c: SupportCase) {
    if (!me?.id || mutation.current) {
      return;
    }

    mutation.current = true;

    setPending(`assign:${c.id}`);

    setError(null);

    try {
      await updateSupportCase(c.id, {
        assigned_staff: me.id,
        version: c.version,
      });

      await Promise.all([load(), loadDetail(String(c.id))]);
    } catch (caught) {
      if (caught instanceof ApiError && [401, 403].includes(caught.status)) {
        clearPrivate();
      }

      setError(caught instanceof Error ? caught.message : "Assignment failed.");
    } finally {
      mutation.current = false;

      setPending(null);
    }
  }

  async function findClient(event: React.FormEvent) {
    event.preventDefault();

    if (clientQuery.trim().length < 2) {
      return;
    }

    const version = ++lookupVersion.current;

    setLookupError(null);

    setSelectedClient(null);

    setClientOptions([]);

    setClientSearchDone(false);

    try {
      const result = await searchSupportClients(clientQuery.trim());

      if (version === lookupVersion.current) {
        setClientOptions(result);

        setClientSearchDone(true);
      }
    } catch (caught) {
      if (version !== lookupVersion.current) {
        return;
      }

      if (caught instanceof ApiError && [401, 403].includes(caught.status)) {
        clearPrivate();
      }

      setLookupError(
        caught instanceof Error ? caught.message : "Customer search failed.",
      );
    }
  }

  async function createCase(event: React.FormEvent) {
    event.preventDefault();

    if (!selectedClient || !newSource || mutation.current) {
      return;
    }

    mutation.current = true;

    setPending("create");

    setError(null);

    try {
      const created = await createStaffSupportCase({
        clientId: selectedClient.id,
        source: newSource.toUpperCase() as Uppercase<
          (typeof STAFF_SUPPORT_SOURCES)[number][0]
        >,
        category: category.trim(),
        description: description.trim(),
      });

      setCategory("");

      setDescription("");

      setNewSource("");

      setClientQuery("");

      setClientOptions([]);

      setSelectedClient(null);

      setClientSearchDone(false);

      setFilter("");

      setSourceFilter("");

      setPage(1);

      openCase(String(created.id));
    } catch (caught) {
      if (caught instanceof ApiError && [401, 403].includes(caught.status)) {
        clearPrivate();
      }

      setError(
        caught instanceof Error ? caught.message : "Could not create case.",
      );
    } finally {
      mutation.current = false;

      setPending(null);
    }
  }

  if (me && !canManage) {
    return (
      <section className="glass rounded-3xl p-10 text-center">
        <h1 className="font-display text-xl font-700 text-blue-ink">
          No access
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          Your role doesn&apos;t handle customer service.
        </p>
      </section>
    );
  }

  const reply = activeCaseId
    ? (replies[activeCaseId] ?? emptyReply)
    : emptyReply;

  return (
    <>
      <header className="glass mb-4 flex items-center gap-3 rounded-3xl px-5 py-3.5">
        <span className="chrome grid h-10 w-10 place-items-center rounded-2xl">
          <Headset weight="fill" className="h-5 w-5 text-blue" />
        </span>
        <div>
          <h1 className="font-display text-lg font-700 tracking-tight text-blue-ink">
            Customer Service
          </h1>
          <p className="text-xs text-ink-soft">
            Track concerns, assignments and customer conversations
          </p>
        </div>
      </header>
      {canManage && <CustomerLookup />}
      {error && (
        <div
          role="alert"
          className="mb-4 rounded-2xl bg-rose-100 px-4 py-2.5 text-sm font-600 text-rose-700"
        >
          <p>{error}</p>
          <button
            type="button"
            onClick={() => {
              setError(null);

              void load();
            }}
            className="mt-2 rounded-lg bg-blue px-3 py-1.5 font-700 text-white"
          >
            Refresh cases
          </button>
        </div>
      )}
      {can(me, "SUPPORT_CREATE") && (
        <CreateSupportConcern
          findClient={findClient}
          clientQuery={clientQuery}
          lookupVersion={lookupVersion}
          setClientQuery={setClientQuery}
          setSelectedClient={setSelectedClient}
          setClientOptions={setClientOptions}
          setClientSearchDone={setClientSearchDone}
          pending={pending}
          lookupError={lookupError}
          clientOptions={clientOptions}
          selectedClient={selectedClient}
          clientSearchDone={clientSearchDone}
          createCase={createCase}
          newSource={newSource}
          setNewSource={setNewSource}
          category={category}
          setCategory={setCategory}
          description={description}
          setDescription={setDescription}
        />
      )}
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {focusedCase && (
          <button
            type="button"
            onClick={() => {
              closeThread();

              setFilter("");

              setPage(1);
            }}
            className="rounded-full bg-violet-100 px-3.5 py-1.5 text-sm font-700 text-violet-700"
          >
            Show all cases
          </button>
        )}
        {[["", "All"], ...SUPPORT_STATUSES].map(([value, label]) => {
          return (
            <button
              type="button"
              key={value}
              aria-pressed={!focusedCase && filter === value}
              onClick={() => {
                closeThread();

                setFilter(value);

                setPage(1);
              }}
              className={`rounded-full px-3.5 py-1.5 text-sm font-700 ${!focusedCase && filter === value ? "bg-blue text-white" : "bg-white/60 text-ink-soft hover:bg-white"}`}
            >
              {label}
            </button>
          );
        })}
      </div>
      {!focusedCase && (
        <label className="mb-3 flex items-center gap-2 text-sm font-700 text-blue-ink">
          Source
          <select
            value={sourceFilter}
            onChange={(event) => {
              setSourceFilter(event.target.value);

              setPage(1);
            }}
            className="rounded-xl border border-violet-200 bg-white/70 px-3 py-2 font-normal"
          >
            <option value="">All sources</option>
            {SUPPORT_SOURCES.map(([value, label]) => {
              return (
                <option key={value} value={value}>
                  {label}
                </option>
              );
            })}
          </select>
        </label>
      )}
      {activeCaseId && (
        <SupportConversationPanel
          activeCaseId={activeCaseId}
          closeThread={closeThread}
          caseLoading={caseLoading}
          detailError={detailError}
          loadDetail={loadDetail}
          caseDetail={caseDetail}
          sendReply={sendReply}
          reply={reply}
          setReplies={setReplies}
          pending={pending}
        />
      )}
      {!focusedCase && count > 20 && (
        <nav
          className="my-3 flex items-center justify-between text-xs text-ink-soft"
          aria-label="Support case pages"
        >
          <button
            type="button"
            disabled={page === 1 || loading}
            onClick={() => {
              return setPage((current) => {
                return current - 1;
              });
            }}
            className="rounded-lg bg-white/70 px-3 py-1.5 font-700 text-blue-ink disabled:opacity-40"
          >
            Previous
          </button>
          <span>
            Page {page} of {Math.ceil(count / 20)}
          </span>
          <button
            type="button"
            disabled={page * 20 >= count || loading}
            onClick={() => {
              return setPage((current) => {
                return current + 1;
              });
            }}
            className="rounded-lg bg-white/70 px-3 py-1.5 font-700 text-blue-ink disabled:opacity-40"
          >
            Next
          </button>
        </nav>
      )}
      <SupportCasesTable
        loading={loading}
        cases={cases}
        focusedCase={focusedCase}
        drafts={drafts}
        pending={pending}
        editCase={editCase}
        me={me}
        assignToMe={assignToMe}
        saveCase={saveCase}
        discardDraft={discardDraft}
        activeCaseId={activeCaseId}
        openCase={openCase}
      />
    </>
  );
}
