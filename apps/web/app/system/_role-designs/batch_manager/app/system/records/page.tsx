"use client";

import WorkspaceProgress, {
  TableSkeletonRows,
} from "@/app/system/_role-designs/batch_manager/components/WorkspaceProgress";
import WorkspaceNativeSelect from "@/app/system/_role-designs/batch_manager/components/WorkspaceNativeSelect";
import DateInput from "@/app/system/_role-designs/batch_manager/components/DateInput";
import CooActionDisclosure from "@/app/system/_role-designs/batch_manager/app/system/CooActionDisclosure";
import { useToastNotice } from "@/lib/useToastNotice";
import { createBatch, listBatches, type Batch } from "@/lib/api";
import { isBatchHandler } from "@/lib/handler-workspace";
import {
  newestBatchSort,
  nextBatchSort,
  type BatchTableSort,
} from "@/lib/handler-batch-table";
import HandlerBatchTable from "@/app/system/_role-designs/batch_manager/app/system/records/HandlerBatchTable";
import { can, useMe } from "@/lib/useMe";
import { Plus, Stack } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { BatchAgentField } from "@/app/system/_role-designs/batch_manager/components/BatchAgentField";
import { BatchAssignments } from "@/app/system/_role-designs/batch_manager/components/BatchAssignments";
import { RecordDetails } from "@/app/system/_role-designs/batch_manager/components/RecordDetails";
import { RecordFilters } from "@/app/system/_role-designs/batch_manager/components/RecordFilters";
import { RecordPagination } from "@/app/system/_role-designs/batch_manager/components/RecordPagination";
import type { RecordId } from "@/lib/api";
import {
  emptyRecordFilters,
  recordFilterQuery,
  type RecordFiltersValue,
} from "@/lib/record-filters";
import { ApiError } from "@/lib/ts-api";
import { useLiveRecords } from "@/lib/useLiveRecords";
import { useRecordFilterText } from "@/lib/useRecordFilterText";
import Link from "next/link";
import {
  Field,
  inputCls,
} from "@/app/system/_role-designs/batch_manager/components/FormField";
import { defaultBatchForm, batchSchedulePlan } from "@/lib/batch-schedule";
import { BatchScheduleFields } from "@/app/system/_role-designs/batch_manager/components/BatchScheduleFields";
import { BatchSchedulePreview } from "@/app/system/_role-designs/batch_manager/components/BatchSchedulePreview";
import {
  BATCH_INTERNAL_PLACEHOLDER_COUNT,
  BATCH_REAL_MEMBER_CAPACITY,
} from "@freshphones/contracts";

