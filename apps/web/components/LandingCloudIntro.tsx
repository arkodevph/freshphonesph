"use client";

import { useEffect, useId, useRef } from "react";
import frames from "./landing-cloud-frames.json";

const LOOP_MS = frames[frames.length - 1].t;

const INTRO_MS = 5200;

export default function LandingCloudIntro() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const gradientId = useId();

  useEffect(() => {
    const canvas = canvasRef.current;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (!canvas || motion.matches) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    const scale = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(240 * scale);

    canvas.height = Math.round(240 * scale);

    context.scale(scale, scale);

    const fill = context.createLinearGradient(45, 60, 185, 180);

    fill.addColorStop(0, "#4f86ff");

    fill.addColorStop(0.6, "#9398e9");

    fill.addColorStop(1, "#f28dcc");

    const paths = frames.map((frame) => {
      return new Path2D(frame.d);
    });

    const started = performance.now();

    let raf = 0;

    const render = (now: number) => {
      const elapsed = now - started;

      const phase = elapsed % LOOP_MS;

      let index = 0;

      while (index < frames.length - 2 && frames[index + 1].t <= phase) {
        index += 1;
      }

      context.clearRect(0, 0, canvas.width, canvas.height);

      // Keep the recording's actual poses and intervals. Cross-fading poses
      // creates ghost dots that are absent from the reference.
      context.fillStyle = fill;

      context.fill(paths[index]);

      canvas.dataset.ready = "true";

      if (elapsed < INTRO_MS && !motion.matches) {
        raf = requestAnimationFrame(render);
      }
    };

    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="landing-loader" aria-hidden="true">
      <div className="landing-loader-content">
        <div className="landing-loader-shape">
          <canvas
            ref={canvasRef}
            className="landing-loader-cloud"
            width={240}
            height={240}
          />
          <svg
            className="landing-loader-still"
            viewBox="0 0 240 240"
            focusable="false"
          >
            <defs>
              <linearGradient
                id={gradientId}
                x1="45"
                y1="60"
                x2="185"
                y2="180"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#4f86ff" />
                <stop offset="0.6" stopColor="#9398e9" />
                <stop offset="1" stopColor="#f28dcc" />
              </linearGradient>
            </defs>
            <path d={frames[0].d} fill={`url(#${gradientId})`} />
          </svg>
        </div>
        <span className="landing-loader-brand">
          Fresh Phones <span>PH</span>
        </span>
        <span className="landing-loader-caption">
          iPhone &amp; iPad paluwagan
        </span>
      </div>
    </div>
  );
}
