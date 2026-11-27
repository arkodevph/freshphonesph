"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/ts-api";
import {
  newEnrollmentAttempt,
  sendEnrollmentAttempt,
  uncertainEnrollmentFailure,
  type EnrollmentAttempt,
  type EnrollmentPayload,
  type EnrollmentReceipt,
} from "./submission-attempt";

export function useEnrollmentSubmission(
  saved: (receipt: EnrollmentReceipt) => void,
  accessLost = false,
) {
  const attempt = useRef<EnrollmentAttempt | null>(null);

  const alive = useRef(true);

  const pending = useRef(false);

  const generation = useRef(0);

  const [busy, setBusy] = useState(false);

  const [uncertain, setUncertain] = useState(false);

  const [denied, setDenied] = useState(false);

  const [error, setError] = useState("");

  const [reference, setReference] = useState<string | null>(null);

  const revoke = useCallback(() => {
    ++generation.current;

    attempt.current = null;

    setReference(null);

    setUncertain(false);

    setDenied(true);

    setError(
      "Your enrollment access or assignment changed. Review your requests before starting another enrollment.",
    );
  }, []);

  useEffect(() => {
    alive.current = true;

    window.addEventListener("fp-session-expired", revoke);

    return () => {
      alive.current = false;

      ++generation.current;

      window.removeEventListener("fp-session-expired", revoke);
    };
  }, [revoke]);

  useEffect(() => {
    if (accessLost) {
      revoke();
    }
  }, [accessLost, revoke]);

  async function submit(payload: EnrollmentPayload) {
    if (pending.current || denied || accessLost) {
      return;
    }

    try {
      attempt.current ??= newEnrollmentAttempt(payload);
    } catch {
      setError("Check the member’s name, contact details and assigned batch.");

      return;
    }

    const command = attempt.current;

    const request = generation.current;

    setReference(command.id);

    pending.current = true;

    setBusy(true);

    setError("");

    try {
      const receipt = await sendEnrollmentAttempt(command);

      if (alive.current && request === generation.current) {
        attempt.current = null;

        setReference(null);

        setUncertain(false);

        saved(receipt);
      }
    } catch (failure) {
      if (!alive.current || request !== generation.current) {
        return;
      }

      const ambiguous = uncertain || uncertainEnrollmentFailure(failure);

      const accessLost =
        failure instanceof ApiError && [401, 403, 404].includes(failure.status);

      if (accessLost) {
        revoke();

        return;
      }

      setUncertain(ambiguous);

      setError(
        ambiguous
          ? "The submission outcome is unconfirmed. Your original details and reference are retained. Retry the original submission to confirm its result before editing."
          : failure instanceof Error
            ? failure.message
            : "Could not submit enrollment.",
      );

      if (!ambiguous) {
        attempt.current = null;
      }
    } finally {
      pending.current = false;

      if (alive.current) {
        setBusy(false);
      }
    }
  }

  function reset() {
    if (!pending.current && !uncertain) {
      attempt.current = null;

      setError("");

      setDenied(false);

      setReference(null);
    }
  }

  return {
    busy,
    uncertain,
    denied: denied || accessLost,
    error,
    submit,
    reset,
    reference,
    revoke,
    locked: busy || uncertain || denied || accessLost,
  };
}
