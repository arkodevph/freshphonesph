"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Page, PublicEnrollmentApplication } from "@freshphones/contracts";
import { listEnrollmentApplications } from "@/lib/enrollment-forms";
import { useLiveRecords } from "@/lib/useLiveRecords";

export function useEnrollmentApplications(query: {
  page: number;
  q: string;
  status: string;
  applicationId?: string;
}) {
  const alive = useRef(false);

  const generation = useRef(0);

  const [data, setData] = useState<Page<PublicEnrollmentApplication> | null>(
    null,
  );

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const request = ++generation.current;

    setData(null);

    setLoading(true);

    setError("");

    try {
      const result = await listEnrollmentApplications(query);

      if (alive.current && request === generation.current) {
        setData(result);
      }
    } catch (failure) {
      if (alive.current && request === generation.current) {
        setData(null);

        setError(
          failure instanceof Error
            ? failure.message
            : "Could not load website applications.",
        );
      }
    } finally {
      if (alive.current && request === generation.current) {
        setLoading(false);
      }
    }
  }, [query.page, query.q, query.status, query.applicationId]);

  useEffect(() => {
    alive.current = true;

    void load();

    window.addEventListener("focus", load);

    return () => {
      alive.current = false;

      ++generation.current;

      window.removeEventListener("focus", load);
    };
  }, [load]);

  useLiveRecords(load);

  return { data, loading, error, load };
}
