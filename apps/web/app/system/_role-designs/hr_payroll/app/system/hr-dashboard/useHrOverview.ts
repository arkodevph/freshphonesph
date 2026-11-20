"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getRecruitmentSummary, listJobs } from "@/lib/api";
import { tsRequest } from "@/lib/ts-api";
import { useLiveRecords } from "@/lib/useLiveRecords";
import type { Staff } from "../people/PersonnelDirectory";

type Resource<T> = {
  data: T | null;
  error: string | null;
  pending: boolean;
};

function useOverviewResource<T>(load: () => Promise<T>, enabled: boolean) {
  const [state, setState] = useState<Resource<T>>({
    data: null,
    error: null,
    pending: enabled,
  });

  const sequence = useRef(0);

  const refresh = useCallback(async () => {
    if (!enabled) {
      return;
    }

    const request = ++sequence.current;

    setState((current) => ({ ...current, pending: true }));

    try {
      const data = await load();

      if (request === sequence.current) {
        setState({ data, error: null, pending: false });
      }
    } catch (error) {
      if (request === sequence.current) {
        setState((current) => ({
          ...current,
          error:
            error instanceof Error
              ? error.message
              : "Could not load this overview.",
          pending: false,
        }));
      }
    }
  }, [load, enabled]);

  useEffect(() => {
    if (!enabled) {
      setState({ data: null, error: null, pending: false });

      return;
    }

    void refresh();

    return () => {
      sequence.current++;
    };
  }, [refresh, enabled]);

  useLiveRecords(refresh, enabled);

  return { ...state, refresh };
}

const loadPersonnel = () => tsRequest<Staff[]>("/staff/directory");

const loadRecruitment = async () => {
  const [summary, jobs] = await Promise.all([
    getRecruitmentSummary(),
    listJobs({ status: "OPEN", page: "1" }),
  ]);

  return { summary, jobs: jobs.results.slice(0, 3) };
};

const loadRequests = () =>
  tsRequest<{ count: number }>("/hr-actions?page=1&status=PENDING");

export function useHrOverview(access: {
  personnel: boolean;
  recruitment: boolean;
  confidential: boolean;
}) {
  const personnel = useOverviewResource(loadPersonnel, access.personnel);

  const recruitment = useOverviewResource(loadRecruitment, access.recruitment);

  const requests = useOverviewResource(loadRequests, access.confidential);

  return { personnel, recruitment, requests };
}
