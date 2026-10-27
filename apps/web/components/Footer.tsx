import Image from "next/image";
import {
  ArrowRight,
  FacebookLogo,
  MessengerLogo,
} from "@phosphor-icons/react/dist/ssr";
import styles from "./Footer.module.css";

const groups = [
  {
    title: "Company",
    links: [
      { href: "/", label: "Home" },
      { href: "/about", label: "About us" },
      { href: "/careers", label: "Careers" },
      { href: "/privacy", label: "Privacy notices" },
      { href: "/terms", label: "Portal terms" },
    ],
  },
  {
    title: "Explore",
    links: [
      { href: "/#units", label: "Available units" },
      { href: "/#how", label: "How it works" },
      { href: "/about#verify", label: "Verify an agent" },
      { href: "/#faq", label: "FAQs" },
      { href: "/support", label: "Customer support" },
    ],
  },
];

const socials = [
  {
    icon: FacebookLogo,
    label: "Facebook",
    href: "https://web.facebook.com/FreshPhonesPh",
  },
  {
    icon: MessengerLogo,
    label: "Messenger",
    href: "https://m.me/FreshPhonesPh",
  },
];

export default function Footer() {
  return (
    <footer className={`landing-footer ${styles.footer}`}>
      <div className={styles.inner}>
        <div>
          <div className={styles.grid}>
            {/* brand */}
            <div>
              <div className="flex min-w-0 flex-wrap items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full">
                  <Image
                    src="/brand/fresh-phones-logo.png"
                    alt="Fresh Phones PH"
                    width={36}
                    height={36}
                    className="h-9 w-9 scale-150 object-cover"
                  />
                </span>
                <div className="min-w-0 break-words font-display text-base font-700 leading-tight text-blue-ink">
                  Fresh Phones <span className="holo-text">PH</span>
                </div>
              </div>
              <p className={styles.description}>
                Your next iPhone or iPad, with a clear plan and real people to
                guide you.
              </p>
              <div className={styles.socials}>
                {socials.map((s) => {
                  return (
                    <a
                      key={s.label}
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={s.label}
                      className={styles.social}
                    >
                      <s.icon weight="fill" className="h-5 w-5" />
                    </a>
                  );
                })}
              </div>
            </div>

            {groups.map((group) => (
              <nav
                key={group.title}
                aria-label={`Footer ${group.title.toLowerCase()}`}
              >
                <h3 className={styles.columnHeading}>{group.title}</h3>
                <ul className={styles.links}>
                  {group.links.map((l) => {
                    return (
                      <li key={l.href}>
                        <a href={l.href} className={styles.navLink}>
                          {l.label}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            ))}

            <div className={styles.contact}>
              <h3 className={styles.columnHeading}>Let&apos;s talk</h3>
              <p className={styles.description}>
                Questions about a device or your plan? Get a little guidance
                from our team.
              </p>
              <a
                href="https://m.me/FreshPhonesPh"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.contactButton}
              >
                Message our team
                <span>
                  <ArrowRight weight="bold" aria-hidden="true" />
                </span>
              </a>
              <a className={styles.phone} href="tel:+639624791649">
                0962 479 1649
              </a>
            </div>
          </div>

          <div className={styles.bottom}>
            <p className="text-xs font-600 text-ink-soft">
              © {new Date().getFullYear()} Fresh Phones PH. DTI registered as FP
              Gadget Center.
            </p>
            <p className="text-xs font-500 text-ink-soft/80">
              Not affiliated with Apple Inc. iPhone is a trademark of Apple Inc.
            </p>
          </div>
          <p className={styles.credits}>
            iPhone mockup adapted from{" "}
            <a
              className="underline"
              href="https://sketchfab.com/3d-models/iphone-17-free-model-bad34ad8718b49e8894ac82cafef33c4"
            >
              SetixOwyy’s model
            </a>
            ,{" "}
            <a
              className="underline"
              href="https://creativecommons.org/licenses/by/4.0/"
            >
              CC BY 4.0
            </a>
            . Star icons by{" "}
            <a
              className="underline"
              href="https://www.figma.com/community/file/1166831539721848736"
            >
              480 Design (Solar)
            </a>
            , CC BY 4.0.
          </p>
        </div>
      </div>
    </footer>
  );
}
