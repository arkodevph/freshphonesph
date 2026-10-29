"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { CaretDown, Check } from "@phosphor-icons/react";
import styles from "./Select.module.css";

type Option = { value: string; label: string };

type Props = {
  id: string;
  labelId: string;
  value: string;
  options: readonly Option[];
  onValueChange: (value: string) => void;
  disabled?: boolean;
};

/** Shared single-value dropdown with listbox keyboard navigation. */
export default function Select({
  id,
  labelId,
  value,
  options,
  onValueChange,
  disabled = false,
}: Props) {
  const listId = useId();

  const root = useRef<HTMLDivElement>(null);

  const trigger = useRef<HTMLButtonElement>(null);

  const search = useRef({ text: "", time: 0 });

  const [open, setOpen] = useState(false);

  const [active, setActive] = useState(0);

  const selected = options.findIndex((option) => {
    return option.value === value;
  });

  const expanded = open && !disabled && options.length > 0;

  useEffect(() => {
    if (!expanded) {
      return;
    }

    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", dismiss);

    return () => {
      document.removeEventListener("pointerdown", dismiss);
    };
  }, [expanded]);

  useEffect(() => {
    if (expanded) {
      document
        .getElementById(`${listId}-${active}`)
        ?.scrollIntoView({ block: "nearest" });
    }
  }, [active, expanded, listId]);

  function choose(index: number) {
    const option = options[index];

    if (option) {
      onValueChange(option.value);
    }

    setOpen(false);

    search.current.text = "";

    trigger.current?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Tab" || event.key === "Escape") {
      setOpen(false);

      if (event.key === "Escape" && expanded) {
        event.preventDefault();

        event.stopPropagation();
      }

      return;
    }

    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();

      setOpen(true);

      const initial = Math.max(0, selected);

      setActive(
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? options.length - 1
            : !expanded
              ? initial
              : (active +
                  (event.key === "ArrowDown" ? 1 : -1) +
                  options.length) %
                options.length,
      );

      return;
    }

    if ((event.key === "Enter" || event.key === " ") && expanded) {
      event.preventDefault();

      choose(active);

      return;
    }

    if (
      event.key.length === 1 &&
      event.key !== " " &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      event.preventDefault();

      const now = Date.now();

      search.current.text =
        (now - search.current.time < 600 ? search.current.text : "") +
        event.key.toLowerCase();

      search.current.time = now;

      const match = options.findIndex((option) => {
        return option.label.toLowerCase().startsWith(search.current.text);
      });

      if (match >= 0) {
        setActive(match);

        setOpen(true);
      }
    }
  }

  return (
    <div
      ref={root}
      className={styles.root}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
        }
      }}
    >
      <button
        ref={trigger}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={expanded}
        aria-controls={expanded ? listId : undefined}
        aria-labelledby={labelId}
        aria-activedescendant={expanded ? `${listId}-${active}` : undefined}
        disabled={disabled || options.length === 0}
        className={styles.trigger}
        onKeyDown={onKeyDown}
        onClick={() => {
          setActive(Math.max(0, selected));

          setOpen(!expanded);
        }}
      >
        <span>{options[selected]?.label ?? "Choose an option"}</span>
        <CaretDown
          aria-hidden="true"
          weight="bold"
          className={expanded ? styles.rotated : undefined}
        />
      </button>
      {expanded && (
        <div
          id={listId}
          role="listbox"
          aria-labelledby={labelId}
          className={styles.menu}
        >
          {options.map((option, index) => {
            return (
              <div
                id={`${listId}-${index}`}
                key={option.value}
                role="option"
                aria-selected={option.value === value}
                className={`${styles.option} ${index === active ? styles.active : ""}`}
                onPointerMove={() => {
                  setActive(index);
                }}
                onMouseDown={(event) => {
                  event.preventDefault();
                }}
                onClick={() => {
                  choose(index);
                }}
              >
                <span>{option.label}</span>
                {option.value === value && (
                  <Check weight="bold" aria-hidden="true" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
