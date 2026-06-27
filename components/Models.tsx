import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import SectionHeading from "./SectionHeading";
import Reveal from "./Reveal";

type Model = {
  name: string;
  condition: "Pre-Owned" | "Brand New";
  daily: string;
  tag?: string;
  gradient: string;
};

const models: Model[] = [
  {
    name: "iPhone 11",
    condition: "Pre-Owned",
    daily: "₱59",
    tag: "Lowest daily",
    gradient: "from-[#c9a7ff] to-[#8aa2f2]",
  },
  {
    name: "iPhone 12",
    condition: "Pre-Owned",
    daily: "₱69",
    gradient: "from-[#2f6bff] to-[#1f53e6]",
  },
  {
    name: "iPhone 13",
    condition: "Pre-Owned",
    daily: "₱89",
    gradient: "from-[#ff8fcb] to-[#ff5fa8]",
  },
  {
    name: "iPad 10th Gen",
    condition: "Pre-Owned",
    daily: "₱89",
    gradient: "from-[#57e0ff] to-[#2f6bff]",
  },
  {
    name: "iPad A16",
    condition: "Brand New",
    daily: "₱95",
    tag: "Brand new",
    gradient: "from-[#8aa2f2] to-[#c9a7ff]",
  },
  {
    name: "iPhone 13 Pro",
    condition: "Pre-Owned",
    daily: "₱105",
    tag: "Top pick",
    gradient: "from-[#1a2c66] to-[#0b1640]",
  },
];

export default function Models() {
  return (
    <section id="iphones" className="relative px-4 py-20">
      <SectionHeading
        title={
          <>
            Pick your <span className="holo-text">fresh</span> device
          </>
        }
        subtitle="Quality pre-owned and brand-new iPhones and iPad, every unit tested and checked. Pay as low as a few pesos a day."
      />

      <div className="mx-auto mt-12 grid max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {models.map((m, i) => (
          <Reveal key={m.name} delay={(i % 3) * 90}>
            <article className="glass group relative flex h-full flex-col overflow-hidden rounded-[1.75rem] p-5 transition-transform duration-300 hover:-translate-y-1.5">
              {m.tag && (
                <span className="absolute right-4 top-4 z-10 rounded-full bg-hotpink px-3 py-1 text-[11px] font-700 text-white shadow">
                  {m.tag}
                </span>
              )}

              {/* device swatch */}
              <div className="relative mb-5 grid h-40 place-items-center rounded-2xl bg-white/50">
                <div
                  className={`bg-gradient-to-b ${m.gradient} ${
                    m.name.includes("iPad")
                      ? "h-32 w-24 rounded-[0.9rem]"
                      : "h-32 w-[4.5rem] rounded-[1.1rem]"
                  } p-1 shadow-[0_18px_30px_-12px_rgba(20,38,107,0.6)]`}
                >
                  <div className="relative h-full w-full rounded-[0.75rem] bg-white/10 ring-1 ring-white/30">
                    {!m.name.includes("iPad") && (
                      <div className="absolute left-1/2 top-1.5 h-1.5 w-6 -translate-x-1/2 rounded-full bg-black/40" />
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <h3 className="font-display text-xl font-700 text-blue-ink">
                  {m.name}
                </h3>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-700 ${
                    m.condition === "Brand New"
                      ? "bg-blue/15 text-blue"
                      : "bg-lilac/25 text-[#6b4fb0]"
                  }`}
                >
                  {m.condition}
                </span>
              </div>
              <p className="mt-0.5 text-sm font-600 text-ink-soft">
                Tested &amp; checked
              </p>

              <div className="mt-4 flex items-end justify-between">
                <div>
                  <p className="font-display text-2xl font-700 holo-text">
                    {m.daily}
                    <span className="text-sm text-ink-soft">/day</span>
                  </p>
                  <p className="text-xs font-600 text-ink-soft/80">
                    Weekly, 15 &amp; 30, or monthly
                  </p>
                </div>
                <a
                  href="#join"
                  className="grid h-11 w-11 place-items-center rounded-full btn-candy"
                  aria-label={`Reserve ${m.name}`}
                >
                  <ArrowUpRight weight="bold" className="h-5 w-5" />
                </a>
              </div>
            </article>
          </Reveal>
        ))}
      </div>

      <Reveal className="mt-8 text-center">
        <p className="text-sm font-600 text-ink-soft">
          Looking for a different model or storage?{" "}
          <a href="#join" className="font-700 text-blue underline-offset-2 hover:underline">
            Message us and we&apos;ll set up a plan for you.
          </a>
        </p>
      </Reveal>
    </section>
  );
}
