"use client";

import { useLayoutEffect, useRef, useState, type ComponentProps } from "react";
import { advanceMenuSpring, type MenuSpring } from "@/lib/menu-spring";

type Props = ComponentProps<"section"> & { open: boolean };

/** A shared material menu that stays mounted while its spring closes or reverses. */
export default function WorkspacePopover({
  open,
  children,
  className = "",
  ...props
}: Props) {
  const panel = useRef<HTMLElement>(null);

  const spring = useRef<MenuSpring>({ position: 0, velocity: 0 });

  const [present, setPresent] = useState(open);

  const [reducedMotion, setReducedMotion] = useState(false);

  useLayoutEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");

    const update = () => {
      setReducedMotion(preference.matches);
    };

    update();

    preference.addEventListener("change", update);

    return () => {
      preference.removeEventListener("change", update);
    };
  }, []);

  useLayoutEffect(() => {
    const element = panel.current;

    if (!element) {
      return;
    }

    if (
      open &&
      element.hasAttribute("popover") &&
      typeof element.showPopover === "function" &&
      !element.matches(":popover-open")
    ) {
      element.showPopover();
    }

    const target = open ? 1 : 0;

    let frame = 0;

    let lastTime: number | null = null;

    const paint = () => {
      const position = spring.current.position;

      element.style.opacity = String(Math.max(0, Math.min(1, position)));

      element.style.transform = `translateY(${(1 - position) * -6}px) scale(${0.97 + position * 0.03})`;
    };

    if (
      reducedMotion ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      spring.current = { position: target, velocity: 0 };

      paint();

      setPresent(open);

      return;
    }

    if (open) {
      setPresent(true);
    }

    paint();

    const tick = (time: number) => {
      const elapsed = lastTime === null ? 1 / 120 : (time - lastTime) / 1000;

      lastTime = time;

      spring.current = advanceMenuSpring(spring.current, target, elapsed);

      const settled =
        Math.abs(spring.current.position - target) < 0.001 &&
        Math.abs(spring.current.velocity) < 0.01;

      if (settled) {
        spring.current = { position: target, velocity: 0 };
      }

      paint();

      if (settled) {
        setPresent(open);
      } else {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [open, reducedMotion]);

  if (!open && !present) {
    return null;
  }

  return (
    <section
      {...props}
      ref={panel}
      className={`${className} system-ios-popover`}
      aria-hidden={!open}
      inert={!open}
    >
      {children}
    </section>
  );
}
