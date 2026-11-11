"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { PaymentReviewDetail } from "@freshphones/contracts";
import { getHandlerPaymentReview } from "@/lib/payment-review";
import { useLiveRecords } from "@/lib/useLiveRecords";

export function usePaymentReview(enabled: boolean) {
  const params = useSearchParams();

  const reviewId = params.get("review");

  const paymentId = params.get("payment");

  const requested = reviewId !== null;

  const dialog = useRef<HTMLDialogElement>(null);

  const [review, setReview] = useState<PaymentReviewDetail | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  const controller = useRef<AbortController | null>(null);

  const sequence = useRef(0);

  const load = useCallback(async () => {
    if (!enabled || !requested) {
      return;
    }

    const version = ++sequence.current;

    controller.current?.abort();

    const abort = new AbortController();

    controller.current = abort;

    setReview(null);

    setError(null);

    setLoading(true);

    try {
      const fresh = await getHandlerPaymentReview(
        paymentId,
        reviewId,
        abort.signal,
      );

      if (sequence.current !== version || abort.signal.aborted) {
        return;
      }

      setReview(fresh);
    } catch (caught) {
      if (sequence.current !== version || abort.signal.aborted) {
        return;
      }

      setError(
        caught instanceof Error
          ? caught.message
          : "Could not load the payment review.",
      );
    } finally {
      if (sequence.current === version && !abort.signal.aborted) {
        setLoading(false);
      }
    }
  }, [enabled, requested, reviewId, paymentId]);

  useEffect(() => {
    if (enabled && requested) {
      if (!dialog.current?.open) {
        dialog.current?.showModal();
      }

      void load();
    } else {
      setReview(null);

      dialog.current?.close();
    }

    return () => {
      sequence.current++;

      controller.current?.abort();
    };
  }, [enabled, requested, load]);

  useLiveRecords(load, enabled && requested);

  useEffect(() => {
    if (!enabled || !requested) {
      return;
    }

    const focus = () => {
      void load();
    };

    window.addEventListener("focus", focus);

    return () => {
      window.removeEventListener("focus", focus);
    };
  }, [enabled, requested, load]);

  const close = () => {
    sequence.current++;

    controller.current?.abort();

    setReview(null);

    setError(null);

    const url = new URL(window.location.href);

    url.searchParams.delete("review");

    window.history.replaceState(null, "", url.pathname + url.search);

    if (paymentId && /^[0-9a-f-]{36}$/i.test(paymentId)) {
      requestAnimationFrame(() => {
        document
          .querySelector<HTMLButtonElement>(
            `[data-handler-row="${paymentId}"] button`,
          )
          ?.focus();
      });
    }
  };

  return { dialog, review, error, loading, load, close };
}
