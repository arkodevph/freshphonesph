"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  MonitorDetail,
  MonitorItem,
  MonitorPage,
} from "@freshphones/contracts";
import {
  getMonitorDetail,
  getOperationsMonitor,
  saveMonitorFollowUp,
  saveMonitorPolicy,
} from "@/lib/operations-monitor";
import { can, useMe } from "@/lib/useMe";
import { ApiError } from "@/lib/ts-api";
import { manilaInput, manilaDueAt } from "./monitor-view";
import { useLiveRecords } from "@/lib/useLiveRecords";

export function useOperationsMonitor() {
  const me = useMe();

  const enabled = can(me, "OPERATIONS_MONITOR");

  const [query, setQuery] = useState("");

  const [data, setData] = useState<MonitorPage | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [notice, setNotice] = useState("");

  const [selected, setSelected] = useState<MonitorItem | null>(null);

  const [detail, setDetail] = useState<MonitorDetail | null>(null);

  const [detailError, setDetailError] = useState("");

  const [detailLoading, setDetailLoading] = useState(false);

  const [note, setNote] = useState("");

  const [dueAt, setDueAt] = useState("");

  const [saving, setSaving] = useState(false);

  const [conflict, setConflict] = useState(false);

  const [reviewHours, setHours] = useState("");

  const policyDirty = useRef(false);

  const setReviewHours = (value: string) => {
    policyDirty.current = true;

    setHours(value);
  };

  const identity = `${me?.id ?? ""}:${enabled}`;

  const identityRef = useRef(identity);

  identityRef.current = identity;

  const selectedKey = useRef("");

  const request = useRef(0);

  const detailRequest = useRef(0);

  const pending = useRef(false);

  const policyVersion = useRef<string | null>(null);

  useEffect(() => {
    const sync = () => {
      setQuery(window.location.search.slice(1));
    };

    sync();

    window.addEventListener("popstate", sync);

    return () => {
      window.removeEventListener("popstate", sync);
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!enabled) {
      return;
    }

    const token = ++request.current;

    const owner = identityRef.current;

    try {
      const value = await getOperationsMonitor(new URLSearchParams(query));

      if (token !== request.current || owner !== identityRef.current) {
        return;
      }

      setData(value);

      const nextPolicyVersion = `${owner}:${value.policy.version}`;

      if (!policyDirty.current && policyVersion.current !== nextPolicyVersion) {
        setHours(String(value.policy.reviewDueHours));

        policyVersion.current = nextPolicyVersion;
      }

      setError("");
    } catch (reason) {
      if (token === request.current && owner === identityRef.current) {
        setError(
          reason instanceof Error
            ? reason.message
            : "Could not load monitoring items.",
        );

        setData(null);
      }
    } finally {
      if (token === request.current && owner === identityRef.current) {
        setLoading(false);
      }
    }
  }, [enabled, query, me?.id]);

  useEffect(() => {
    setLoading(true);

    setData(null);

    void refresh();

    return () => {
      request.current++;
    };
  }, [refresh]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const timer = setInterval(() => {
      void refresh();
    }, 30000);

    const focus = () => {
      void refresh();
    };

    window.addEventListener("focus", focus);

    return () => {
      clearInterval(timer);

      window.removeEventListener("focus", focus);
    };
  }, [refresh, enabled]);

  useLiveRecords(refresh, enabled);

  useEffect(() => {
    setSelected(null);

    setDetail(null);

    setNote("");

    setDueAt("");

    setNotice("");

    policyDirty.current = false;

    policyVersion.current = null;

    setConflict(false);

    selectedKey.current = "";

    detailRequest.current++;
  }, [me?.id, enabled]);

  const filter = (key: string, value: string) => {
    const params = new URLSearchParams(query);

    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    if (key !== "page") {
      params.delete("page");
    }

    const next = params.toString();

    window.history.pushState(
      null,
      "",
      `/system/operations-monitor${next ? `?${next}` : ""}`,
    );

    setQuery(next);
  };

  const open = async (
    item: MonitorItem,
    preserveDraft = false,
    historyPage = 1,
  ) => {
    const token = ++detailRequest.current;

    const owner = identityRef.current;

    selectedKey.current = `${item.source}:${item.id}`;

    setSelected(item);

    setDetail(null);

    setDetailError("");

    setDetailLoading(true);

    if (!preserveDraft) {
      setNote("");

      setDueAt("");
    }

    try {
      const value = await getMonitorDetail(item.source, item.id, historyPage);

      if (token !== detailRequest.current || owner !== identityRef.current) {
        return;
      }

      setDetail(value);

      setConflict(false);

      if (!preserveDraft) {
        setDueAt(manilaInput(value.item.followUp?.dueAt));
      }
    } catch (reason) {
      if (token === detailRequest.current && owner === identityRef.current) {
        setDetailError(
          reason instanceof Error
            ? reason.message
            : "Could not open this item.",
        );
      }
    } finally {
      if (token === detailRequest.current && owner === identityRef.current) {
        setDetailLoading(false);
      }
    }
  };

  const close = () => {
    if (!pending.current) {
      selectedKey.current = "";

      detailRequest.current++;

      setSelected(null);

      setDetail(null);

      setNote("");

      setDueAt("");
    }
  };

  const save = async (status: "OPEN" | "RESOLVED") => {
    if (!detail || pending.current) {
      return;
    }

    if (note.trim().length < 2) {
      setDetailError("Add a follow-up note or resolution reason.");

      return;
    }

    const owner = identityRef.current;

    const key = `${detail.item.source}:${detail.item.id}`;

    pending.current = true;

    setSaving(true);

    setDetailError("");

    try {
      await saveMonitorFollowUp(detail.item.source, detail.item.id, {
        version: detail.item.followUp?.version ?? 0,
        sourceVersion: detail.item.sourceVersion,
        status,
        note: note.trim(),
        dueAt: manilaDueAt(dueAt),
      });

      if (owner !== identityRef.current || key !== selectedKey.current) {
        return;
      }

      setNote("");

      setNotice(
        status === "OPEN"
          ? "Follow-up saved."
          : "Follow-up resolved. Source reviews stay unchanged.",
      );

      await open(detail.item);

      await refresh();
    } catch (reason) {
      if (owner !== identityRef.current || key !== selectedKey.current) {
        return;
      }

      setDetailError(
        reason instanceof Error
          ? reason.message
          : "Could not save your follow-up.",
      );

      setConflict(reason instanceof ApiError && reason.status === 409);
    } finally {
      pending.current = false;

      setSaving(false);
    }
  };

  const updatePolicy = async () => {
    if (!data || pending.current) {
      return;
    }

    const owner = identityRef.current;

    pending.current = true;

    setSaving(true);

    setError("");

    try {
      await saveMonitorPolicy(data.policy.version, Number(reviewHours));

      if (owner !== identityRef.current) {
        return;
      }

      policyDirty.current = false;

      setNotice("Review deadline updated.");

      await refresh();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Could not save the review deadline.",
      );
    } finally {
      pending.current = false;

      setSaving(false);
    }
  };

  return {
    me,
    enabled,
    query,
    data,
    loading,
    error,
    notice,
    selected,
    detail,
    detailError,
    detailLoading,
    note,
    setNote,
    dueAt,
    setDueAt,
    saving,
    conflict,
    reviewHours,
    setReviewHours,
    refresh,
    filter,
    open,
    close,
    save,
    updatePolicy,
  };
}
