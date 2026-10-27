"use client";

import Image from "next/image";
import { useRef } from "react";
import { useProcessStack } from "@/lib/useProcessStack";
import styles from "./ProcessStack.module.css";
import type { ReactNode } from "react";

const panels = [
  {
    label: "Choose & prepare",
    title: "Find your next favourite.",
    description:
      "Find the iPhone or iPad that fits you. Then get ready for your application, with a little help from our team.",
    image: "/brand/mascot/cloud-boy-choose-prepare-v1.png",
    imageAlt:
      "Cloud-boy comparing an iPhone and iPad beside a requirements checklist",
    note: "The team confirms current unit availability and application requirements.",
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
    label: "Meet your team",
    title: "Real people. Clear answers.",
    description:
      "Get guidance from the Fresh Phones PH team before joining a batch.",
    image: "/brand/mascot/cloud-boy-meet-team-v1.png",
    imageAlt:
      "Cloud-boy answering questions beside a conversation bubble and application checklist",
    note: "Ask about the batch terms before deciding to join.",
    steps: [
      [
        "Contact Fresh Phones PH",
        "Speak with the team through an authorized channel.",
      ],
      [
        "Application review",
        "Submit your requirements for the team to review. Joining is subject to approval.",
      ],
    ],
  },
  {
    label: "Plan & track",
    title: "A plan you can follow.",
    description:
      "Know what to pay and when it is due. Follow your agreed schedule and see your verified payment progress.",
    image: "/brand/mascot/cloud-boy-plan-track-v1.png",
    imageAlt:
      "Cloud-boy pointing to checked calendar dates and showing payment progress on a phone",
    note: "Only Finance-verified payments reduce your remaining balance.",
    steps: [
      [
        "Join an approved batch",
        "Confirm the batch terms and your payment schedule.",
      ],
      [
        "Follow your schedule",
        "Pay through the agreed external channels. Check verified payments in your portal.",
      ],
    ],
  },
  {
    label: "Complete & collect",
    title: "Your next phone. Finally yours.",
    description:
      "Finish your agreed payments, confirm your release requirements, and let the team guide you through the handover.",
    image: "/brand/mascot/cloud-boy-complete-collect-v1.png",
    imageAlt:
      "Cloud-boy happily unboxing a phone beside its packaging and completed checklist",
    note: "Your release schedule follows your approved batch terms.",
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

export default function ProcessStack({ children }: { children?: ReactNode }) {
  const trackRef = useRef<HTMLDivElement>(null);

  useProcessStack(trackRef, panels.length);

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
                data-panel={index}
                aria-labelledby={`process-card-${index}`}
                style={{ zIndex: panels.length - index }}
              >
                <div className={styles.topline}>
                  <span>{panel.label}</span>
                  <span className={styles.counter}>
                    {String(index + 1).padStart(2, "0")} <span>/ 04</span>
                  </span>
                </div>
                <div className={styles.progress} aria-hidden="true">
                  {panels.map((item, marker) => {
                    return (
                      <span key={item.label} data-reached={marker <= index} />
                    );
                  })}
                </div>
                <div className={styles.main}>
                  <div>
                    <h3 id={`process-card-${index}`}>{panel.title}</h3>
                    <p>{panel.description}</p>
                  </div>
                  <div className={styles.scene}>
                    <Image
                      src={panel.image}
                      alt={panel.imageAlt}
                      width={1254}
                      height={1254}
                      sizes="(max-width: 640px) calc(100vw - 80px), (max-width: 1024px) 40vw, 420px"
                      className={styles.visual}
                    />
                  </div>
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
                <p className={styles.note}>{panel.note}</p>
              </article>
            );
          })}
          <div className={styles.reviews}>{children}</div>
        </div>
      </div>
    </section>
  );
}
