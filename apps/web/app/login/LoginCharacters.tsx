"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import styles from "./login.module.css";

export type CharacterMood = "idle" | "typing" | "private" | "error" | "loading";

type CharacterName =
  | "blue"
  | "navy"
  | "lilac"
  | "pink"
  | "cream"
  | "sky"
  | "blush"
  | "slate"
  | "lavender";

type Pet = {
  name: CharacterName;
  kind: "cat" | "dog";
  x: number;
  y: number;
  angle: number;
  fur: string;
  patch: string;
};

const pets: Pet[] = [
  {
    name: "cream",
    kind: "cat",
    x: 131,
    y: 130,
    angle: -12,
    fur: "#f9fbff",
    patch: "#b5c9ee",
  },
  {
    name: "blue",
    kind: "dog",
    x: 255,
    y: 126,
    angle: 5,
    fur: "#89aaf0",
    patch: "#557ac4",
  },
  {
    name: "pink",
    kind: "cat",
    x: 373,
    y: 149,
    angle: 10,
    fur: "#f3b4d2",
    patch: "#dc87b3",
  },
  {
    name: "lilac",
    kind: "dog",
    x: 102,
    y: 237,
    angle: -9,
    fur: "#c4b4ed",
    patch: "#9b84cc",
  },
  {
    name: "navy",
    kind: "cat",
    x: 234,
    y: 245,
    angle: 2,
    fur: "#303b52",
    patch: "#52617f",
  },
  {
    name: "sky",
    kind: "dog",
    x: 365,
    y: 253,
    angle: 10,
    fur: "#b9def4",
    patch: "#7db1d8",
  },
  {
    name: "blush",
    kind: "cat",
    x: 126,
    y: 356,
    angle: -10,
    fur: "#f7d7e6",
    patch: "#dca2be",
  },
  {
    name: "slate",
    kind: "dog",
    x: 252,
    y: 353,
    angle: -4,
    fur: "#91a2c6",
    patch: "#627596",
  },
  {
    name: "lavender",
    kind: "cat",
    x: 371,
    y: 362,
    angle: 9,
    fur: "#ddd3f5",
    patch: "#aa98d3",
  },
];

function PetFace({ pet, mood }: { pet: Pet; mood: CharacterMood }) {
  const dog = pet.kind === "dog";

  const dark = pet.name === "navy";

  const outline = dark ? "#f1f5ff" : "#283650";

  return (
    <>
      {dog ? (
        <>
          <path
            d="M -44 -42 Q -68 -67 -82 -41 Q -108 -5 -91 27 Q -78 47 -61 20 L -44 -3 M 44 -42 Q 69 -67 82 -41 Q 108 -5 91 27 Q 78 47 61 20 L 44 -3"
            fill={pet.patch}
            stroke="#283650"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path
            d="M -58 -34 Q -48 -58 0 -58 Q 49 -58 59 -32 L 65 27 Q 62 67 0 69 Q -61 65 -65 27 Z"
            fill={pet.fur}
            stroke="#283650"
            strokeWidth="2.5"
          />
          <ellipse cx="28" cy="-3" rx="24" ry="29" fill={pet.patch} />
          <path
            d="M -58 46 Q 0 64 58 50 Q 44 68 0 68 Q -45 65 -58 46 Z"
            fill="#283650"
            opacity=".1"
          />
          <ellipse cy="34" rx="32" ry="25" fill="#f6f8ff" />
        </>
      ) : (
        <>
          <path
            d="M -64 -10 Q -75 -53 -54 -88 Q -34 -83 -18 -49 Q 2 -54 23 -47 Q 44 -88 59 -88 Q 76 -49 64 -7 Q 88 15 72 43 Q 48 62 0 60 Q -52 60 -73 40 Q -87 14 -64 -10 Z"
            fill={pet.fur}
            stroke="#283650"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path
            d="M -54 -72 L -37 -47 L -58 -39 Z M 54 -73 L 36 -46 L 60 -36 Z"
            fill={dark ? "#7b86a4" : "#eaa7c9"}
          />
          <g stroke={pet.patch} strokeWidth="7" strokeLinecap="round">
            <path d="M -17 -43 L -12 -26 M 2 -46 L 2 -24 M 23 -42 L 18 -25" />
          </g>
          <path
            d="M -69 40 Q 0 60 71 41 Q 48 58 0 59 Q -52 59 -69 40 Z"
            fill="#283650"
            opacity=".1"
          />
        </>
      )}
      <g className={styles.expression}>
        <g className={styles.eyes}>
          <ellipse
            cx="-28"
            cy="9"
            rx="18"
            ry="21"
            fill="#f8fcff"
            stroke="#283650"
            strokeWidth="2"
          />
          <ellipse
            cx="28"
            cy="9"
            rx="18"
            ry="21"
            fill="#f8fcff"
            stroke="#283650"
            strokeWidth="2"
          />
          <g className={styles.pupils} fill="#283650">
            <ellipse cx="-28" cy="9" rx={dog ? 8 : 6} ry="14" />
            <ellipse cx="28" cy="9" rx={dog ? 8 : 6} ry="14" />
          </g>
        </g>
        <g
          className={styles.closedEyes}
          stroke={outline}
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        >
          <path d="M -44 9 Q -28 22 -12 9 M 12 9 Q 28 22 44 9" />
        </g>
        <path
          d={
            dog
              ? "M -8 28 Q 0 23 8 28 Q 7 37 0 38 Q -7 37 -8 28 Z"
              : "M -4 25 L 4 25 L 0 30 Z"
          }
          fill={dog ? "#283650" : outline}
        />
        <path
          d={
            mood === "error"
              ? "M 0 30 V 36 M -9 42 Q 0 34 9 42"
              : "M 0 30 V 38 M -10 35 Q -7 44 0 38 Q 8 44 11 35"
          }
          fill="none"
          stroke={dog ? "#283650" : outline}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
      {!dog && (
        <g stroke={outline} strokeWidth="1.6" strokeLinecap="round" fill="none">
          <path d="M -51 29 L -91 21 M -53 35 L -93 35 M -51 41 L -87 49 M 51 29 L 90 20 M 53 35 L 93 34 M 51 41 L 88 49" />
        </g>
      )}
      <path
        d={
          dog
            ? "M -38 64 Q 0 77 38 64 L 35 74 Q 0 87 -35 74 Z"
            : "M -38 56 Q 0 68 38 56 L 35 67 Q 0 78 -35 67 Z"
        }
        fill={dog ? "#f3a5c9" : "#7c9ee8"}
        stroke="#283650"
        strokeWidth="2"
      />
      {dog && (
        <circle
          cy="80"
          r="7"
          fill="#fff4fb"
          stroke="#283650"
          strokeWidth="1.5"
        />
      )}
    </>
  );
}

