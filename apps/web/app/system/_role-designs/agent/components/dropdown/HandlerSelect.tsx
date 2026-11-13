"use client";

import { CaretDown, Check, MagnifyingGlass } from "@phosphor-icons/react";
import { useId, useLayoutEffect, useState, type ReactNode } from "react";
import { DropdownTooltip } from "@/app/system/_role-designs/agent/components/dropdown/DropdownTooltip";
import {
  useDropdownSelect,
  type DropdownOption,
} from "@/components/dropdown/useDropdownSelect";
import styles from "@/app/system/_role-designs/agent/components/dropdown/dropdown.module.css";

export type HandlerSelectProps = {
  id?: string;
  labelId?: string;
  label?: string;
  value: string;
  options: readonly DropdownOption[];
  onValueChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  form?: string;
  className?: string;
  renderLabel?: (option: DropdownOption) => ReactNode;
};

export function HandlerSelect({
  id,
  labelId,
  label,
  value,
  options,
  onValueChange,
  disabled = false,
  required = false,
  name,
  form,
  className,
  renderLabel,
}: HandlerSelectProps) {
  const generated = useId();

  const listId = `${generated}-options`;

  const tooltipId = `${generated}-tooltip`;

  const [nameText, setNameText] = useState(label || "options");

  const work = useDropdownSelect(
    options,
    value,
    disabled,
    onValueChange,
    listId,
  );

  const { tooltip, tipRef, show, hide, keep, dismiss } = work.text;

  const selected = options.find((option) => {
    return option.value === value;
  });

  useLayoutEffect(() => {
    if (labelId) {
      setNameText(
        labelId
          .split(/\s+/)
          .map((key) => {
            return document.getElementById(key)?.textContent ?? "";
          })
          .join(" ")
          .trim() ||
          label ||
          "options",
      );
    }
  }, [labelId, label]);

  return (
    <div
      ref={work.root}
      className={styles.root}
      data-text-dropdown
      data-handler-select
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          work.close();
        }
      }}
    >
      <button
        ref={work.trigger}
        id={id ?? generated}
        type="button"
        role="combobox"
        data-dropdown-trigger
        aria-label={label}
        aria-labelledby={labelId}
        aria-haspopup="listbox"
        aria-expanded={work.expanded}
        aria-controls={work.expanded ? listId : undefined}
        aria-required={required || undefined}
        aria-describedby={tooltip && !work.expanded ? tooltipId : undefined}
        disabled={disabled || options.length === 0}
        className={`${styles.trigger} ${className ?? ""}`}
        onFocus={(event) => {
          if (work.suppressFocus.current) {
            work.suppressFocus.current = false;

            return;
          }

          if (selected && !work.expanded) {
            show(
              event.currentTarget,
              selected.label,
              event.currentTarget,
              true,
            );
          }
        }}
        onPointerEnter={(event) => {
          if (selected && !work.expanded && event.pointerType !== "touch") {
            show(event.currentTarget, selected.label);
          }
        }}
        onPointerLeave={hide}
        onClick={() => {
          if (work.expanded) {
            work.close();
          } else {
            work.begin();
          }
        }}
        onKeyDown={(event) => {
          if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
            event.preventDefault();

            work.begin("", event.key === "End", true);
          } else if (event.key === "Escape") {
            dismiss();
          } else if (
            event.key.length === 1 &&
            event.key !== " " &&
            !event.ctrlKey &&
            !event.metaKey &&
            !event.altKey
          ) {
            event.preventDefault();

            work.begin(event.key);
          }
        }}
      >
        <span data-picker-text className={styles.text}>
          {selected
            ? (renderLabel?.(selected) ?? selected.label)
            : "Choose an option"}
        </span>
        <CaretDown weight="bold" aria-hidden="true" />
      </button>
      {(required || name) && (
        <select
          tabIndex={-1}
          aria-hidden="true"
          className={styles.native}
          name={name}
          form={form}
          required={required}
          disabled={disabled}
          value={value}
          onChange={(event) => {
            onValueChange(event.target.value);
          }}
          onInvalid={(event) => {
            event.preventDefault();

            work.begin();
          }}
        >
          {options.map((option) => {
            return (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            );
          })}
        </select>
      )}
      {work.expanded && (
        <div ref={work.popup} popover="manual" className={styles.menu}>
          <div className={styles.search}>
            <MagnifyingGlass aria-hidden="true" />
            <input
              ref={work.search}
              type="search"
              role="combobox"
              aria-label={`Search ${nameText}`}
              aria-autocomplete="list"
              aria-expanded="true"
              aria-controls={listId}
              aria-activedescendant={
                work.filtered[work.active]
                  ? `${listId}-${work.active}`
                  : undefined
              }
              aria-describedby={tooltip ? tooltipId : undefined}
              autoComplete="off"
              maxLength={100}
              placeholder="Search options…"
              value={work.query}
              onChange={(event) => {
                dismiss();

                work.keyboard.current = false;

                work.setActive(0);

                work.setQuery(event.target.value);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                  event.preventDefault();

                  work.move(event.key === "ArrowDown" ? 1 : -1);
                } else if (event.key === "Enter") {
                  event.preventDefault();

                  work.choose(work.active);
                } else if (event.key === "Escape") {
                  event.preventDefault();

                  event.stopPropagation();

                  work.close(true);
                }
              }}
            />
          </div>
          <div id={listId} role="listbox" aria-label={nameText}>
            {work.filtered.map((option, index) => {
              return (
                <div
                  key={option.value}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={option.value === value}
                  aria-disabled={option.disabled || undefined}
                  className={styles.option}
                  data-active={index === work.active || undefined}
                  onPointerEnter={(event) => {
                    work.keyboard.current = false;

                    work.setActive(index);

                    if (event.pointerType !== "touch") {
                      show(
                        event.currentTarget,
                        option.label,
                        work.popup.current ?? event.currentTarget,
                      );
                    }
                  }}
                  onPointerLeave={hide}
                  onMouseDown={(event) => {
                    event.preventDefault();
                  }}
                  onClick={(event) => {
                    event.preventDefault();

                    work.choose(index);
                  }}
                >
                  <span data-picker-text className={styles.text}>
                    {renderLabel?.(option) ?? option.label}
                  </span>
                  {option.value === value && (
                    <Check weight="bold" aria-hidden="true" />
                  )}
                </div>
              );
            })}
          </div>
          {work.filtered.length === 0 && (
            <p className={styles.empty} role="status">
              No matching options.
            </p>
          )}
        </div>
      )}
      <DropdownTooltip
        tooltip={tooltip}
        id={tooltipId}
        tipRef={tipRef}
        keep={keep}
        hide={hide}
      />
    </div>
  );
}
