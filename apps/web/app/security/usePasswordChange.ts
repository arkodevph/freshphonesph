"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ApiError } from "@/lib/ts-api";
import {
  changeOwnPassword,
  emptyPasswordFields,
  passwordChangeErrors,
  type PasswordChangeFields,
  type PasswordChangeErrors,
} from "@/lib/password-change";

export function usePasswordChange({
  disabled,
  onBusyChange,
  onChanged,
  onSessionExpired,
  focusField,
}: {
  disabled: boolean;
  onBusyChange: (busy: boolean) => void;
  onChanged: () => Promise<void>;
  onSessionExpired: () => void;
  focusField: (field: keyof PasswordChangeFields) => void;
}) {
  const [fields, setFields] = useState(emptyPasswordFields);

  const [errors, setErrors] = useState<PasswordChangeErrors>({});

  const [error, setError] = useState("");

  const [success, setSuccess] = useState(false);

  const [busy, setBusy] = useState(false);

  const [show, setShow] = useState(false);

  const pending = useRef(false);

  const mounted = useRef(true);

  const focusAfterRequest = useRef<keyof PasswordChangeFields | null>(null);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!busy && !disabled && focusAfterRequest.current) {
      focusField(focusAfterRequest.current);

      focusAfterRequest.current = null;
    }
  }, [busy, disabled, focusField]);

  const update = (field: keyof PasswordChangeFields, value: string) => {
    setFields((current) => {
      return { ...current, [field]: value };
    });

    setErrors((current) => {
      const next = { ...current };

      delete next[field];

      return next;
    });

    setError("");

    setSuccess(false);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (disabled || pending.current) {
      return;
    }

    setSuccess(false);

    const problems = passwordChangeErrors(fields);

    setErrors(problems);

    if (Object.keys(problems).length) {
      setError("Check the highlighted fields.");

      focusField(Object.keys(problems)[0] as keyof PasswordChangeFields);

      return;
    }

    pending.current = true;

    setBusy(true);

    setError("");

    onBusyChange(true);

    try {
      await changeOwnPassword(fields);

      if (!mounted.current) {
        return;
      }

      setFields(emptyPasswordFields());

      setShow(false);

      setSuccess(true);

      // The password change has succeeded. Session-list refresh reports its own error.
      await onChanged();
    } catch (caught) {
      if (!mounted.current) {
        return;
      }

      if (caught instanceof ApiError && caught.status === 401) {
        setFields(emptyPasswordFields());

        setShow(false);

        onSessionExpired();

        return;
      }

      const wrongCurrent =
        caught instanceof ApiError &&
        caught.status === 400 &&
        /invalid password|incorrect password/i.test(caught.message);

      if (wrongCurrent) {
        setErrors({ currentPassword: "Your current password is incorrect." });

        setError("Check your current password and try again.");

        focusAfterRequest.current = "currentPassword";
      } else {
        setError(
          caught instanceof TypeError
            ? "Could not reach the server. Check your connection and try again."
            : caught instanceof Error
              ? caught.message
              : "Could not change your password. Please try again.",
        );
      }
    } finally {
      pending.current = false;

      if (mounted.current) {
        setBusy(false);
      }

      onBusyChange(false);
    }
  };

  return {
    fields,
    errors,
    error,
    success,
    busy,
    show,
    setShow,
    update,
    submit,
  };
}
