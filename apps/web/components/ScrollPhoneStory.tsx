"use client";

import { useEffect, useRef } from "react";
import { ArrowRight } from "@phosphor-icons/react";
import StoryDepth from "./StoryDepth";

const TOTAL_FRAMES = 115;

const LAST_FRAME = TOTAL_FRAMES - 1;

const clamp = (value: number) => {
  return Math.min(1, Math.max(0, value));
};

export default function ScrollPhoneStory() {
  const sectionRef = useRef<HTMLElement>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const section = sectionRef.current;

    const canvas = canvasRef.current;

    if (!section || !canvas) {
      return;
    }

    const context = canvas.getContext("2d", { alpha: true });

    const frames: HTMLImageElement[] = [];

    const framePath = (index: number) => {
      return `/video/cloud-phone-scroll-v2/frame-${String(index + 1).padStart(3, "0")}.webp`;
    };

    let raf = 0;

    let current = 0; // eased frame currently painted (float)

    let target = 0; // frame the scroll position wants (float)

    // Draw the requested frame, or the nearest already-decoded frame so the
    // canvas is never blank while later frames are still loading.
    const drawFrame = (index: number) => {
      if (!context) {
        return;
      }

      let image = frames[index];

      if (!image?.complete || !image.naturalWidth) {
        for (let step = 1; step <= LAST_FRAME; step += 1) {
          const near = frames[index - step] ?? frames[index + step];

          if (near?.complete && near.naturalWidth) {
            image = near;

            break;
          }
        }
      }

      if (!image?.complete || !image.naturalWidth) {
        return;
      }

      context.clearRect(0, 0, canvas.width, canvas.height);

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
    };

    for (let index = 0; index < TOTAL_FRAMES; index += 1) {
      const image = new Image();

      image.decoding = "async";

      image.onload = () => {
        // Paint the first frame immediately, and repaint if the frame we
        // currently want just finished decoding.
        if (index === 0 || index === Math.round(current)) {
          drawFrame(index);
        }
      };

      image.src = framePath(index);

      frames[index] = image;
    }

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const readProgress = () => {
      const rect = section.getBoundingClientRect();

      const viewportHeight = window.visualViewport?.height ?? innerHeight;

      const distance = Math.max(1, section.offsetHeight - viewportHeight);

      const progress = clamp(-rect.top / distance);

      target = motion.matches ? LAST_FRAME : progress * LAST_FRAME;

      section.style.setProperty("--story-progress", String(progress));

      section.style.setProperty(
        "--story-one",
        String(clamp((0.4 - progress) / 0.08)),
      );

      section.style.setProperty(
        "--story-two",
        String(
          clamp((progress - 0.42) / 0.08) * clamp((0.72 - progress) / 0.08),
        ),
      );

      section.style.setProperty(
        "--story-final",
        String(clamp((progress - 0.76) / 0.1)),
      );
    };

    // Ease the painted frame toward the target and keep looping until settled,
    // which smooths the scrub the way GSAP's `scrub` would.
    const render = () => {
      raf = 0;

      const diff = target - current;

      if (motion.matches || Math.abs(diff) < 0.35) {
        current = target;
      } else {
        current += diff * 0.2;
      }

      drawFrame(Math.round(current));

      if (current !== target) {
        tick();
      }
    };

    const tick = () => {
      if (!raf) {
        raf = requestAnimationFrame(render);
      }
    };

    const onScroll = () => {
      readProgress();

      tick();
    };

    readProgress();

    drawFrame(0);

    motion.addEventListener("change", onScroll);

    addEventListener("scroll", onScroll, { passive: true });

    addEventListener("resize", onScroll);

    document.addEventListener("touchmove", onScroll, { passive: true });

    window.visualViewport?.addEventListener("resize", onScroll);

    return () => {
      motion.removeEventListener("change", onScroll);

      removeEventListener("scroll", onScroll);

      removeEventListener("resize", onScroll);

      document.removeEventListener("touchmove", onScroll);

      window.visualViewport?.removeEventListener("resize", onScroll);

      if (raf) {
        cancelAnimationFrame(raf);
      }
    };
  }, []);

  return (
    <section ref={sectionRef} className="scroll-phone-story relative h-[380vh]">
      <div className="sticky top-0 h-screen overflow-hidden bg-[#c1e4f4] px-4 pt-24">
        <StoryDepth />
        <div className="relative mx-auto h-full w-full max-w-7xl">
          <canvas
            ref={canvasRef}
            width={1600}
            height={900}
            role="img"
            aria-label="Cloud mascot floating toward an iPhone"
            className="story-frame-canvas pointer-events-none absolute left-1/2 top-[39%] z-10 h-auto w-[1280px] max-w-[94vw] -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_16px_22px_rgba(20,38,107,.12)]"
          />
          <div className="story-beat story-beat-one absolute left-0 top-10 z-20 max-w-xs text-blue-ink sm:top-14">
            <p className="text-xs font-800 uppercase tracking-[.2em] text-[#3155a6]">
              01 · Choose your unit
            </p>
            <h2 className="mt-3 font-display text-3xl font-700 leading-tight sm:text-4xl">
              The iPhone you&apos;ve been reaching for.
            </h2>
            <p className="mt-3 max-w-64 font-600 leading-relaxed text-blue-ink/75">
              Quality options with the important details made clear before you
              commit.
            </p>
          </div>
          <div className="story-beat story-beat-two absolute right-0 top-10 z-20 max-w-sm text-right text-blue-ink sm:top-14">
            <p className="text-xs font-800 uppercase tracking-[.2em] text-[#3155a6]">
              02 · Pick your rhythm
            </p>
            <h2 className="mt-3 font-display text-3xl font-700 leading-tight sm:text-4xl">
              A schedule that feels manageable.
            </h2>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              {["Weekly", "15th & 30th", "Monthly"].map((label) => {
                return (
                  <span
                    key={label}
                    className="rounded-full border border-blue-ink/20 bg-white/40 px-4 py-2 text-sm font-800 backdrop-blur-sm"
                  >
                    {label}
                  </span>
                );
              })}
            </div>
          </div>
          <div className="story-finale absolute inset-x-0 bottom-7 z-20 mx-auto max-w-3xl text-center text-blue-ink sm:bottom-10">
            <p className="text-xs font-800 uppercase tracking-[.22em] text-[#3155a6]">
              Closer with every scroll
            </p>
            <h2 className="mt-3 font-display text-4xl font-700 leading-tight sm:text-6xl">
              Reach for your next iPhone.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base font-600 leading-relaxed text-blue-ink/75 sm:text-lg">
              A clear plan turns the phone you want into a goal you can work
              toward—one manageable payment at a time.
            </p>
            <a
              href="#units"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-800 text-blue-ink shadow-lg transition-transform hover:-translate-y-0.5"
            >
              View Available Units <ArrowRight weight="bold" />
            </a>
          </div>
          <div className="absolute right-0 top-1/2 z-30 hidden h-52 -translate-y-1/2 items-center gap-3 text-blue-ink/60 lg:flex">
            <span className="text-[10px] font-800 tracking-[.2em] [writing-mode:vertical-rl]">
              SCROLL STORY
            </span>
            <span className="h-full w-px overflow-hidden bg-blue-ink/20">
              <span className="story-progress block h-full origin-top bg-[#3155a6]" />
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
