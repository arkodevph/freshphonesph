"use client";

import { useEffect, useRef } from "react";
import { createStyleSpring } from "@/lib/style-spring";
import styles from "./catalog-controls.module.css";

export default function CatalogPlanSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const track = useRef<HTMLSpanElement>(null);

  const motion = useRef<ReturnType<typeof createStyleSpring> | null>(null);

  const initial = useRef(checked);

  useEffect(() => {
    if (!track.current) {
      return;
    }

    motion.current = createStyleSpring(track.current, {
      "--switch-position": initial.current ? 1 : 0,
    });

    return () => {
      return motion.current?.dispose();
    };
  }, []);

  useEffect(() => {
    motion.current?.to({ "--switch-position": checked ? 1 : 0 });
  }, [checked]);

  return (
    <label className={styles.planToggle}>
      <span className={styles.toggleCopy}>
        <span>Show a sample payment plan</span>
        <small>Let customers preview installments before joining.</small>
      </span>
      <span className={styles.switchControl}>
        <input
          type="checkbox"
          role="switch"
          checked={checked}
          aria-label="Show a sample payment plan"
          onChange={(event) => {
            return onChange(event.target.checked);
          }}
        />
        <span ref={track} className={styles.switchTrack} aria-hidden="true">
          <span />
        </span>
      </span>
    </label>
  );
}
