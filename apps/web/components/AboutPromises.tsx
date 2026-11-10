"use client";

import { useId } from "react";
import { useExpandingCards } from "@/lib/useExpandingCards";
import DoodleIcon from "./DoodleIcon";
import styles from "./AboutPromises.module.css";

const commitments = [
  {
    icon: "shield-heart",
    eyebrow: "Legit & accountable",
    title: "A registered local business",
    body: "Fresh Phones PH operates under the DTI-registered business name FP Gadget Center, giving customers a clear business identity behind every transaction.",
    className: "bg-[#3157c8] text-white",
  },
  {
    icon: "chat-heart",
    eyebrow: "Customer-first",
    title: "Support that stays human",
    body: "Questions are welcome. From choosing a unit to understanding a payment schedule, our goal is to make every next step easy to follow.",
    className: "bg-[#67d2f1] text-blue-ink",
  },
  {
    icon: "application",
    eyebrow: "Clear process",
    title: "No confusing surprises",
    body: "We share unit details, requirements, payment options, and availability clearly before a customer commits to a paluwagan plan.",
    className: "bg-[#c7a6ff] text-blue-ink",
  },
  {
    icon: "phone-heart",
    eyebrow: "The Fresh Phones way",
    title: "Gadgets made manageable",
    body: "The business is built around a simple purpose: help more Filipinos work toward a quality iPhone or iPad through manageable payment options.",
    className: "bg-[#ff92c8] text-blue-ink",
  },
] as const;

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

  const { active, ready, compact, cards, toggles, select, handleKey } =
    useExpandingCards(4, "(max-width: 1199px)");

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
                    <DoodleIcon name={item.icon} size={64} />
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
