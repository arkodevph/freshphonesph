"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  enrollmentErrorStep,
  enrollmentStepErrors,
  publicEnrollmentSteps,
  type EnrollmentStep,
} from "@/lib/public-enrollment-steps";
import type { EnrollmentAnswers } from "@freshphones/contracts";
import type { EnrollmentContactValues } from "./FormFields";
import type { usePublicEnrollment } from "./usePublicEnrollment";

export function useEnrollmentSteps(
  workspace: ReturnType<typeof usePublicEnrollment>,
) {
  const [selectedStep, setStep] = useState<EnrollmentStep>("contact");

  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  const revision = workspace.form?.revisionId;

  useEffect(() => {
    setStep("contact");

    setLocalErrors({});
  }, [revision]);

  const steps = workspace.form
    ? publicEnrollmentSteps(workspace.form.definition)
    : ["contact" as const];

  const step = steps.includes(selectedStep) ? selectedStep : "contact";

  function focus(id: string) {
    requestAnimationFrame(() => {
      const element =
        document.getElementById(id) ??
        document.getElementById("enrollment-form-title");

      element?.focus({ preventScroll: true });

      element?.scrollIntoView({ block: "start" });
    });
  }

  function goTo(next: EnrollmentStep, target = "enrollment-form-title") {
    if (workspace.pending || !steps.includes(next)) {
      return;
    }

    setLocalErrors({});

    setStep(next);

    focus(target);
  }

  function next() {
    if (!workspace.form || workspace.pending || workspace.needsReview) {
      return;
    }

    const errors = enrollmentStepErrors(
      step,
      workspace.form.definition,
      workspace.contact,
      workspace.answers,
    );

    setLocalErrors(errors);

    if (Object.keys(errors).length) {
      focus("enrollment-errors");

      return;
    }

    goTo(steps[steps.indexOf(step) + 1] ?? "review");
  }

  function edit(key: string) {
    if (!workspace.form) {
      return;
    }

    const target =
      key === "contactAcknowledged"
        ? "enrollment-contact-acknowledgment"
        : key === "_form"
          ? "enrollment-form-title"
          : `public-enrollment-${key}`;

    goTo(enrollmentErrorStep(key, workspace.form.definition), target);
  }

  function clearFieldErrors(keys: string[]) {
    setLocalErrors((current) => {
      return Object.fromEntries(
        Object.entries(current).filter(([key]) => {
          return !keys.includes(key);
        }),
      );
    });

    workspace.clearFieldErrors(keys);
  }

  function setContact(next: EnrollmentContactValues) {
    clearFieldErrors(
      Object.keys(next).filter((key) => {
        return (
          next[key as keyof EnrollmentContactValues] !==
          workspace.contact[key as keyof EnrollmentContactValues]
        );
      }),
    );

    workspace.setContact(next);
  }

  function setAnswers(next: EnrollmentAnswers) {
    clearFieldErrors(
      Object.keys(next).filter((key) => {
        return next[key] !== workspace.answers[key];
      }),
    );

    workspace.setAnswers(next);
  }

  function setAcknowledged(checked: boolean) {
    clearFieldErrors(["contactAcknowledged"]);

    workspace.setAcknowledged(checked);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    if (step !== "review") {
      event.preventDefault();

      next();

      return;
    }

    void workspace.submit(event);
  }

  return {
    step,
    steps,
    index: steps.indexOf(step),
    errors: { ...workspace.errors, ...localErrors },
    setContact,
    setAnswers,
    setAcknowledged,
    goTo,
    next,
    edit,
    submit,
  };
}
