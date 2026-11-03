"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import styles from "./CloudDivider.module.css";

export default function CloudDivider() {
  const dividerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const divider = dividerRef.current;

    if (!divider) {
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const media = gsap.matchMedia();

    media.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo(
        divider.querySelector("img"),
        { yPercent: 18, scale: 1.04 },
        {
          yPercent: -18,
          scale: 1.14,
          ease: "none",
          scrollTrigger: {
            trigger: divider,
            start: "top bottom",
            end: "bottom top",
            scrub: 0.5,
            invalidateOnRefresh: true,
          },
        },
      );
    });

    return () => {
      media.revert();
    };
  }, []);

  return (
    <div ref={dividerRef} className={styles.divider} aria-hidden="true">
      <Image
        src="/brand/cloud-section-divider-v2.webp"
        alt=""
        width={2048}
        height={682}
        sizes="100vw"
        className={styles.clouds}
      />
    </div>
  );
}
