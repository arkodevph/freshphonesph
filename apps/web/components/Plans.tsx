import { Check, Sparkle } from "@phosphor-icons/react/dist/ssr";
import SectionHeading from "./SectionHeading";
import Reveal from "./Reveal";

type Plan = {
  name: string;
  cadence: string;
  blurb: string;
  perks: string[];
  popular?: boolean;
};

const plans: Plan[] = [
  {
    name: "Weekly",
    cadence: "Every 7 days",
    blurb: "A regular weekly payment interval.",
    perks: ["Weekly payment rhythm", "Offer-specific amounts", "Preview sample dates", "Confirm terms with our team"],
  },
  {
    name: "Every 15 days",
    cadence: "A fixed 15-day interval",
    blurb: "Payments spaced fifteen days apart from your start date.",
    perks: ["Predictable day intervals", "Offer-specific amounts", "Preview sample dates", "Confirm terms with our team"],
  },
  {
    name: "Every 30 days",
    cadence: "A fixed 30-day interval",
    blurb: "Payments spaced thirty days apart from your start date.",
    perks: ["Longer payment intervals", "Offer-specific amounts", "Preview sample dates", "Confirm terms with our team"],
  },
];

export default function Plans() {
  return (
    <section id="plans" className="relative px-4 py-20">
      <div className="absolute inset-0 -z-10 dotgrid opacity-60" aria-hidden />
      <SectionHeading
        title={
          <>
            Pay the <span className="holo-text">way</span> that suits you
          </>
        }
        subtitle="Browse a unit’s sample payment breakdown for its total, payment interval and installment amounts. Available terms depend on the offer."
      />

      <div className="mx-auto mt-12 grid max-w-5xl items-stretch gap-5 lg:grid-cols-3">
        {plans.map((p, i) => (
          <Reveal key={p.name} delay={i * 100} className="h-full">
            <article
              className={`relative flex h-full flex-col rounded-[2rem] p-7 transition-transform duration-300 hover:-translate-y-1.5 ${
                p.popular
                  ? "bg-gradient-to-b from-[#2f6bff] to-[#1f53e6] text-white shadow-[0_30px_60px_-22px_rgba(47,107,255,0.8)] lg:-mt-4 lg:mb-0"
                  : "glass text-blue-ink"
              }`}
            >
              {p.popular && (
                <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-hotpink px-4 py-1 text-xs font-700 text-white shadow">
                  <Sparkle weight="fill" className="h-3.5 w-3.5" /> Most popular
                </span>
              )}

              <h3 className="font-display text-2xl font-700">{p.name}</h3>
              <p
                className={`font-display mt-1 text-lg font-600 ${
                  p.popular ? "text-cyan" : "text-blue"
                }`}
              >
                {p.cadence}
              </p>
              <p
                className={`mt-2 text-sm font-500 ${
                  p.popular ? "text-white/85" : "text-ink-soft"
                }`}
              >
                {p.blurb}
              </p>

              <ul className="mt-5 space-y-3">
                {p.perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-2.5 text-sm font-600">
                    <span
                      className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${
                        p.popular ? "bg-white/20 text-white" : "bg-blue/15 text-blue"
                      }`}
                    >
                      <Check weight="bold" className="h-3.5 w-3.5" />
                    </span>
                    <span className={p.popular ? "text-white/90" : "text-ink-soft"}>
                      {perk}
                    </span>
                  </li>
                ))}
              </ul>

              <a
                href="#units"
                className={`mt-7 inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-700 ${
                  p.popular
                    ? "bg-white text-blue-ink hover:bg-white/90"
                    : "btn-candy"
                } transition-colors`}
              >
                Explore unit offers
              </a>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
