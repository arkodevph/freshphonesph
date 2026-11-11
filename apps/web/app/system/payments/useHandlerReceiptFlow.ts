"use client";

import { useEffect, useRef, useState } from "react";
import { listPayments, uploadProof, type Payment } from "@/lib/api";
import { ApiError } from "@/lib/ts-api";

export type ReceiptConfirmation = {
  client: string;
  amount: string;
  date: string;
  method: string;
  reference: string;
  editing: boolean;
};

export function acceptsReceipt(payment: Payment) {
  return (
    !payment.proof_file &&
    ["pending", "needs_clarification"].includes(payment.status)
  );
}

export function useHandlerReceiptFlow({
  scope,
  onSaved,
}: {
  scope: string;
  onSaved: (payment: Payment) => void;
}) {
  const [confirmation, setConfirmation] = useState<ReceiptConfirmation | null>(
    null,
  );

  const resolveConfirmation = useRef<((confirmed: boolean) => void) | null>(
    null,
  );

  const [result, setResult] = useState<{
    payment: Payment;
    file: File | null;
    error: string | null;
  } | null>(null);

  const [target, setTarget] = useState<Payment | null>(null);

  const [open, setOpen] = useState(false);

  const [file, setFile] = useState<File | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);

  const [preview, setPreview] = useState<string | null>(null);

  const generation = useRef(0);

  const locked = useRef(false);

  const currentScope = useRef(scope);

  const owner = useRef(scope);

  currentScope.current = scope;

  useEffect(() => {
    owner.current = scope;

    generation.current++;

    resolveConfirmation.current?.(false);

    resolveConfirmation.current = null;

    setConfirmation(null);

    setResult(null);

    setTarget(null);

    setOpen(false);

    setFile(null);

    setPreview(null);

    setError(null);

    setBusy(false);

    locked.current = false;

    return () => {
      generation.current++;

      resolveConfirmation.current?.(false);

      resolveConfirmation.current = null;
    };
  }, [scope]);

  useEffect(() => {
    if (!file) {
      setPreview(null);

      return;
    }

    const url = URL.createObjectURL(file);

    setPreview(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  function confirm(summary: ReceiptConfirmation) {
    if (
      !scope ||
      currentScope.current !== scope ||
      resolveConfirmation.current
    ) {
      return Promise.resolve(false);
    }

    setConfirmation(summary);

    return new Promise<boolean>((resolve) => {
      resolveConfirmation.current = resolve;
    });
  }

  function answer(confirmed: boolean) {
    const resolve = resolveConfirmation.current;

    resolveConfirmation.current = null;

    setConfirmation(null);

    resolve?.(confirmed);
  }

  function recorded(
    payment: Payment,
    retryFile: File | null,
    failure: string | null,
  ) {
    if (!scope || currentScope.current !== scope) {
      return;
    }

    setResult(
      payment.proof_file ? null : { payment, file: retryFile, error: failure },
    );
  }

  function attach(
    payment: Payment,
    retryFile: File | null = null,
    failure: string | null = null,
  ) {
    if (
      !scope ||
      currentScope.current !== scope ||
      locked.current ||
      !acceptsReceipt(payment)
    ) {
      return;
    }

    generation.current++;

    setTarget(payment);

    setFile(retryFile);

    setError(failure);

    setOpen(true);
  }

  function close() {
    if (locked.current) {
      return;
    }

    generation.current++;

    setOpen(false);

    setTarget(null);

    setFile(null);

    setError(null);
  }

  function selectFile(next: File | null) {
    if (locked.current) {
      return;
    }

    const problem =
      next &&
      (!["image/jpeg", "image/png", "image/webp"].includes(next.type)
        ? "Choose a JPG, PNG or WebP receipt image."
        : next.size === 0
          ? "This file is empty. Choose another receipt image."
          : next.size > 5 * 1024 * 1024
            ? "Choose an image no larger than 5 MB."
            : null);

    setFile(problem ? null : next);

    setError(problem || null);
  }

  async function upload() {
    if (
      !scope ||
      currentScope.current !== scope ||
      locked.current ||
      !target ||
      !file
    ) {
      return;
    }

    locked.current = true;

    setBusy(true);

    setError(null);

    const token = generation.current;

    const id = target.id;

    const pendingFile = file;

    const alive = () => {
      return generation.current === token && currentScope.current === scope;
    };

    try {
      const page = await listPayments({ id: String(id), page: "1" });

      if (!alive()) {
        return;
      }

      const latest = page.results.find((payment) => {
        return String(payment.id) === String(id);
      });

      if (!latest) {
        setTarget(null);

        setFile(null);

        setResult((current) => {
          return String(current?.payment.id) === String(id) ? null : current;
        });

        setError(
          "This payment is no longer available. Close this window and refresh the list.",
        );

        return;
      }

      // A prior request may have succeeded even if its response was lost.
      // Keep proof already attached to this claim instead of replacing it on retry.
      if (!latest.proof_file && !acceptsReceipt(latest)) {
        setTarget(latest);

        setFile(null);

        setError("This payment no longer accepts receipt uploads.");

        return;
      }

      const saved = latest.proof_file
        ? latest
        : await uploadProof(id, pendingFile);

      if (!alive()) {
        return;
      }

      setResult((current) => {
        return String(current?.payment.id) === String(id) ? null : current;
      });

      setOpen(false);

      setTarget(null);

      setFile(null);

      onSaved(saved);
    } catch (failure) {
      if (!alive()) {
        return;
      }

      if (
        failure instanceof ApiError &&
        [401, 403, 404].includes(failure.status)
      ) {
        setTarget(null);

        setFile(null);

        setResult(null);

        setError(
          "This payment is no longer available. Close this window and refresh the list.",
        );
      } else {
        const message =
          failure instanceof Error
            ? failure.message
            : "Could not attach the receipt.";

        setError(
          `${message} The payment is already recorded. Retry attaching the receipt here.`,
        );

        setResult((current) => {
          return String(current?.payment.id) === String(id)
            ? { payment: target, file: pendingFile, error: message }
            : current;
        });
      }
    } finally {
      if (alive()) {
        locked.current = false;

        setBusy(false);
      }
    }
  }

  const visible = Boolean(scope) && owner.current === scope;

  return {
    confirmation: visible ? confirmation : null,
    confirm,
    answer,
    result: visible ? result : null,
    recorded,
    dismissResult: () => {
      setResult(null);
    },
    target: visible ? target : null,
    open: visible && open,
    file: visible ? file : null,
    preview: visible ? preview : null,
    error: visible ? error : null,
    busy: visible && busy,
    attach,
    close,
    selectFile,
    upload,
  };
}

export type HandlerReceiptFlow = ReturnType<typeof useHandlerReceiptFlow>;
