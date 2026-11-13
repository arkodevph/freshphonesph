"use client";

import {
  useEffect,
  useRef,
  useState,
  type RefObject,
  type CSSProperties,
} from "react";
import styles from "@/app/system/_role-designs/batch_manager/app/system/records/handler-batch-table.module.css";

export type TextTooltip = {
  text: string;
  target: HTMLElement;
  left: number;
  top: number;
};

export function BatchTableText({
  text,
  tooltip,
  tooltipId,
  show,
  hide,
  keep,
  className,
  style,
}: {
  text: string;
  tooltip: TextTooltip | null;
  tooltipId: string;
  show: (target: HTMLElement, text: string) => void;
  hide: () => void;
  keep: () => void;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  const [truncated, setTruncated] = useState(false);

  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    const measure = () => {
      setTruncated(element.scrollWidth > element.clientWidth + 1);
    };

    const observer = new ResizeObserver(measure);

    observer.observe(element);

    measure();

    return () => {
      observer.disconnect();
    };
  }, [text]);

  function reveal(target: HTMLElement) {
    if (truncated) {
      show(target, text);
    }
  }

  return (
    <span
      ref={ref}
      className={`${styles.text} ${className ?? ""}`}
      style={style}
      tabIndex={truncated ? 0 : undefined}
      aria-describedby={tooltip?.target === ref.current ? tooltipId : undefined}
      onFocus={(event) => {
        reveal(event.currentTarget);
      }}
      onBlur={hide}
      onPointerEnter={(event) => {
        keep();

        reveal(event.currentTarget);
      }}
      onPointerLeave={hide}
      onClick={(event) => {
        reveal(event.currentTarget);
      }}
    >
      {text}
    </span>
  );
}

export function TableTooltip({
  tooltip,
  id,
  tipRef,
  keep,
  hide,
}: {
  tooltip: TextTooltip | null;
  id: string;
  tipRef: RefObject<HTMLDivElement | null>;
  keep: () => void;
  hide: () => void;
}) {
  if (!tooltip) {
    return null;
  }

  return (
    <div
      ref={tipRef}
      id={id}
      role="tooltip"
      className={styles.tooltip}
      style={{ left: tooltip.left, top: tooltip.top }}
      onPointerEnter={keep}
      onPointerLeave={hide}
    >
      {tooltip.text}
    </div>
  );
}
