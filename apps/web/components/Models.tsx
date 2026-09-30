import Image from "next/image";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import SectionHeading from "./SectionHeading";
import Reveal from "./Reveal";

const cardTones = {
  lilac: {
    panel: "linear-gradient(135deg, #efe3ff, #e8edff)",
    ink: "#342060",
    muted: "#594b78",
    accent: "#7140b3",
  },
  ocean: {
    panel: "linear-gradient(135deg, #ddecff, #e4f6ff)",
    ink: "#163a70",
    muted: "#456385",
    accent: "#1d5db8",
  },
  pink: {
    panel: "linear-gradient(135deg, #ffe0f0, #ffeaf5)",
    ink: "#66234f",
    muted: "#80536f",
    accent: "#ad246f",
  },
  aqua: {
    panel: "linear-gradient(135deg, #dcf6ff, #e6edff)",
    ink: "#184368",
    muted: "#4b6880",
    accent: "#17669c",
  },
  berry: {
    panel: "linear-gradient(135deg, #ffddec, #f1e6ff)",
    ink: "#68244e",
    muted: "#80536c",
    accent: "#af276c",
  },
  indigo: {
    panel: "linear-gradient(135deg, #e5e7ff, #e8f1ff)",
    ink: "#263064",
    muted: "#535d83",
    accent: "#5148a8",
  },
} as const;

type Model = {
  name: string;
  condition: "Pre-Owned" | "Brand New";
  daily: string;
  tag?: string;
  gradient: string;
  image?: string;
  imageAlt?: string;
  imageZoom?: "large";
  tone: keyof typeof cardTones;
};

function FlatDevicePreview({ name, gradient }: Pick<Model, "name" | "gradient">) {
  const isPad = name.includes("iPad");
  const isPro = name.includes("Pro");
  const cameraCount = isPad ? 1 : isPro ? 3 : 2;

  return (
    <div className="relative h-full w-full overflow-hidden" aria-hidden="true">
      <div className={`absolute left-[18%] top-[28%] h-[92%] ${isPad ? "w-[42%] rounded-[18px]" : "w-[34%] rounded-[26px]"} bg-gradient-to-b ${gradient} border border-black/15 shadow-[0_18px_35px_rgba(20,38,107,.22)]`}>
        <div className={`absolute left-[9%] top-[5%] grid ${cameraCount === 3 ? "grid-cols-2" : "grid-cols-1"} gap-1.5 rounded-xl bg-black/10 p-2`}>
          {Array.from({ length: cameraCount }, (_, index) => <span key={index} className="h-4 w-4 rounded-full border-[3px] border-[#34415f] bg-[#081226] shadow-inner" />)}
        </div>
        <span className="absolute left-1/2 top-[54%] -translate-x-1/2 text-sm font-800 text-white/55">●</span>
      </div>
      <div className={`absolute left-[50%] top-[23%] h-[96%] ${isPad ? "w-[45%] rounded-[19px]" : "w-[35%] rounded-[27px]"} border-[4px] border-[#26324c] bg-[#07101f] p-1 shadow-[0_20px_38px_rgba(20,38,107,.25)]`}>
        <div className="relative h-full w-full overflow-hidden rounded-[inherit] bg-[linear-gradient(150deg,#e80066_3%,#ff3154_34%,#f0ded6_58%,#0064b9_82%,#003b88_100%)]">
          {!isPad && <span className={`absolute left-1/2 top-0 h-3 -translate-x-1/2 bg-[#07101f] ${isPro ? "w-9 rounded-b-full" : "w-11 rounded-b-xl"}`} />}
        </div>
      </div>
    </div>
  );
}

