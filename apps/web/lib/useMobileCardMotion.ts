"use client";

import { useEffect, type RefObject } from "react";

export function useMobileCardMotion(
  trackRef: RefObject<HTMLDivElement | null>,
  count: number,
) {
  useEffect(() => {
    const track = trackRef.current;

    const travel = track?.querySelector<HTMLElement>(
      "[data-mobile-process-track]",
    );

    const deck = track?.querySelector<HTMLElement>("[data-process-deck]");

    if (!track || !travel || !deck) {
      return;
    }

    const cards = Array.from(
      track.querySelectorAll<HTMLElement>("article[data-panel]"),
    );

    const compact = window.matchMedia("(max-width: 900px)");

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

    let mounted = true;

    let enabled = false;

    let frame = 0;

    let fitFrame = 0;

    let distance = 1;

    let top = 0;

    function draw() {
      frame = 0;

      if (!enabled) {
        return;
      }

      const progress = Math.min(
        count - 1,
        Math.max(0, (top - travel!.getBoundingClientRect().top) / distance),
      );

      cards.forEach((card, index) => {
        const phase = progress - index;

        const flip = Math.max(0, Math.min(1, (phase - 0.55) / 0.45));

        card.style.setProperty("--mobile-flip", String(flip));

        card.style.setProperty(
          "--mobile-depth",
          String(Math.min(3, Math.max(0, index - progress))),
        );

        card.style.visibility = phase >= 1 ? "hidden" : "visible";
      });
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

      track!.dataset.mobileStack = "false";

      for (const name of [
        "--mobile-safe-top",
        "--mobile-stack-top",
        "--mobile-card-height",
        "--mobile-step-distance",
        "--mobile-step-count",
      ]) {
        track!.style.removeProperty(name);
      }

      cards.forEach((card) => {
        card.style.removeProperty("--mobile-flip");

        card.style.removeProperty("--mobile-depth");

        if (track!.dataset.animated !== "true") {
          card.style.removeProperty("visibility");
        }
      });
    }

    function fit() {
      fitFrame = 0;

      if (!mounted || !compact.matches || motion.matches) {
        disable();

        return;
      }

      // Measure the natural cards, including text resizing, before pinning them.
      track!.dataset.mobileStack = "false";

      const header = document.querySelector<HTMLElement>(
        'header[data-landing-version="2"]',
      );

      const safeTop = Math.max(
        88,
        (header?.getBoundingClientRect().bottom ?? 76) + 12,
      );

      track!.style.setProperty("--mobile-safe-top", `${safeTop}px`);

      const available = Number.parseFloat(getComputedStyle(deck!).maxHeight);

      const height =
        Math.ceil(
          Math.max(
            ...cards.map((card) => {
              return card.offsetHeight;
            }),
          ),
        ) + 2;

      const backing =
        Number.parseFloat(getComputedStyle(document.documentElement).fontSize) *
        0.75 *
        Math.min(3, count - 1);

      if (!Number.isFinite(available) || height + backing > available) {
        disable();

        return;
      }

      top = safeTop + Math.max(0, (available - height - backing) / 2);

      distance = Math.max(height * 0.85, (available + safeTop) * 0.7);

      track!.style.setProperty("--mobile-stack-top", `${top}px`);

      track!.style.setProperty("--mobile-card-height", `${height}px`);

      track!.style.setProperty("--mobile-step-distance", `${distance}px`);

      track!.style.setProperty("--mobile-step-count", String(count));

      track!.dataset.mobileStack = "true";

      enabled = true;

      draw();
    }

    function scheduleFit() {
      if (!fitFrame) {
        fitFrame = requestAnimationFrame(fit);
      }
    }

    const observer = new ResizeObserver(scheduleFit);

    observer.observe(track);

    cards.forEach((card) => {
      observer.observe(card);
    });

    fit();

    void document.fonts.ready.then(() => {
      if (mounted) {
        scheduleFit();
      }
    });

    window.addEventListener("scroll", schedule, { passive: true });

    window.addEventListener("resize", scheduleFit);

    compact.addEventListener("change", scheduleFit);

    motion.addEventListener("change", scheduleFit);

    document.fonts.addEventListener("loadingdone", scheduleFit);

    return () => {
      mounted = false;

      observer.disconnect();

      cancelAnimationFrame(fitFrame);

      window.removeEventListener("scroll", schedule);

      window.removeEventListener("resize", scheduleFit);

      compact.removeEventListener("change", scheduleFit);

      motion.removeEventListener("change", scheduleFit);

      document.fonts.removeEventListener("loadingdone", scheduleFit);

      disable();
    };
  }, [trackRef, count]);

  useEffect(() => {
    const cards = Array.from(
      trackRef.current?.querySelectorAll<HTMLElement>("[data-mobile-review]") ??
        [],
    );

    const compact = window.matchMedia("(max-width: 900px)");

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const seen = new WeakSet<HTMLElement>();

    const animations = new Set<Animation>();

    let mounted = true;

    let observer: IntersectionObserver | null = null;

    function cancelAnimations() {
      animations.forEach((animation) => {
        animation.cancel();
      });

      animations.clear();
    }

    function sync() {
      observer?.disconnect();

      cancelAnimations();

      if (!compact.matches) {
        return;
      }

      observer = new IntersectionObserver(
        (entries) => {
          if (!mounted || !compact.matches) {
            return;
          }

          entries.forEach((entry) => {
            const card = entry.target as HTMLElement;

            if (!entry.isIntersecting || seen.has(card)) {
              return;
            }

            seen.add(card);

            observer?.unobserve(card);

            if (motion.matches || !card.animate) {
              return;
            }

            const animation = card.animate(
              [
                { opacity: 0, transform: "translateY(24px) scale(0.97)" },
                { opacity: 1, transform: "translateY(0) scale(1)" },
              ],
              { duration: 520, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
            );

            animations.add(animation);

            animation.onfinish = () => {
              animations.delete(animation);
            };
          });
        },
        { rootMargin: "0px 0px -24px 0px", threshold: 0 },
      );

      cards.forEach((card) => {
        if (!seen.has(card)) {
          observer!.observe(card);
        }
      });
    }

    sync();

    compact.addEventListener("change", sync);

    motion.addEventListener("change", sync);

    return () => {
      mounted = false;

      observer?.disconnect();

      cancelAnimations();

      compact.removeEventListener("change", sync);

      motion.removeEventListener("change", sync);
    };
  }, [trackRef]);
}
