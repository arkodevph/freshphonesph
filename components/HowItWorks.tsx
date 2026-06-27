import { DeviceMobile, CalendarCheck, Wallet, Confetti } from "@phosphor-icons/react/dist/ssr";
import SectionHeading from "./SectionHeading";
import Reveal from "./Reveal";

const steps = [
  {
    icon: DeviceMobile,
    title: "Pick your device",
    body: "Choose from quality pre-owned and brand-new iPhones and iPad.",
  },
  {
    icon: CalendarCheck,
    title: "Choose your plan",
    body: "Pay weekly, 15 & 30, or monthly. Whatever fits your budget best.",
  },
  {
    icon: Wallet,
    title: "Pay as low as a day",
    body: "Send payments via GCash, Maya, or bank transfer, as low as a few pesos a day.",
  },
  {
    icon: Confetti,
    title: "Get your device",
    body: "We deliver your tested, ready-to-use device right to your doorstep.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how" className="relative px-4 py-20">
      <SectionHeading
        title={
          <>
            Paluwagan, but make it <span className="holo-text">easy</span>
          </>
        }
        subtitle="Four simple steps between you and your next device. No confusing fine print."
      />

      <div className="relative mx-auto mt-14 max-w-6xl">
        {/* connecting line on desktop */}
        <div
          className="absolute left-0 right-0 top-7 hidden h-0.5 bg-gradient-to-r from-blue/15 via-bubblegum/40 to-blue/15 lg:block"
          aria-hidden
        />
        <ol className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {steps.map((s, i) => (
            <Reveal as="li" key={s.title} delay={i * 90} className="relative">
              <div className="flex items-center gap-4 lg:flex-col lg:items-start lg:gap-0">
                <span className="relative grid h-14 w-14 shrink-0 place-items-center rounded-2xl chrome text-blue-ink lg:mb-5">
                  <s.icon weight="duotone" className="h-7 w-7" />
                  <span className="font-display absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-blue text-xs font-700 text-white shadow">
                    {i + 1}
                  </span>
                </span>
                <div>
                  <h3 className="font-display text-xl font-700 text-blue-ink">
                    {s.title}
                  </h3>
                  <p className="mt-1.5 text-sm font-500 leading-relaxed text-ink-soft">
                    {s.body}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
