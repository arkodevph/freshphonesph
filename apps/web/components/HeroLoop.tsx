"use client";

import { useEffect, useRef } from "react";

export default function HeroLoop() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPlayback = () => {
      if (motionPreference.matches) {
        video.pause();
        video.currentTime = 0;
        return;
      }

      void video.play().catch(() => undefined);
    };

    syncPlayback();
    motionPreference.addEventListener("change", syncPlayback);
    return () => motionPreference.removeEventListener("change", syncPlayback);
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
        poster="/video/hero/woman-floating-cloud-poster.webp?v=20261006124456"
        tabIndex={-1}
      >
        <source src="/video/hero/woman-floating-cloud-loop.mp4?v=20261006124456" type="video/mp4" />
      </video>
    </div>
  );
}
