"use client";

import { useEffect, type RefObject } from "react";

const clamp = (value: number) => {
  return Math.max(0, Math.min(1, value));
};

export function useProcessStack(
  trackRef: RefObject<HTMLDivElement | null>,
  count: number,
) {
  useEffect(() => {
    const track = trackRef.current;

    if (!track) {
      return;
    }

    const stage = track.firstElementChild as HTMLElement;

    const cards = Array.from(
      track.querySelectorAll<HTMLElement>("article[data-panel]"),
    );

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const reviews = track.querySelector<HTMLElement>("#reviews");

    const panDistance = Number(reviews?.dataset.reviewPan ?? 0);

    const extraTravel = panDistance > 0 ? 1.6 : 0;

    let frame = 0;

    let position = 0;

    let target = 0;

    let lastTime = 0;

    let initialized = false;

    const draw = (time: number) => {
      frame = 0;

      if (track.dataset.animated !== "true") {
        return;
      }

      const elapsed = Math.min(64, lastTime ? time - lastTime : 16.67);

      lastTime = time;

      position += (target - position) * (1 - Math.exp(-elapsed / 150));

      if (Math.abs(target - position) < 0.0001) {
        position = target;
      }

      cards.forEach((card, index) => {
        const phase = position - index;

        // Match the reference: read, lift and tip toward the viewer, hold
        // the flattened edge, then push it completely above the stage.
        const flip = clamp((phase - 0.42) / 0.36);

        const clear = clamp((phase - 1.02) / 0.18);

        const completed =
          Math.floor(position) + clamp(((position % 1) - 0.42) / 0.36);

        const depth = Math.min(3, Math.max(0, index - completed));

        card.style.setProperty("--flip", String(flip));

        card.style.setProperty("--clear", String(clear));

        card.style.setProperty("--depth", String(depth));

        card.style.visibility = clear >= 1 ? "hidden" : "visible";
      });

      stage.style.setProperty(
        "--reviews-reveal",
        String(clamp((position - count + 0.08) / 1.1)),
      );

      stage.style.setProperty(
        "--reviews-pan",
        String(clamp((position - count - 1.05) / 1.4) * panDistance),
      );

      if (position !== target) {
        frame = requestAnimationFrame(draw);
      } else {
        lastTime = 0;
      }
    };

    const schedule = () => {
      if (track.dataset.animated !== "true") {
        return;
      }

      const top = Number.parseFloat(getComputedStyle(stage).top);

      const travel = Math.max(1, track.offsetHeight - stage.offsetHeight);

      target =
        clamp((top - track.getBoundingClientRect().top) / travel) *
        (count + 1.4 + extraTravel);

      if (!initialized) {
        position = target;

        initialized = true;
      }

      if (!frame) {
        frame = requestAnimationFrame(draw);
      }
    };

    const sync = () => {
      const animated =
        !motion.matches && innerHeight >= 740 && innerWidth > 900;

      track.dataset.animated = String(animated);

      track.style.setProperty(
        "--review-extra-travel",
        `${extraTravel * 100}svh`,
      );

      stage.style.setProperty("--stage-width", `${stage.clientWidth}px`);

      stage.style.setProperty("--stage-height", `${stage.clientHeight}px`);

      if (!animated) {
        cancelAnimationFrame(frame);

        frame = 0;

        lastTime = 0;

        initialized = false;

        cards.forEach((card) => {
          card.style.removeProperty("visibility");
        });

        stage.style.removeProperty("--reviews-reveal");

        stage.style.removeProperty("--reviews-pan");
      }

      schedule();
    };

    const observer = new ResizeObserver(sync);

    observer.observe(track);

    sync();

    window.addEventListener("scroll", schedule, { passive: true });

    window.addEventListener("resize", sync);

    motion.addEventListener("change", sync);

    return () => {
      cancelAnimationFrame(frame);

      observer.disconnect();

      window.removeEventListener("scroll", schedule);

      window.removeEventListener("resize", sync);

      motion.removeEventListener("change", sync);
    };
  }, [trackRef, count]);
}
