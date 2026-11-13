"use client";

import { useLayoutEffect, useRef } from "react";
import { createStyleSpring } from "@/lib/style-spring";
import styles from "@/app/system/_role-designs/batch_handler/app/system/reports/reports.module.css";

type Props = {
  label?: string;
  variant?: "types" | "views";
  items: { value: string; label: string }[];
  value: string;
  disabled: boolean;
  sliding: boolean;
  onValueChange: (value: string) => void;
};

export default function ReportTabs({
  label = "Report types",
  variant = "types",
  items,
  value,
  disabled,
  sliding,
  onValueChange,
}: Props) {
  const nav = useRef<HTMLElement>(null);

  const indicator = useRef<HTMLSpanElement>(null);

  const motion = useRef<ReturnType<typeof createStyleSpring> | null>(null);

  useLayoutEffect(() => {
    const track = nav.current;

    const pill = indicator.current;

    if (!track || !pill) {
      return;
    }

    const position = () => {
      const selected = track.querySelector<HTMLButtonElement>(
        'button[aria-pressed="true"]',
      );

      if (!selected) {
        return;
      }

      const targets = {
        "--tab-x": selected.offsetLeft,
        "--tab-y": selected.offsetTop,
        "--tab-width": selected.offsetWidth,
        "--tab-height": selected.offsetHeight,
      };

      if (!motion.current) {
        motion.current = createStyleSpring(pill, targets);
      } else {
        motion.current.to(targets);
      }

      pill.style.visibility = "visible";
    };

    position();

    const observer = new ResizeObserver(position);

    observer.observe(track);

    track.querySelectorAll("button").forEach((button) => {
      observer.observe(button);
    });

    return () => {
      observer.disconnect();
    };
  }, [value, sliding]);

  useLayoutEffect(() => {
    return () => {
      motion.current?.dispose();

      motion.current = null;
    };
  }, []);

  return (
    <nav
      ref={nav}
      className={`${styles.tabs} ${sliding ? styles.slidingTabs : ""} ${variant === "views" ? styles.viewTabs : ""}`}
      data-report-tabs
      data-report-tab-kind={variant}
      aria-label={label}
    >
      {sliding && (
        <span
          ref={indicator}
          className={styles.tabIndicator}
          aria-hidden="true"
        />
      )}
      {items.map((item) => {
        return (
          <button
            key={item.value}
            type="button"
            data-report-tab
            aria-pressed={value === item.value}
            disabled={disabled}
            onClick={() => {
              return onValueChange(item.value);
            }}
          >
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
