"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  DeviceInquiry,
  InquiryQuery,
  InquiryStatus,
  Page,
} from "@freshphones/contracts";
import { listInquiries, updateInquiry } from "./inquiries";

export function useInquiries() {
  const [query, setQuery] = useState<InquiryQuery>({ page: 1, q: "" });

  const [result, setResult] = useState<Page<DeviceInquiry> | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [pending, setPending] = useState("");

  const [notice, setNotice] = useState("");

  const sequence = useRef(0);

  const updating = useRef(false);

  const load = useCallback(async () => {
    const request = ++sequence.current;

    setLoading(true);

    setError("");

    try {
      const next = await listInquiries(query);

      if (request === sequence.current) {
        setResult(next);
      }
    } catch (e) {
      if (request === sequence.current) {
        setResult(null);

        setError(e instanceof Error ? e.message : "Could not load inquiries.");
      }
    } finally {
      if (request === sequence.current) {
        setLoading(false);
      }
    }
  }, [query]);

  useEffect(() => {
    const timer = setTimeout(() => {
      return void load();
    }, 200);

    return () => {
      clearTimeout(timer);

      sequence.current++;
    };
  }, [load]);

  async function changeStatus(item: DeviceInquiry, status: InquiryStatus) {
    if (updating.current) {
      return;
    }

    updating.current = true;

    setPending(item.id);

    setError("");

    setNotice("");

    try {
      await updateInquiry(item, status);

      await load();

      setNotice("Inquiry status updated.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update inquiry.");
    } finally {
      updating.current = false;

      setPending("");
    }
  }

  return {
    query,
    setQuery,
    result,
    loading,
    error,
    pending,
    notice,
    load,
    changeStatus,
  };
}
