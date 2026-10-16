"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import styles from "./ProcessStack.module.css";

const panels = [
  {
    title: "Find your next favourite.",
    description: "A little planning brings your next iPhone or iPad closer.",
    image: "/products/iphone-15-overlap-transparent.png",
    steps: [
      [
        "Choose your unit",
        "Explore the available models and find the one for you.",
      ],
      [
        "Review requirements",
        "Check what you need to prepare before applying.",
      ],
    ],
  },
  {
    title: "Real people. Clear answers.",
    description:
      "Get guidance from the Fresh Phones PH team before joining a batch.",
    image: "/portal/illustrations/identity.png",
    steps: [
      [
        "Contact Fresh Phones PH",
        "Speak with the team through an authorized channel.",
      ],
      [
        "Application review",
        "The team reviews your application and requirements.",
      ],
    ],
  },
  {
    title: "A plan you can follow.",
    description:
      "Know your agreed amounts, expected due dates and payment progress.",
    image: "/portal/illustrations/payments.png",
    steps: [
      [
        "Join an approved batch",
        "Confirm the batch terms and your payment schedule.",
      ],
      [
        "Follow your schedule",
        "Pay through authorized channels and track verified records.",
      ],
    ],
  },
  {
    title: "Your next phone. Finally yours.",
    description:
      "From the first conversation to release, you know what comes next.",
    image: "/products/iphone-16-overlap-transparent.png",
    steps: [
      [
        "Complete payments",
        "Finish your agreed payments and confirm your account status.",
      ],
      [
        "Receive your unit",
        "The team coordinates release under your approved batch terms.",
      ],
    ],
  },
] as const;

export default function ProcessStack() {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;

    if (!track) {
      return;
    }

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const cards = Array.from(track.querySelectorAll<HTMLElement>("article"));

    const stage = track.firstElementChild as HTMLElement;

    let frame = 0;

    let visible = false;

    const draw = () => {
      frame = 0;

      if (!visible || motion.matches || innerHeight < 620) {
        return;
      }

      const top = Number.parseFloat(getComputedStyle(stage).top);

      const travel = Math.max(1, track.offsetHeight - stage.offsetHeight);

      const progress = Math.max(
        0,
        Math.min(1, (top - track.getBoundingClientRect().top) / travel),
      );

      const position = progress * (panels.length - 0.2);

      cards.forEach((card, index) => {
        const exit =
          index === panels.length - 1
            ? 0
            : Math.max(0, Math.min(1, (position - index - 0.55) / 0.45));

        const depth = Math.max(0, index - position);

        card.style.setProperty("--exit", String(exit));

        card.style.setProperty("--depth", String(Math.min(3, depth)));
      });
    };

    const schedule = () => {
      if (!frame && visible) {
        frame = requestAnimationFrame(draw);
      }
    };

    const sync = () => {
      track.dataset.animated = String(!motion.matches && innerHeight >= 620);

      schedule();
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;

      schedule();
    });

    observer.observe(track);

    sync();

    window.addEventListener("scroll", schedule, { passive: true });

    window.addEventListener("resize", sync);

    motion.addEventListener("change", sync);

    return () => {
      cancelAnimationFrame(frame);

      observer.disconnect();

      window.removeEventListener("scroll", schedule);

      window.removeEventListener("resize", sync);

      motion.removeEventListener("change", sync);
    };
  }, []);

  return (
    <section
      id="how"
      className={styles.section}
      aria-labelledby="process-heading"
    >
      <header className={styles.heading}>
        <span>HOW IT WORKS</span>
        <h2 id="process-heading">
          Your next phone.
          <br />
          <em>A clear path to get there.</em>
        </h2>
        <p>Eight simple steps, with the Fresh Phones PH team by your side.</p>
      </header>
      <div ref={trackRef} className={styles.track}>
        <div className={styles.stage}>
          {panels.map((panel, index) => {
            return (
              <article
                key={panel.title}
                className={styles.card}
                style={{ zIndex: panels.length - index }}
              >
                <div className={styles.topline}>
                  <span>FRESH PHONES PH</span>
                  <span>({String(index + 1).padStart(2, "0")} / 04)</span>
                </div>
                <div className={styles.main}>
                  <div>
                    <h3>{panel.title}</h3>
                    <p>{panel.description}</p>
                  </div>
                  <Image
                    src={panel.image}
                    alt=""
                    width={520}
                    height={520}
                    sizes="(max-width: 640px) 140px, 320px"
                    className={styles.visual}
                  />
                </div>
                <ol start={index * 2 + 1} className={styles.steps}>
                  {panel.steps.map(([title, description], step) => {
                    return (
                      <li key={title}>
                        <span>
                          {String(index * 2 + step + 1).padStart(2, "0")}
                        </span>
                        <div>
                          <h4>{title}</h4>
                          <p>{description}</p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </article>
            );
          })}
        </div>
      </div>
      <a href="#requirements" className={styles.next}>
        See what you need to prepare <span aria-hidden="true">↗</span>
      </a>
    </section>
  );
}
