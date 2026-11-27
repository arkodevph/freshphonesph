"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { WithdrawalCase } from "@freshphones/contracts";
import { getWithdrawal } from "@/lib/withdrawals";
import { ApiError } from "@/lib/ts-api";
import { useLiveRecords } from "@/lib/useLiveRecords";
import { uncertainEnrollmentFailure } from "../../app/system/enrollments/submission-attempt";

type Command = { action: () => Promise<unknown>; message: string };

export function useAgentWithdrawal(id?: string) {
  const current = useRef<WithdrawalCase | null>(null);

  const sequence = useRef(0);

  const mutation = useRef(false);

  const alive = useRef(true);

  const command = useRef<Command | null>(null);

  const [row, setRow] = useState<WithdrawalCase | null>(null);

  const [loading, setLoading] = useState(Boolean(id));

  const [error, setError] = useState("");

  const [notice, setNotice] = useState("");

  const [busy, setBusy] = useState(false);

  const [stale, setStale] = useState(false);

  const [uncertain, setUncertain] = useState(false);

  const [revision, setRevision] = useState(0);

  const clear = useCallback(() => {
    ++sequence.current;

    current.current = null;

    command.current = null;

    setRow(null);

    setUncertain(false);

    setNotice("");
  }, []);

  const reload = useCallback(async () => {
    if (!id || mutation.current) {
      return;
    }

    const request = ++sequence.current;

    setLoading(true);

    setError("");

    try {
      const latest = await getWithdrawal(id);

      if (alive.current && request === sequence.current) {
        current.current = latest;

        setRow(latest);

        command.current = null;

        setStale(false);

        setUncertain(false);

        setRevision((value) => {
          return value + 1;
        });
      }
    } catch (failure) {
      if (alive.current && request === sequence.current) {
        if (
          failure instanceof ApiError &&
          [401, 403, 404].includes(failure.status)
        ) {
          clear();
        }

        setError(
          failure instanceof Error
            ? failure.message
            : "Could not load this request. Your draft remains here.",
        );
      }
    } finally {
      if (alive.current) {
        setLoading(false);
      }
    }
  }, [id, clear]);

  const check = useCallback(async () => {
    if (!id || !current.current || mutation.current) {
      return;
    }

    const request = ++sequence.current;

    try {
      const latest = await getWithdrawal(id);

      if (
        alive.current &&
        request === sequence.current &&
        latest.version !== current.current?.version
      ) {
        setStale(true);
      }
    } catch (failure) {
      if (alive.current && request === sequence.current) {
        if (
          failure instanceof ApiError &&
          [401, 403, 404].includes(failure.status)
        ) {
          clear();
        }

        setError(
          failure instanceof Error
            ? failure.message
            : "Could not refresh this request.",
        );
      }
    }
  }, [id, clear]);

  useEffect(() => {
    alive.current = true;

    clear();

    setError("");

    setStale(false);

    setLoading(Boolean(id));

    if (id) {
      void reload();
    }

    function revoked() {
      clear();

      setError(
        "Your session changed. Private request details have been cleared.",
      );
    }

    window.addEventListener("focus", check);

    window.addEventListener("fp-session-expired", revoked);

    return () => {
      alive.current = false;

      ++sequence.current;

      window.removeEventListener("focus", check);

      window.removeEventListener("fp-session-expired", revoked);
    };
  }, [id, reload, check, clear]);

  useLiveRecords(check);

  async function execute(next: Command) {
    if (mutation.current || !id || !current.current) {
      return false;
    }

    mutation.current = true;

    setBusy(true);

    setError("");

    setNotice("");

    const request = ++sequence.current;

    try {
      const saved = await next.action();

      if (!alive.current || request !== sequence.current) {
        return false;
      }

      if (
        saved &&
        typeof saved === "object" &&
        "actions" in saved &&
        "reason" in saved
      ) {
        current.current = saved as WithdrawalCase;

        setRow(saved as WithdrawalCase);

        setRevision((value) => {
          return value + 1;
        });
      }

      command.current = null;

      setUncertain(false);

      setStale(false);

      setNotice(next.message);

      return true;
    } catch (failure) {
      if (alive.current && request === sequence.current) {
        if (
          failure instanceof ApiError &&
          [401, 403, 404].includes(failure.status)
        ) {
          clear();
        } else if (failure instanceof ApiError && failure.status === 409) {
          setStale(true);
        } else if (uncertainEnrollmentFailure(failure)) {
          command.current = next;

          setUncertain(true);
        }

        setError(
          failure instanceof Error
            ? failure.message
            : "The result is unconfirmed. Your original action and draft are retained.",
        );
      }

      return false;
    } finally {
      mutation.current = false;

      if (alive.current) {
        setBusy(false);
      }
    }
  }

  async function run(action: () => Promise<unknown>, message: string) {
    return stale || uncertain ? false : execute({ action, message });
  }

  async function retry() {
    return command.current && !stale ? execute(command.current) : false;
  }

  return {
    row: row?.id === id ? row : null,
    loading,
    error,
    notice,
    busy,
    stale,
    uncertain,
    revision,
    blocked: busy || stale || uncertain || loading,
    reload,
    run,
    retry,
    clear,
  };
}
