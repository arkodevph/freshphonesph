import { Quotes } from "@phosphor-icons/react/dist/ssr";
import SolarStar from "./SolarStar";
import SectionHeading from "./SectionHeading";
import Reveal from "./Reveal";
import styles from "./Testimonials.module.css";
import type { CSSProperties } from "react";

type Review = {
  name: string;
  role: string;
  quote: string;
  initials: string;
  color: string;
  sample?: boolean;
};

const reviews: Review[] = [
  {
    name: "Hazen Lelay",
    role: "Recommends on Facebook",
    quote:
      "Smooth and secured transaction! Very responsive agent, super bilis at bait kausap. High quality unit and service, 100% would recommend! 💗",
    initials: "HL",
    color: "from-bubblegum to-hotpink",
  },
  {
    name: "Benjie L. Panday Jr.",
    role: "iPhone 11",
    quote:
      "Ang ganda ng iPhone 11! Talagang sulit ang pera mo. Ang galing ng camera at ang lakas ng battery life, highly recommend! 😍",
    initials: "BP",
    color: "from-blue to-cyan",
  },
  {
    name: "John Cadion Fabillar",
    role: "Recommends on Facebook",
    quote: "High quality phones, 100% recommended!",
    initials: "JF",
    color: "from-lilac to-periwinkle",
  },
  {
    name: "Ana Marie Dulin",
    role: "Recommends on Facebook",
    quote: "Super smooth transaction!",
    initials: "AD",
    color: "from-cyan to-blue",
  },
  {
    name: "Sample member 01",
    role: "Example feedback · weekly plan",
    quote:
      "I liked being able to review the schedule before deciding. Having the steps laid out made it easier to know what to prepare.",
    initials: "01",
    color: "from-bubblegum to-hotpink",
    sample: true,
  },
  {
    name: "Sample member 02",
    role: "Example feedback · choosing a unit",
    quote:
      "Comparing the available models helped me narrow down my options. I could ask the team about the details that mattered to me.",
    initials: "02",
    color: "from-blue to-cyan",
    sample: true,
  },
  {
    name: "Sample member 03",
    role: "Example feedback · payment progress",
    quote:
      "Seeing my verified payment progress in one place helped me keep track of my plan and prepare for the next due date.",
    initials: "03",
    color: "from-lilac to-periwinkle",
    sample: true,
  },
  {
    name: "Sample member 04",
    role: "Example feedback · getting started",
    quote:
      "The checklist gave me a useful starting point. It helped to have my questions ready before speaking with the team.",
    initials: "04",
    color: "from-cyan to-blue",
    sample: true,
  },
];

const reviewX = (index: number) => {
  return index < 4
    ? [-0.09, 0.22, 0.56, 0.75][index]
    : 0.75 + (index - 3) * 0.31;
};

export default function Testimonials({ staged = false }: { staged?: boolean }) {
  return (
    <section
      id="reviews"
      data-review-count={reviews.length}
      data-review-pan={Math.max(0, reviewX(reviews.length - 1) - 0.75)}
      className={staged ? styles.staged : "relative px-4 py-20"}
    >
      <SectionHeading
        title={
          <>
            Real members, real <span className="holo-text">flexes</span>
          </>
        }
        subtitle="Customer recommendations, with clearly labeled sample reviews for this preview."
      />

      <div
        className={
          staged
            ? styles.cards
            : "mx-auto mt-12 grid max-w-5xl gap-5 sm:grid-cols-2"
        }
      >
        {reviews.map((r, i) => {
          const card = (
            <figure className="glass relative h-full rounded-[1.75rem] p-6">
              {r.sample && (
                <span className={styles.sample}>
                  Sample review · preview only
                </span>
              )}
              <Quotes
                weight="fill"
                className="absolute right-5 top-5 h-8 w-8 text-blue/15"
              />
              <div
                className="mb-3 flex gap-1"
                role="img"
                aria-label="5 out of 5 stars"
              >
                {[0, 1, 2, 3, 4].map((s) => {
                  return <SolarStar key={s} className="h-5 w-5 text-hotpink" />;
                })}
              </div>
              <blockquote className="text-[15px] font-500 leading-relaxed text-ink">
                “{r.quote}”
              </blockquote>
              <figcaption className="mt-5 flex items-center gap-3">
                <span
                  className={`grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br ${r.color} font-display text-sm font-700 text-white shadow`}
                >
                  {r.initials}
                </span>
                <div>
                  <p className="font-display font-700 text-blue-ink">
                    {r.name}
                  </p>
                  <p className="text-xs font-600 text-ink-soft">{r.role}</p>
                </div>
              </figcaption>
            </figure>
          );

          return staged ? (
            <div
              key={r.name}
              data-sample={r.sample || undefined}
              className={styles.card}
              style={
                {
                  "--review-from-x":
                    i < 4 ? [1.05, 1.55, 2, 2.4][i] : reviewX(i) + 1.1,
                  "--review-to-x": reviewX(i),
                  "--review-from-y": [1.05, 1.2, 1.4, 1.55][i % 4],
                  "--review-to-y": [0.46, 0.26, 0.41, 0.44][i % 4],
                  "--review-from-angle": `${[26, 30, -18, 24][i % 4]}deg`,
                  "--review-to-angle": `${[-12, 0, -10, 0][i % 4]}deg`,
                  "--review-delay": [0, 0.08, 0.16, 0.24][i % 4],
                } as CSSProperties
              }
            >
              {card}
            </div>
          ) : (
            <Reveal key={r.name} delay={(i % 2) * 100}>
              {card}
            </Reveal>
          );
        })}
      </div>

      <div className={staged ? styles.link : "mt-8 text-center"}>
        <a
          href="https://web.facebook.com/FreshPhonesPh"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-700 text-blue underline-offset-2 hover:underline"
        >
          See all reviews on Facebook
        </a>
      </div>
    </section>
  );
}
