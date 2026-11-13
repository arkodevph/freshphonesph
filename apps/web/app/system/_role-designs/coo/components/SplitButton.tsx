"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { CaretDown } from "@phosphor-icons/react";
import styles from "@/app/system/_role-designs/coo/components/SplitButton.module.css";

type Action = {
  label: string;
  icon?: ReactNode;
  onAction: () => void;
  disabled?: boolean;
};

type Props = Action & {
  menuLabel: string;
  actions: readonly Action[];
  primary?: boolean;
};

/** One immediate action and a top-layer menu of related alternatives. */
export default function SplitButton({
  label,
  icon,
  onAction,
  disabled = false,
  menuLabel,
  actions,
  primary = false,
}: Props) {
  const id = useId();

  const root = useRef<HTMLDivElement>(null);

  const trigger = useRef<HTMLButtonElement>(null);

  const menu = useRef<HTMLDivElement>(null);

  const firstFocus = useRef(0);

  const [open, setOpen] = useState(false);

  function position() {
    if (!root.current || !menu.current) {
      return;
    }

    const rect = root.current.getBoundingClientRect();

    const css = getComputedStyle(root.current);

    const safeTop = parseFloat(css.getPropertyValue("--select-safe-top")) || 12;

    const safeBottom =
      parseFloat(css.getPropertyValue("--split-safe-bottom")) || 16;

    const width = Math.min(Math.max(220, rect.width), innerWidth - 24);

    const below = innerHeight - rect.bottom - safeBottom - 8;

    const above = rect.top - safeTop - 8;

    const upward = below < actions.length * 44 + 14 && above > below;

    const height = Math.max(44, Math.min(280, upward ? above : below));

    menu.current.style.width = `${width}px`;

    menu.current.style.maxHeight = `${height}px`;

    menu.current.style.left = `${Math.max(12, Math.min(rect.right - width, innerWidth - width - 12))}px`;

    menu.current.style.top = upward ? "auto" : `${rect.bottom + 8}px`;

    menu.current.style.bottom = upward
      ? `${innerHeight - rect.top + 8}px`
      : "auto";

    menu.current.dataset.placement = upward ? "top" : "bottom";
  }

  useEffect(() => {
    if (disabled) {
      menu.current?.hidePopover();
    }
  }, [disabled]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const items = menu.current?.querySelectorAll<HTMLButtonElement>(
      '[role="menuitem"]:not(:disabled)',
    );

    items?.[firstFocus.current === -1 ? items.length - 1 : 0]?.focus();

    const dismiss = () => {
      return menu.current?.hidePopover();
    };

    // A scrolled-away trigger must not leave a detached floating menu.
    document.addEventListener("scroll", dismiss, true);

    window.addEventListener("resize", dismiss);

    return () => {
      document.removeEventListener("scroll", dismiss, true);

      window.removeEventListener("resize", dismiss);
    };
  }, [open]);

  return (
    <div
      ref={root}
      className={styles.root}
      data-split-button
      data-tone={primary ? "primary" : "neutral"}
      role="group"
      aria-label={menuLabel}
    >
      <button
        type="button"
        className={styles.main}
        disabled={disabled}
        onClick={onAction}
      >
        {icon}
        {label}
      </button>
      <button
        ref={trigger}
        type="button"
        className={styles.trigger}
        disabled={
          disabled ||
          actions.every((action) => {
            return action.disabled;
          })
        }
        aria-label={menuLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={id}
        popoverTarget={id}
        onClick={() => {
          firstFocus.current = 0;

          position();
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();

            firstFocus.current = event.key === "ArrowUp" ? -1 : 0;

            position();

            menu.current?.showPopover();
          }
        }}
      >
        <CaretDown aria-hidden="true" />
      </button>
      <div
        ref={menu}
        id={id}
        className={styles.menu}
        popover="auto"
        role="menu"
        aria-label={menuLabel}
        onToggle={(event) => {
          setOpen(event.currentTarget.matches(":popover-open"));
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();

            menu.current?.hidePopover();

            trigger.current?.focus();
          } else if (event.key === "Tab") {
            menu.current?.hidePopover();
          } else if (
            ["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)
          ) {
            event.preventDefault();

            const items = Array.from(
              event.currentTarget.querySelectorAll<HTMLButtonElement>(
                '[role="menuitem"]:not(:disabled)',
              ),
            );

            const current = items.findIndex((item) => {
              return item === document.activeElement;
            });

            const index =
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? items.length - 1
                  : (current +
                      (event.key === "ArrowDown" ? 1 : -1) +
                      items.length) %
                    items.length;

            items[index]?.focus();
          }
        }}
      >
        {actions.map((action) => {
          return (
            <button
              key={action.label}
              type="button"
              role="menuitem"
              tabIndex={-1}
              className={styles.item}
              disabled={disabled || action.disabled}
              onClick={() => {
                menu.current?.hidePopover();

                trigger.current?.focus();

                action.onAction();
              }}
            >
              {action.icon}
              {action.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
