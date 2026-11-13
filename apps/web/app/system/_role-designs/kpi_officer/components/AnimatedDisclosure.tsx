"use client";

import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type ComponentProps,
} from "react";
import { advanceMenuSpring } from "@/lib/menu-spring";
import styles from "@/app/system/_role-designs/kpi_officer/components/animated-disclosure.module.css";
import { CaretRight } from "@phosphor-icons/react";

export default function AnimatedDisclosure({
  title,
  children,
  className = "",
  forceOpen = false,
  open: requestedOpen,
  onExpandedChange,
  detailsProps,
  summaryProps,
  indicator = true,
}: {
  title: ReactNode;
  children: ReactNode;
  className?: string;
  forceOpen?: boolean;
  open?: boolean;
  onExpandedChange?: (open: boolean) => void;
  detailsProps?: Omit<
    ComponentProps<"details">,
    "children" | "open" | "className"
  >;
  summaryProps?: ComponentProps<"summary">;
  indicator?: boolean;
}) {
  const [open, setOpen] = useState(Boolean(requestedOpen));

  const [present, setPresent] = useState(false);

  const expanded = open || forceOpen;

  useLayoutEffect(() => {
    setOpen(Boolean(requestedOpen));
  }, [requestedOpen]);

  useLayoutEffect(() => {
    onExpandedChange?.(expanded);
  }, [expanded, onExpandedChange]);

  const firstPaint = useRef(true);

  const id = useId();

  const body = useRef<HTMLDivElement>(null);

  const content = useRef<HTMLDivElement>(null);

  const summary = useRef<HTMLElement>(null);

  const motion = useRef({
    height: { position: 0, velocity: 0 },
    opacity: { position: 0, velocity: 0 },
  });

  useLayoutEffect(() => {
    const panel = body.current;

    const inner = content.current;

    if (!panel || !inner) {
      return;
    }

    const preference = matchMedia("(prefers-reduced-motion: reduce)");

    if (expanded) {
      setPresent(true);
    }

    if (!expanded && panel.contains(document.activeElement)) {
      summary.current?.focus();
    }

    motion.current.height.position = panel.getBoundingClientRect().height;

    let frame = 0;

    let previous: number | null = null;

    function paint() {
      panel!.style.height = `${Math.max(0, motion.current.height.position)}px`;

      panel!.style.opacity = String(
        Math.max(0, Math.min(1, motion.current.opacity.position)),
      );

      panel!.style.overflow = "hidden";

      summary.current?.style.setProperty(
        "--disclosure-progress",
        String(Math.max(0, Math.min(1, motion.current.opacity.position))),
      );
    }

    function settle() {
      cancelAnimationFrame(frame);

      motion.current = {
        height: {
          position: expanded ? inner!.getBoundingClientRect().height : 0,
          velocity: 0,
        },
        opacity: { position: expanded ? 1 : 0, velocity: 0 },
      };

      paint();

      if (expanded) {
        panel!.style.height = "auto";

        panel!.style.overflow = "visible";
      }

      setPresent(expanded);
    }

    function tick(time: number) {
      const dt = previous === null ? 1 / 120 : (time - previous) / 1000;

      previous = time;

      const target = expanded ? inner!.getBoundingClientRect().height : 0;

      motion.current.height = advanceMenuSpring(
        motion.current.height,
        target,
        dt,
      );

      motion.current.opacity = advanceMenuSpring(
        motion.current.opacity,
        expanded ? 1 : 0,
        dt,
      );

      paint();

      if (
        Math.abs(motion.current.height.position - target) < 0.25 &&
        Math.abs(motion.current.height.velocity) < 0.1 &&
        Math.abs(motion.current.opacity.position - (expanded ? 1 : 0)) < 0.001
      ) {
        settle();
      } else {
        frame = requestAnimationFrame(tick);
      }
    }

    function preferenceChanged() {
      if (preference.matches) {
        settle();
      }
    }

    function visibilityChanged() {
      if (document.hidden) {
        settle();
      }
    }

    paint();

    if (firstPaint.current || preference.matches || document.hidden) {
      settle();
    } else {
      frame = requestAnimationFrame(tick);
    }

    firstPaint.current = false;

    preference.addEventListener("change", preferenceChanged);

    document.addEventListener("visibilitychange", visibilityChanged);

    return () => {
      cancelAnimationFrame(frame);

      preference.removeEventListener("change", preferenceChanged);

      document.removeEventListener("visibilitychange", visibilityChanged);
    };
  }, [expanded]);

  return (
    <details
      {...detailsProps}
      className={className}
      open={expanded || present}
      data-animated-disclosure
    >
      <summary
        {...summaryProps}
        ref={summary}
        className={`${summaryProps?.className ?? ""} ${indicator ? styles.summary : ""}`}
        aria-expanded={expanded}
        aria-controls={id}
        onClick={(event) => {
          summaryProps?.onClick?.(event);

          if (event.defaultPrevented) {
            return;
          }

          event.preventDefault();

          setOpen((current) => {
            return forceOpen ? current : !current;
          });
        }}
      >
        {indicator && (
          <CaretRight className={styles.indicator} aria-hidden="true" />
        )}
        {title}
      </summary>
      <div
        ref={body}
        id={id}
        className={styles.body}
        inert={!expanded}
        aria-hidden={!expanded}
      >
        <div ref={content} className={styles.content}>
          {children}
        </div>
      </div>
    </details>
  );
}
