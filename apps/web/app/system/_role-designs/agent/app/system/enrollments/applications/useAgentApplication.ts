"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PublicEnrollmentApplication } from "@freshphones/contracts";
import { getEnrollmentApplication } from "@/lib/enrollment-forms";
import { ApiError } from "@/lib/ts-api";
import { useLiveRecords } from "@/lib/useLiveRecords";
import { uncertainEnrollmentFailure } from "../submission-attempt";

type Operation = "forward" | "close";

type Command = {
  work: () => Promise<unknown>;
  message: string;
  operation: Operation;
};

export function useAgentApplication(id: string) {
  const current = useRef<PublicEnrollmentApplication | null>(null);

  const generation = useRef(0);

  const busy = useRef(false);

  const alive = useRef(true);

  const command = useRef<Command | null>(null);

  const [application, setApplication] =
    useState<PublicEnrollmentApplication | null>(null);

  const [loading, setLoading] = useState(true);

  const [stale, setStale] = useState(false);

  const [uncertain, setUncertain] = useState(false);

  const [operation, setOperation] = useState<Operation | null>(null);

  const [error, setError] = useState("");

  const [notice, setNotice] = useState("");

  function clear() {
    current.current = null;

    setApplication(null);

    command.current = null;

    setUncertain(false);
  }

  const load = useCallback(async () => {
    if (busy.current) {
      return;
    }

    const request = ++generation.current;

    setLoading(true);

    setError("");

    try {
      const detail = await getEnrollmentApplication(id);

      if (alive.current && request === generation.current) {
        current.current = detail;

        setApplication(detail);

        setStale(false);

        setUncertain(false);

        command.current = null;
      }
    } catch (failure) {
      if (alive.current && request === generation.current) {
        if (
          failure instanceof ApiError &&
          [401, 403, 404].includes(failure.status)
        ) {
          clear();
        }

        setError(
          failure instanceof Error
            ? failure.message
            : "Could not load this application.",
        );
      }
    } finally {
      if (alive.current && request === generation.current) {
        setLoading(false);
      }
    }
  }, [id]);

  const check = useCallback(async () => {
    if (!current.current || busy.current) {
      return;
    }

    const request = ++generation.current;

    try {
      const latest = await getEnrollmentApplication(id);

      if (
        alive.current &&
        request === generation.current &&
        (latest.version !== current.current?.version ||
          JSON.stringify(latest.enrollmentRequest) !==
            JSON.stringify(current.current?.enrollmentRequest))
      ) {
        setStale(true);
      }
    } catch (failure) {
      if (alive.current && request === generation.current) {
        if (
          failure instanceof ApiError &&
          [401, 403, 404].includes(failure.status)
        ) {
          clear();
        }

        setError(
          failure instanceof Error
            ? failure.message
            : "Could not check the latest application. Your draft is retained.",
        );
      }
    }
  }, [id]);

  useEffect(() => {
    alive.current = true;

    void load();

    window.addEventListener("focus", check);

    return () => {
      alive.current = false;

      ++generation.current;

      window.removeEventListener("focus", check);
    };
  }, [load, check]);

  useLiveRecords(check);

  async function execute(next: Command) {
    if (busy.current || !current.current) {
      return;
    }

    busy.current = true;

    setOperation(next.operation);

    setError("");

    setNotice("");

    ++generation.current;

    try {
      await next.work();

      if (alive.current) {
        command.current = null;

        setUncertain(false);

        setNotice(next.message);

        setStale(true);

        busy.current = false;

        await load();
      }
    } catch (failure) {
      if (!alive.current) {
        return;
      }

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
          : "The result is unconfirmed. Retry the original action or load the latest application before continuing.",
      );
    } finally {
      busy.current = false;

      if (alive.current) {
        setOperation(null);
      }
    }
  }

  async function run(
    work: () => Promise<unknown>,
    message: string,
    kind: Operation = "forward",
  ) {
    if (stale || uncertain) {
      return;
    }

    await execute({ work, message, operation: kind });
  }

  async function retry() {
    if (command.current && !stale) {
      await execute(command.current);
    }
  }

  return {
    application,
    loading,
    stale,
    uncertain,
    error,
    notice,
    operation,
    pending: Boolean(operation),
    load,
    run,
    retry,
    check,
  };
}
