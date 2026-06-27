import { Sparkle } from "./decor";

const items = [
  "DTI Registered",
  "Paluwagan",
  "Installment",
  "Pre-Owned & Brand New",
  "iPhone & iPad",
  "We Buy Units",
  "Fast Delivery",
  "Trusted Seller",
];

export default function Marquee() {
  return (
    <div className="relative -rotate-1 border-y-2 border-white/60 bg-gradient-to-r from-blue via-blue-600 to-blue py-3 text-white shadow-[0_18px_40px_-20px_rgba(47,107,255,0.7)]">
      <div className="flex overflow-hidden">
        <div className="marquee-track">
          {[0, 1].map((dup) => (
            <div key={dup} className="flex shrink-0 items-center" aria-hidden={dup === 1}>
              {items.map((it) => (
                <span
                  key={it}
                  className="flex items-center gap-3 px-5 font-display text-base font-600 sm:text-lg"
                >
                  {it}
                  <Sparkle className="h-4 w-4 shrink-0" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
