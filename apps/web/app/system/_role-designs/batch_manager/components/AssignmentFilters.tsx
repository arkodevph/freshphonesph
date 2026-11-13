"use client";

import FormSelect from "@/app/system/_role-designs/batch_manager/components/FormSelect";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { getAssignmentOptions, type AssignmentOptions } from "@/lib/api";
import { useLiveRecords } from "@/lib/useLiveRecords";

export function AssignmentFilters({
  handlerId,
  agentId,
  onChange,
}: {
  handlerId: string;
  agentId: string;
  onChange: (key: "handlerId" | "agentId", value: string) => void;
}) {
  const [options, setOptions] = useState<AssignmentOptions>({
    handlers: [],
    agents: [],
  });

  const [error, setError] = useState<string | null>(null);

  const sequence = useRef(0);

  const labelId = useId();

  const load = useCallback(async () => {
    const current = ++sequence.current;

    try {
      const result = await getAssignmentOptions();

      if (current === sequence.current) {
        setOptions(result);

        setError(null);
      }
    } catch (error) {
      if (current === sequence.current) {
        setOptions({ handlers: [], agents: [] });

        setError(
          error instanceof Error
            ? error.message
            : "Could not load assignment filters.",
        );
      }
    }
  }, []);

  useEffect(() => {
    void load();

    return () => {
      sequence.current++;
    };
  }, [load]);

  useLiveRecords(load);

  return (
    <div className="mb-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {(["handlerId", "agentId"] as const).map((key) => {
          const items = key === "handlerId" ? options.handlers : options.agents;

          const selected = key === "handlerId" ? handlerId : agentId;

          const label =
            key === "handlerId" ? "Filter by handler" : "Filter by agent";

          return (
            <div key={key} className="grid gap-1 text-sm text-blue-ink">
              <span id={`${labelId}-${key}-label`}>{label}</span>
              <FormSelect
                id={`${labelId}-${key}`}
                label={label}
                labelId={`${labelId}-${key}-label`}
                value={selected}
                onValueChange={(next) => {
                  return onChange(key, next);
                }}
                searchable
                options={[
                  {
                    value: "",
                    label: `All ${key === "handlerId" ? "handlers" : "agents"}`,
                  },
                  ...(selected &&
                  !items.some((item) => {
                    return item.id === selected;
                  })
                    ? [
                        {
                          value: selected,
                          label: "Selected assignment unavailable",
                        },
                      ]
                    : []),
                  ...items.map((item) => {
                    return {
                      value: item.id,
                      label: `${item.name}${item.active ? "" : " (inactive)"}`,
                    };
                  }),
                ]}
              />
            </div>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-rose-700">
          {error}{" "}
          <button
            type="button"
            className="underline"
            onClick={() => {
              return void load();
            }}
          >
            Retry filters
          </button>
        </p>
      )}
    </div>
  );
}
