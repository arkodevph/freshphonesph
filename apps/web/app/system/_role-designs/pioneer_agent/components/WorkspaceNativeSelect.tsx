"use client";

import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
} from "react";
import { useHandlerDropdowns } from "@/components/dropdown/HandlerDropdownScope";
import Select from "@/app/system/_role-designs/pioneer_agent/components/Select";
import styles from "@/app/system/_role-designs/pioneer_agent/components/workspace-native-select.module.css";

type Snapshot = {
  active: boolean;
  value: string;
  label: string;
  disabled: boolean;
  options: { value: string; label: string; disabled: boolean }[];
};

/** Adapts existing COO form selectors while preserving their native event/validation contract. */
export default function WorkspaceNativeSelect({
  ref,
  onChange,
  onInvalid,
  onFocus,
  onClick,
  onBlur,
  className,
  tabIndex,
  ...props
}: ComponentProps<"select">) {
  const handler = useHandlerDropdowns();

  const generated = useId();

  const native = useRef<HTMLSelectElement>(null);

  const control = useRef<HTMLSpanElement>(null);

  const [invalid, setInvalid] = useState(false);

  const [snapshot, setSnapshot] = useState<Snapshot>({
    active: false,
    value: "",
    label: "Choose an option",
    disabled: false,
    options: [],
  });

  useLayoutEffect(() => {
    const element = native.current;

    if (!element) {
      return;
    }

    const active =
      (handler ||
        element.closest<HTMLElement>("[data-workspace-role]")?.dataset
          .workspaceRole === "coo") &&
      !element.multiple &&
      element.size <= 1;

    let label = props["aria-label"];

    const associated = element.labels?.[0];

    if (!label && associated) {
      label = Array.from(associated.childNodes)
        .find((node) => {
          return node.nodeType === Node.TEXT_NODE && node.textContent?.trim();
        })
        ?.textContent?.trim();

      if (!label) {
        const copy = associated.cloneNode(true) as HTMLElement;

        copy
          .querySelectorAll(
            "select, [data-workspace-native-control], svg, small",
          )
          .forEach((node) => {
            return node.remove();
          });

        label = copy.textContent?.trim();
      }
    }

    const next: Snapshot = {
      active,
      value: props.value === undefined ? element.value : String(props.value),
      label: label || props.title || "Choose an option",
      disabled: element.matches(":disabled"),
      options: Array.from(element.options, (option) => {
        return {
          value: option.value,
          label: option.label,
          disabled:
            option.disabled || Boolean(option.closest("optgroup")?.disabled),
        };
      }),
    };

    if (
      next.value &&
      !next.options.some((option) => {
        return option.value === next.value;
      })
    ) {
      next.options.push({
        value: next.value,
        label:
          snapshot.options.find((option) => {
            return option.value === next.value;
          })?.label || "Selected option unavailable",
        disabled: true,
      });
    }

    setSnapshot((previous) => {
      return JSON.stringify(previous) === JSON.stringify(next)
        ? previous
        : next;
    });
  });

  function focusControl() {
    control.current
      ?.querySelector<HTMLButtonElement>('[role="combobox"]')
      ?.focus();
  }

  return (
    <>
      <select
        {...props}
        ref={(element) => {
          native.current = element;

          if (typeof ref === "function") {
            ref(element);
          } else if (ref) {
            ref.current = element;
          }
        }}
        className={
          snapshot.active ? `${className ?? ""} ${styles.native}` : className
        }
        data-workspace-native={snapshot.active || undefined}
        tabIndex={snapshot.active ? -1 : tabIndex}
        aria-hidden={snapshot.active ? true : props["aria-hidden"]}
        onChange={(event) => {
          setInvalid(false);

          onChange?.(event);

          const value = event.currentTarget.value;

          setSnapshot((current) => {
            return { ...current, value };
          });
        }}
        onInvalid={(event) => {
          if (snapshot.active) {
            event.preventDefault();

            setInvalid(true);

            const first = event.currentTarget.form?.querySelector(
              "input:invalid, select:invalid, textarea:invalid",
            );

            if (!first || first === event.currentTarget) {
              queueMicrotask(focusControl);
            }
          }

          onInvalid?.(event);
        }}
        onFocus={(event) => {
          onFocus?.(event);

          if (snapshot.active) {
            focusControl();
          }
        }}
        onClick={(event) => {
          onClick?.(event);

          if (snapshot.active) {
            event.preventDefault();

            control.current
              ?.querySelector<HTMLButtonElement>('[role="combobox"]')
              ?.click();
          }
        }}
        onBlur={onBlur}
      />
      {snapshot.active && (
        <span
          ref={control}
          className={styles.control}
          data-workspace-native-control
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget) && onBlur) {
              native.current?.dispatchEvent(
                new FocusEvent("focusout", {
                  bubbles: true,
                  relatedTarget: event.relatedTarget,
                }),
              );
            }
          }}
        >
          <span id={`${generated}-label`} className={styles.srOnly}>
            {snapshot.label}
          </span>
          <Select
            id={`${generated}-trigger`}
            labelId={props["aria-labelledby"] ?? `${generated}-label`}
            descriptionId={
              invalid ? `${generated}-error` : props["aria-describedby"]
            }
            invalid={
              invalid ||
              props["aria-invalid"] === true ||
              props["aria-invalid"] === "true"
            }
            value={snapshot.value}
            options={snapshot.options}
            disabled={snapshot.disabled}
            searchable={snapshot.options.length > 8}
            fitViewport
            onValueChange={(value) => {
              const element = native.current;

              if (!element || element.matches(":disabled")) {
                return;
              }

              Object.getOwnPropertyDescriptor(
                HTMLSelectElement.prototype,
                "value",
              )!.set!.call(element, value);

              element.dispatchEvent(new Event("change", { bubbles: true }));
            }}
          />
          {invalid && (
            <span
              id={`${generated}-error`}
              role="alert"
              className={styles.error}
            >
              {native.current?.validationMessage || "Select an option."}
            </span>
          )}
        </span>
      )}
    </>
  );
}
