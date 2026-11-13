"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { CaretDown, Check } from "@phosphor-icons/react";
import styles from "@/app/system/_role-designs/finance_officer/components/Select.module.css";
import { useHandlerDropdowns } from "@/components/dropdown/HandlerDropdownScope";
import { HandlerSelect } from "@/app/system/_role-designs/finance_officer/components/dropdown/HandlerSelect";
import WorkspacePopover from "@/app/system/_role-designs/finance_officer/components/WorkspacePopover";
import { createStyleSpring } from "@/lib/style-spring";

type Option = { value: string; label: string; disabled?: boolean };

type Props = {
  id: string;
  labelId: string;
  value: string;
  options: readonly Option[];
  onValueChange: (value: string) => void;
  disabled?: boolean;
  fitViewport?: boolean;
  animate?: boolean;
  descriptionId?: string;
  invalid?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  renderLabel?: (option: Option) => ReactNode;
};

/** Shared single-value dropdown with listbox keyboard navigation. */
export default function Select(props: Props) {
  const handler = useHandlerDropdowns();

  return handler ? <HandlerSelect {...props} /> : <StandardSelect {...props} />;
}

function StandardSelect({
  id,
  labelId,
  value,
  options,
  onValueChange,
  disabled = false,
  fitViewport = false,
  renderLabel,

  descriptionId,
  invalid = false,
  searchable = false,
  searchPlaceholder = "Search options",
}: Props) {
  const listId = useId();

  const root = useRef<HTMLDivElement>(null);

  const trigger = useRef<HTMLButtonElement>(null);

  const caret = useRef<ReturnType<typeof createStyleSpring> | null>(null);

  const search = useRef({ text: "", time: 0 });

  const searchInput = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");

  const [open, setOpen] = useState(false);

  const [active, setActive] = useState(0);

  const [placement, setPlacement] = useState({
    side: "bottom",
    height: 240,
    left: 12,
    edge: 12,
    width: 160,
  });

  const selected = options.findIndex((option) => {
    return option.value === value;
  });

  const visibleOptions =
    searchable && query.trim()
      ? options.filter((option) => {
          return option.label
            .toLocaleLowerCase()
            .includes(query.trim().toLocaleLowerCase());
        })
      : options;

  const visibleSelected = visibleOptions.findIndex((option) => {
    return option.value === value;
  });

  const expanded = open && !disabled && options.length > 0;

  useLayoutEffect(() => {
    if (!root.current) {
      return;
    }

    caret.current = createStyleSpring(root.current, { "--select-progress": 0 });

    return () => {
      return caret.current?.dispose();
    };
  }, []);

  useLayoutEffect(() => {
    caret.current?.to({ "--select-progress": expanded ? 1 : 0 });
  }, [expanded]);

  useEffect(() => {
    if (expanded && searchable) {
      searchInput.current?.focus();
    }
  }, [expanded, searchable]);

  useLayoutEffect(() => {
    if (!expanded) {
      return;
    }

    const position = () => {
      if (!root.current || !trigger.current) {
        return;
      }

      const rect = trigger.current.getBoundingClientRect();

      const css = getComputedStyle(root.current);

      const top = parseFloat(css.getPropertyValue("--select-safe-top")) || 12;

      const bottom =
        parseFloat(css.getPropertyValue("--select-safe-bottom")) || 16;

      if (
        rect.bottom <= top ||
        rect.top >= innerHeight - bottom ||
        rect.right <= 0 ||
        rect.left >= innerWidth
      ) {
        setOpen(false);

        return;
      }

      const below = innerHeight - rect.bottom - bottom - 8;

      const above = rect.top - top - 8;

      const side =
        below < Math.min(240, options.length * 44 + 12) && above > below
          ? "top"
          : "bottom";

      const height = Math.max(
        44,
        Math.min(240, side === "top" ? above : below),
      );

      const width = Math.min(Math.max(160, rect.width), innerWidth - 24);

      const next = {
        side,
        height,
        width,
        left: Math.max(12, Math.min(rect.left, innerWidth - width - 12)),
        edge: side === "top" ? innerHeight - rect.top + 8 : rect.bottom + 8,
      };

      setPlacement((previous) => {
        return JSON.stringify(previous) === JSON.stringify(next)
          ? previous
          : next;
      });
    };

    position();

    window.addEventListener("resize", position);

    document.addEventListener("scroll", position, true);

    return () => {
      window.removeEventListener("resize", position);

      document.removeEventListener("scroll", position, true);
    };
  }, [expanded, fitViewport, options.length]);

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
  }, [active, expanded, listId, query]);

  function choose(index: number) {
    const option = visibleOptions[index];

    if (option && !option.disabled) {
      onValueChange(option.value);
    }

    setOpen(false);

    search.current.text = "";

    trigger.current?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Tab" || event.key === "Escape") {
      setOpen(false);

      if (event.key === "Escape" && expanded) {
        event.preventDefault();

        event.stopPropagation();

        if (searchable) {
          trigger.current?.focus();
        }
      }

      return;
    }

    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();

      setOpen(true);

      if (!visibleOptions.length) {
        return;
      }

      const enabled = visibleOptions
        .map((option, index) => {
          return option.disabled ? -1 : index;
        })
        .filter((index) => {
          return index >= 0;
        });

      if (!enabled.length) {
        return;
      }

      const initial = enabled.includes(visibleSelected)
        ? visibleSelected
        : enabled[0];

      const current = enabled.indexOf(active);

      setActive(
        event.key === "Home"
          ? enabled[0]
          : event.key === "End"
            ? enabled[enabled.length - 1]
            : !expanded
              ? initial
              : enabled[
                  (current +
                    (event.key === "ArrowDown" ? 1 : -1) +
                    enabled.length) %
                    enabled.length
                ],
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

      if (searchable) {
        setQuery(event.key);

        setActive(0);

        setOpen(true);

        return;
      }

      const now = Date.now();

      search.current.text =
        (now - search.current.time < 600 ? search.current.text : "") +
        event.key.toLowerCase();

      search.current.time = now;

      const match = options.findIndex((option) => {
        return (
          !option.disabled &&
          option.label.toLowerCase().startsWith(search.current.text)
        );
      });

      if (match >= 0) {
        setActive(match);

        setOpen(true);
      }
    }
  }

  const optionElements = visibleOptions.map((option, index) => {
    return (
      <div
        id={`${listId}-${index}`}
        key={option.value}
        role="option"
        aria-selected={option.value === value}
        aria-disabled={option.disabled || undefined}
        data-active={index === active || undefined}
        className={`${styles.option} ${index === active ? styles.active : ""}`}
        onPointerMove={() => {
          if (!option.disabled) {
            setActive(index);
          }
        }}
        onMouseDown={(event) => {
          event.preventDefault();
        }}
        onClick={(event) => {
          event.preventDefault();

          choose(index);
        }}
      >
        <span>{renderLabel?.(option) ?? option.label}</span>
        {option.value === value && <Check weight="bold" aria-hidden="true" />}
      </div>
    );
  });

  return (
    <div
      ref={root}
      className={styles.root}
      data-workspace-select
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
        title={options[selected]?.label}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={expanded}
        aria-controls={expanded ? listId : undefined}
        aria-labelledby={labelId}
        aria-describedby={descriptionId}
        aria-invalid={invalid || undefined}
        aria-activedescendant={
          expanded && visibleOptions.length ? `${listId}-${active}` : undefined
        }
        disabled={disabled || options.length === 0}
        className={styles.trigger}
        onKeyDown={onKeyDown}
        onClick={() => {
          if (!expanded) {
            setQuery("");
          }

          setActive(Math.max(0, selected));

          setOpen((current) => {
            return !current;
          });
        }}
      >
        <span>
          {options[selected]
            ? (renderLabel?.(options[selected]) ?? options[selected].label)
            : "Choose an option"}
        </span>
        <CaretDown aria-hidden="true" weight="bold" />
      </button>
      <WorkspacePopover
        open={expanded}
        popover="manual"
        id={searchable ? `${listId}-popup` : listId}
        role={searchable ? undefined : "listbox"}
        aria-hidden={!expanded || undefined}
        inert={!expanded}
        aria-labelledby={labelId}
        className={styles.menu}
        data-workspace-options
        data-placement={placement.side}
        style={{
          maxHeight: placement.height,
          left: placement.left,
          width: placement.width,
          top: placement.side === "bottom" ? placement.edge : "auto",
          bottom: placement.side === "top" ? placement.edge : "auto",
        }}
      >
        {searchable ? (
          <>
            <div className={styles.search}>
              <input
                ref={searchInput}
                type="search"
                value={query}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                aria-controls={listId}
                aria-activedescendant={
                  visibleOptions.length ? `${listId}-${active}` : undefined
                }
                onChange={(event) => {
                  setQuery(event.target.value);

                  setActive(0);
                }}
                onKeyDown={(event) => {
                  if (
                    ["ArrowDown", "ArrowUp", "Enter", "Escape", "Tab"].includes(
                      event.key,
                    )
                  ) {
                    onKeyDown(event);
                  }
                }}
              />
            </div>
            <div id={listId} role="listbox" aria-labelledby={labelId}>
              {optionElements}
              {!visibleOptions.length && (
                <p className={styles.noResults} role="status">
                  No matching options.
                </p>
              )}
            </div>
          </>
        ) : (
          optionElements
        )}
      </WorkspacePopover>
    </div>
  );
}
