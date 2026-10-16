import { ArrowRight, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import HeroLoop from "./HeroLoop";
import styles from "./Hero.module.css";

export default function Hero() {
  return (
    <section id="top" className="landing-hero" aria-labelledby="hero-title">
      <div className={`landing-hero-frame ${styles.frame}`}>
        <HeroLoop />
        <div className={styles.shade} aria-hidden="true" />

        <div className={styles.copy}>
          <span className={styles.eyebrow}>
            <ShieldCheck weight="fill" aria-hidden="true" />
            DTI registered iPhone &amp; iPad paluwagan
          </span>
          <h1 id="hero-title" className={styles.title}>
            <span>Your next phone,</span>
            <span>made manageable.</span>
          </h1>
          <p className={styles.description}>
            Find your iPhone or iPad. Follow a clear paluwagan schedule, with
            real people to guide you from application to release.
          </p>
          <a href="#units" className={styles.cta}>
            View available units
            <ArrowRight weight="bold" aria-hidden="true" />
          </a>
        </div>

        <ul
          className={styles.facts}
          aria-label="Fresh Phones service highlights"
        >
          <li>
            <strong>0% interest</strong>
            <span>On approved paluwagan batches</span>
          </li>
          <li>
            <strong>Clear schedules</strong>
            <span>Know each expected due date</span>
          </li>
          <li>
            <strong>Human support</strong>
            <span>From application to release</span>
          </li>
        </ul>
      </div>
    </section>
  );
}
