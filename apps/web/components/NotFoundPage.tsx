import Image from "next/image";
import PublicNavigationLink from "./PublicNavigationLink";
import type { Metadata } from "next";
import { ArrowRight, House, Sparkle } from "@phosphor-icons/react/dist/ssr";
import { landingV2Font } from "./font";
import styles from "./NotFoundPage.module.css";
import typography from "./typography.module.css";

export const metadata: Metadata = {
  title: "Page not found · Fresh Phones PH",
  description:
    "This page could not be found. Find your way back to Fresh Phones PH.",
  robots: { index: false, follow: false },
};

export default function NotFoundPage() {
  return (
    <div
      className={`${styles.page} ${landingV2Font.variable} ${typography.root}`}
    >
      <header className={styles.header}>
        <PublicNavigationLink href="/" className={styles.brand}>
          <Image
            src="/brand/fresh-phones-logo.png"
            alt=""
            width={44}
            height={44}
            className={styles.logo}
            data-landing-logo
          />
          <span>
            Fresh Phones <span className={styles.brandAccent}>PH</span>
          </span>
        </PublicNavigationLink>
        <span className={styles.headerNote}>A little lost. Still fresh.</span>
      </header>

      <main className={styles.main}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>
            <span className={styles.status}>404</span>
            Page not found
          </p>
          <h1 className={styles.title}>
            This page
            <br />
            <span>drifted off.</span>
          </h1>
          <p className={styles.description}>
            A wrong turn in the clouds? This page may have moved, or the link
            might be a little off. Let’s get you back to fresh finds.
          </p>
          <div className={styles.actions}>
            <PublicNavigationLink href="/" className={styles.primary}>
              <House weight="bold" aria-hidden="true" />
              Back to home
            </PublicNavigationLink>
            <PublicNavigationLink href="/#units" className={styles.secondary}>
              Browse available units
              <ArrowRight weight="bold" aria-hidden="true" />
            </PublicNavigationLink>
          </div>
        </div>

        <div className={styles.art} aria-hidden="true">
          <span className={styles.digits}>404</span>
          <span className={styles.halo} />
          <Sparkle weight="fill" className={styles.sparkleOne} />
          <Sparkle weight="fill" className={styles.sparkleTwo} />
          <Image
            src="/brand/mascot/cloud-boy-guidance-v1.png"
            alt=""
            width={1254}
            height={1254}
            sizes="(max-width: 700px) 280px, (max-width: 1000px) 45vw, 560px"
            priority
            className={styles.mascot}
          />
        </div>
      </main>

      <footer className={styles.footer}>
        <span>A fresh start is just a click away.</span>
        <p>
          Still a little lost?{" "}
          <PublicNavigationLink href="/support">
            Contact support
          </PublicNavigationLink>
        </p>
      </footer>
    </div>
  );
}
