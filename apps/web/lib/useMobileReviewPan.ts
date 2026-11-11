"use client";

import { useEffect, type RefObject } from "react";

const clamp = (value: number) => {
  return Math.max(0, Math.min(1, value));
};

export function useMobileReviewPan(trackRef: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const track = trackRef.current;

    if (!track) {
      return;
    }

    const compact = window.matchMedia("(max-width: 900px)");

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const section = track.querySelector<HTMLElement>("#reviews");

    const pin = section?.firstElementChild as HTMLElement | null;

    const row = section?.querySelector<HTMLElement>("[data-review-row]");

    if (!section || !pin || !row) {
      return;
    }

    let mounted = true;

    let enabled = false;

    let frame = 0;

    let position = 0;

    let target = 0;

    let lastTime = 0;

    function draw(time: number) {
      frame = 0;

      if (!enabled) {
        return;
      }

      const sectionRect = section!.getBoundingClientRect();

      const travel = Math.max(1, sectionRect.height - innerHeight);

      target = clamp((0 - sectionRect.top) / travel);

      const elapsed = Math.min(64, lastTime ? time - lastTime : 16.67);

      lastTime = time;

      position += (target - position) * (1 - Math.exp(-elapsed / 150));

      if (Math.abs(target - position) < 0.0001) {
        position = target;
      }

      section!.style.setProperty("--reviews-row-pan", position.toFixed(4));

      if (position !== target) {
        frame = requestAnimationFrame(draw);
      } else {
        lastTime = 0;
      }
    }

    function schedule() {
      if (enabled && !frame) {
        frame = requestAnimationFrame(draw);
      }
    }

    function disable() {
      enabled = false;

      cancelAnimationFrame(frame);

      frame = 0;

      lastTime = 0;

      position = 0;

      target = 0;

      section!.dataset.reviewPanMode = "false";

      section!.style.removeProperty("--reviews-row-pan");

      section!.style.removeProperty("--reviews-row-travel");
    }

    function fit() {
      if (!enabled) {
        return;
      }

      const pinStyle = getComputedStyle(pin!);

      const visibleWidth =
        pin!.clientWidth -
        Number.parseFloat(pinStyle.paddingLeft) -
        Number.parseFloat(pinStyle.paddingRight);

      const travel = Math.min(0, visibleWidth - row!.offsetWidth);

      section!.style.setProperty(
        "--reviews-row-travel",
        `${travel.toFixed(2)}px`,
      );
    }

    function sync() {
      if (!mounted || !compact.matches || motion.matches) {
        disable();

        return;
      }

      if (!enabled) {
        enabled = true;

        section!.dataset.reviewPanMode = "true";
      }

      fit();

      schedule();
    }

    const observer = new ResizeObserver(sync);

    observer.observe(section);

    observer.observe(row);

    sync();

    window.addEventListener("scroll", schedule, { passive: true });

    window.addEventListener("resize", sync);

    compact.addEventListener("change", sync);

    motion.addEventListener("change", sync);

    return () => {
      mounted = false;

      observer.disconnect();

      cancelAnimationFrame(frame);

      window.removeEventListener("scroll", schedule);

      window.removeEventListener("resize", sync);

      compact.removeEventListener("change", sync);

      motion.removeEventListener("change", sync);

      disable();
    };
  }, [trackRef]);
}
