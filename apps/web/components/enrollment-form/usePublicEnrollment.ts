"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  enrollmentPublicSubmissionSchema,
  validateEnrollmentAnswers,
  type EnrollmentAnswers,
  type PublishedEnrollmentForm,
} from "@freshphones/contracts";
import {
  EnrollmentPublicError,
  enrollmentSubmissionAttempt,
  getPublishedEnrollmentForm,
  migrateEnrollmentAnswers,
  submitPublicEnrollment,
  type EnrollmentSubmissionAttempt,
} from "@/lib/enrollment-forms";
import type {
  EnrollmentContactValues,
  EnrollmentFieldErrors,
} from "./FormFields";

export function usePublicEnrollment() {
  const alive = useRef(false);

  const busy = useRef(false);

  const generation = useRef(0);

  const attempt = useRef<EnrollmentSubmissionAttempt | null>(null);

  const [form, setForm] = useState<PublishedEnrollmentForm | null>(null);

  const [contact, setContact] = useState<EnrollmentContactValues>({
    name: "",
    phone: "",
    email: "",
  });

  const [answers, setAnswers] = useState<EnrollmentAnswers>({});

  const [acknowledged, setAcknowledged] = useState(false);

  const [errors, setErrors] = useState<EnrollmentFieldErrors>({});

  const [error, setError] = useState("");

  const [loading, setLoading] = useState(true);

  const [pending, setPending] = useState(false);

  const [needsReview, setNeedsReview] = useState(false);

  const [reference, setReference] = useState("");

  const [previousAnswers, setPreviousAnswers] = useState<
    { id: string; label: string; value: string }[]
  >([]);

  const load = useCallback(async () => {
    const request = ++generation.current;

    setLoading(true);

    setError("");

    try {
      const published = await getPublishedEnrollmentForm();

      if (alive.current && request === generation.current) {
        setForm(published);
      }
    } catch (failure) {
      if (alive.current && request === generation.current) {
        setError(
          failure instanceof Error
            ? failure.message
            : "Could not load the application form. Please try again.",
        );
      }
    } finally {
      if (alive.current && request === generation.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    alive.current = true;

    void load();

    return () => {
      alive.current = false;

      ++generation.current;
    };
  }, [load]);

  function focusErrors() {
    requestAnimationFrame(() => {
      if (alive.current) {
        document.getElementById("enrollment-errors")?.focus();
      }
    });
  }

  async function reviewUpdatedForm() {
    if (!form || busy.current) {
      return;
    }

    busy.current = true;

    const request = ++generation.current;

    setPending(true);

    setError("");

    try {
      const published = await getPublishedEnrollmentForm();

      if (!alive.current || request !== generation.current) {
        return;
      }

      const migrated = migrateEnrollmentAnswers(
        form.definition,
        published.definition,
        answers,
      );

      setAnswers(migrated.answers);

      setPreviousAnswers((current) => {
        return [
          ...current,
          ...migrated.previousAnswers.map((answer) => {
            return { ...answer, id: `${form.revisionId}-${answer.id}` };
          }),
        ];
      });

      setForm(published);

      setErrors({});

      setNeedsReview(false);

      attempt.current = null;

      requestAnimationFrame(() => {
        document.getElementById("enrollment-form-title")?.focus();
      });
    } catch (failure) {
      if (alive.current && request === generation.current) {
        setError(
          failure instanceof Error
            ? failure.message
            : "Could not load the updated form. Your answers are still here.",
        );
      }
    } finally {
      busy.current = false;

      if (alive.current && request === generation.current) {
        setPending(false);
      }
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form || busy.current || needsReview) {
      return;
    }

    setError("");

    const answerResult = validateEnrollmentAnswers(form.definition, answers);

    const nextErrors: EnrollmentFieldErrors = {};

    if (!answerResult.success) {
      for (const issue of answerResult.issues) {
        nextErrors[issue.questionId ?? "_form"] ??= issue.message;
      }
    }

    const parsed = enrollmentPublicSubmissionSchema.safeParse({
      submissionId: "00000000-0000-4000-8000-000000000000",
      revisionId: form.revisionId,
      ...contact,
      contactAcknowledged: acknowledged,
      answers: answerResult.success ? answerResult.data : answers,
    });

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = typeof issue.path[0] === "string" ? issue.path[0] : "_form";

        nextErrors[key] ??=
          key === "contactAcknowledged"
            ? "Confirm that our team may contact you about this application."
            : issue.message;
      }
    }

    setErrors(nextErrors);

    if (!parsed.success || Object.keys(nextErrors).length) {
      focusErrors();

      return;
    }

    const { submissionId: _ignored, ...payload } = parsed.data;

    attempt.current = enrollmentSubmissionAttempt(attempt.current, payload);

    busy.current = true;

    const request = ++generation.current;

    setPending(true);

    try {
      const result = await submitPublicEnrollment({
        ...payload,
        submissionId: attempt.current.id,
      });

      if (alive.current && request === generation.current) {
        setReference(result.reference);

        requestAnimationFrame(() => {
          document.getElementById("enrollment-success")?.focus();
        });
      }
    } catch (failure) {
      if (alive.current && request === generation.current) {
        if (
          failure instanceof EnrollmentPublicError &&
          failure.status === 409 &&
          failure.code?.includes("FORM_VERSION_CHANGED")
        ) {
          setNeedsReview(true);
        }

        if (failure instanceof EnrollmentPublicError && failure.issues.length) {
          setErrors(
            Object.fromEntries(
              failure.issues.map((issue) => {
                return [issue.questionId ?? "_form", issue.message];
              }),
            ),
          );

          focusErrors();
        }

        setError(
          failure instanceof Error
            ? failure.message
            : "Could not submit your application. Your answers are still here. Please retry.",
        );
      }
    } finally {
      busy.current = false;

      if (alive.current && request === generation.current) {
        setPending(false);
      }
    }
  }

  return {
    form,
    contact,
    setContact,
    answers,
    setAnswers,
    acknowledged,
    setAcknowledged,
    errors,
    error,
    loading,
    pending,
    needsReview,
    reference,
    previousAnswers,
    load,
    reviewUpdatedForm,
    submit,
  };
}
