import {
  SealCheck,
  Handshake,
  CalendarDots,
  ShieldCheck,
  ArrowsLeftRight,
} from "@phosphor-icons/react/dist/ssr";
import Reveal from "./Reveal";

const badges = [
  { icon: SealCheck, label: "DTI Registered" },
  { icon: Handshake, label: "Paluwagan" },
  { icon: CalendarDots, label: "Installment" },
  { icon: ShieldCheck, label: "Trusted Seller" },
  { icon: ArrowsLeftRight, label: "We Buy Units" },
];

export default function Stats() {
  return (
    <section className="px-4 py-14">
      <div className="mx-auto max-w-6xl">
        <div className="glass grid grid-cols-2 gap-4 rounded-[2rem] p-6 sm:grid-cols-3 sm:p-8 lg:grid-cols-5">
          {badges.map((b, i) => (
            <Reveal
              key={b.label}
              delay={i * 70}
              className="flex flex-col items-center gap-2 text-center"
            >
              <span className="grid h-12 w-12 place-items-center rounded-2xl chrome text-blue-ink">
                <b.icon weight="duotone" className="h-6 w-6" />
              </span>
              <p className="text-sm font-700 text-blue-ink">{b.label}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
