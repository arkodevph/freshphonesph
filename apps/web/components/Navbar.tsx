"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowUpRight, CaretDown, List, X } from "@phosphor-icons/react";
import { systemHref } from "@/lib/site-links";
import styles from "./Navbar.module.css";
import DoodleIcon from "./DoodleIcon";
import PublicNavigationLink from "./PublicNavigationLink";
import { landingV2Font } from "./font";
import typography from "./typography.module.css";
import "./landing-v2.css";

const primaryLinks = [
  { href: "/#units", label: "Units" },
  { href: "/about", label: "About" },
  { href: "/inquire", label: "Inquire" },
];

const exploreLinks = [
  { href: "/#how", label: "How it works", icon: "calendar-heart" },
  { href: "/careers", label: "Careers", icon: "id-heart" },
  { href: "/support", label: "Support", icon: "chat-heart" },
] as const;

export default function Navbar() {
  const scrollMarker = useRef<HTMLSpanElement>(null);

  const [scrolled, setScrolled] = useState(false);

  const desktopDisclosure = useRef<HTMLDetailsElement>(null);

  const exploreAnimation = useRef<Animation | null>(null);

  const mobileDisclosure = useRef<HTMLDetailsElement>(null);

  const loginHref = systemHref("/login");

  const animateExplore = useCallback((open: boolean) => {
    const disclosure = desktopDisclosure.current;

    const panel = disclosure?.querySelector<HTMLElement>(
      "[data-explore-panel]",
    );

    if (
      !disclosure ||
      !panel ||
      (!open && (!disclosure.open || disclosure.dataset.closing === "true"))
    ) {
      return;
    }

    const current = disclosure.open ? getComputedStyle(panel) : null;

    const from = {
      opacity: current?.opacity ?? "0",
      transform:
        current?.transform ?? "translate(-50%, -16px) scale(0.94, 0.88)",
    };

    exploreAnimation.current?.cancel();

    disclosure.open = true;

    disclosure.dataset.closing = String(!open);

    panel.inert = !open;

    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !panel.animate
    ) {
      disclosure.open = open;

      delete disclosure.dataset.closing;

      exploreAnimation.current = null;

      return;
    }

    const animation = panel.animate(
      [
        from,
        {
          opacity: open ? "1" : "0",
          transform: open
            ? "translate(-50%, 0) scale(1)"
            : "translate(-50%, -12px) scale(0.96, 0.9)",
        },
      ],
      {
        duration: open ? 340 : 220,
        easing: open
          ? "cubic-bezier(0.16, 1, 0.3, 1)"
          : "cubic-bezier(0.4, 0, 1, 1)",
        fill: "both",
      },
    );

    exploreAnimation.current = animation;

    animation.onfinish = () => {
      if (exploreAnimation.current !== animation) {
        return;
      }

      disclosure.open = open;

      delete disclosure.dataset.closing;

      animation.cancel();

      exploreAnimation.current = null;
    };
  }, []);

  useEffect(() => {
    const marker = scrollMarker.current;

    if (!marker) {
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      setScrolled(!entry.isIntersecting);
    });

    observer.observe(marker);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const disclosures = [desktopDisclosure.current, mobileDisclosure.current];

    const desktop = window.matchMedia("(min-width: 64rem)");

    function dismissOutside(event: Event) {
      for (const disclosure of disclosures) {
        if (
          disclosure?.open &&
          event.target instanceof Node &&
          !disclosure.contains(event.target)
        ) {
          if (disclosure === desktopDisclosure.current) {
            animateExplore(false);
          } else {
            disclosure.open = false;
          }
        }
      }
    }

    function dismissOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      for (const disclosure of disclosures) {
        if (disclosure?.open) {
          if (disclosure === desktopDisclosure.current) {
            animateExplore(false);
          } else {
            disclosure.open = false;
          }

          disclosure.querySelector("summary")?.focus();
        }
      }
    }

    function dismissOnResize() {
      for (const disclosure of disclosures) {
        if (disclosure) {
          if (disclosure === desktopDisclosure.current) {
            animateExplore(false);
          } else {
            disclosure.open = false;
          }
        }
      }
    }

    document.addEventListener("pointerdown", dismissOutside);

    document.addEventListener("focusin", dismissOutside);

    document.addEventListener("keydown", dismissOnEscape);

    desktop.addEventListener("change", dismissOnResize);

    return () => {
      document.removeEventListener("pointerdown", dismissOutside);

      document.removeEventListener("focusin", dismissOutside);

      document.removeEventListener("keydown", dismissOnEscape);

      desktop.removeEventListener("change", dismissOnResize);

      exploreAnimation.current?.cancel();
    };
  }, [animateExplore]);

  function closeMenus() {
    for (const disclosure of [
      desktopDisclosure.current,
      mobileDisclosure.current,
    ]) {
      if (disclosure) {
        if (disclosure === desktopDisclosure.current) {
          animateExplore(false);
        } else {
          disclosure.open = false;
        }
      }
    }
  }

  const login = (
    <PublicNavigationLink
      href={loginHref ?? undefined}
      role="link"
      aria-disabled={!loginHref}
      title={loginHref ? undefined : "Login will be available soon"}
      className={styles.login}
      onClick={closeMenus}
    >
      <DoodleIcon name="lock-heart" size={24} />
      Log in
    </PublicNavigationLink>
  );

  const apply = (
    <PublicNavigationLink
      href="/enroll"
      className={styles.apply}
      onClick={closeMenus}
    >
      <DoodleIcon name="application" size={24} />
      Apply to join
    </PublicNavigationLink>
  );

  return (
    <>
      <span
        ref={scrollMarker}
        className={styles.scrollMarker}
        aria-hidden="true"
      />
      <header
        className={`${styles.header} ${landingV2Font.variable} ${typography.root}`}
        data-scrolled={scrolled}
        data-landing-version="2"
      >
        <nav className={styles.nav} aria-label="Main navigation">
          <PublicNavigationLink
            href="/#top"
            className={styles.brand}
            aria-label="Fresh Phones PH home"
            onClick={closeMenus}
          >
            <span className={styles.logo} data-landing-logo>
              <Image
                src="/brand/fresh-phones-logo.png"
                alt=""
                width={36}
                height={36}
                className={styles.logoImage}
              />
            </span>
            <span className={styles.wordmark}>
              Fresh Phones <span>PH</span>
            </span>
          </PublicNavigationLink>

          <ul className={styles.primary}>
            {primaryLinks.map((link) => {
              return (
                <li key={link.href}>
                  <PublicNavigationLink
                    href={link.href}
                    className={styles.navLink}
                    onClick={closeMenus}
                  >
                    {link.label}
                  </PublicNavigationLink>
                </li>
              );
            })}
            <li>
              <details ref={desktopDisclosure} className={styles.explore}>
                <summary
                  className={styles.navLink}
                  onClick={(event) => {
                    event.preventDefault();

                    const disclosure = desktopDisclosure.current;

                    animateExplore(
                      !disclosure?.open ||
                        disclosure.dataset.closing === "true",
                    );
                  }}
                >
                  Explore
                  <CaretDown aria-hidden="true" />
                </summary>
                <ul className={styles.explorePanel} data-explore-panel>
                  {exploreLinks.map((link) => {
                    return (
                      <li key={link.href}>
                        <PublicNavigationLink
                          href={link.href}
                          onClick={closeMenus}
                        >
                          <DoodleIcon name={link.icon} size={28} />
                          {link.label}
                        </PublicNavigationLink>
                      </li>
                    );
                  })}
                </ul>
              </details>
            </li>
          </ul>

          <div className={styles.actions}>
            <span className={styles.desktopLogin}>{login}</span>
            <span className={styles.desktopApply}>{apply}</span>
            <details ref={mobileDisclosure} className={styles.mobileDisclosure}>
              <summary
                className={styles.menuToggle}
                aria-label="Navigation menu"
              >
                <List className={styles.menuIcon} aria-hidden="true" />
                <X className={styles.closeIcon} aria-hidden="true" />
              </summary>
              <div className={styles.mobilePanel}>
                <ul className={styles.mobileLinks}>
                  {[...primaryLinks, ...exploreLinks].map((link) => {
                    return (
                      <li key={link.href}>
                        <PublicNavigationLink
                          href={link.href}
                          onClick={closeMenus}
                        >
                          {"icon" in link ? (
                            <DoodleIcon name={link.icon} size={28} />
                          ) : (
                            <ArrowUpRight aria-hidden="true" />
                          )}
                          {link.label}
                        </PublicNavigationLink>
                      </li>
                    );
                  })}
                </ul>
                <div className={styles.mobileActions}>
                  {login}
                  {apply}
                </div>
              </div>
            </details>
          </div>
        </nav>
      </header>
    </>
  );
}
