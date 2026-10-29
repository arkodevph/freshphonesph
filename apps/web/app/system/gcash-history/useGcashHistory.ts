"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  GcashHistory,
  GcashHistoryReview,
  GcashHistoryStatus,
} from "@freshphones/contracts";
import {
  listGcashBatchChoices,
  listGcashHistories,
  getGcashHistory,
  uploadGcashHistory,
  reviewGcashHistory,
  downloadGcashSubmission,
  gcashPdfError,
  type GcashBatchChoice,
} from "@/lib/api";
import { can, useMe } from "@/lib/useMe";
import { ApiError } from "@/lib/ts-api";
import { useLiveRecords } from "@/lib/useLiveRecords";
import { today } from "@/lib/date";
import type { GcashFeedbackMessage } from "./GcashFeedback";

const emptyDraft = () => {
  return {
    batchId: "",
    periodStart: today(),
    periodEnd: today(),
    expectedVersion: 0,
    note: "",
  };
};

export function useGcashHistory() {
  const me = useMe();

  const canRead = can(me, "GCASH_HISTORY_READ");

  const canUpload = can(me, "GCASH_HISTORY_UPLOAD");

  const canReview = can(me, "GCASH_HISTORY_REVIEW");

  const [items, setItems] = useState<GcashHistory[]>([]);

  const [total, setTotal] = useState(0);

  const [page, setPage] = useState(1);

  const [query, setQuery] = useState("");

  const [status, setStatus] = useState<GcashHistoryStatus | "">("");

  const [loading, setLoading] = useState(true);

  const [listError, setListError] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [notice, setNotice] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);

  const [feedback, setFeedback] = useState<GcashFeedbackMessage | null>(null);

  const feedbackSequence = useRef(0);

  const announce = useCallback(
    (kind: GcashFeedbackMessage["kind"], title: string, message: string) => {
      setFeedback({ id: ++feedbackSequence.current, kind, title, message });
    },
    [],
  );

  const [draft, setDraft] = useState(emptyDraft);

  const [file, setFile] = useState<File | null>(null);

  const [password, setPassword] = useState("");

  const [inputKey, setInputKey] = useState(0);

  const [correcting, setCorrecting] = useState<GcashHistory | null>(null);

  const [reviewing, setReviewing] = useState<GcashHistory | null>(null);

  const [choices, setChoices] = useState<GcashBatchChoice[]>([]);

  const [choicesError, setChoicesError] = useState<string | null>(null);

  const [choicesAttempt, setChoicesAttempt] = useState(0);

  const request = useRef(0);

  const access = useRef(0);

  const mutation = useRef(false);

  const resetDraft = useCallback(() => {
    setFeedback(null);

    setError(null);

    setNotice(null);

    setDraft(emptyDraft());

    setFile(null);

    setPassword("");

    setCorrecting(null);

    setInputKey((key) => {
      return key + 1;
    });
  }, []);

  const clear = useCallback(() => {
    access.current++;

    request.current++;

    setItems([]);

    setTotal(0);

    setLoading(false);

    setChoices([]);

    setReviewing(null);

    setError(null);

    setNotice(null);

    setFeedback(null);

    resetDraft();
  }, [resetDraft]);

  useEffect(() => {
    clear();

    return () => {
      access.current++;

      request.current++;
    };
  }, [me?.id, canRead, canUpload, canReview, clear]);

  const load = useCallback(async () => {
    const token = ++request.current;

    if (!canRead) {
      setLoading(!me);

      return;
    }

    setLoading(true);

    setListError(null);

    try {
      const result = await listGcashHistories({
        page,
        q: query,
        ...(status ? { status } : {}),
      });

      if (token !== request.current) {
        return;
      }

      setItems(result.items);

      setTotal(result.total);
    } catch (error) {
      if (token !== request.current) {
        return;
      }

      setItems([]);

      setTotal(0);

      setListError(
        error instanceof Error
          ? error.message
          : "Could not load GCash histories.",
      );

      if (error instanceof ApiError && [401, 403].includes(error.status)) {
        clear();
      }
    } finally {
      if (token === request.current) {
        setLoading(false);
      }
    }
  }, [me?.id, canRead, page, query, status, clear]);

  useEffect(() => {
    void load();

    return () => {
      request.current++;
    };
  }, [load]);

  useLiveRecords(load, canRead);

  useEffect(() => {
    let active = true;

    if (!canUpload) {
      return;
    }

    setChoicesError(null);

    void listGcashBatchChoices()
      .then((rows) => {
        if (active) {
          setChoices(rows);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setChoicesError(
            error instanceof Error ? error.message : "Could not load batches.",
          );
        }
      });

    return () => {
      active = false;
    };
  }, [me?.id, canUpload, choicesAttempt]);

  const failure = (error: unknown, uploadVersion?: number) => {
    const conflict =
      error instanceof ApiError &&
      error.status === 409 &&
      uploadVersion !== undefined;

    const message = conflict
      ? uploadVersion === 0
        ? "A PDF is already submitted for this batch and date range. Open its PDF history to review it."
        : "This submission has changed. Load its latest Records review before trying the correction again."
      : error instanceof Error
        ? error.message
        : "The action could not be completed.";

    if (error instanceof ApiError && [401, 403].includes(error.status)) {
      clear();
    }

    setError(message);

    announce(
      "error",
      conflict
        ? uploadVersion === 0
          ? "Already submitted"
          : "Submission changed"
        : "Action needed",
      message,
    );
  };

  function selectFile(next: File | null) {
    const invalid = next ? gcashPdfError(next) : null;

    setPassword("");

    setError(invalid);

    setNotice(null);

    setFile(invalid ? null : next);

    if (invalid) {
      announce("error", "Choose a PDF", invalid);
    } else if (next) {
      announce(
        "info",
        "PDF ready",
        "Your PDF is selected. Check the batch, dates and password, then submit it to Records.",
      );
    } else {
      setFeedback(null);
    }

    return invalid;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    if (mutation.current || !file) {
      return;
    }

    const invalid = gcashPdfError(file);

    if (invalid) {
      setError(invalid);

      announce("error", "Choose a PDF", invalid);

      return;
    }

    const token = access.current;

    mutation.current = true;

    setSaving(true);

    setError(null);

    setNotice(null);

    announce(
      "progress",
      "Reading PDF",
      "Reading your statement and submitting it to Records. Please keep this page open.",
    );

    try {
      const saved = await uploadGcashHistory(
        { ...draft, ...(password ? { password } : {}) },
        file,
      );

      if (token !== access.current) {
        return;
      }

      resetDraft();

      const message = `${saved.batch.code}: PDF revision ${saved.revision} submitted to Records.`;

      setNotice(message);

      announce("success", "PDF submitted", message);

      await load();
    } catch (error) {
      if (token === access.current) {
        failure(error, draft.expectedVersion);
      }
    } finally {
      setPassword("");

      setSaving(false);

      mutation.current = false;
    }
  }

  async function review(input: GcashHistoryReview) {
    if (!reviewing || mutation.current) {
      return;
    }

    const token = access.current;

    mutation.current = true;

    setSaving(true);

    setError(null);

    setNotice(null);

    try {
      const saved = await reviewGcashHistory(reviewing.id, input);

      if (token !== access.current) {
        return;
      }

      setReviewing(null);

      const message =
        saved.status === "REVIEWED"
          ? "Records review saved. Payments still require Finance verification."
          : "Clarification requested. The Handler can submit a corrected PDF.";

      setNotice(message);

      announce("success", "Review saved", message);

      await load();
    } catch (error) {
      if (token === access.current) {
        failure(error);
      }
    } finally {
      setSaving(false);

      mutation.current = false;
    }
  }

  async function download(id: string, filename: string) {
    const token = access.current;

    try {
      const blob = await downloadGcashSubmission(id);

      if (token !== access.current) {
        return;
      }

      const url = URL.createObjectURL(blob);

      const anchor = document.createElement("a");

      anchor.href = url;

      anchor.download = filename;

      anchor.click();

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
    } catch (error) {
      failure(error);
    }
  }

  return {
    me,
    canRead,
    canUpload,
    canReview,
    items,
    total,
    page,
    setPage,
    query,
    setQuery,
    status,
    setStatus,
    loading,
    listError,
    error,
    setError,
    notice,
    saving,
    draft,
    setDraft,
    file,
    setFile,
    password,
    setPassword,
    inputKey,
    feedback,
    dismissFeedback: () => {
      setFeedback(null);
    },
    selectFile,
    correcting,
    reviewing,
    setReviewing,
    choices,
    choicesError,
    retryChoices: () => {
      setChoicesAttempt((value) => {
        return value + 1;
      });
    },
    resetDraft,
    load,
    submit,
    review,
    download,
    correct: (row: GcashHistory) => {
      setCorrecting(row);

      setDraft({
        batchId: row.batch.id,
        periodStart: row.periodStart,
        periodEnd: row.periodEnd,
        expectedVersion: row.version,
        note: "",
      });

      setFile(null);

      setPassword("");

      setInputKey((value) => {
        return value + 1;
      });

      setError(null);

      setNotice(null);

      setFeedback(null);

      window.scrollTo({ top: 0, behavior: "auto" });
    },
    refreshReview: async () => {
      if (!reviewing) {
        return;
      }

      const token = access.current;

      try {
        const latest = await getGcashHistory(reviewing.id);

        if (token !== access.current) {
          return;
        }

        setReviewing(latest);

        setError(null);
      } catch (error) {
        if (token === access.current) {
          failure(error);
        }
      }
    },
  };
}
