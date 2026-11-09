"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

export function useExpandingCards(count: number, compactQuery: string) {
  const [active, setActive] = useState(0);

  const [ready, setReady] = useState(false);

  const [compact, setCompact] = useState(false);

  const cards = useRef<Array<HTMLElement | null>>([]);

  const toggles = useRef<Array<HTMLButtonElement | null>>([]);

  const userSelection = useRef(false);

  useEffect(() => {
    const query = window.matchMedia(compactQuery);

    function syncLayout() {
      setCompact(query.matches);
    }

    syncLayout();

    setReady(true);

    query.addEventListener("change", syncLayout);

    return () => {
      query.removeEventListener("change", syncLayout);
    };
  }, [compactQuery]);

  useEffect(() => {
    if (!compact) {
      userSelection.current = false;

      return;
    }

    if (!userSelection.current) {
      return;
    }

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const timer = setTimeout(
      () => {
        userSelection.current = false;

        const card = cards.current[active];

        const top = card?.getBoundingClientRect().top;

        if (
          top !== undefined &&
          (top < 100 || top > window.innerHeight - 100)
        ) {
          card?.scrollIntoView({
            block: "start",
            behavior: motion.matches ? "instant" : "smooth",
          });
        }
      },
      motion.matches ? 0 : 680,
    );

    return () => {
      clearTimeout(timer);
    };
  }, [active, compact]);

  function select(index: number) {
    if (!ready || index === active) {
      return;
    }

    userSelection.current = compact;

    setActive(index);
  }

  function handleKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? count - 1
          : ["ArrowRight", "ArrowDown"].includes(event.key)
            ? (index + 1) % count
            : ["ArrowLeft", "ArrowUp"].includes(event.key)
              ? (index + count - 1) % count
              : null;

    if (next === null) {
      return;
    }

    event.preventDefault();

    toggles.current[next]?.focus({ preventScroll: true });

    select(next);
  }

  return { active, ready, compact, cards, toggles, select, handleKey };
}
