"use client";

import { useLayoutEffect, type RefObject } from "react";
import type { DropdownText } from "@/components/dropdown/useDropdownText";
import styles from "@/app/system/_role-designs/records/components/dropdown/dropdown.module.css";

export function DropdownTooltip({
  tooltip,
  id,
  tipRef,
  keep,
  hide,
}: {
  tooltip: DropdownText | null;
  id: string;
  tipRef: RefObject<HTMLDivElement | null>;
  keep: () => void;
  hide: () => void;
}) {
  useLayoutEffect(() => {
    const tip = tipRef.current;

    if (!tooltip || !tip) {
      return;
    }

    tip.showPopover();

    const edge = 12;

    const anchor = tooltip.anchor.getBoundingClientRect();

    const target = tooltip.target.getBoundingClientRect();

    const { width, height } = tip.getBoundingClientRect();

    const maxLeft = Math.max(edge, window.innerWidth - width - edge);

    let left = Math.min(Math.max(edge, target.left), maxLeft);

    let top = anchor.bottom + 8;

    if (anchor.right + width + 8 <= window.innerWidth - edge) {
      left = anchor.right + 8;

      top = target.top;
    } else if (anchor.left - width - 8 >= edge) {
      left = anchor.left - width - 8;

      top = target.top;
    } else if (top + height > window.innerHeight - edge) {
      top = anchor.top - height - 8;
    }

    tip.style.left = `${left}px`;

    tip.style.top = `${Math.max(edge, Math.min(top, window.innerHeight - height - edge))}px`;
  }, [tooltip, tipRef]);

  if (!tooltip) {
    return null;
  }

  return (
    <div
      ref={tipRef}
      id={id}
      role="tooltip"
      popover="manual"
      className={styles.tooltip}
      onPointerEnter={keep}
      onPointerLeave={hide}
      onPointerDown={(event) => {
        event.preventDefault();
      }}
    >
      {tooltip.text}
    </div>
  );
}
