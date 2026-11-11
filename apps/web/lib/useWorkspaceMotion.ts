"use client";

import { useEffect, useRef } from "react";
import { createStyleSpring } from "@/lib/style-spring";

/** Delegated press feedback; no state updates or navigation delays. */
export function useWorkspaceMotion<T extends HTMLElement = HTMLDivElement>() {
  const root = useRef<T>(null);

  useEffect(() => {
    const node = root.current;

    if (!node) {
      return;
    }

    const motions = new Map<
      HTMLElement,
      ReturnType<typeof createStyleSpring>
    >();

    const pressed = new Set<HTMLElement>();

    function press(event: Event) {
      const element = (event.target as Element).closest<HTMLElement>(
        "a, button:not(:disabled):not([data-chart-month])",
      );

      if (!element || !node?.contains(element)) {
        return;
      }

      if (!motions.has(element)) {
        motions.set(element, createStyleSpring(element, { "--coo-press": 0 }));
      }

      pressed.add(element);

      motions.get(element)?.to({ "--coo-press": 1 });
    }

    function release() {
      for (const element of pressed) {
        motions.get(element)?.to({ "--coo-press": 0 });
      }

      pressed.clear();
    }

    function keydown(event: KeyboardEvent) {
      if (!event.repeat && (event.key === "Enter" || event.key === " ")) {
        press(event);
      }
    }

    node.addEventListener("pointerdown", press);

    node.addEventListener("keydown", keydown);

    document.addEventListener("pointerup", release);

    document.addEventListener("pointercancel", release);

    document.addEventListener("keyup", release);

    window.addEventListener("blur", release);

    return () => {
      node.removeEventListener("pointerdown", press);

      node.removeEventListener("keydown", keydown);

      document.removeEventListener("pointerup", release);

      document.removeEventListener("pointercancel", release);

      document.removeEventListener("keyup", release);

      window.removeEventListener("blur", release);

      for (const motion of motions.values()) {
        motion.dispose();
      }
    };
  }, []);

  return root;
}
