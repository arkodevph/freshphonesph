"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";
import { advanceMenuSpring } from "@/lib/menu-spring";

/** Keep native modal focus behavior while entry/exit retain spring velocity. */
export function useSpringDialog(
  dialog: RefObject<HTMLDialogElement | null>,
  open: boolean,
  afterClose?: () => void,
) {
  const motion = useRef({ position: 0, velocity: 0 });

  const onClosed = useRef(afterClose);

  onClosed.current = afterClose;

  useLayoutEffect(() => {
    const element = dialog.current;

    if (!element) {
      return;
    }

    element.dataset.modalSpring = "";

    const preference = matchMedia("(prefers-reduced-motion: reduce)");

    let frame = 0;

    let previous: number | null = null;

    const target = open ? 1 : 0;

    function paint() {
      element!.style.setProperty(
        "--dialog-progress",
        String(Math.max(0, Math.min(1, motion.current.position))),
      );
    }

    function settle() {
      cancelAnimationFrame(frame);

      motion.current = { position: target, velocity: 0 };

      paint();

      if (!open && element?.open) {
        element.close();

        onClosed.current?.();
      }
    }

    function tick(time: number) {
      const elapsed = previous === null ? 1 / 120 : (time - previous) / 1000;

      previous = time;

      motion.current = advanceMenuSpring(motion.current, target, elapsed);

      paint();

      if (
        Math.abs(motion.current.position - target) < 0.001 &&
        Math.abs(motion.current.velocity) < 0.01
      ) {
        settle();
      } else {
        frame = requestAnimationFrame(tick);
      }
    }

    paint();

    if (open && !element.open) {
      element.showModal();
    }

    function onPreference() {
      if (preference.matches) {
        settle();
      }
    }

    function onVisibility() {
      if (document.hidden) {
        settle();
      }
    }

    if (preference.matches || document.hidden || (!open && !element.open)) {
      settle();
    } else {
      frame = requestAnimationFrame(tick);
    }

    preference.addEventListener("change", onPreference);

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(frame);

      preference.removeEventListener("change", onPreference);

      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [dialog, open]);
}
