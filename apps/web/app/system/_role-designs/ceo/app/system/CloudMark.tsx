"use client";

import { useEffect, useRef, useState } from "react";
import { mountCloudMascot } from "@/lib/cloud-mascot";
import styles from "./cloud-mark.module.css";

/** A live 3D character, with one shared GPU renderer and reduced-motion support. */
export function CloudMark({ active = false }: { active?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  const activity = useRef(active);

  activity.current = active;

  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!canvas.current) {
      return;
    }

    const dispose = mountCloudMascot(canvas.current, () => {
      return activity.current;
    });

    setReady(Boolean(dispose));

    return () => {
      return dispose?.();
    };
  }, []);

  return (
    <span
      className={styles.mark}
      data-active={active}
      data-rendered={ready}
      aria-hidden="true"
    >
      <canvas ref={canvas} />
      <span className={styles.fallback}>
        <i />
        <i />
      </span>
    </span>
  );
}
