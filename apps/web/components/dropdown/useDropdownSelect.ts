"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useDropdownText } from "./useDropdownText";
import { useDropdownMenu } from "./useDropdownMenu";

export type DropdownOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export function useDropdownSelect(
  options: readonly DropdownOption[],
  value: string,
  disabled: boolean,
  onValueChange: (value: string) => void,
  listId: string,
) {
  const root = useRef<HTMLDivElement>(null);

  const trigger = useRef<HTMLButtonElement>(null);

  const search = useRef<HTMLInputElement>(null);

  const popup = useRef<HTMLDivElement>(null);

  const keyboard = useRef(false);

  const suppressFocus = useRef(false);

  const [navigation, setNavigation] = useState(0);

  const [open, setOpen] = useState(false);

  const [query, setQuery] = useState("");

  const [active, setActive] = useState(0);

  const text = useDropdownText();

  const { show, dismiss } = text;

  const expanded = open && !disabled;

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();

    return options.filter((option) => {
      return option.label.toLocaleLowerCase().includes(term);
    });
  }, [options, query]);

  useDropdownMenu(popup, expanded);

  useEffect(() => {
    if (expanded) {
      search.current?.focus();
    }
  }, [expanded]);

  useEffect(() => {
    dismiss();

    setOpen(false);

    setQuery("");

    setActive(0);
  }, [value, disabled, dismiss]);

  useEffect(() => {
    dismiss();
  }, [options, dismiss]);

  useEffect(() => {
    if (!expanded || !keyboard.current) {
      return;
    }

    const option = document.getElementById(`${listId}-${active}`);

    const menu = popup.current;

    if (!option || !menu || !filtered[active]) {
      dismiss();

      return;
    }

    const bounds = option.getBoundingClientRect();

    const menuBounds = menu.getBoundingClientRect();

    const searchHeight = search.current?.offsetHeight ?? 0;

    if (bounds.top < menuBounds.top + searchHeight + 12) {
      menu.scrollTop -= menuBounds.top + searchHeight + 12 - bounds.top;
    } else if (bounds.bottom > menuBounds.bottom - 6) {
      menu.scrollTop += bounds.bottom - menuBounds.bottom + 6;
    }

    show(option, filtered[active].label, menu, true);
  }, [active, expanded, filtered, listId, show, dismiss, navigation]);

  useEffect(() => {
    if (!expanded) {
      return;
    }

    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) {
        setOpen(false);

        dismiss();
      }
    };

    document.addEventListener("pointerdown", outside);

    return () => {
      document.removeEventListener("pointerdown", outside);
    };
  }, [expanded, dismiss]);

  function close(focus = false) {
    setOpen(false);

    setQuery("");

    dismiss();

    if (focus) {
      suppressFocus.current = true;

      trigger.current?.focus();
    }
  }

  function begin(term = "", last = false, fromKeyboard = false) {
    dismiss();

    keyboard.current = fromKeyboard;

    setQuery(term);

    setActive(
      term
        ? 0
        : last
          ? options.length - 1
          : Math.max(
              0,
              options.findIndex((option) => {
                return option.value === value;
              }),
            ),
    );

    setOpen(true);
  }

  function choose(index: number) {
    const option = filtered[index];

    if (!option || option.disabled) {
      return;
    }

    onValueChange(option.value);

    close(true);
  }

  function move(direction: number) {
    keyboard.current = true;

    setNavigation((current) => {
      return current + 1;
    });

    setActive((previous) => {
      for (let step = 1; step <= filtered.length; step++) {
        const next =
          (previous + direction * step + filtered.length) % filtered.length;

        if (!filtered[next].disabled) {
          return next;
        }
      }

      return previous;
    });
  }

  return {
    root,
    trigger,
    search,
    popup,
    keyboard,
    suppressFocus,
    expanded,
    query,
    setQuery,
    active,
    setActive,
    filtered,
    text,
    begin,
    close,
    choose,
    move,
  };
}
