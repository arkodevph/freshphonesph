"use client";

import { useEffect, useRef } from "react";
import { ArrowRight } from "@phosphor-icons/react";

const clamp = (value: number) => Math.min(1, Math.max(0, value));

export default function ScrollPhoneStory() {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    if (!section || !canvas) return;

    let frame = 0;
    let desiredFrame = 0;
    const context = canvas.getContext("2d", { alpha: false });
    const frames: HTMLImageElement[] = [];
    const framePath = (index: number) => `/video/iphone-scroll-frames/frame-${String(index + 1).padStart(3, "0")}.webp`;
    const drawFrame = (index: number) => {
      const image = frames[index];
      if (!context || !canvas || !image?.complete || !image.naturalWidth) return;
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
    };
    for (let index = 0; index < 115; index += 1) {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => {
        if (index === 0 || index === desiredFrame) drawFrame(index);
      };
      image.src = framePath(index);
      frames[index] = image;
    }
    const update = () => {
      frame = 0;
      const rect = section.getBoundingClientRect();
      const viewportHeight = window.visualViewport?.height ?? innerHeight;
      const distance = Math.max(1, section.offsetHeight - viewportHeight);
      const progress = clamp(-rect.top / distance);
      desiredFrame = Math.min(114, Math.round(progress * 114));
      drawFrame(desiredFrame);
      section.style.setProperty("--story-progress", String(progress));
      section.style.setProperty("--story-one", String(clamp((0.4 - progress) / 0.08)));
      section.style.setProperty("--story-two", String(clamp((progress - 0.42) / 0.08) * clamp((0.72 - progress) / 0.08)));
      section.style.setProperty("--story-final", String(clamp((progress - 0.76) / 0.1)));
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    document.addEventListener("touchmove", schedule, { passive: true });
    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("resize", schedule);
    return () => {
      removeEventListener("scroll", schedule);
      removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
      document.removeEventListener("touchmove", schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section ref={sectionRef} className="scroll-phone-story relative h-[380vh]">
      <div className="sticky top-0 h-screen overflow-hidden bg-gradient-to-br from-blue-ink via-blue-600 to-[#5948bd] px-4 pt-24">
        <div className="absolute -left-32 top-1/3 h-80 w-80 rounded-full bg-bubblegum/30 blur-3xl" />
        <div className="absolute -right-32 bottom-1/4 h-96 w-96 rounded-full bg-cyan/25 blur-3xl" />
        <div className="relative mx-auto h-full w-full max-w-7xl">
          <canvas ref={canvasRef} width={720} height={406} role="img" aria-label="Character floating toward an iPhone" className="story-frame-canvas pointer-events-none absolute left-1/2 top-[39%] z-10 h-auto w-[1280px] max-w-[94vw] -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_30px_40px_rgba(0,0,0,.22)]" />
          <div className="story-beat story-beat-one absolute left-0 top-10 z-20 max-w-xs text-white sm:top-14">
            <p className="text-xs font-800 uppercase tracking-[.2em] text-cyan">01 · Choose your unit</p><h2 className="mt-3 font-display text-3xl font-700 leading-tight sm:text-4xl">The iPhone you&apos;ve been reaching for.</h2><p className="mt-3 max-w-64 font-600 leading-relaxed text-white/70">Quality options with the important details made clear before you commit.</p>
          </div>
          <div className="story-beat story-beat-two absolute right-0 top-10 z-20 max-w-sm text-right text-white sm:top-14">
            <p className="text-xs font-800 uppercase tracking-[.2em] text-cyan">02 · Pick your rhythm</p><h2 className="mt-3 font-display text-3xl font-700 leading-tight sm:text-4xl">A schedule that feels manageable.</h2><div className="mt-4 flex flex-wrap justify-end gap-2">{["Weekly", "15th & 30th", "Monthly"].map((label) => <span key={label} className="rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-800 backdrop-blur-sm">{label}</span>)}</div>
          </div>
          <div className="story-finale absolute inset-x-0 bottom-7 z-20 mx-auto max-w-3xl text-center text-white sm:bottom-10">
            <p className="text-xs font-800 uppercase tracking-[.22em] text-cyan">Closer with every scroll</p><h2 className="mt-3 font-display text-4xl font-700 leading-tight sm:text-6xl">Reach for your next iPhone.</h2><p className="mx-auto mt-4 max-w-2xl text-base font-600 leading-relaxed text-white/75 sm:text-lg">A clear plan turns the phone you want into a goal you can work toward—one manageable payment at a time.</p><a href="#units" className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-800 text-blue-ink shadow-lg transition-transform hover:-translate-y-0.5">View Available Units <ArrowRight weight="bold" /></a>
          </div>
          <div className="absolute right-0 top-1/2 z-30 hidden h-52 -translate-y-1/2 items-center gap-3 text-white/55 lg:flex"><span className="text-[10px] font-800 tracking-[.2em] [writing-mode:vertical-rl]">SCROLL STORY</span><span className="h-full w-px overflow-hidden bg-white/20"><span className="story-progress block h-full origin-top bg-cyan" /></span></div>
        </div>
      </div>
    </section>
  );
}
