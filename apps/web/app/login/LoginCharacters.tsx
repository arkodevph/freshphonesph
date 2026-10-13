"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import styles from "./login.module.css";

export type CharacterMood = "idle" | "typing" | "private" | "error" | "loading";
type CharacterName = "blue" | "navy" | "lilac" | "pink";

function Face({ x, y, mood }: { x: number; y: number; mood: CharacterMood }) {
  const mouth = mood === "error" ? "M -8 25 Q 0 15 8 25" : mood === "private" ? "M -7 23 H 7" : "M -8 21 Q 0 31 8 21";
  return (
    <g transform={`translate(${x} ${y})`} className={styles.face}>
      <g className={styles.expression}>
        <g className={styles.eyes}>
          <circle cx="-20" r="7" fill="white" />
          <circle cx="20" r="7" fill="white" />
          <g className={styles.pupils}><circle cx="-20" r="3.5" /><circle cx="20" r="3.5" /></g>
        </g>
        <g className={styles.closedEyes}>
          <path d="M -27 1 Q -20 7 -13 1 M 13 1 Q 20 7 27 1" />
        </g>
        <path className={styles.mouth} d={mouth} />
      </g>
    </g>
  );
}

export default function LoginCharacters({ mood }: { mood: CharacterMood }) {
  const stage = useRef<HTMLDivElement>(null);
  const [facingPassword, setFacingPassword] = useState<Partial<Record<CharacterName, boolean>>>({});
  const interactive = mood === "private";

  useEffect(() => {
    if (!interactive) setFacingPassword({});
  }, [interactive]);

  function toggleCharacter(name: CharacterName) {
    if (!interactive) return;
    setFacingPassword((current) => ({ ...current, [name]: !current[name] }));
  }

  function characterControls(name: CharacterName) {
    const facing = interactive && Boolean(facingPassword[name]);
    return {
      role: "button",
      tabIndex: interactive ? 0 : -1,
      "aria-label": `${name} character: turn toward the password with eyes closed`,
      "aria-disabled": !interactive,
      "aria-pressed": facing,
      "data-facing": facing,
      onClick: () => toggleCharacter(name),
      onKeyDown: (event: KeyboardEvent<SVGGElement>) => {
        if (interactive && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          if (!event.repeat) toggleCharacter(name);
        }
      },
    };
  }

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    function follow(event: PointerEvent) {
      if (event.pointerType !== "mouse" || motion.matches) return;
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const element = stage.current;
        if (!element) return;
        const bounds = element.getBoundingClientRect();
        const x = Math.max(-1, Math.min(1, (event.clientX - bounds.left - bounds.width / 2) / (bounds.width / 2)));
        const y = Math.max(-1, Math.min(1, (event.clientY - bounds.top - bounds.height / 2) / (bounds.height / 2)));
        element.style.setProperty("--gaze-x", `${x * 3}px`);
        element.style.setProperty("--gaze-y", `${y * 3}px`);
        element.style.setProperty("--pointer-lean", `${x * 3}deg`);
      });
    }
    function reset() {
      window.cancelAnimationFrame(frame);
      stage.current?.style.setProperty("--gaze-x", "0px");
      stage.current?.style.setProperty("--gaze-y", "0px");
      stage.current?.style.setProperty("--pointer-lean", "0deg");
    }
    window.addEventListener("pointermove", follow, { passive: true });
    document.addEventListener("pointerleave", reset);
    motion.addEventListener("change", reset);
    return () => {
      window.removeEventListener("pointermove", follow);
      document.removeEventListener("pointerleave", reset);
      motion.removeEventListener("change", reset);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  const caption = {
    idle: "A fresh start. A familiar face.",
    typing: "Ready when you are.",
    private: "No peeking. Your password stays yours.",
    error: "Let’s give that another try.",
    loading: "Getting your workspace ready…",
  }[mood];

  return (
    <div ref={stage} className={styles.characters} data-mood={mood}>
      <svg viewBox="0 0 480 450" fill="none" focusable="false" role="group" aria-label="Interactive Fresh Phones characters">
        <g className={`${styles.arrival} ${styles.blueArrival}`}>
          <g className={`${styles.character} ${styles.blueCharacter}`} {...characterControls("blue")}>
            <rect x="137" y="60" width="148" height="340" rx="12" fill="var(--login-blue)" />
            <rect x="194" y="74" width="34" height="5" rx="2.5" fill="white" opacity=".38" />
            <Face x={211} y={115} mood={mood} />
          </g>
        </g>
        <g className={`${styles.arrival} ${styles.navyArrival}`}>
          <g className={`${styles.character} ${styles.navyCharacter}`} {...characterControls("navy")}>
            <rect x="253" y="157" width="98" height="243" rx="9" fill="var(--login-ink)" />
            <Face x={302} y={192} mood={mood} />
          </g>
        </g>
        <g className={`${styles.arrival} ${styles.lilacArrival}`}>
          <g className={`${styles.character} ${styles.lilacCharacter}`} {...characterControls("lilac")}>
            <path d="M 326 400 V 278 A 55 55 0 0 1 436 278 V 400 Z" fill="var(--login-lilac)" />
            <Face x={381} y={269} mood={mood} />
          </g>
        </g>
        <g className={`${styles.arrival} ${styles.pinkArrival}`}>
          <g className={`${styles.character} ${styles.pinkCharacter}`} {...characterControls("pink")}>
            <path d="M 40 400 A 121 121 0 0 1 282 400 Z" fill="var(--login-pink)" />
            <Face x={157} y={329} mood={mood} />
          </g>
        </g>
      </svg>
      <p className={styles.characterCaption}>{caption}</p>
    </div>
  );
}
