"use client";

import { useLayoutEffect, useRef } from "react";
import styles from "./reports.module.css";

type Props = {
  items: { value: string; label: string }[];
  value: string;
  disabled: boolean;
  sliding: boolean;
  onValueChange: (value: string) => void;
};

export default function ReportTabs({
  items,
  value,
  disabled,
  sliding,
  onValueChange,
}: Props) {
  const nav = useRef<HTMLElement>(null);

  const indicator = useRef<HTMLSpanElement>(null);

  const positioned = useRef(false);

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

      // Place the first selection immediately; later selections glide from here.
      pill.style.transitionDuration = positioned.current ? "" : "0s";

      pill.style.width = `${selected.offsetWidth}px`;

      pill.style.height = `${selected.offsetHeight}px`;

      pill.style.transform = `translate3d(${selected.offsetLeft}px, ${selected.offsetTop}px, 0)`;

      pill.style.visibility = "visible";

      positioned.current = true;
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

  return (
    <nav
      ref={nav}
      className={`${styles.tabs} ${sliding ? styles.slidingTabs : ""}`}
      aria-label="Report types"
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
