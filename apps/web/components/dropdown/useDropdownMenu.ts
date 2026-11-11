"use client";

import { useLayoutEffect, type RefObject } from "react";

export function useDropdownMenu(
  list: RefObject<HTMLDivElement | null>,
  open: boolean,
) {
  useLayoutEffect(() => {
    const menu = list.current;

    const input = menu
      ?.closest("[data-text-dropdown]")
      ?.querySelector<HTMLElement>("[data-dropdown-trigger]");

    if (!open || !menu || !input) {
      return;
    }

    menu.showPopover();

    function position(event?: Event) {
      if (
        !menu ||
        !input ||
        (event?.target instanceof Node && menu.contains(event.target))
      ) {
        return;
      }

      const bounds = input.getBoundingClientRect();

      const narrow = window.innerWidth < 768;

      const edge = 12;

      const safeTop = Math.min(76, window.innerHeight / 4);

      const safeBottom = narrow ? 96 : edge;

      const width = Math.min(
        narrow ? window.innerWidth - 48 : bounds.width,
        window.innerWidth - edge * 2,
      );

      menu.style.width = `${width}px`;

      const below = Math.max(
        0,
        window.innerHeight - safeBottom - bounds.bottom - 6,
      );

      const above = Math.max(0, bounds.top - safeTop - 6);

      const placeBelow =
        below >= Math.min(240, menu.scrollHeight) || below >= above;

      const available = placeBelow ? below : above;

      menu.style.maxHeight = `${Math.min(240, Math.max(60, available))}px`;

      const height = menu.getBoundingClientRect().height;

      const top = placeBelow ? bounds.bottom + 6 : bounds.top - height - 6;

      menu.style.left = `${Math.max(edge, Math.min(bounds.left, window.innerWidth - width - edge))}px`;

      menu.style.top = `${Math.max(safeTop, Math.min(top, window.innerHeight - safeBottom - height))}px`;
    }

    position();

    const observer = new ResizeObserver(() => {
      position();
    });

    observer.observe(menu);

    window.addEventListener("resize", position);

    window.addEventListener("scroll", position, true);

    return () => {
      observer.disconnect();

      window.removeEventListener("resize", position);

      window.removeEventListener("scroll", position, true);
    };
  }, [list, open]);
}
