"use client";

import { useEffect, useState } from "react";
import { landingV2Font } from "./font";
import styles from "./LandingLoader.module.css";
import LandingCloudIntro from "./LandingCloudIntro";

type Props = {
  phase?: "intro" | "pending" | "leaving";
};

export default function LandingLoader({ phase = "intro" }: Props) {
  const [skipIntro, setSkipIntro] = useState(false);

  const intro = phase === "intro";

  useEffect(() => {
    // The navigation overlay already introduces the homepage on client returns.
    if (intro && document.querySelector("[data-public-navigation-loader]")) {
      setSkipIntro(true);
    }
  }, [intro]);

  if (intro && skipIntro) {
    return null;
  }

  if (intro) {
    return <LandingCloudIntro />;
  }

  return (
    <div
      className={`landing-loader ${landingV2Font.variable} ${styles.loader}`}
      data-phase={phase}
      data-public-navigation-loader={intro ? undefined : ""}
      aria-hidden={intro ? true : undefined}
      role={intro ? undefined : "status"}
      aria-live={intro ? undefined : "polite"}
      aria-atomic={intro ? undefined : true}
    >
      {!intro && <span className={styles.srOnly}>Loading page…</span>}
      <div className={styles.panels} aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className={styles.content} aria-hidden="true">
        <div className={styles.wordmarkMask}>
          <span className={styles.brand}>
            Fresh Phones <span>PH.</span>
          </span>
        </div>
        <span className={styles.caption}>Gadget Center</span>
        <span className={styles.line} />
      </div>
    </div>
  );
}
