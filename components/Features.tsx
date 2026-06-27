import {
  SealCheck,
  CalendarDots,
  CheckCircle,
  Truck,
  ArrowsLeftRight,
  Handshake,
} from "@phosphor-icons/react/dist/ssr";
import SectionHeading from "./SectionHeading";
import Reveal from "./Reveal";

const lead = {
  icon: SealCheck,
  title: "Trusted & DTI registered",
  body: "Fresh Phones PH is DTI registered under FP Gadget Center. Buy with confidence from a legit, accountable seller.",
};

const tiles = [
  {
    icon: CalendarDots,
    title: "Flexible payments",
    body: "Choose weekly, 15 & 30, or monthly. Pay the way that fits your budget and payday.",
    span: "md:col-span-2 lg:col-span-2",
    surface: "glass-tint",
  },
  {
    icon: CheckCircle,
    title: "Quality checked",
    body: "Pre-owned and brand-new units, all tested and in excellent condition.",
    span: "lg:col-span-1",
    surface: "glass",
  },
  {
    icon: Handshake,
    title: "Paluwagan friendly",
    body: "Real paluwagan and installment options, built for the community.",
    span: "lg:col-span-1",
    surface: "glass",
  },
  {
    icon: Truck,
    title: "Fast & smooth delivery",
    body: "We deliver right to your doorstep, fast and hassle-free.",
    span: "md:col-span-2 lg:col-span-2",
    surface: "glass dotgrid",
  },
  {
    icon: ArrowsLeftRight,
    title: "We buy units too",
    body: "Got an old iPhone or iPad? We buy units. Message us for a fair quote.",
    span: "md:col-span-2 lg:col-span-2",
    surface: "glass",
  },
];

export default function Features() {
  return (
    <section className="relative px-4 py-20">
      <SectionHeading
        title={
          <>
            Trust mo, <span className="holo-text">fresh</span> phone mo
          </>
        }
        subtitle="We built this paluwagan to be the safest, friendliest way to get an iPhone in the Philippines."
      />

      <div className="mx-auto mt-12 grid max-w-6xl auto-rows-[minmax(0,1fr)] grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* lead tile: gradient, larger */}
        <Reveal className="md:col-span-2 lg:col-span-2 lg:row-span-2">
          <div className="flex h-full flex-col justify-between rounded-[1.75rem] bg-gradient-to-br from-[#2f6bff] to-[#1f53e6] p-7 text-white shadow-[0_30px_60px_-24px_rgba(47,107,255,0.8)]">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/15 backdrop-blur">
              <lead.icon weight="duotone" className="h-7 w-7" />
            </span>
            <div className="mt-8">
              <h3 className="font-display text-2xl font-700 sm:text-3xl">
                {lead.title}
              </h3>
              <p className="mt-2 max-w-sm text-[15px] font-500 leading-relaxed text-white/85">
                {lead.body}
              </p>
            </div>
          </div>
        </Reveal>

        {tiles.map((t, i) => (
          <Reveal key={t.title} delay={(i % 2) * 80} className={t.span}>
            <div className={`flex h-full items-start gap-4 rounded-[1.75rem] p-6 ${t.surface}`}>
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl chrome text-blue-ink">
                <t.icon weight="duotone" className="h-6 w-6" />
              </span>
              <div>
                <h3 className="font-display text-lg font-700 text-blue-ink">
                  {t.title}
                </h3>
                <p className="mt-1 text-sm font-500 leading-relaxed text-ink-soft">
                  {t.body}
                </p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
