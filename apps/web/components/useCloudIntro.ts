"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const cloudCircles = [
  { cx: 55, cy: 101, r: 38 },
  { cx: 118, cy: 57, r: 51 },
  { cx: 169, cy: 80, r: 43 },
  { cx: 193, cy: 109, r: 32 },
] as const;

type Options = {
  navigation?: boolean;
  ready?: boolean;
  onComplete?: () => void;
};

export function useCloudIntro({
  navigation = false,
  ready = true,
  onComplete,
}: Options = {}) {
  const introRef = useRef<HTMLDivElement>(null);

  const cloudRef = useRef<HTMLDivElement>(null);

  const backdropRef = useRef<HTMLDivElement>(null);

  const baseRef = useRef<SVGRectElement>(null);

  const orbitRef = useRef<SVGGElement>(null);

  const particleRefs = useRef<Array<SVGCircleElement | null>>([]);

  const initialParticleRefs = useRef<Array<HTMLSpanElement | null>>([]);

  const finishRef = useRef<(() => void) | null>(null);

  const readyRef = useRef(ready);

  const releaseRef = useRef<(() => void) | null>(null);

  const completeRef = useRef(onComplete);

  const [finished, setFinished] = useState(false);

  const skip = useCallback(() => {
    finishRef.current?.();
  }, []);

  useEffect(() => {
    completeRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    readyRef.current = ready;

    if (ready) {
      releaseRef.current?.();
    }
  }, [ready]);

  useEffect(() => {
    const intro = introRef.current;

    const cloud = cloudRef.current;

    const backdrop = backdropRef.current;

    const base = baseRef.current;

    const orbit = orbitRef.current;

    const html = document.documentElement;

    const viewportWidth = html.clientWidth;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const animations: Animation[] = [];

    const timers: ReturnType<typeof setTimeout>[] = [];

    const siblings: Array<{ element: HTMLElement; inert: boolean }> = [];

    const siblingObserver = new MutationObserver(lockSiblings);

    let stopped = false;

    let mounted = true;

    let ownsFlag = false;

    function finish() {
      if (stopped) {
        return;
      }

      stopped = true;

      releaseRef.current = null;

      siblingObserver.disconnect();

      const hadFocus = intro?.contains(document.activeElement);

      for (const timer of timers) {
        clearTimeout(timer);
      }

      for (const animation of animations) {
        animation.cancel();
      }

      for (const sibling of siblings) {
        sibling.element.inert = sibling.inert;
      }

      if (ownsFlag) {
        delete html.dataset.cloudIntro;
      }

      if (intro) {
        intro.hidden = true;
      }

      if (navigation) {
        cloud?.style.removeProperty("top");
      }

      window.removeEventListener("resize", onResize);

      window.removeEventListener("scroll", finish);

      window.removeEventListener("pagehide", finish);

      window.removeEventListener("pageshow", onPageShow);

      document.removeEventListener("keydown", onKey);

      document.removeEventListener("visibilitychange", onVisibilityChange);

      motion.removeEventListener("change", onMotionChange);

      if (hadFocus) {
        document
          .querySelector<HTMLElement>("[data-landing-logo]")
          ?.closest<HTMLAnchorElement>("a")
          ?.focus({ preventScroll: true });
      }

      if (mounted) {
        setFinished(true);

        completeRef.current?.();
      }
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();

        finish();
      }
    }

    function onMotionChange() {
      if (motion.matches) {
        finish();
      }
    }

    function onResize() {
      // Browser chrome and simulators can resize height during a page change.
      if (!navigation || html.clientWidth !== viewportWidth) {
        finish();
      }
    }

    function onVisibilityChange() {
      if (document.hidden) {
        finish();
      }
    }

    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) {
        finish();
      }
    }

    function track(animation: Animation) {
      animations.push(animation);

      void animation.finished.catch(() => {
        return undefined;
      });

      return animation;
    }

    function lockSiblings() {
      if (stopped || !intro) {
        return;
      }

      for (const element of Array.from(intro.parentElement?.children ?? [])) {
        if (
          element instanceof HTMLElement &&
          element !== intro &&
          !siblings.some((sibling) => {
            return sibling.element === element;
          })
        ) {
          siblings.push({ element, inert: element.inert });

          element.inert = true;
        }
      }
    }

    finishRef.current = finish;

    // React may replay the effect while retaining this DOM node in development.
    if (intro) {
      intro.hidden = false;
    }

    if (
      !intro ||
      !cloud ||
      !backdrop ||
      !base ||
      !orbit ||
      motion.matches ||
      document.hidden ||
      (!navigation &&
        (document.querySelector("[data-public-navigation-loader]") ||
          html.dataset.publicNavigationStarted === "true")) ||
      typeof cloud.animate !== "function" ||
      getComputedStyle(intro).visibility === "hidden"
    ) {
      finish();

      return;
    }

    lockSiblings();

    if (intro.parentElement) {
      siblingObserver.observe(intro.parentElement, { childList: true });
    }

    function phase(value: string) {
      if (!stopped && intro) {
        intro.dataset.phase = value;

        html.dataset.cloudIntro = value;

        ownsFlag = true;
      }
    }

    phase("gathering");

    document.addEventListener("keydown", onKey);

    document.addEventListener("visibilitychange", onVisibilityChange);

    window.addEventListener("resize", onResize);

    if (!navigation) {
      window.addEventListener("scroll", finish, { passive: true });
    }

    window.addEventListener("pagehide", finish);

    window.addEventListener("pageshow", onPageShow);

    motion.addEventListener("change", onMotionChange);

    timers.push(setTimeout(finish, navigation ? 15000 : 6500));

    function flyToLogo() {
      if (stopped || !intro || !cloud || !backdrop) {
        return;
      }

      const target = document
        .querySelector<HTMLElement>("[data-landing-logo]")
        ?.getBoundingClientRect();

      if (!target || !target.width || target.bottom <= 0) {
        const fade = track(
          intro.animate([{ opacity: 1 }, { opacity: 0 }], {
            duration: 240,
            fill: "forwards",
          }),
        );

        void fade.finished.then(finish).catch(finish);

        return;
      }

      if (navigation) {
        // Keep the flight origin stable if the address bar changes height.
        cloud.style.top = getComputedStyle(cloud).top;
      }

      const from = cloud.getBoundingClientRect();

      const dx = target.left + target.width / 2 - (from.left + from.width / 2);

      const dy = target.top + target.height / 2 - (from.top + from.height / 2);

      const scale = target.width / from.width;

      phase("flying");

      const flight = track(
        cloud.animate(
          [
            { transform: "translate(-50%, -50%) translate(0, 0) scale(1)" },
            {
              transform: `translate(-50%, -50%) translate(${dx}px, ${dy}px) scale(${scale})`,
            },
          ],
          {
            duration: 980,
            easing: "cubic-bezier(.65, 0, .25, 1)",
            fill: "forwards",
          },
        ),
      );

      track(
        cloud.animate(
          [{ opacity: 1 }, { opacity: 1, offset: 0.78 }, { opacity: 0 }],
          { duration: 980, fill: "forwards" },
        ),
      );

      track(
        backdrop.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: 720,
          delay: 80,
          easing: "cubic-bezier(.4, 0, .2, 1)",
          fill: "forwards",
        }),
      );

      timers.push(
        setTimeout(() => {
          phase("docking");
        }, 765),
      );

      void flight.finished.then(finish).catch(finish);
    }

    try {
      const bounds = cloud.getBoundingClientRect();

      const scale = bounds.width / 240;

      const particles = cloudCircles.map((circle, index) => {
        const particle = particleRefs.current[index];

        const initial =
          initialParticleRefs.current[index]?.getBoundingClientRect();

        if (!particle || !initial) {
          throw new Error("Missing cloud particle");
        }

        const dx =
          (initial.left + initial.width / 2 - bounds.left) / scale - circle.cx;

        const dy =
          (initial.top + initial.height / 2 - bounds.top) / scale - circle.cy;

        const angle =
          ((160 + (index * 360) / cloudCircles.length) * Math.PI) / 180;

        const ringTransform = `translate(${120 + Math.cos(angle) * 90 - circle.cx}px, ${75 + Math.sin(angle) * 90 - circle.cy}px) scale(${38 / circle.r})`;

        const gathering = track(
          particle.animate(
            [
              {
                transform: `translate(${dx}px, ${dy}px) scale(.9)`,
                opacity: 1,
              },
              { transform: ringTransform, opacity: 1 },
            ],
            {
              duration: 740,
              delay: index * 20,
              easing: "cubic-bezier(.65, 0, .25, 1)",
              fill: "both",
            },
          ),
        );

        return { particle, ringTransform, gathering };
      });

      async function circleThenForm() {
        await Promise.all(
          particles.map(({ gathering }) => {
            return gathering.finished;
          }),
        );

        if (stopped || !orbit || !base) {
          return;
        }

        phase("circling");

        await track(
          orbit.animate(
            [{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }],
            {
              duration: 1000,
              easing: "cubic-bezier(.4, 0, .2, 1)",
              fill: "forwards",
            },
          ),
        ).finished;

        if (stopped) {
          return;
        }

        phase("forming");

        const forming = particles.map(({ particle, ringTransform }) => {
          return track(
            particle.animate(
              [
                { transform: ringTransform, opacity: 1 },
                { transform: "translate(0, 0) scale(1)", opacity: 1 },
              ],
              {
                duration: 620,
                easing: "cubic-bezier(.45, 0, .25, 1)",
                fill: "forwards",
              },
            ),
          );
        });

        track(
          base.animate([{ opacity: 0 }, { opacity: 1 }], {
            duration: 240,
            delay: 300,
            fill: "forwards",
          }),
        );

        await Promise.all(
          forming.map((animation) => {
            return animation.finished;
          }),
        );

        if (!stopped) {
          phase("formed");

          timers.push(
            setTimeout(() => {
              if (readyRef.current) {
                flyToLogo();
              } else {
                releaseRef.current = flyToLogo;
              }
            }, 180),
          );
        }
      }

      void circleThenForm().catch(finish);
    } catch {
      finish();
    }

    return () => {
      mounted = false;

      finish();
    };
  }, [navigation]);

  return {
    introRef,
    cloudRef,
    backdropRef,
    baseRef,
    orbitRef,
    particleRefs,
    initialParticleRefs,
    finished,
    skip,
  };
}
