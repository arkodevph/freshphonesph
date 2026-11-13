"use client";

import { useEffect, useRef } from "react";
import { createStyleSpring } from "@/lib/style-spring";
import styles from "@/app/system/_role-designs/coo/app/system/coo-dashboard/coo-dashboard.module.css";

export default function ChartCursor({
  index,
  count,
}: {
  index: number;
  count: number;
}) {
  const element = useRef<HTMLSpanElement>(null);

  const initialIndex = useRef(index);

  const motion = useRef<ReturnType<typeof createStyleSpring> | null>(null);

  useEffect(() => {
    if (!element.current) {
      return;
    }

    const controller = createStyleSpring(element.current, {
      "--chart-index": initialIndex.current,
    });

    motion.current = controller;

    return () => {
      controller.dispose();

      motion.current = null;
    };
  }, []);

  useEffect(() => {
    motion.current?.to({ "--chart-index": index });
  }, [index]);

  return (
    <span
      ref={element}
      className={styles.chartCursor}
      style={{ width: `${100 / count}%` }}
      aria-hidden="true"
    />
  );
}
