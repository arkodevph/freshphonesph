"use client";

import { useEffect, useRef } from "react";

export default function HeroLoop() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    const motionPreference = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    const syncPlayback = () => {
      if (motionPreference.matches) {
        video.pause();

        video.currentTime = 0;

        return;
      }

      void video.play().catch(() => {
        return undefined;
      });
    };

    syncPlayback();

    motionPreference.addEventListener("change", syncPlayback);

    return () => {
      return motionPreference.removeEventListener("change", syncPlayback);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;

    const hero = video?.closest<HTMLElement>(".landing-hero-frame");

    const media = video?.parentElement;

    if (!video || !hero || !media) {
      return;
    }

    const motionPreference = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    let raf = 0;

    const updateParallax = () => {
      raf = 0;

      if (motionPreference.matches) {
        video.style.removeProperty("--hero-parallax-y");

        return;
      }

      const rect = hero.getBoundingClientRect();

      const offset = Math.min(
        media.clientHeight * 0.05,
        Math.max(0, -rect.top) * 0.24,
      );

      video.style.setProperty("--hero-parallax-y", `${offset}px`);
    };

    const scheduleParallax = () => {
      if (!raf) {
        raf = requestAnimationFrame(updateParallax);
      }
    };

    updateParallax();

    window.addEventListener("scroll", scheduleParallax, { passive: true });

    window.addEventListener("resize", scheduleParallax);

    motionPreference.addEventListener("change", scheduleParallax);

    return () => {
      window.removeEventListener("scroll", scheduleParallax);

      window.removeEventListener("resize", scheduleParallax);

      motionPreference.removeEventListener("change", scheduleParallax);

      cancelAnimationFrame(raf);

      video.style.removeProperty("--hero-parallax-y");
    };
  }, []);

  return (
    <div className="landing-hero-media" aria-hidden="true">
      <video
        ref={videoRef}
        className="landing-hero-video"
        loop
        muted
        playsInline
        preload="metadata"
        poster="/video/hero/cloud-boy-poster-v2.webp"
        tabIndex={-1}
      >
        <source src="/video/hero/cloud-boy-loop-v1.mp4" type="video/mp4" />
      </video>
    </div>
  );
}
