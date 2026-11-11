"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type DropdownText = {
  target: HTMLElement;
  anchor: HTMLElement;
  text: string;
  keyboard: boolean;
};

function isClipped(target: HTMLElement, text: string) {
  if (target instanceof HTMLInputElement) {
    const style = getComputedStyle(target);

    const context = document.createElement("canvas").getContext("2d");

    if (!context) {
      return false;
    }

    context.font = style.font;

    const width = context.measureText(text).width;

    const spacing = parseFloat(style.letterSpacing) || 0;

    const available =
      target.clientWidth -
      parseFloat(style.paddingLeft) -
      parseFloat(style.paddingRight);

    return width + spacing * text.length > available + 1;
  }

  return Array.from(
    target.querySelectorAll<HTMLElement>("[data-picker-text]"),
  ).some((element) => {
    return element.scrollWidth > element.clientWidth + 1;
  });
}

export function useDropdownText() {
  const [tooltip, setTooltip] = useState<DropdownText | null>(null);

  const current = useRef<DropdownText | null>(null);

  const tipRef = useRef<HTMLDivElement>(null);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const keep = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);

      timer.current = null;
    }
  }, []);

  const dismiss = useCallback(() => {
    keep();

    current.current = null;

    setTooltip(null);
  }, [keep]);

  const show = useCallback(
    (target: HTMLElement, text: string, anchor = target, keyboard = false) => {
      keep();

      if (!isClipped(target, text)) {
        dismiss();

        return;
      }

      const next = {
        target,
        anchor,
        text,
        keyboard: keyboard || target === document.activeElement,
      };

      current.current = next;

      setTooltip(next);
    },
    [dismiss, keep],
  );

  const hide = useCallback(() => {
    keep();

    timer.current = setTimeout(() => {
      const value = current.current;

      if (
        tipRef.current?.matches(":hover") ||
        value?.target.matches(":hover") ||
        (value?.keyboard &&
          value.target
            .closest("[data-text-dropdown]")
            ?.contains(document.activeElement))
      ) {
        return;
      }

      dismiss();
    }, 160);
  }, [dismiss, keep]);

  useEffect(() => {
    function onScroll(event: Event) {
      const value = current.current;

      if (
        !value ||
        tipRef.current?.contains(event.target as Node) ||
        event.target === value.target
      ) {
        return;
      }

      if (value.keyboard && event.target === value.anchor) {
        return;
      }

      dismiss();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        dismiss();
      }
    }

    window.addEventListener("scroll", onScroll, true);

    window.addEventListener("resize", dismiss);

    window.addEventListener("keydown", onKeyDown);

    return () => {
      keep();

      window.removeEventListener("scroll", onScroll, true);

      window.removeEventListener("resize", dismiss);

      window.removeEventListener("keydown", onKeyDown);
    };
  }, [dismiss, keep]);

  return { tooltip, tipRef, show, hide, keep, dismiss };
}