export default function LoginCharacters({ mood }: { mood: CharacterMood }) {
  const stage = useRef<HTMLDivElement>(null);

  const [facingPassword, setFacingPassword] = useState<
    Partial<Record<CharacterName, boolean>>
  >({});

  const interactive = mood === "private";

  useEffect(() => {
    if (!interactive) {
      setFacingPassword({});
    }
  }, [interactive]);

  function toggleCharacter(name: CharacterName) {
    if (!interactive) {
      return;
    }

    setFacingPassword((current) => {
      return { ...current, [name]: !current[name] };
    });
  }

  function characterControls(name: CharacterName) {
    const facing = interactive && Boolean(facingPassword[name]);

    return {
      role: "button",
      tabIndex: interactive ? 0 : -1,
      "aria-label": `${name} pet: turn toward the password with eyes closed`,
      "aria-disabled": !interactive,
      "aria-pressed": facing,
      "data-facing": facing,
      onClick: () => {
        return toggleCharacter(name);
      },
      onKeyDown: (event: KeyboardEvent<SVGGElement>) => {
        if (interactive && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();

          if (!event.repeat) {
            toggleCharacter(name);
          }
        }
      },
    };
  }

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

    let frame = 0;

    function follow(event: PointerEvent) {
      if (event.pointerType !== "mouse" || motion.matches) {
        return;
      }

      window.cancelAnimationFrame(frame);

      frame = window.requestAnimationFrame(() => {
        const element = stage.current;

        if (!element) {
          return;
        }

        const bounds = element.getBoundingClientRect();

        const x = Math.max(
          -1,
          Math.min(
            1,
            (event.clientX - bounds.left - bounds.width / 2) /
              (bounds.width / 2),
          ),
        );

        const y = Math.max(
          -1,
          Math.min(
            1,
            (event.clientY - bounds.top - bounds.height / 2) /
              (bounds.height / 2),
          ),
        );

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

  return (
    <div ref={stage} className={styles.characters} data-mood={mood}>
      <svg
        viewBox="0 0 480 455"
        fill="none"
        focusable="false"
        role="group"
        aria-label="Interactive Fresh Phones cats and dogs"
      >
        {pets.map((pet, index) => {
          return (
            <g
              key={pet.name}
              transform={`translate(${pet.x} ${pet.y}) rotate(${pet.angle}) scale(0.8)`}
            >
              <g
                className={styles.arrival}
                style={{ animationDelay: `${index * 0.04}s` }}
              >
                <g
                  className={`${styles.character} ${pet.name === "navy" ? styles.navyCharacter : ""}`}
                  {...characterControls(pet.name)}
                >
                  <PetFace pet={pet} mood={mood} />
                </g>
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
