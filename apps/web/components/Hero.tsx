import {
  ArrowRight,
  CalendarCheck,
  ChatCircleDots,
  ShieldCheck,
} from "@phosphor-icons/react/dist/ssr";
import HeroLoop from "./HeroLoop";
import HeroDeviceWord from "./HeroDeviceWord";
import styles from "./Hero.module.css";

export default function Hero() {
  return (
    <section
      id="top"
      className={`landing-hero ${styles.section}`}
      aria-labelledby="hero-title"
    >
      <div className={`landing-hero-frame ${styles.frame}`}>
        <HeroLoop />
        <div className={styles.shade} aria-hidden="true" />

        <div className={styles.copy}>
          <span className={styles.eyebrow}>
            <ShieldCheck weight="fill" aria-hidden="true" />
            DTI registered iPhone &amp; iPad paluwagan
          </span>
          <h1
            id="hero-title"
            className={styles.title}
            aria-label="Your next iPhone or iPad, made manageable."
          >
            <span>
              Your next <HeroDeviceWord />
            </span>
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
      </div>
      <aside
        className={styles.highlights}
        aria-label="Fresh Phones service highlights"
      >
        <ul className={styles.facts}>
          <li className={`${styles.glassCard} ${styles.interest}`}>
            <strong>
              0% <span>interest</span>
            </strong>
            <p>On approved paluwagan batches</p>
          </li>
          <li className={`${styles.glassCard} ${styles.schedule}`}>
            <CalendarCheck weight="duotone" aria-hidden="true" />
            <div>
              <strong>Clear schedules</strong>
              <p>Know each expected due date</p>
            </div>
          </li>
          <li className={`${styles.glassCard} ${styles.support}`}>
            <ChatCircleDots weight="duotone" aria-hidden="true" />
            <div>
              <strong>Human support</strong>
              <p>From application to release</p>
            </div>
          </li>
        </ul>
      </aside>
    </section>
  );
}
