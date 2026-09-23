import Image from "next/image";
import SectionHeading from "./SectionHeading";
import Reveal from "./Reveal";

const posters = [
  { src: "/brand/plan-poster-1.png", alt: "Fresh Phones PH paluwagan plan: iPhone 12, iPhone 13 Pro, and iPad 10th Gen daily rates" },
  { src: "/brand/plan-poster-2.png", alt: "Fresh Phones PH paluwagan plan: iPhone 13, iPhone 11, and iPad A16 daily rates" },
  { src: "/brand/plan-poster-3.png", alt: "Fresh Phones PH iPhone 12 paluwagan feature poster" },
];

export default function PosterGallery() {
  return (
    <section className="relative px-4 py-20">
      <SectionHeading
        title={
          <>
            This week&apos;s <span className="holo-text">paluwagan</span> plans
          </>
        }
        subtitle="Straight from our page. Tap a plan, message us, and we'll lock in your slot."
      />

      <div className="mx-auto mt-12 grid max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {posters.map((p, i) => (
          <Reveal key={p.src} delay={(i % 3) * 90}>
            <a
              href="#join"
              className="glass group block overflow-hidden rounded-[1.75rem] p-3 transition-transform duration-300 hover:-translate-y-1.5"
            >
              <Image
                src={p.src}
                alt={p.alt}
                width={1280}
                height={1280}
                className="h-auto w-full rounded-[1.3rem]"
              />
            </a>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
