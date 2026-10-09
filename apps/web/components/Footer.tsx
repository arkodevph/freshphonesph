import Image from "next/image";
import { FacebookLogo, MessengerLogo } from "@phosphor-icons/react/dist/ssr";

const nav = [
  { href: "/#how", label: "How it Works" },
  { href: "/#iphones", label: "iPhones" },
  { href: "/#plans", label: "Plans" },
  { href: "/#reviews", label: "Reviews" },
  { href: "/#faq", label: "FAQ" },
  { href: "/careers", label: "Careers" },
];

const socials = [
  { icon: FacebookLogo, label: "Facebook", href: "https://web.facebook.com/FreshPhonesPh" },
  { icon: MessengerLogo, label: "Messenger", href: "https://m.me/FreshPhonesPh" },
];

export default function Footer() {
  return (
    <footer className="px-4 pb-10 pt-8">
      <div className="mx-auto max-w-6xl">
        <div className="glass rounded-[2.5rem] p-8 sm:p-10">
          <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
            {/* brand */}
            <div>
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center overflow-hidden rounded-2xl chrome">
                  <Image
                    src="/brand/fresh-phones-logo.png"
                    alt="Fresh Phones PH"
                    width={48}
                    height={48}
                    className="h-11 w-11 scale-150 object-cover"
                  />
                </span>
                <div className="font-display text-xl font-700 leading-tight text-blue-ink">
                  Fresh Phones <span className="holo-text">PH</span>
                  <span className="block text-xs font-600 tracking-[0.3em] text-ink-soft">
                    GADGET CENTER
                  </span>
                </div>
              </div>
              <p className="mt-4 max-w-xs text-sm font-500 leading-relaxed text-ink-soft">
                The friendly, trusted way to own an iPhone or iPad through
                paluwagan. DTI registered under FP Gadget Center.
              </p>
              <div className="mt-5 flex gap-2.5">
                {socials.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="grid h-10 w-10 place-items-center rounded-full bg-white/70 text-blue-ink transition-colors hover:bg-blue hover:text-white"
                  >
                    <s.icon weight="fill" className="h-5 w-5" />
                  </a>
                ))}
              </div>
            </div>

            {/* links */}
            <div>
              <h3 className="font-display text-sm font-700 uppercase tracking-wider text-blue-ink">
                Explore
              </h3>
              <ul className="mt-4 space-y-2.5">
                {nav.map((l) => (
                  <li key={l.href}>
                    <a
                      href={l.href}
                      className="text-sm font-600 text-ink-soft transition-colors hover:text-blue"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* contact */}
            <div>
              <h3 className="font-display text-sm font-700 uppercase tracking-wider text-blue-ink">
                Get in touch
              </h3>
              <ul className="mt-4 space-y-2.5 text-sm font-600 text-ink-soft">
                <li>
                  <a href="tel:+639624791649" className="transition-colors hover:text-blue">
                    0962 479 1649
                  </a>
                </li>
                <li>Owner: Mr. Dale John Garcia Tambong</li>
                <li>GCash, Maya, or bank transfer</li>
              </ul>
              <a
                href="/#join"
                className="btn-candy mt-5 inline-flex rounded-full px-5 py-2.5 text-sm font-700"
              >
                Reserve a Slot
              </a>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-blue/10 pt-6 text-center sm:flex-row sm:text-left">
            <p className="text-xs font-600 text-ink-soft">
              © {new Date().getFullYear()} Fresh Phones PH. DTI registered as FP
              Gadget Center.
            </p>
            <p className="text-xs font-500 text-ink-soft/80">
              Not affiliated with Apple Inc. iPhone is a trademark of Apple Inc.
            </p>
          </div>
          <p className="mt-3 text-center text-xs text-ink-soft/80">
            iPhone mockup adapted from <a className="underline" href="https://sketchfab.com/3d-models/iphone-17-free-model-bad34ad8718b49e8894ac82cafef33c4">SetixOwyy’s model</a>, <a className="underline" href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>.
          </p>
        </div>
      </div>
    </footer>
  );
}
