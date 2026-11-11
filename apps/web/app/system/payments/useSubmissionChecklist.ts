"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ChecklistQuery,
  EvidenceRequirementInput,
  SubmissionChecklist,
} from "@freshphones/contracts";
import { listBatches, type Batch } from "@/lib/api";
import { today } from "@/lib/date";
import {
  getSubmissionChecklist,
  saveEvidenceRequirement,
} from "@/lib/submission-checklists";
import { ApiError } from "@/lib/ts-api";
import { useLiveRecords } from "@/lib/useLiveRecords";

export type RequirementDraft = {
  id: string;
  version: number;
  record: EvidenceRequirementInput;
};

export function useSubmissionChecklist(enabled: boolean, open: boolean) {
  const [search, setSearch] = useState("");

  const [batches, setBatches] = useState<Batch[]>([]);

  const [query, setQuery] = useState<ChecklistQuery>({
    batchId: "",
    from: today(),
    to: today(),
  });

  const [activeQuery, setActiveQuery] = useState<ChecklistQuery | null>(null);

  const [data, setData] = useState<SubmissionChecklist | null>(null);

  const [draft, setDraft] = useState<RequirementDraft | null>(null);

  const [loading, setLoading] = useState(false);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [notice, setNotice] = useState("");

  const request = useRef(0);

  const mutation = useRef(false);

  useEffect(() => {
    if (!enabled || !open) {
      return;
    }

    let cancelled = false;

    const timeout = setTimeout(() => {
      void listBatches({ q: search })
        .then((result) => {
          if (!cancelled) {
            setBatches(result.results);
          }
        })
        .catch((caught) => {
          if (!cancelled) {
            setBatches([]);

            setError(
              caught instanceof Error
                ? caught.message
                : "Could not load batches.",
            );
          }
        });
    }, 250);

    return () => {
      cancelled = true;

      clearTimeout(timeout);
    };
  }, [enabled, open, search]);

  const load = useCallback(async (scope: ChecklistQuery) => {
    const current = ++request.current;

    setLoading(true);

    setError("");

    try {
      const result = await getSubmissionChecklist(scope);

      if (current === request.current) {
        setData(result);

        setActiveQuery(scope);
      }
    } catch (caught) {
      if (current !== request.current) {
        return;
      }

      setError(
        caught instanceof Error
          ? caught.message
          : "Could not load the checklist.",
      );

      if (
        caught instanceof ApiError &&
        [401, 403, 404].includes(caught.status)
      ) {
        setData(null);

        setDraft(null);
      }
    } finally {
      if (current === request.current) {
        setLoading(false);
      }
    }
  }, []);

  useLiveRecords(() => {
    if (activeQuery) {
      void load(activeQuery);
    }
  }, enabled && open);

  useEffect(() => {
    if (!enabled) {
      ++request.current;

      setData(null);

      setDraft(null);

      setBatches([]);
    }

    return () => {
      ++request.current;
    };
  }, [enabled]);

  function add() {
    if (!activeQuery) {
      return;
    }

    setNotice("");

    setDraft({
      id: crypto.randomUUID(),
      version: 0,
      record: {
        batchId: activeQuery.batchId,
        periodStart: activeQuery.from,
        periodEnd: activeQuery.to,
        kind: "RECEIPT",
        description: "",
        clientId: null,
        paymentId: null,
        historyId: null,
        cancelled: false,
        reason: "",
      },
    });
  }

  async function save() {
    if (!draft || !activeQuery || mutation.current) {
      return;
    }

    mutation.current = true;

    setSaving(true);

    setError("");

    try {
      await saveEvidenceRequirement(draft.id, draft.version, draft.record);

      setDraft(null);

      setNotice(
        "Expected evidence saved. Completeness is checked against the actual files and current review.",
      );

      await load(activeQuery);
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : "Could not save the expectation.";

      if (caught instanceof ApiError && [401, 403].includes(caught.status)) {
        setData(null);

        setDraft(null);
      } else {
        await load(activeQuery);
      }

      setError(message);
    } finally {
      mutation.current = false;

      setSaving(false);
    }
  }

  return {
    search,
    setSearch,
    batches,
    query,
    setQuery,
    activeQuery,
    data,
    draft,
    setDraft,
    loading,
    saving,
    error,
    notice,
    load,
    add,
    save,
  };
}
