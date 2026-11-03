"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  enrollmentFormDefinitionSchema,
  type EnrollmentFormConfig,
  type EnrollmentFormDefinition,
} from "@freshphones/contracts";
import {
  getEnrollmentFormConfig,
  publishEnrollmentForm,
  saveEnrollmentForm,
} from "@/lib/enrollment-forms";
import { ApiError } from "@/lib/ts-api";
import { useLiveRecords } from "@/lib/useLiveRecords";

export function useEnrollmentFormDraft() {
  const alive = useRef(false);

  const generation = useRef(0);

  const busy = useRef(false);

  const [config, setConfig] = useState<EnrollmentFormConfig | null>(null);

  const [definition, setDefinition] = useState<EnrollmentFormDefinition | null>(
    null,
  );

  const [receivingAgentId, setReceivingAgentId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  const [pending, setPending] = useState(false);

  const [outdated, setOutdated] = useState(false);

  const [error, setError] = useState("");

  const [notice, setNotice] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  const accept = useCallback((latest: EnrollmentFormConfig) => {
    setConfig(latest);

    setDefinition(latest.definition);

    setReceivingAgentId(latest.receivingAgentId);

    setOutdated(false);

    setErrors({});
  }, []);

  const clearPrivate = useCallback(() => {
    setConfig(null);

    setDefinition(null);

    setReceivingAgentId(null);
  }, []);

  const load = useCallback(async () => {
    const request = ++generation.current;

    setLoading(true);

    setError("");

    try {
      const latest = await getEnrollmentFormConfig();

      if (alive.current && request === generation.current) {
        accept(latest);
      }
    } catch (failure) {
      if (alive.current && request === generation.current) {
        clearPrivate();

        setError(
          failure instanceof Error
            ? failure.message
            : "Could not load the enrollment form.",
        );
      }
    } finally {
      if (alive.current && request === generation.current) {
        setLoading(false);
      }
    }
  }, [accept, clearPrivate]);

  const check = useCallback(async () => {
    if (!config || busy.current) {
      return;
    }

    const request = ++generation.current;

    try {
      const latest = await getEnrollmentFormConfig();

      if (alive.current && request === generation.current) {
        if (latest.version !== config.version) {
          setOutdated(true);
        } else if (
          JSON.stringify(latest.agents) !== JSON.stringify(config.agents)
        ) {
          setConfig((current) => {
            return current ? { ...current, agents: latest.agents } : null;
          });
        }
      }
    } catch (failure) {
      if (
        alive.current &&
        request === generation.current &&
        failure instanceof ApiError &&
        [401, 403, 404].includes(failure.status)
      ) {
        clearPrivate();

        setError(failure.message);
      }
    }
  }, [config, clearPrivate]);

  useEffect(() => {
    alive.current = true;

    void load();

    return () => {
      alive.current = false;

      ++generation.current;
    };
  }, [load]);

  useEffect(() => {
    window.addEventListener("focus", check);

    return () => {
      window.removeEventListener("focus", check);
    };
  }, [check]);

  useLiveRecords(check, Boolean(config));

  const dirty = Boolean(
    config &&
    definition &&
    (JSON.stringify(config.definition) !== JSON.stringify(definition) ||
      config.receivingAgentId !== receivingAgentId),
  );

  async function run(publish: boolean) {
    if (!config || !definition || busy.current || outdated) {
      return;
    }

    setError("");

    setNotice("");

    const parsed = enrollmentFormDefinitionSchema.safeParse(definition);

    if (!parsed.success) {
      const next: Record<string, string> = {};

      for (const issue of parsed.error.issues) {
        const root = issue.path[0];

        const key =
          root === "questions" && typeof issue.path[1] === "number"
            ? definition.questions[issue.path[1]]?.id
            : root === "contact"
              ? String(issue.path[1])
              : String(root);

        next[key ?? "form"] ??= issue.message;
      }

      setErrors(next);

      setError("Check the form labels, questions and options before saving.");

      return;
    }

    if (publish && (dirty || !receivingAgentId || config.version === 0)) {
      setError(
        "Save a valid draft and choose its receiving Agent before publishing.",
      );

      return;
    }

    busy.current = true;

    const request = ++generation.current;

    setPending(true);

    try {
      const latest = publish
        ? await publishEnrollmentForm(config.version)
        : await saveEnrollmentForm({
            version: config.version,
            definition: parsed.data,
            receivingAgentId,
          });

      if (alive.current && request === generation.current) {
        accept(latest);

        setNotice(
          publish
            ? "Published. New visitors will see this version of the form."
            : "Draft saved. The published form has not changed.",
        );
      }
    } catch (failure) {
      if (alive.current && request === generation.current) {
        if (
          failure instanceof ApiError &&
          [401, 403, 404].includes(failure.status)
        ) {
          clearPrivate();
        }

        if (failure instanceof ApiError && failure.status === 409) {
          setOutdated(true);

          await getEnrollmentFormConfig().catch((refreshFailure) => {
            if (
              alive.current &&
              refreshFailure instanceof ApiError &&
              [401, 403, 404].includes(refreshFailure.status)
            ) {
              clearPrivate();
            }
          });
        }

        if (alive.current && request === generation.current) {
          setError(
            failure instanceof Error
              ? failure.message
              : "Could not save the enrollment form. Please retry.",
          );
        }
      }
    } finally {
      busy.current = false;

      if (alive.current) {
        setPending(false);
      }
    }
  }

  return {
    config,
    definition,
    setDefinition,
    receivingAgentId,
    setReceivingAgentId,
    loading,
    pending,
    outdated,
    error,
    notice,
    errors,
    dirty,
    load,
    save: () => {
      return run(false);
    },
    publish: () => {
      return run(true);
    },
  };
}
