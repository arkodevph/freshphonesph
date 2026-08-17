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
    <section id="units" className="relative scroll-mt-24 px-4 py-20">
      <SectionHeading
        title={
          <>
            Phones for your <span className="holo-text">next chapter</span>
          </>
        }
        subtitle="Clear pricing, payment schedules, and availability—before you message us."
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

              {/* Static flat front-and-back showcase; intentionally cropped like a product card. */}
              <div className="relative mb-5 h-48 overflow-hidden rounded-2xl bg-white/50">
                <FlatDevicePreview name={m.name} gradient={m.gradient} />
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
