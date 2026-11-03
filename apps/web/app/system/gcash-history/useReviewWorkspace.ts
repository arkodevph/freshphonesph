"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  GcashCorrection,
  GcashHistory,
  GcashHistoryReview,
  GcashReadingPage,
} from "@freshphones/contracts";
import {
  correctGcashTransaction,
  getGcashHistory,
  getGcashReading,
  reviewGcashHistory,
} from "@/lib/gcash-history";

export function useReviewWorkspace(
  id: string,
  initial: GcashHistory,
  changed: (row: GcashHistory) => void,
) {
  const [record, setRecord] = useState(initial);

  const [page, setPage] = useState(1);

  const [source, setSource] = useState<"current" | "original">("current");

  const [result, setResult] = useState<GcashReadingPage | null>(null);

  const [loading, setLoading] = useState(true);

  const [readingError, setReadingError] = useState("");

  const [error, setError] = useState("");

  const [notice, setNotice] = useState("");

  const [saving, setSaving] = useState(false);

  const [edit, setEdit] = useState<number | null>(null);

  const [attempt, setAttempt] = useState(0);

  const pending = useRef(false);

  const alive = useRef(true);

  const generation = useRef(0);

  useEffect(() => {
    alive.current = true;

    return () => {
      alive.current = false;

      generation.current++;
    };
  }, []);

  useEffect(() => {
    const token = ++generation.current;

    setLoading(true);

    setReadingError("");

    setResult(null);

    void getGcashReading(id, page, source)
      .then((value) => {
        if (token === generation.current) {
          setResult(value);
        }
      })
      .catch((failure: unknown) => {
        if (token === generation.current) {
          setReadingError(
            failure instanceof Error
              ? failure.message
              : "Could not load transactions.",
          );
        }
      })
      .finally(() => {
        if (token === generation.current) {
          setLoading(false);
        }
      });

    return () => {
      generation.current++;
    };
  }, [id, page, source, attempt]);

  useEffect(() => {
    let active = true;

    void getGcashHistory(initial.id)
      .then((value) => {
        if (active) {
          setRecord(value);
        }
      })
      .catch((failure: unknown) => {
        if (active) {
          setError(
            failure instanceof Error
              ? failure.message
              : "Could not load the current submission.",
          );
        }
      });

    return () => {
      active = false;
    };
  }, [initial.id, attempt]);

  const updated = useCallback(
    (row: GcashHistory) => {
      setRecord(row);

      changed(row);

      setAttempt((value) => {
        return value + 1;
      });
    },
    [changed],
  );

  async function mutate(run: () => Promise<GcashHistory>, message: string) {
    if (pending.current) {
      return;
    }

    pending.current = true;

    setSaving(true);

    setError("");

    setNotice("");

    try {
      const row = await run();

      if (alive.current) {
        updated(row);

        setEdit(null);

        setNotice(message);
      }
    } catch (failure) {
      if (alive.current) {
        setError(
          failure instanceof Error
            ? failure.message
            : "Could not save this change.",
        );
      }
    } finally {
      pending.current = false;

      if (alive.current) {
        setSaving(false);
      }
    }
  }

  return {
    record,
    page,
    setPage,
    source,
    setSource,
    result,
    loading,
    readingError,
    error,
    notice,
    saving,
    edit,
    setEdit,
    attempt,
    updated,
    reload: () => {
      setEdit(null);

      setError("");

      setAttempt((value) => {
        return value + 1;
      });
    },
    correct: (input: GcashCorrection) => {
      return mutate(() => {
        return correctGcashTransaction(id, input);
      }, "Correction saved. Recheck the updated totals, then record a new Records review.");
    },
    review: (input: GcashHistoryReview) => {
      return mutate(
        () => {
          return reviewGcashHistory(initial.id, input);
        },
        input.status === "REVIEWED"
          ? "Records review saved."
          : "Clarification requested. The Handler can submit a corrected PDF.",
      );
    },
  };
}
