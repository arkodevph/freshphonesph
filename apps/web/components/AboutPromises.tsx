"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import {
  CheckCircle,
  Heart,
  ShieldCheck,
  UsersThree,
} from "@phosphor-icons/react/dist/ssr";
import styles from "./AboutPromises.module.css";

const commitments = [
  {
    icon: ShieldCheck,
    eyebrow: "Legit & accountable",
    title: "A registered local business",
    body: "Fresh Phones PH operates under the DTI-registered business name FP Gadget Center, giving customers a clear business identity behind every transaction.",
    className: "bg-[#3157c8] text-white",
  },
  {
    icon: UsersThree,
    eyebrow: "Customer-first",
    title: "Support that stays human",
    body: "Questions are welcome. From choosing a unit to understanding a payment schedule, our goal is to make every next step easy to follow.",
    className: "bg-[#67d2f1] text-blue-ink",
  },
  {
    icon: CheckCircle,
    eyebrow: "Clear process",
    title: "No confusing surprises",
    body: "We share unit details, requirements, payment options, and availability clearly before a customer commits to a paluwagan plan.",
    className: "bg-[#c7a6ff] text-blue-ink",
  },
  {
    icon: Heart,
    eyebrow: "The Fresh Phones way",
    title: "Gadgets made manageable",
    body: "The business is built around a simple purpose: help more Filipinos work toward a quality iPhone or iPad through manageable payment options.",
    className: "bg-[#ff92c8] text-blue-ink",
  },
];

function PromiseArtwork({ index }: { index: number }) {
  return (
    <div className={styles.art} aria-hidden="true">
      {index === 0 && (
        <>
          <div className={styles.ring} />
          <div className={styles.circle} />
        </>
      )}
      {index === 1 && (
        <>
          <div className={styles.roundedSquare} />
          <div className={styles.pill} />
          <div className={styles.smallPill} />
        </>
      )}
      {index === 2 && (
        <>
          <div className={styles.diamondRing} />
          <div className={styles.diamond} />
        </>
      )}
      {index === 3 && (
        <>
          <div className={styles.blob} />
          <div className={styles.stripe} />
        </>
      )}
    </div>
  );
}

export default function AboutPromises() {
  const id = useId();

  const [active, setActive] = useState(0);

  const [ready, setReady] = useState(false);

  const [compact, setCompact] = useState(false);

  const cards = useRef<Array<HTMLElement | null>>([]);

  const toggles = useRef<Array<HTMLButtonElement | null>>([]);

  const userSelection = useRef(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 1199px)");

    function syncLayout() {
      setCompact(query.matches);
    }

    syncLayout();

    setReady(true);

    query.addEventListener("change", syncLayout);

    return () => {
      query.removeEventListener("change", syncLayout);
    };
  }, []);

  useEffect(() => {
    if (!compact) {
      userSelection.current = false;

      return;
    }

    if (!userSelection.current) {
      return;
    }

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const timer = setTimeout(
      () => {
        userSelection.current = false;

        const card = cards.current[active];

        const top = card?.getBoundingClientRect().top;

        if (
          top !== undefined &&
          (top < 100 || top > window.innerHeight - 100)
        ) {
          card?.scrollIntoView({
            block: "start",
            behavior: motion.matches ? "instant" : "smooth",
          });
        }
      },
      motion.matches ? 0 : 680,
    );

    return () => {
      clearTimeout(timer);
    };
  }, [active, compact]);

  function select(index: number) {
    if (!ready || index === active) {
      return;
    }

    userSelection.current = compact;

    setActive(index);
  }

  function handleKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? commitments.length - 1
          : ["ArrowRight", "ArrowDown"].includes(event.key)
            ? (index + 1) % commitments.length
            : ["ArrowLeft", "ArrowUp"].includes(event.key)
              ? (index + commitments.length - 1) % commitments.length
              : null;

    if (next === null) {
      return;
    }

    event.preventDefault();

    toggles.current[next]?.focus({ preventScroll: true });

    select(next);
  }

  return (
    <div
      className={styles.grid}
      data-promises
      data-ready={ready}
      data-active-card={active}
    >
      {commitments.map((item, index) => {
        const selected = active === index;

        const closed = ready && compact && !selected;

        const titleId = `${id}-promise-title-${index}`;

        const detailsId = `${id}-promise-details-${index}`;

        return (
          <article
            key={item.title}
            ref={(node) => {
              cards.current[index] = node;
            }}
            className={`${styles.card} ${item.className}`}
            data-promise-card={index}
            data-active={selected}
            aria-labelledby={titleId}
            onClick={(event) => {
              if (
                !(event.target as HTMLElement).closest("button") &&
                !window.getSelection()?.toString()
              ) {
                select(index);
              }
            }}
          >
            <PromiseArtwork index={index} />
            <span className={styles.number} aria-hidden="true">
              0{index + 1}
            </span>
            <div className={styles.copy}>
              <p className={styles.eyebrow}>{item.eyebrow}</p>
              <h3 id={titleId} className={styles.title}>
                {ready ? (
                  <button
                    ref={(node) => {
                      toggles.current[index] = node;
                    }}
                    type="button"
                    className={styles.toggle}
                    aria-pressed={compact ? undefined : selected}
                    aria-expanded={compact ? selected : undefined}
                    aria-disabled={compact && selected ? true : undefined}
                    aria-controls={detailsId}
                    onClick={() => {
                      select(index);
                    }}
                    onKeyDown={(event) => {
                      handleKey(event, index);
                    }}
                  >
                    {item.title}
                  </button>
                ) : (
                  item.title
                )}
              </h3>
              <div
                id={detailsId}
                className={styles.details}
                aria-hidden={closed ? true : undefined}
                inert={closed}
              >
                <div className={styles.detailsInner}>
                  <p className={styles.body}>{item.body}</p>
                  <div className={styles.icon} aria-hidden="true">
                    <item.icon weight={index === 1 ? "fill" : "duotone"} />
                  </div>
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