const models: Model[] = [
  {
    name: "iPhone 11",
    condition: "Pre-Owned",
    daily: "₱59",
    tag: "Lowest daily",
    gradient: "from-[#c9a7ff] to-[#8aa2f2]",
    image: "/products/iphone-11-overlap-transparent.png",
    imageAlt: "White iPhone 11 shown from the front and back",
    imageZoom: "large",
    tone: "lilac",
  },
  {
    name: "iPhone 12",
    condition: "Pre-Owned",
    daily: "₱69",
    gradient: "from-[#2f6bff] to-[#1f53e6]",
    image: "/products/iphone-12-overlap-transparent.png",
    imageAlt: "Blue iPhone 12 shown from the front and back",
    imageZoom: "large",
    tone: "ocean",
  },
  {
    name: "iPhone 13",
    condition: "Pre-Owned",
    daily: "₱89",
    gradient: "from-[#ff8fcb] to-[#ff5fa8]",
    image: "/products/iphone-13-overlap-transparent.png",
    imageAlt: "Pink iPhone 13 shown from the front and back",
    tone: "pink",
  },
  {
    name: "iPad 10th Gen",
    condition: "Pre-Owned",
    daily: "₱89",
    gradient: "from-[#57e0ff] to-[#2f6bff]",
    image: "/products/ipad-10th-gen-overlap-transparent.png",
    imageAlt: "Blue iPad 10th generation shown from the front and back",
    tone: "aqua",
  },
  {
    name: "iPad A16",
    condition: "Brand New",
    daily: "₱95",
    tag: "Brand new",
    gradient: "from-[#8aa2f2] to-[#c9a7ff]",
    image: "/products/ipad-a16-overlap-transparent.png",
    imageAlt: "Pink iPad A16 shown from the front and back",
    tone: "berry",
  },
  {
    name: "iPhone 13 Pro",
    condition: "Pre-Owned",
    daily: "₱105",
    tag: "Top pick",
    gradient: "from-[#1a2c66] to-[#0b1640]",
    image: "/products/iphone-13-pro-overlap-transparent.png",
    imageAlt: "Sierra Blue iPhone 13 Pro shown from the front and back",
    tone: "indigo",
  },
];

export default function Models() {
  return (
    <section id="units" className="relative scroll-mt-24 px-4 py-20">
      <SectionHeading
        title={
          <>
            Phones for your <span className="holo-text">next chapter</span>
          </>
        }
        subtitle="Clear pricing, payment schedules, and availability—before you message us."
      />

      <div className="mx-auto mt-[12.5rem] grid max-w-6xl gap-x-5 gap-y-64 sm:grid-cols-2 lg:grid-cols-3">
        {models.map((m, i) => {
          const tone = cardTones[m.tone];
          return (
            <Reveal key={m.name} delay={(i % 3) * 90}>
              <article
                className="glass group relative flex h-full flex-col overflow-visible rounded-[1.75rem] p-5 transition-transform duration-300 hover:-translate-y-1.5"
              >
                {m.image && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 -top-44 z-0 h-56 rounded-[1.75rem] border border-white bg-white shadow-[0_16px_38px_rgba(80,64,160,0.08)]"
                  />
                )}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 z-20 rounded-[1.75rem]"
                  style={{ background: tone.panel }}
                />
                {m.tag && (
                  <span className="absolute right-4 top-4 z-40 rounded-full bg-hotpink px-3 py-1 text-[11px] font-700 text-white shadow">
                    {m.tag}
                  </span>
                )}

                {/* Real product renders are used when available; other models keep the illustrated fallback. */}
                <div className={`h-64 ${m.image ? "absolute inset-x-5 -top-[10.25rem] z-10 overflow-visible" : "relative z-30 overflow-hidden rounded-2xl bg-white/50"}`}>
                  {m.image ? (
                    <Image
                      src={m.image}
                      alt={m.imageAlt ?? `${m.name} product view`}
                      fill
                      sizes="(max-width: 639px) calc(100vw - 2rem), (max-width: 1023px) 50vw, 33vw"
                      className={`object-contain transition-transform duration-500 ${m.imageZoom === "large" ? "scale-[1.4] group-hover:scale-[1.43]" : "scale-[1.3] group-hover:scale-[1.33]"}`}
                    />
                  ) : (
                    <FlatDevicePreview name={m.name} gradient={m.gradient} />
                  )}
                </div>

                <div className={`relative z-30 -mx-5 -mb-5 rounded-b-[1.75rem] px-5 pb-5 pt-5 ${m.image ? "-mt-5" : ""}`}>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-xl font-700" style={{ color: tone.ink }}>
                      {m.name}
                    </h3>
                    <span
                      className="rounded-full border border-white/80 bg-white/70 px-2 py-0.5 text-[10px] font-700"
                      style={{ color: tone.accent }}
                    >
                      {m.condition}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm font-600" style={{ color: tone.muted }}>
                    Tested &amp; checked
                  </p>

                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <p className="font-display text-2xl font-700" style={{ color: tone.accent }}>
                        {m.daily}
                        <span className="text-sm" style={{ color: tone.ink }}>/day</span>
                      </p>
                      <p className="text-xs font-600" style={{ color: tone.muted }}>
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
                </div>
              </article>
            </Reveal>
          );
        })}
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
