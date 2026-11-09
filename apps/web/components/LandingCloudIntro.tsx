"use client";

import { useId } from "react";
import { cloudCircles, useCloudIntro } from "./useCloudIntro";
import styles from "./LandingCloudIntro.module.css";

type Props = {
  navigation?: boolean;
  ready?: boolean;
  onComplete?: () => void;
};

export default function LandingCloudIntro({
  navigation = false,
  ready = true,
  onComplete,
}: Props) {
  const id = useId();

  const {
    introRef,
    cloudRef,
    backdropRef,
    baseRef,
    orbitRef,
    particleRefs,
    initialParticleRefs,
    finished,
    skip,
  } = useCloudIntro({ navigation, ready, onComplete });

  if (finished) {
    return null;
  }

  return (
    <>
      {!navigation && (
        <noscript>
          <style>
            {
              ".landing-cloud-intro:not([data-public-navigation-loader]){display:none!important}"
            }
          </style>
        </noscript>
      )}
      <div
        ref={introRef}
        className={`landing-cloud-intro ${styles.intro}`}
        data-public-navigation-loader={navigation ? "" : undefined}
      >
        {navigation && (
          <span className={styles.srOnly} role="status" aria-live="polite">
            Loading page…
          </span>
        )}
        <div ref={backdropRef} className={styles.backdrop} aria-hidden="true" />
        <div className={styles.edges} aria-hidden="true">
          {cloudCircles.map((circle, index) => {
            return (
              <span
                key={index}
                ref={(element) => {
                  initialParticleRefs.current[index] = element;
                }}
                className={styles.edgeParticle}
                style={{
                  left: circle.left,
                  top: circle.top,
                  width: `calc(var(--cloud-size) * ${(circle.r * 1.8) / 240})`,
                  background: circle.color,
                }}
              />
            );
          })}
        </div>
        <div
          ref={cloudRef}
          className={styles.cloud}
          data-cloud-shape
          aria-hidden="true"
        >
          <svg viewBox="0 0 240 150" focusable="false" aria-hidden="true">
            <defs>
              <linearGradient
                id={id}
                gradientUnits="userSpaceOnUse"
                x1="20"
                y1="110"
                x2="220"
                y2="50"
              >
                <stop stopColor="#5ca9f7" />
                <stop offset="0.52" stopColor="#9c8fe3" />
                <stop offset="1" stopColor="#f28dcc" />
              </linearGradient>
            </defs>
            <rect
              ref={baseRef}
              className={styles.base}
              x="46"
              y="88"
              width="148"
              height="57"
              rx="28.5"
              fill={`url(#${id})`}
            />
            <g ref={orbitRef} className={styles.orbit} data-cloud-orbit>
              {cloudCircles.map((circle, index) => {
                return (
                  <circle
                    key={index}
                    ref={(element) => {
                      particleRefs.current[index] = element;
                    }}
                    className={styles.particle}
                    data-cloud-particle
                    cx={circle.cx}
                    cy={circle.cy}
                    r={circle.r}
                    fill={`url(#${id})`}
                  />
                );
              })}
            </g>
          </svg>
        </div>
        <button type="button" className={styles.skip} onClick={skip}>
          {navigation ? "Skip animation" : "Skip intro"}
        </button>
      </div>
    </>
  );
}
