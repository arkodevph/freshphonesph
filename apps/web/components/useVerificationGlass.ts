"use client";

import { useEffect, useId, useRef, useState } from "react";

export function useVerificationGlass() {
  const id = `verification-glass-${useId().replace(/:/g, "")}`;

  const layer = useRef<HTMLSpanElement>(null);

  const [map, setMap] = useState("");

  useEffect(() => {
    const surface = layer.current?.parentElement;

    if (!surface) {
      return;
    }

    let frame = 0;

    const draw = () => {
      const bounds = surface.getBoundingClientRect();

      const scale = Math.min(1, 512 / bounds.width);

      const width = Math.max(1, Math.round(bounds.width * scale));

      const height = Math.max(1, Math.round(bounds.height * scale));

      const radius = Math.min(32 * scale, width / 2, height / 2);

      const bevel = 18 * scale;

      const canvas = document.createElement("canvas");

      canvas.width = width;

      canvas.height = height;

      const context = canvas.getContext("2d");

      if (!context) {
        return;
      }

      const pixels = context.createImageData(width, height);

      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const dx = x - width / 2;

          const dy = y - height / 2;

          const qx = Math.abs(dx) - (width / 2 - radius);

          const qy = Math.abs(dy) - (height / 2 - radius);

          const ox = Math.max(qx, 0);

          const oy = Math.max(qy, 0);

          const length = Math.hypot(ox, oy);

          const distance = -(length + Math.min(Math.max(qx, qy), 0) - radius);

          const bend = Math.pow(
            Math.max(0, 1 - Math.max(0, distance) / bevel),
            2,
          );

          const nx =
            length > 0
              ? (ox / length) * Math.sign(dx)
              : qx > qy
                ? Math.sign(dx)
                : 0;

          const ny =
            length > 0
              ? (oy / length) * Math.sign(dy)
              : qy >= qx
                ? Math.sign(dy)
                : 0;

          const offset = (y * width + x) * 4;

          pixels.data[offset] = 128 + nx * bend * 110;

          pixels.data[offset + 1] = 128 + ny * bend * 110;

          pixels.data[offset + 2] = 128;

          pixels.data[offset + 3] = 255;
        }
      }

      context.putImageData(pixels, 0, 0);

      setMap(canvas.toDataURL());
    };

    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);

      frame = requestAnimationFrame(draw);
    });

    observer.observe(surface);

    return () => {
      observer.disconnect();

      cancelAnimationFrame(frame);
    };
  }, []);

  return { id, layer, map };
}