export default function RecordsPage() {
  const me = useMe();

  const handler = isBatchHandler(me?.role);

  const [sort, setSort] = useState<BatchTableSort>(newestBatchSort);

  const canManage = can(me, "BATCH_MANAGE");

  const canRead = can(me, "BATCH_READ", "BATCH_MANAGE");

  const [page, setPage] = useState(1);

  const [filters, setFilters] = useState(emptyRecordFilters);

  const text = useRecordFilterText(filters);

  const filterError = recordFilterQuery("batch", filters, page).error;

  const [total, setTotal] = useState(0);

  const [assignmentId, setAssignmentId] = useState<RecordId | null>(null);

  const [hasNext, setHasNext] = useState(false);

  const requestVersion = useRef(0);

  const privateVersion = useRef(0);

  const mutation = useRef(false);

  const [batches, setBatches] = useState<Batch[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [notice, setNotice] = useToastNotice(null);

  const [saving, setSaving] = useState(false);

  const [details, setDetails] = useState<{
    id: RecordId;
    mode: "edit" | "history";
  } | null>(null);

  const [form, setForm] = useState(defaultBatchForm);

  const clearPrivate = useCallback(() => {
    ++privateVersion.current;

    ++requestVersion.current;

    setBatches([]);

    setTotal(0);

    setHasNext(false);

    setDetails(null);

    setAssignmentId(null);

    setNotice(null);

    setLoading(false);

    setForm(defaultBatchForm());
  }, []);

  const load = useCallback(async () => {
    const version = ++requestVersion.current;

    if (!canRead || text.pending || filterError) {
      setBatches([]);

      setTotal(0);

      setHasNext(false);

      setLoading(text.pending || !me);

      return;
    }

    setLoading(true);

    setError(null);

    try {
      const result = await listBatches({
        ...recordFilterQuery(
          "batch",
          { ...filters, q: text.q, model: text.model },
          page,
        ).params!,
        ...(handler ? { sortBy: sort.key, sortDirection: sort.direction } : {}),
      });

      if (version !== requestVersion.current) {
        return;
      }

      const lastPage = Math.max(1, Math.ceil(result.count / 20));

      if (page > lastPage) {
        setPage(lastPage);

        return;
      }

      setBatches(result.results);

      setTotal(result.count);

      setHasNext(Boolean(result.next));
    } catch (e) {
      if (version !== requestVersion.current) {
        return;
      }

      if (e instanceof ApiError && [401, 403].includes(e.status)) {
        clearPrivate();
      }

      setBatches([]);

      setTotal(0);

      setHasNext(false);

      setError(e instanceof Error ? e.message : "Failed to load batches.");
    } finally {
      if (version === requestVersion.current) {
        setLoading(false);
      }
    }
  }, [
    canRead,
    me,
    page,
    filters,
    text.q,
    text.model,
    text.pending,
    filterError,
    clearPrivate,
    handler,
    sort,
  ]);

  useLiveRecords(load, canRead);

  useEffect(() => {
    void load();

    return () => {
      ++requestVersion.current;
    };
  }, [load]);

  useEffect(() => {
    if (me && !canRead) {
      clearPrivate();
    }
  }, [me, canRead, clearPrivate]);

  useEffect(() => {
    if (!me || canManage) {
      return;
    }

    ++privateVersion.current;

    setDetails(null);

    setAssignmentId(null);

    setForm(defaultBatchForm());
  }, [me, canManage]);

  function changeFilter(key: keyof RecordFiltersValue, value: string) {
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
      const created = await createBatch({
        agent_id: form.agent_id,
        unit_model: form.unit_model,
        status: form.status,
        contract_price: form.contract_price,
        num_installments: Number(form.num_installments),
        cadence: form.cadence,
        start_date: form.start_date,
        first_due_date: form.first_due_date,
        month_end: form.month_end,
      });

      if (access !== privateVersion.current) {
        return;
      }

      flash(`Batch ${created.batch_number} created.`);

      setForm((f) => {
        return { ...f, agent_id: "", unit_model: "", contract_price: "" };
      });

      load();
    } catch (e) {
      if (access !== privateVersion.current) {
        return;
      }

      if (e instanceof ApiError && [401, 403].includes(e.status)) {
        clearPrivate();
      }

      setError(e instanceof Error ? e.message : "Could not create batch.");
    } finally {
      setSaving(false);

      mutation.current = false;
    }
  }

  if (me && !canRead) {
    return (
      <section className="glass rounded-3xl p-10 text-center">
        <h1 className="font-display text-xl font-700 text-blue-ink">
          No access
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          Your role doesn&apos;t manage Paluwagan records.
        </p>
      </section>
    );
  }

  return (
    <>
      <header className="glass mb-4 flex items-center gap-3 rounded-3xl px-5 py-3.5">
        <span className="grid h-10 w-10 place-items-center rounded-2xl chrome">
          <Stack weight="fill" className="h-5 w-5 text-blue" />
        </span>
        <div>
          <h1 className="font-display text-lg font-700 tracking-tight text-blue-ink">
            {handler ? "My batches" : "Paluwagan Records"}
          </h1>
          <p className="text-xs text-ink-soft">
            {["core_handler", "batch_handler", "batch_manager"].includes(
              me?.role ?? "",
            )
              ? "Your assigned batches and members"
              : "Batches — the plan terms drive each member's schedule & balance"}
          </p>
        </div>
      </header>

      {(error || notice) && (
        <div
          className={`mb-4 rounded-2xl px-4 py-2.5 text-sm font-600 ${
            error
              ? "bg-rose-100 text-rose-700"
              : "bg-emerald-100 text-emerald-700"
          }`}
        >
          {error ?? notice}
        </div>
      )}

      {can(me, "BATCH_CREATE") && (
        <CooActionDisclosure role={me?.role} title="Create a batch">
          <form onSubmit={onCreate} className="glass mb-4 rounded-3xl p-5">
            <h2 className="mb-3 flex items-center gap-2 font-display font-700 text-blue-ink">
              <Plus weight="bold" className="h-4 w-4" /> New batch
            </h2>
            <fieldset
              disabled={saving}
              className="grid min-w-0 grid-cols-1 gap-3 min-[400px]:grid-cols-2 sm:grid-cols-4"
            >
              <BatchAgentField
                value={form.agent_id}
                onChange={(agent_id) => {
                  setForm((current) => {
                    return { ...current, agent_id };
                  });
                }}
              />
              <Field label="Batch number">
                <input
                  readOnly
                  value="Assigned on creation"
                  className={inputCls}
                />
              </Field>
              <Field label="Unit / model">
                <input
                  required
                  value={form.unit_model}
                  onChange={(e) => {
                    return setForm({ ...form, unit_model: e.target.value });
                  }}
                  className={inputCls}
                  placeholder="iPhone 15"
                />
              </Field>
              <Field label="Contract price (₱)">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={form.contract_price}
                  onChange={(e) => {
                    return setForm({ ...form, contract_price: e.target.value });
                  }}
                  className={inputCls}
                  placeholder="15000.00"
                />
              </Field>
              <Field label="Installments">
                <input
                  type="number"
                  min="1"
                  required
                  value={form.num_installments}
                  onChange={(e) => {
                    return setForm({
                      ...form,
                      num_installments: e.target.value,
                    });
                  }}
                  className={inputCls}
                />
              </Field>
              <Field label="Start date">
                <DateInput
                  type="date"
                  required
                  value={form.start_date}
                  onChange={(e) => {
                    return setForm({ ...form, start_date: e.target.value });
                  }}
                  className={inputCls}
                />
              </Field>
              <BatchScheduleFields
                value={form}
                onChange={(change) => {
                  setForm((current) => {
                    return { ...current, ...change };
                  });
                }}
              />
              <Field label="Status">
                <WorkspaceNativeSelect
                  value={form.status}
                  onChange={(e) => {
                    return setForm({ ...form, status: e.target.value });
                  }}
                  className={inputCls}
                >
                  <option value="forming">Forming</option>
                  <option value="active">Active</option>
                  <option value="closed">Closed</option>
                </WorkspaceNativeSelect>
              </Field>
            </fieldset>
            <BatchSchedulePreview
              plan={batchSchedulePlan(form)}
              requireFirstDate
            />
            <button
              type="submit"
              disabled={saving || !form.agent_id}
              className="btn-candy mt-4 inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-700 disabled:opacity-70"
            >
              <Plus weight="bold" className="h-4 w-4" />
              {saving ? "Creating…" : "Create batch"}
            </button>
          </form>
        </CooActionDisclosure>
      )}

      {canRead && (
        <RecordFilters
          kind="batch"
          value={filters}
          onChange={changeFilter}
          onClear={() => {
            setFilters(emptyRecordFilters);

            setPage(1);
          }}
          onRefresh={() => {
            return void load();
          }}
          loading={loading}
          error={filterError}
        />
      )}
      {canRead && (
        <p role="status" className="mb-3 text-sm text-ink-soft">
          {filterError
            ? "Fix the date range to view batches."
            : handler && error
              ? "Could not load batch records."
              : loading
                ? "Loading batches…"
                : total
                  ? `Showing ${(page - 1) * 20 + 1}–${Math.min(page * 20, total)} of ${total} batches`
                  : "0 batches"}
        </p>
      )}

      {handler ? (
        <HandlerBatchTable
          key={String(me?.id)}
          userId={String(me?.id)}
          batches={batches}
          loading={loading}
          error={filterError ?? error}
          sort={sort}
          onSort={(key) => {
            setSort((current) => {
              return nextBatchSort(current, key);
            });

            setPage(1);
          }}
          onResetSort={() => {
            setSort(newestBatchSort);

            setPage(1);
          }}
        />
      ) : (
        <div className="glass overflow-x-auto rounded-3xl p-5">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-ink-soft">
              <tr className="border-b border-white/60">
                <th className="px-2 py-2">Batch</th>
                <th className="px-2 py-2">Unit</th>
                <th className="px-2 py-2">Price</th>
                <th className="px-2 py-2">Installments</th>
                <th className="px-2 py-2">Cadence</th>
                <th className="px-2 py-2">Members</th>
                <>
                  <th className="px-2 py-2">Handler</th>
                  <th className="px-2 py-2">Agent</th>
                </>
                <th className="px-2 py-2">Status</th>
                {canManage && <th className="px-2 py-2">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeletonRows
                  columns={canManage ? 10 : 9}
                  cellClassName="px-2 py-2.5"
                  label="Loading…"
                />
              ) : batches.length === 0 ? (
                <tr>
                  <td
                    colSpan={canManage ? 10 : 9}
                    className="px-2 py-6 text-center text-ink-soft"
                  >
                    {[
                      "core_handler",
                      "batch_handler",
                      "batch_manager",
                    ].includes(me?.role ?? "")
                      ? "No assigned batches match these filters."
                      : "No batches match these filters."}
                  </td>
                </tr>
              ) : (
                batches.map((b) => {
                  return (
                    <tr key={b.id} className="border-b border-white/40">
                      <td className="px-2 py-2.5 font-700 text-blue-ink">
                        {b.batch_number}
                      </td>
                      <td className="px-2 py-2.5">{b.unit_model}</td>
                      <td className="px-2 py-2.5 font-600 text-blue-ink">
                        {b.contract_price === null
                          ? "Terms not set"
                          : `₱${b.contract_price}`}
                      </td>
                      <td className="px-2 py-2.5 text-ink-soft">
                        {b.num_installments ?? "—"}
                      </td>
                      <td className="px-2 py-2.5 capitalize text-ink-soft">
                        {b.cadence === "semimonthly"
                          ? b.first_due_date
                            ? "Bi-monthly"
                            : "Every 15 days (existing plan)"
                          : b.cadence === "monthly"
                            ? b.first_due_date
                              ? "Monthly"
                              : "Every 30 days (existing plan)"
                            : b.cadence === "weekly"
                              ? "Weekly"
                              : "Terms not set"}
                      </td>
                      <td className="px-2 py-2.5">
                        <Link
                          href={`/system/clients?batch=${b.id}`}
                          className="text-blue underline"
                          aria-label={`View ${b.member_count} real members of ${b.batch_number}`}
                        >
                          {b.member_count} / {BATCH_REAL_MEMBER_CAPACITY} real
                          members
                        </Link>
                        <small className="block text-ink-soft">
                          {BATCH_INTERNAL_PLACEHOLDER_COUNT} internal
                          placeholders
                        </small>
                        {b.member_count > BATCH_REAL_MEMBER_CAPACITY && (
                          <small className="block font-600 text-blue-ink">
                            Existing batch above capacity
                          </small>
                        )}
                      </td>
                      <>
                        <td className="px-2 py-2.5">
                          {b.handler_name ?? "Unassigned"}
                          {b.handler_name && !b.handler_available && (
                            <small className="block text-ink-soft">
                              Inactive / role changed
                            </small>
                          )}
                        </td>
                        <td className="px-2 py-2.5">
                          {b.agent_name ?? "Unassigned"}
                          {b.agent_name && !b.agent_available && (
                            <small className="block text-ink-soft">
                              Inactive
                            </small>
                          )}
                        </td>
                      </>
                      <td className="px-2 py-2.5 capitalize">
                        <span className="rounded-full bg-sky-2/70 px-2.5 py-1 text-xs font-700 text-blue-ink">
                          {b.status}
                        </span>
                      </td>
                      {canManage && (
                        <td className="px-2 py-2.5">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              className="rounded-lg bg-violet-100 px-2 py-1 text-xs font-700 text-violet-700"
                              aria-label={`Assign handler and agent for ${b.batch_number}`}
                              onClick={() => {
                                return setAssignmentId(b.id);
                              }}
                            >
                              Assign
                            </button>
                            {can(me, "BATCH_ASSIGN") && (
                              <button
                                type="button"
                                className="rounded-lg bg-violet-100 px-2 py-1 text-xs font-700 text-violet-700"
                                aria-label={`Edit batch ${b.batch_number}`}
                                onClick={() => {
                                  return setDetails({ id: b.id, mode: "edit" });
                                }}
                              >
                                Edit
                              </button>
                            )}
                            <button
                              type="button"
                              className="rounded-lg bg-white/70 px-2 py-1 text-xs font-700 text-blue"
                              aria-label={`Change history for batch ${b.batch_number}`}
                              onClick={() => {
                                return setDetails({
                                  id: b.id,
                                  mode: "history",
                                });
                              }}
                            >
                              History
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
      <RecordPagination
        page={page}
        total={total}
        hasNext={hasNext}
        loading={loading}
        onPage={setPage}
      />
      {details && (
        <RecordDetails
          key={String(details.id)}
          kind="batch"
          id={details.id}
          mode={details.mode}
          onClose={() => {
            return setDetails(null);
          }}
          onSaved={() => {
            flash("Batch changes saved.");

            void load();
          }}
        />
      )}
      {assignmentId !== null && (
        <BatchAssignments
          key={String(assignmentId)}
          id={assignmentId}
          onClose={() => {
            return setAssignmentId(null);
          }}
          onSaved={() => {
            flash("Batch assignments saved.");

            void load();
          }}
        />
      )}
    </>
  );
}
