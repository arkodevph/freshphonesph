"use client";

import { useToastNotice } from "@/lib/useToastNotice";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  EnrollmentFormConfig,
  PublicEnrollmentApplication,
} from "@freshphones/contracts";
import type { Me } from "@/lib/api";
import {
  getEnrollmentApplication,
  getEnrollmentBatchChoices,
  getEnrollmentFormConfig,
  type EnrollmentBatchChoice,
} from "@/lib/enrollment-forms";
import { ApiError } from "@/lib/ts-api";
import { useLiveRecords } from "@/lib/useLiveRecords";

export function useEnrollmentApplication(id: string, me: Me) {
  const alive = useRef(false);

  const generation = useRef(0);

  const busy = useRef(false);

  const detailRef = useRef<PublicEnrollmentApplication | null>(null);

  const [application, setApplication] =
    useState<PublicEnrollmentApplication | null>(null);

  const [batches, setBatches] = useState<EnrollmentBatchChoice[]>([]);

  const [agents, setAgents] = useState<EnrollmentFormConfig["agents"]>([]);

  const [loading, setLoading] = useState(true);

  const [pending, setPending] = useState(false);

  const [error, setError] = useState("");

  const [notice, setNotice] = useToastNotice("");

  const clear = useCallback(() => {
    setApplication(null);

    detailRef.current = null;

    setBatches([]);

    setAgents([]);
  }, []);

  const load = useCallback(async () => {
    const request = ++generation.current;

    clear();

    setLoading(true);

    setError("");

    try {
      const detail = await getEnrollmentApplication(id);

      const [choices, config] = await Promise.all([
        detail.status === "RECEIVED" &&
        detail.assignedAgent.id === String(me.id) &&
        me.role === "agent"
          ? getEnrollmentBatchChoices()
          : Promise.resolve([]),
        detail.status === "RECEIVED" && me.role === "coo"
          ? getEnrollmentFormConfig()
          : Promise.resolve(null),
      ]);

      if (alive.current && request === generation.current) {
        setApplication(detail);

        detailRef.current = detail;

        setBatches(choices);

        setAgents(config?.agents ?? []);
      }
    } catch (failure) {
      if (alive.current && request === generation.current) {
        clear();

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
  }, [id, me.id, me.role, clear]);

  const check = useCallback(async () => {
    if (!detailRef.current || busy.current) {
      return;
    }

    const request = ++generation.current;

    try {
      const latest = await getEnrollmentApplication(id);

      if (
        alive.current &&
        request === generation.current &&
        (latest.version !== detailRef.current?.version ||
          JSON.stringify(latest.enrollmentRequest) !==
            JSON.stringify(detailRef.current?.enrollmentRequest))
      ) {
        await load();

        if (alive.current) {
          setNotice(
            "This application changed. The latest record is now shown; review it before taking an action.",
          );
        }
      }
    } catch (failure) {
      if (
        alive.current &&
        request === generation.current &&
        failure instanceof ApiError &&
        [401, 403, 404].includes(failure.status)
      ) {
        clear();

        setError(failure.message);
      }
    }
  }, [id, load, clear]);

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

  async function run(work: () => Promise<unknown>, message: string) {
    if (!application || busy.current) {
      return;
    }

    busy.current = true;

    const request = ++generation.current;

    setPending(true);

    setError("");

    setNotice("");

    try {
      await work();

      if (alive.current && request === generation.current) {
        await load();

        if (alive.current) {
          setNotice(message);
        }
      }
    } catch (failure) {
      if (alive.current && request === generation.current) {
        if (
          failure instanceof ApiError &&
          [401, 403, 404].includes(failure.status)
        ) {
          clear();
        }

        if (failure instanceof ApiError && failure.status === 409) {
          await load();

          if (alive.current) {
            setNotice(
              "The application changed. Review the latest record before trying again.",
            );
          }
        }

        if (alive.current) {
          setError(
            failure instanceof Error
              ? failure.message
              : "Could not update this application. Please retry.",
          );
        }
      }
    } finally {
      busy.current = false;

      if (alive.current) {
        setPending(false);
      }
    }
  }

  return {
    application,
    batches,
    agents,
    loading,
    pending,
    error,
    notice,
    load,
    run,
  };
}
