import DoodleIcon from "./DoodleIcon";
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
        <div className={styles.dots} aria-hidden="true" />

        <div className={styles.copy}>
          <span className={styles.eyebrow}>
            <DoodleIcon name="shield-heart" size={20} />
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
          <div className={styles.actions}>
            <a href="#units" className={styles.cta}>
              <DoodleIcon name="phone-heart" size={28} />
              View available units
            </a>
            <a href="/inquire" className={styles.apply}>
              <DoodleIcon name="application" size={28} />
              Apply to join
            </a>
          </div>
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
            <DoodleIcon name="calendar-heart" size={24} />
            <div>
              <strong>Clear schedules</strong>
              <p>Know each expected due date</p>
            </div>
          </li>
          <li className={`${styles.glassCard} ${styles.support}`}>
            <DoodleIcon name="chat-heart" size={24} />
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
