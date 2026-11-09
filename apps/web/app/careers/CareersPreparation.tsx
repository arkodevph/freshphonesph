"use client";

import { useId } from "react";
import { CaretDown } from "@phosphor-icons/react";
import DoodleIcon from "@/components/DoodleIcon";
import { useExpandingCards } from "@/lib/useExpandingCards";
import styles from "./CareersPreparation.module.css";

const steps = [
  {
    icon: "application",
    title: "Find your fit.",
    body: "Explore the role, location, and employment type before you apply.",
  },
  {
    icon: "id-heart",
    title: "Tell us about you.",
    body: "Share your details and experience through the application form.",
  },
  {
    icon: "chat-heart",
    title: "Leave it with us.",
    body: "Our recruitment team reviews your application and experience.",
  },
] as const;

export default function CareersPreparation() {
  const id = useId();

  const { active, ready, compact, cards, toggles, select, handleKey } =
    useExpandingCards(steps.length, "(max-width: 899px)");

  return (
    <ol
      className={styles.grid}
      data-career-steps
      data-ready={ready}
      data-active-card={active}
    >
      {steps.map((step, index) => {
        const selected = active === index;

        const closed = ready && compact && !selected;

        const titleId = `${id}-step-title-${index}`;

        const detailsId = `${id}-step-details-${index}`;

        return (
          <li
            key={step.title}
            className={styles.card}
            data-career-step={index}
            data-active={selected}
            ref={(node) => {
              cards.current[index] = node;
            }}
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
            <div className={styles.icon}>
              <DoodleIcon name={step.icon} size={48} />
            </div>
            <div className={styles.copy}>
              <h3 id={titleId}>
                {ready ? (
                  <button
                    type="button"
                    ref={(node) => {
                      toggles.current[index] = node;
                    }}
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
                    <span>{step.title}</span>
                    <CaretDown className={styles.caret} aria-hidden="true" />
                  </button>
                ) : (
                  step.title
                )}
              </h3>
              <div
                id={detailsId}
                className={styles.details}
                aria-hidden={closed ? true : undefined}
                inert={closed}
              >
                <div className={styles.detailsInner}>
                  <p>{step.body}</p>
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
