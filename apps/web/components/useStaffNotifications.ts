"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getStaffAlerts,
  deleteStaffNotification,
  readAllStaffAlerts,
  readStaffAlert,
  type StaffAlert,
  type StaffAlertPage,
  type StaffAlertScope,
} from "@/lib/api";
import { useLiveRecords } from "@/lib/useLiveRecords";
import { ApiError } from "@/lib/ts-api";

/** Authoritative staff alert reads, scoped filters and per-user read receipts. */
export function useStaffNotifications(enabled = true) {
  const [snapshot, setSnapshot] = useState<StaffAlertPage | null>(null);

  const [scope, setScope] = useState<StaffAlertScope>("all");

  const [page, setPage] = useState(1);

  const [unreadOnly, setUnreadOnly] = useState(false);

  const [loading, setLoading] = useState(true);

  const [busy, setBusy] = useState(false);

  const [notice, setNotice] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [actionError, setActionError] = useState<string | null>(null);

  const sequence = useRef(0);

  const pendingReads = useRef(new Set<string>());

  const load = useCallback(async () => {
    if (!enabled) {
      return;
    }

    const request = ++sequence.current;

    setLoading(true);

    try {
      const result = await getStaffAlerts(page, unreadOnly, scope);

      if (request !== sequence.current) {
        return;
      }

      setError(null);

      const lastPage = Math.max(1, Math.ceil(result.total / result.pageSize));

      if (page > lastPage) {
        setPage(lastPage);

        return;
      }

      setSnapshot(result);
    } catch (error) {
      if (request !== sequence.current) {
        return;
      }

      if (error instanceof ApiError && [401, 403].includes(error.status)) {
        setSnapshot(null);
      }

      setError(
        error instanceof Error ? error.message : "Could not load staff alerts.",
      );
    } finally {
      if (request === sequence.current) {
        setLoading(false);
      }
    }
  }, [page, unreadOnly, scope, enabled]);

  const currentLoad = useRef(load);

  currentLoad.current = load;

  useEffect(() => {
    void load();

    return () => {
      sequence.current++;
    };
  }, [load]);

  useLiveRecords(load, enabled);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const refresh = () => {
      if (document.visibilityState === "visible") {
        void currentLoad.current();
      }
    };

    const timer = setInterval(refresh, 30_000);

    window.addEventListener("fp-staff-notifications-read", refresh);

    document.addEventListener("visibilitychange", refresh);

    return () => {
      clearInterval(timer);

      window.removeEventListener("fp-staff-notifications-read", refresh);

      document.removeEventListener("visibilitychange", refresh);
    };
  }, [enabled]);

  async function read(alert?: StaffAlert) {
    const key = alert
      ? `${alert.entity}:${alert.id}:${alert.entity === "task" ? `${alert.kind}:${alert.deadline}` : alert.version}`
      : "all";

    if (
      (!alert && busy) ||
      (alert && alert.readAt) ||
      pendingReads.current.has(key)
    ) {
      return;
    }

    pendingReads.current.add(key);

    setBusy(true);

    setActionError(null);

    try {
      if (alert) {
        await readStaffAlert(alert);
      } else {
        await readAllStaffAlerts(scope);
      }

      window.dispatchEvent(new Event("fp-staff-notifications-read"));
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Could not update the alert. Please try again.",
      );
    } finally {
      pendingReads.current.delete(key);

      setBusy(pendingReads.current.size > 0);

      void currentLoad.current();
    }
  }

  async function remove(alert: StaffAlert) {
    if (!alert.inboxId || busy) {
      return false;
    }

    setBusy(true);

    setActionError(null);

    setNotice(null);

    try {
      await deleteStaffNotification(alert.inboxId);

      setNotice("Notification deleted.");

      window.dispatchEvent(new Event("fp-staff-notifications-read"));

      await currentLoad.current();

      return true;
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Could not delete the notification. Try again.",
      );

      return false;
    } finally {
      setBusy(false);
    }
  }

  return {
    snapshot,
    scope,
    setScope,
    page,
    setPage,
    unreadOnly,
    setUnreadOnly,
    loading,
    busy,
    notice,
    remove,
    error,
    actionError,
    load,
    read,
  };
}
