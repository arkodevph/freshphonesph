"use client";

import { useToastNotice } from "@/lib/useToastNotice";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  WithdrawalCase,
  WithdrawalEligibility,
  WithdrawalPage,
  WithdrawalStatus,
} from "@freshphones/contracts";
import {
  getWithdrawal,
  listWithdrawals,
  withdrawalEligibility,
} from "@/lib/withdrawals";
import { useLiveRecords } from "@/lib/useLiveRecords";
import { ApiError } from "@/lib/ts-api";

export function useWithdrawalWorkspace({
  enabled,
  customer,
  clientId,
  requestId,
}: {
  enabled: boolean;
  customer: boolean;
  clientId?: string;
  requestId?: string;
}) {
  const [page, setPage] = useState(1);

  const [status, setStatus] = useState<WithdrawalStatus | "">("");

  const [query, setQuery] = useState("");

  const [result, setResult] = useState<WithdrawalPage | null>(null);

  const [eligibility, setEligibility] = useState<WithdrawalEligibility | null>(
    null,
  );

  const [selected, setSelected] = useState<string | null>(requestId ?? null);

  const [row, setRow] = useState<WithdrawalCase | null>(null);

  const [loading, setLoading] = useState(true);

  const [detailLoading, setDetailLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [notice, setNotice] = useToastNotice(null);

  const [busy, setBusy] = useState(false);

  const [stale, setStale] = useState(false);

  const sequence = useRef(0);

  const detailSequence = useRef(0);

  const selection = useRef(selected);

  const current = useRef(row);

  const mutation = useRef(false);

  selection.current = selected;

  current.current = row;

  const load = useCallback(async () => {
    if (!enabled) {
      return;
    }

    const version = ++sequence.current;

    try {
      const [items, choices] = await Promise.all([
        listWithdrawals({
          page,
          ...(status ? { status } : {}),
          ...(query.trim() ? { q: query.trim() } : {}),
          ...(customer && clientId ? { clientId } : {}),
        }),
        customer ? withdrawalEligibility() : Promise.resolve([]),
      ]);

      if (version !== sequence.current) {
        return;
      }

      setResult(items);

      setEligibility(
        choices.find((item) => {
          return item.clientId === clientId;
        }) ?? null,
      );

      setError(null);
    } catch (failure) {
      if (version === sequence.current) {
        setResult(null);

        setEligibility(null);

        if (
          failure instanceof ApiError &&
          [401, 403, 404].includes(failure.status)
        ) {
          setRow(null);
        }

        setError(
          failure instanceof Error
            ? failure.message
            : "Could not load withdrawal requests.",
        );
      }
    } finally {
      if (version === sequence.current) {
        setLoading(false);
      }
    }
  }, [enabled, customer, clientId, page, status, query]);

  const loadDetail = useCallback(async (id: string, replace = false) => {
    const version = ++detailSequence.current;

    if (replace || !current.current) {
      setDetailLoading(true);
    }

    try {
      const record = await getWithdrawal(id);

      if (version !== detailSequence.current || selection.current !== id) {
        return;
      }

      if (
        !replace &&
        current.current?.id === id &&
        current.current.version !== record.version
      ) {
        setStale(true);

        return;
      }

      setRow(record);

      setStale(false);
    } catch (failure) {
      if (version === detailSequence.current && selection.current === id) {
        if (
          failure instanceof ApiError &&
          [401, 403, 404].includes(failure.status)
        ) {
          setRow(null);
        }

        setError(
          failure instanceof Error
            ? failure.message
            : "Could not load this request.",
        );
      }
    } finally {
      if (version === detailSequence.current) {
        setDetailLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    setLoading(true);

    void load();

    return () => {
      ++sequence.current;
    };
  }, [load]);

  useEffect(() => {
    setRow(null);

    setStale(false);

    if (selected && enabled) {
      void loadDetail(selected, true);
    }

    return () => {
      ++detailSequence.current;
    };
  }, [selected, enabled, loadDetail]);

  useLiveRecords(() => {
    void load();

    if (selection.current && !mutation.current) {
      void loadDetail(selection.current);
    }
  }, enabled);

  useEffect(() => {
    return () => {
      ++sequence.current;

      ++detailSequence.current;

      selection.current = null;
    };
  }, []);

  async function run(action: () => Promise<unknown>, message: string) {
    if (mutation.current || stale) {
      return false;
    }

    const id = selection.current;

    mutation.current = true;

    setBusy(true);

    setError(null);

    setNotice(null);

    try {
      const saved = await action();

      if (selection.current !== id) {
        return false;
      }

      if (
        saved &&
        typeof saved === "object" &&
        "id" in saved &&
        "reason" in saved &&
        "actions" in saved
      ) {
        setRow(saved as WithdrawalCase);

        setStale(false);

        if (!id) {
          setSelected((saved as WithdrawalCase).id);
        }
      } else if (id) {
        await loadDetail(id, true);
      }

      setNotice(message);

      await load();

      return true;
    } catch (failure) {
      if (selection.current === id) {
        if (
          failure instanceof ApiError &&
          [401, 403, 404].includes(failure.status)
        ) {
          setResult(null);

          setEligibility(null);

          setRow(null);
        }

        setError(
          failure instanceof Error
            ? failure.message
            : "The change could not be saved. Your draft is retained.",
        );

        if (
          failure instanceof ApiError &&
          [401, 403, 404].includes(failure.status)
        ) {
          setRow(null);
        }

        if (failure instanceof ApiError && failure.status === 409) {
          setStale(true);
        }
      }

      return false;
    } finally {
      mutation.current = false;

      setBusy(false);
    }
  }

  return {
    page,
    setPage,
    status,
    setStatus,
    query,
    setQuery,
    result,
    eligibility,
    selected,
    setSelected,
    row,
    loading,
    detailLoading,
    error,
    notice,
    busy,
    stale,
    load,
    loadDetail,
    run,
  };
}
