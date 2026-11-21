"use client";

import { useEffect, useRef, useState } from "react";
import {
  getFinanceReviewEvidence,
  type FinanceReviewEvidence,
} from "@/lib/finance-review";
import { ApiError } from "@/lib/ts-api";

export function useFinanceReviewEvidence(
  id?: string | number,
  version?: number,
) {
  const [attempt, setAttempt] = useState(0);

  const generation = useRef(0);

  const acceptReload = useRef<{
    paymentId: string;
    accept: (data: FinanceReviewEvidence) => void;
  } | null>(null);

  const [state, setState] = useState<{
    data: FinanceReviewEvidence | null;
    proofUrl: string | null;
    error: string | null;
    denied: boolean;
    loading: boolean;
  }>({ data: null, proofUrl: null, error: null, denied: false, loading: true });

  useEffect(() => {
    let current = true;

    const request = ++generation.current;

    if (!id || acceptReload.current?.paymentId !== String(id)) {
      acceptReload.current = null;
    }

    let proofUrl: string | null = null;

    setState({
      data: null,
      proofUrl: null,
      error: null,
      denied: false,
      loading: Boolean(id),
    });

    if (id != null) {
      getFinanceReviewEvidence(id)
        .then((data) => {
          if (!current || request !== generation.current) {
            return;
          }

          proofUrl = data.proof ? URL.createObjectURL(data.proof) : null;

          setState({
            data,
            proofUrl,
            error: null,
            denied: false,
            loading: false,
          });

          const accept = acceptReload.current;

          acceptReload.current = null;

          accept?.accept(data);
        })
        .catch((error) => {
          if (current && request === generation.current) {
            acceptReload.current = null;

            setState({
              data: null,
              proofUrl: null,
              error:
                error instanceof Error
                  ? error.message
                  : "Review evidence could not be loaded.",
              denied:
                error instanceof ApiError && [401, 403].includes(error.status),
              loading: false,
            });
          }
        });
    }

    return () => {
      current = false;

      if (proofUrl) {
        URL.revokeObjectURL(proofUrl);
      }
    };
  }, [id, version, attempt]);

  return {
    ...state,
    refresh: () => {
      ++generation.current;

      acceptReload.current = null;

      return setAttempt((value) => {
        return value + 1;
      });
    },
    reload: (accept: (data: FinanceReviewEvidence) => void) => {
      ++generation.current;

      acceptReload.current = { paymentId: String(id), accept };

      setAttempt((value) => {
        return value + 1;
      });
    },
  };
}
