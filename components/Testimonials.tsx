import { Star, Quotes } from "@phosphor-icons/react/dist/ssr";
import SectionHeading from "./SectionHeading";
import Reveal from "./Reveal";

type Review = {
  name: string;
  role: string;
  quote: string;
  initials: string;
  color: string;
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
    quote:
      "High quality phones, 100% recommended!",
    initials: "JF",
    color: "from-lilac to-periwinkle",
  },
  {
    name: "Ana Marie Dulin",
    role: "Recommends on Facebook",
    quote:
      "Super smooth transaction!",
    initials: "AD",
    color: "from-cyan to-blue",
  },
];

export default function Testimonials() {
  return (
    <section id="reviews" className="relative px-4 py-20">
      <SectionHeading
        title={
          <>
            Real members, real <span className="holo-text">flexes</span>
          </>
        }
        subtitle="Real recommendations from our Facebook page."
      />

      <div className="mx-auto mt-12 grid max-w-5xl gap-5 sm:grid-cols-2">
        {reviews.map((r, i) => (
          <Reveal key={r.name} delay={(i % 2) * 100}>
            <figure className="glass relative h-full rounded-[1.75rem] p-6">
              <Quotes weight="fill" className="absolute right-5 top-5 h-8 w-8 text-blue/15" />
              <div className="mb-3 flex">
                {[0, 1, 2, 3, 4].map((s) => (
                  <Star key={s} weight="fill" className="h-4 w-4 text-hotpink" />
                ))}
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
                  <p className="font-display font-700 text-blue-ink">{r.name}</p>
                  <p className="text-xs font-600 text-ink-soft">{r.role}</p>
                </div>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>

      <Reveal className="mt-8 text-center">
        <a
          href="https://web.facebook.com/FreshPhonesPh"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-700 text-blue underline-offset-2 hover:underline"
        >
          See all reviews on Facebook
        </a>
      </Reveal>
    </section>
  );
}
