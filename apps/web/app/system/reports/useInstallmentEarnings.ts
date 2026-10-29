"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import type {
  EarningsFrequency,
  InstallmentEarningsReport,
  ReportBatchOption,
} from "@freshphones/contracts";
import { downloadInstallmentEarnings, getInstallmentEarnings } from "@/lib/api";
import {
  changeEarningsFrequency,
  defaultEarningsFilters,
  earningsFilterQuery,
  type EarningsFilters,
} from "@/lib/installment-earnings";

function message(reason: unknown) {
  return reason instanceof Error
    ? reason.message
    : "Could not load installment earnings.";
}

export function useInstallmentEarnings() {
  const [draft, setDraft] = useState<EarningsFilters>(defaultEarningsFilters);

  const [applied, setApplied] = useState<EarningsFilters>(
    defaultEarningsFilters,
  );

  const [batch, setBatch] = useState<ReportBatchOption | null>(null);

  const [appliedBatch, setAppliedBatch] = useState<ReportBatchOption | null>(
    null,
  );

  const [page, setPage] = useState(1);

  const [report, setReport] = useState<InstallmentEarningsReport | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [validation, setValidation] = useState<string | null>(null);

  const [actionError, setActionError] = useState<string | null>(null);

  const [busy, setBusy] = useState<"csv" | "xlsx" | null>(null);

  const sequence = useRef(0);

  const operation = useRef(false);

  const mounted = useRef(true);

  const dirty = JSON.stringify(draft) !== JSON.stringify(applied);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    const query = earningsFilterQuery(applied, page);

    if (!query.params) {
      setValidation(query.error);

      return;
    }

    const request = ++sequence.current;

    setLoading(true);

    setError(null);

    setReport(null);

    try {
      const data = await getInstallmentEarnings(query.params);

      if (request !== sequence.current) {
        return;
      }

      const last = Math.max(1, Math.ceil(data.total / data.pageSize));

      if (page > last) {
        setPage(last);

        return;
      }

      setReport(data);
    } catch (reason) {
      if (request === sequence.current) {
        setError(message(reason));
      }
    } finally {
      if (request === sequence.current) {
        setLoading(false);
      }
    }
  }, [applied, page]);

  useEffect(() => {
    void load();

    return () => {
      sequence.current++;
    };
  }, [load]);

  function edit(field: keyof EarningsFilters, value: string) {
    setDraft((previous) => {
      return field === "frequency"
        ? changeEarningsFrequency(previous, value as EarningsFrequency)
        : { ...previous, [field]: value };
    });

    setValidation(null);

    setActionError(null);
  }

  function apply(event: FormEvent) {
    event.preventDefault();

    const query = earningsFilterQuery(draft);

    if (!query.params) {
      setValidation(query.error);

      return;
    }

    sequence.current++;

    setLoading(true);

    setReport(null);

    setValidation(null);

    setActionError(null);

    setPage(1);

    setAppliedBatch(batch);

    setApplied({ ...draft });
  }

  function reset() {
    const filters = defaultEarningsFilters();

    sequence.current++;

    setLoading(true);

    setReport(null);

    setDraft(filters);

    setApplied(filters);

    setPage(1);

    setBatch(null);

    setAppliedBatch(null);

    setValidation(null);

    setActionError(null);
  }

  function openMembers(item: ReportBatchOption) {
    const filters: EarningsFilters = {
      ...applied,
      groupBy: "members",
      batchId: item.id,
    };

    sequence.current++;

    setLoading(true);

    setReport(null);

    setDraft(filters);

    setApplied(filters);

    setBatch(item);

    setAppliedBatch(item);

    setPage(1);

    setActionError(null);
  }

  async function download(format: "csv" | "xlsx") {
    if (operation.current || loading || dirty || !report) {
      return;
    }

    const query = earningsFilterQuery(applied);

    if (!query.params) {
      return;
    }

    operation.current = true;

    setBusy(format);

    setActionError(null);

    try {
      await downloadInstallmentEarnings(query.params, format);
    } catch (reason) {
      if (mounted.current) {
        setActionError(message(reason));
      }
    } finally {
      operation.current = false;

      if (mounted.current) {
        setBusy(null);
      }
    }
  }

  return {
    draft,
    applied,
    batch,
    appliedBatch,
    page,
    report,
    loading,
    error,
    validation,
    actionError,
    busy,
    dirty,
    load,
    edit,
    apply,
    reset,
    openMembers,
    download,
    selectBatch: (item: ReportBatchOption | null) => {
      setBatch(item);

      edit("batchId", item?.id ?? "");
    },
    selectPage: (next: number) => {
      sequence.current++;

      setLoading(true);

      setReport(null);

      setPage(next);
    },
  };
}
